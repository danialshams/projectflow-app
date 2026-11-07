import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { s3 } from "@/lib/storage";
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { asResponse, context, getTask, parseJson, requireWrite, HttpError } from "@/lib/access";
const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip", "text/plain", "video/mp4"];
const schema = z.object({ taskId: z.string().cuid(), name: z.string().trim().min(1).max(190), mime: z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp", "application/zip", "text/plain", "video/mp4"]), size: z.number().int().min(1).max(25 * 1024 * 1024) });
export async function POST(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const data = await parseJson(req, schema); const task = await getTask(data.taskId, c.workspaceId);
    if (!allowed.includes(data.mime)) throw new HttpError(400, "نوع فایل مجاز نیست.");
    const { client, bucket } = s3();
    const key = `workspaces/${c.workspaceId}/projects/${task.projectId}/tasks/${task.id}/${crypto.randomUUID()}`;
    const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: data.mime, ContentLength: data.size }), { expiresIn: 120 });
    return NextResponse.json({ url, key, expiresIn: 120 });
  } catch (err) { return asResponse(err); }
}
export async function PUT(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const data = await parseJson(req, schema.extend({ key: z.string().max(500) }));
    const task = await getTask(data.taskId, c.workspaceId);
    const prefix = `workspaces/${c.workspaceId}/projects/${task.projectId}/tasks/${task.id}/`;
    if (!data.key.startsWith(prefix)) throw new HttpError(400, "کلید فایل نامعتبر است.");
    const { client, bucket } = s3();
    const meta = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: data.key }));
    if (meta.ContentLength !== data.size || meta.ContentType !== data.mime) throw new HttpError(400, "مشخصات فایل آپلود شده مطابقت ندارد.");
    const existing = await db.attachment.findFirst({ where: { taskId: data.taskId, objectKey: data.key } });
    if (existing) return NextResponse.json({ attachment: existing });
    const attachment = await db.attachment.create({ data: { taskId: data.taskId, uploaderId: c.userId, name: data.name, mime: data.mime, size: data.size, objectKey: data.key } });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
