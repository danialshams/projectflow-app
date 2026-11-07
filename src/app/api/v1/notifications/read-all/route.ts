import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asResponse, context } from "@/lib/access";

export async function PATCH() {
  try {
    const c = await context();
    const result = await db.notification.updateMany({
      where: { workspaceId: c.workspaceId, userId: c.userId, readAt: null },
      data: { readAt: new Date() }
    });
    return NextResponse.json({ ok: true, count: result.count }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) { return asResponse(err); }
}
