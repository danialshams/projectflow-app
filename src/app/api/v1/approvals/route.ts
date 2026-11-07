import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, getProject, getTask, logActivity, HttpError } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const data = await parseJson(req, z.object({ projectId: z.string().cuid(), taskId: z.string().cuid().nullable().optional(), title: z.string().trim().min(2).max(200), description: z.string().max(2000).default(""), reviewerId: z.string().cuid().nullable().optional() }));
    await getProject(data.projectId, c.workspaceId);
    if (data.taskId && (await getTask(data.taskId, c.workspaceId)).projectId !== data.projectId) throw new HttpError(400, "وظیفه متعلق به پروژه نیست.");
    if (data.reviewerId && !(await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: c.workspaceId, userId: data.reviewerId } } }))) throw new HttpError(400, "بررسی‌کننده عضو تیم نیست.");
    const approval = await db.approval.create({ data: { projectId: data.projectId, taskId: data.taskId ?? null, title: data.title, description: data.description, requesterId: c.userId, reviewerId: data.reviewerId ?? null } });
    await logActivity(c.workspaceId, c.userId, "CREATE", "APPROVAL", approval.id, `درخواست تأیید «${approval.title}» ایجاد شد`);
    if (approval.reviewerId && approval.reviewerId !== c.userId) await db.notification.create({ data: { workspaceId: c.workspaceId, userId: approval.reviewerId, title: "درخواست تأیید جدید", body: approval.title, href: "/dashboard/approvals" } });
    return NextResponse.json({ approval }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
