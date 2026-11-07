import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, getTask, logActivity, HttpError } from "@/lib/access";
const schema = z.object({ title: z.string().trim().min(2).max(180).optional(), description: z.string().max(6000).optional(), status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(), assigneeId: z.string().cuid().nullable().optional(), parentId: z.string().cuid().nullable().optional(), dueAt: z.string().datetime().nullable().optional(), estimatedMinutes: z.number().int().min(0).max(100000).optional(), position: z.number().int().min(0).optional() }).strict();
type Params = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role);
    const { id } = await params; const old = await getTask(id, c.workspaceId);
    const data = await parseJson(req, schema);
    if (data.assigneeId && !(await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: c.workspaceId, userId: data.assigneeId } } }))) throw new HttpError(400, "مسئول باید عضو تیم باشد.");
    if (data.parentId) { if (data.parentId === id) throw new HttpError(400, "وظیفه نمی‌تواند زیرکار خودش باشد."); const parent = await getTask(data.parentId, c.workspaceId); if (parent.projectId !== old.projectId || parent.parentId === id) throw new HttpError(400, "زیرکار نامعتبر است."); }
    const task = await db.task.update({ where: { id }, data: { ...data, dueAt: data.dueAt === undefined ? undefined : data.dueAt ? new Date(data.dueAt) : null } });
    await logActivity(c.workspaceId, c.userId, "UPDATE", "TASK", id, `وظیفه «${task.title}» ویرایش شد`);
    if (data.assigneeId && data.assigneeId !== old.assigneeId && data.assigneeId !== c.userId) await db.notification.create({ data: { workspaceId: c.workspaceId, userId: data.assigneeId, title: "وظیفه به شما واگذار شد", body: task.title, href: "/dashboard/tasks" } });
    return NextResponse.json({ task });
  } catch (err) { return asResponse(err); }
}
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role);
    const { id } = await params; const task = await getTask(id, c.workspaceId);
    await db.task.delete({ where: { id } });
    await logActivity(c.workspaceId, c.userId, "DELETE", "TASK", id, `وظیفه «${task.title}» حذف شد`);
    return NextResponse.json({ ok: true });
  } catch (err) { return asResponse(err); }
}
