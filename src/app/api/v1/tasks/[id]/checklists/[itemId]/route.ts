import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, getTask, parseJson, requireWrite, HttpError } from "@/lib/access";
type Params = { params: Promise<{ id: string; itemId: string }> };
export async function PATCH(req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role); const { id, itemId } = await params; await getTask(id, c.workspaceId);
    const { checked } = await parseJson(req, z.object({ checked: z.boolean() }));
    const r = await db.checklist.updateMany({ where: { id: itemId, taskId: id }, data: { checked } });
    if (!r.count) throw new HttpError(404, "آیتم یافت نشد.");
    return NextResponse.json({ ok: true });
  } catch (err) { return asResponse(err); }
}
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role); const { id, itemId } = await params; await getTask(id, c.workspaceId);
    await db.checklist.deleteMany({ where: { id: itemId, taskId: id } });
    return NextResponse.json({ ok: true });
  } catch (err) { return asResponse(err); }
}
