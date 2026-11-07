import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asResponse, context, getProject, HttpError, logActivity, requireManage } from "@/lib/access";

type Params = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

// Creates a one-time, seven-day link. We never persist the raw token.
export async function POST(request: Request, { params }: Params) {
  try {
    const c = await context();
    requireManage(c.role);
    const { id } = await params;
    const client = await db.client.findFirst({ where: { id, workspaceId: c.workspaceId } });
    if (!client) throw new HttpError(404, "مشتری پیدا نشد.");
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.clientPortalInvitation.create({
      data: { clientId: id, createdById: c.userId, tokenHash, expiresAt }
    });
    await logActivity(c.workspaceId, c.userId, "PORTAL_INVITE", "CLIENT", id, "لینک ورود مشتری «" + client.name + "» ساخته شد");
    const base = process.env.NEXTAUTH_URL || new URL(request.url).origin;
    const url = base.replace(/\/$/, "") + "/portal/activate/" + token;
    return NextResponse.json({ url, expiresAt: expiresAt.toISOString() }, {
      status: 201, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }
    });
  } catch (err) { return asResponse(err); }
}

// Revoke every existing client session and all as-yet-unused invitations.
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const c = await context();
    requireManage(c.role);
    const { id } = await params;
    const client = await db.client.findFirst({ where: { id, workspaceId: c.workspaceId } });
    if (!client) throw new HttpError(404, "مشتری پیدا نشد.");
    const now = new Date();
    const results = await db.$transaction([
      db.clientPortalSession.updateMany({ where: { clientId: id, revokedAt: null }, data: { revokedAt: now } }),
      db.clientPortalInvitation.updateMany({ where: { clientId: id, redeemedAt: null, expiresAt: { gt: now } }, data: { expiresAt: now } })
    ]);
    await logActivity(c.workspaceId, c.userId, "PORTAL_REVOKE", "CLIENT", id, "دسترسی پرتال مشتری «" + client.name + "» لغو شد");
    return NextResponse.json({ ok: true, revokedSessions: results[0].count, revokedInvitations: results[1].count });
  } catch (err) { return asResponse(err); }
}
