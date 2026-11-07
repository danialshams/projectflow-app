import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { asResponse, context, parseJson, requireManage, HttpError, logActivity } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const c = await context(); requireManage(c.role);
    const { email, role } = await parseJson(req, z.object({ email: z.string().email().max(200), role: z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]).default("MEMBER") }));
    const lower = email.toLowerCase().trim();
    const user = await db.user.findUnique({ where: { email: lower } });
    if (user) {
      const existing = await db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: c.workspaceId, userId: user.id } } });
      if (existing) throw new HttpError(409, "این کاربر قبلاً عضو تیم است.");
    }
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invite = await db.workspaceInvitation.create({ data: { workspaceId: c.workspaceId, invitedEmail: lower, role, tokenHash, createdById: c.userId, expiresAt: new Date(Date.now()+7*86400000) } });
    await logActivity(c.workspaceId, c.userId, "INVITE", "MEMBERSHIP", invite.id, `دعوت‌نامه برای ${lower} صادر شد`);
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    return NextResponse.json({ inviteUrl: `${base.replace(/\/$/,"")}/invite/${token}`, expiresAt: invite.expiresAt }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
