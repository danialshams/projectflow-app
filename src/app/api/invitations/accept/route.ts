import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { asResponse, HttpError, parseJson } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const session = await getAuth();
    if (!session?.user?.id || !session.user.email) throw new HttpError(401, "برای پذیرش دعوت‌نامه باید وارد شوید.");
    const { token } = await parseJson(req, z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }));
    const invite = await db.workspaceInvitation.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) throw new HttpError(400, "دعوت‌نامه معتبر نیست یا منقضی شده است.");
    if (invite.invitedEmail !== session.user.email.toLowerCase()) throw new HttpError(403, "این دعوت‌نامه برای ایمیل دیگری ارسال شده است.");
    await db.$transaction(async tx => {
      const updated = await tx.workspaceInvitation.updateMany({ where: { id: invite.id, acceptedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
      if (!updated.count) throw new HttpError(409, "این دعوت‌نامه قبلاً استفاده شده است.");
      await tx.membership.upsert({ where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: session.user.id } }, update: {}, create: { workspaceId: invite.workspaceId, userId: session.user.id, role: invite.role } });
    });
    const response = NextResponse.json({ ok: true, workspaceId: invite.workspaceId });
    response.cookies.set("projectflow_workspace", invite.workspaceId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60*60*24*30 });
    return response;
  } catch (err) { return asResponse(err); }
}
