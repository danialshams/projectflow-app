import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import type { WorkspaceRole } from "@prisma/client";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function context() {
  const session = await getAuth();
  if (!session?.user?.id) throw new HttpError(401, "ابتدا وارد حساب خود شوید.");
  const activeId = (await cookies()).get("projectflow_workspace")?.value;
  const active = activeId ? await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: activeId, userId: session.user.id } } }) : null;
  const member = active ?? await db.membership.findFirst({ where: { userId: session.user.id }, orderBy: { joinedAt: "asc" } });
  if (!member) throw new HttpError(403, "فضای کاری یافت نشد.");
  return { userId: session.user.id, workspaceId: member.workspaceId, role: member.role };
}
export function canWrite(role: WorkspaceRole) { return role !== "VIEWER"; }
export function canManage(role: WorkspaceRole) { return ["OWNER", "ADMIN", "MANAGER"].includes(role); }
export function requireWrite(role: WorkspaceRole) { if (!canWrite(role)) throw new HttpError(403, "دسترسی ویرایش ندارید."); }
export function requireManage(role: WorkspaceRole) { if (!canManage(role)) throw new HttpError(403, "فقط مدیران اجازه انجام این عملیات را دارند."); }
export async function getProject(id: string, workspaceId: string) {
  const project = await db.project.findFirst({ where: { id, workspaceId } });
  if (!project) throw new HttpError(404, "پروژه پیدا نشد.");
  return project;
}
export async function getTask(id: string, workspaceId: string) {
  const task = await db.task.findFirst({ where: { id, project: { workspaceId } } });
  if (!task) throw new HttpError(404, "وظیفه پیدا نشد.");
  return task;
}
export async function parseJson<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try { body = await req.json(); } catch { throw new HttpError(400, "فرمت درخواست نامعتبر است."); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است.");
  return parsed.data;
}
export function asResponse(err: unknown) {
  if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error("API error", err);
  return NextResponse.json({ error: "خطای داخلی سرور. دوباره تلاش کنید." }, { status: 500 });
}
export const dateInput = z.union([z.string().datetime(), z.literal(""), z.null()]).optional();
export function dateOrNull(value?: string | null) { return value ? new Date(value) : null; }
export async function logActivity(workspaceId: string, actorId: string, action: string, entityType: string, entityId: string, summary: string) {
  await db.activity.create({ data: { workspaceId, actorId, action, entityType, entityId, summary } });
}
