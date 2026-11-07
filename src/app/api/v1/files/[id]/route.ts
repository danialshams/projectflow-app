import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/storage";
import { asResponse, context, HttpError } from "@/lib/access";
type Params = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Params) {
  try {
    const c = await context(); const { id } = await params;
    const file = await db.attachment.findFirst({ where: { id, task: { project: { workspaceId: c.workspaceId } } } });
    if (!file) throw new HttpError(404, "فایل یافت نشد.");
    const { client, bucket } = s3();
    const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: file.objectKey }), { expiresIn: 120 });
    return NextResponse.json({ url });
  } catch (err) { return asResponse(err); }
}
