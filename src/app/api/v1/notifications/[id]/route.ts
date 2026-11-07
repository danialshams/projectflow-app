import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { asResponse, context } from "@/lib/access";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(_req: Request, { params }: Params) {
  try {
    const c = await context(); const { id } = await params;
    await db.notification.updateMany({ where: { id, userId: c.userId, workspaceId: c.workspaceId }, data: { readAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) { return asResponse(err); }
}
