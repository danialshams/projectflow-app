import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, getProject, getTask, logActivity, HttpError } from "@/lib/access";
const taskSchema = z.object({ projectId: z.string().cuid(), title: z.string().trim().min(2).max(180), description: z.string().max(6000).default(""), status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"), assigneeId: z.string().cuid().nullable().optional(), parentId: z.string().cuid().nullable().optional(), dueAt: z.string().datetime().nullable().optional(), estimatedMinutes: z.number().int().min(0).max(100000).default(0) });
export async function POST(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const data = await parseJson(req, taskSchema);
    const project = await getProject(data.projectId, c.workspaceId);
    if (data.assigneeId && !(await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: c.workspaceId, userId: data.assigneeId } } }))) throw new HttpError(400, "مسئول باید عضو تیم باشد.");
    if (data.parentId && (await getTask(data.parentId, c.workspaceId)).projectId !== data.projectId) throw new HttpError(400, "زیرکار باید متعلق به همین پروژه باشد.");
    const task = await db.task.create({ data: { projectId: data.projectId, title: data.title, description: data.description, status: data.status, priority: data.priority, assigneeId: data.assigneeId ?? null, parentId: data.parentId ?? null, dueAt: data.dueAt ? new Date(data.dueAt) : null, estimatedMinutes: data.estimatedMinutes, createdById: c.userId } });
    await logActivity(c.workspaceId, c.userId, "CREATE", "TASK", task.id, `وظیفه «${task.title}» در ${project.name} ساخته شد`);
    if (data.assigneeId && data.assigneeId !== c.userId) await db.notification.create({ data: { workspaceId: c.workspaceId, userId: data.assigneeId, title: "وظیفه جدید", body: task.title, href: "/dashboard/tasks" } });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
