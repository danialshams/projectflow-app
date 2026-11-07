import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, asResponse } from "@/lib/access";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = form.get("token");
    if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new HttpError(400, "لینک ورود نامعتبر است.");
    const hash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const sessionToken = randomBytes(32).toString("hex");
    const sessionHash = createHash("sha256").update(sessionToken).digest("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const session = await db.$transaction(async (tx) => {
      const invite = await tx.clientPortalInvitation.findUnique({ where: { tokenHash: hash } });
      if (!invite || invite.redeemedAt || invite.expiresAt <= now) return null;
      // Atomically redeem: two simultaneous submissions cannot use the same invitation.
      const updated = await tx.clientPortalInvitation.updateMany({
        where: { id: invite.id, redeemedAt: null, expiresAt: { gt: now } },
        data: { redeemedAt: now }
      });
      if (updated.count !== 1) return null;
      return tx.clientPortalSession.create({ data: { clientId: invite.clientId, tokenHash: sessionHash, expiresAt } });
    });
    if (!session) return NextResponse.redirect(new URL("/portal?expired=1", request.url), 303);
    const response = NextResponse.redirect(new URL("/portal", request.url), 303);
    response.cookies.set("projectflow_client", sessionToken, {
      httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
      path: "/", expires: expiresAt
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    if (err instanceof HttpError) return NextResponse.redirect(new URL("/portal?expired=1", request.url), 303);
    return asResponse(err);
  }
}
