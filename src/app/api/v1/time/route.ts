import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, getTask, logActivity } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const data = await parseJson(req, z.object({ taskId: z.string().cuid(), minutes: z.number().int().min(1).max(1440), note: z.string().max(400).default(""), startedAt: z.string().datetime().optional() }));
    const task = await getTask(data.taskId, c.workspaceId);
    const entry = await db.timeEntry.create({ data: { taskId: task.id, userId: c.userId, minutes: data.minutes, note: data.note, startedAt: data.startedAt ? new Date(data.startedAt) : new Date() } });
    await logActivity(c.workspaceId, c.userId, "LOG_TIME", "TASK", task.id, `${data.minutes} دقیقه برای «${task.title}» ثبت شد`);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
