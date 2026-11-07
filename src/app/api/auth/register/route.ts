import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asResponse, parseJson, HttpError } from "@/lib/access";
import bcrypt from "bcryptjs";
import { z } from "zod";
const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(200), password: z.string().min(10).max(128), workspaceName: z.string().trim().min(2).max(100).optional() });
export async function POST(request: Request) {
  try {
    const data = await parseJson(request, schema);
    const email = data.email.toLowerCase();
    if (await db.user.findUnique({ where: { email } })) throw new HttpError(409, "این ایمیل قبلاً ثبت شده است.");
    const hash = await bcrypt.hash(data.password, 12);
    const name = data.workspaceName || `تیم ${data.name}`;
    const slug = `team-${crypto.randomUUID().slice(0, 12)}`;
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, name: data.name, passwordHash: hash } });
      const workspace = await tx.workspace.create({ data: { slug, name, ownerId: user.id } });
      await tx.membership.create({ data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" } });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
