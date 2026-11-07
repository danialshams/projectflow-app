import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, getTask, requireWrite, logActivity } from "@/lib/access";
type Params = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Params) {
  try {
    const c = await context(); const { id } = await params; await getTask(id, c.workspaceId);
    const comments = await db.comment.findMany({ where: { taskId: id }, include: { author: { select: { id: true, name: true, avatarColor: true } } }, orderBy: { createdAt: "asc" }, take: 200 });
    return NextResponse.json({ comments });
  } catch (err) { return asResponse(err); }
}
export async function POST(req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role); const { id } = await params; const task = await getTask(id, c.workspaceId);
    const { body } = await parseJson(req, z.object({ body: z.string().trim().min(1).max(3000) }));
    const comment = await db.comment.create({ data: { taskId: id, authorId: c.userId, body } });
    await logActivity(c.workspaceId, c.userId, "COMMENT", "TASK", id, `برای «${task.title}» نظر ثبت شد`);
    if (task.assigneeId && task.assigneeId !== c.userId) await db.notification.create({ data: { workspaceId: c.workspaceId, userId: task.assigneeId, title: "نظر جدید روی وظیفه", body: task.title, href: "/dashboard/tasks" } });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
