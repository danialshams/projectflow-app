import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireManage, HttpError } from "@/lib/access";
type Params = { params: Promise<{ id: string; itemId: string }> };
export async function PATCH(req: Request, { params }: Params) {
  try {
    const c = await context(); requireManage(c.role); const { id, itemId } = await params;
    const { paid } = await parseJson(req, z.object({ paid: z.boolean() }));
    const r = await db.installment.updateMany({ where: { id: itemId, contractId: id, contract: { project: { workspaceId: c.workspaceId } } }, data: { paidAt: paid ? new Date() : null } });
    if (!r.count) throw new HttpError(404, "قسط پیدا نشد.");
    return NextResponse.json({ ok: true });
  } catch (err) { return asResponse(err); }
}
