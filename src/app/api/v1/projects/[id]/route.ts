import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, requireManage, getProject, logActivity, HttpError } from "@/lib/access";
const schema = z.object({ name: z.string().trim().min(2).max(120).optional(), description: z.string().max(2000).optional(), status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(), budget: z.number().nonnegative().max(1e15).optional(), dueAt: z.string().datetime().nullable().optional(), clientId: z.string().cuid().nullable().optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).strict();
type Params = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role);
    const { id } = await params; await getProject(id, c.workspaceId);
    const data = await parseJson(req, schema);
    if (data.clientId && !(await db.client.findFirst({ where: { id: data.clientId, workspaceId: c.workspaceId } }))) throw new HttpError(400, "مشتری نامعتبر است.");
    const project = await db.project.update({ where: { id }, data: { ...data, dueAt: data.dueAt === undefined ? undefined : data.dueAt ? new Date(data.dueAt) : null } });
    await logActivity(c.workspaceId, c.userId, "UPDATE", "PROJECT", id, `پروژه «${project.name}» ویرایش شد`);
    return NextResponse.json({ project });
  } catch (err) { return asResponse(err); }
}
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const c = await context(); requireManage(c.role);
    const { id } = await params; const project = await getProject(id, c.workspaceId);
    await db.project.delete({ where: { id } });
    await logActivity(c.workspaceId, c.userId, "DELETE", "PROJECT", id, `پروژه «${project.name}» حذف شد`);
    return NextResponse.json({ ok: true });
  } catch (err) { return asResponse(err); }
}
