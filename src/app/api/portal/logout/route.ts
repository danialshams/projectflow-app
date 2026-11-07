import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { asResponse } from "@/lib/access";

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("projectflow_client")?.value;
    if (token && /^[0-9a-f]{64}$/.test(token)) {
      await db.clientPortalSession.updateMany({
        where: { tokenHash: createHash("sha256").update(token).digest("hex"), revokedAt: null },
        data: { revokedAt: new Date() }
      });
    }
    const response = NextResponse.redirect(new URL("/portal", request.url), 303);
    response.cookies.set("projectflow_client", "", { httpOnly: true, sameSite: "strict",
      secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
    return response;
  } catch (err) { return asResponse(err); }
}
