import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, logActivity, HttpError } from "@/lib/access";
const schema = z.object({ name: z.string().trim().min(2).max(120), description: z.string().max(2000).default(""), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#5474da"), status: z.enum(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"]).default("ACTIVE"), budget: z.number().nonnegative().max(1e15).default(0), dueAt: z.string().datetime().nullable().optional(), clientId: z.string().cuid().nullable().optional() });
export async function POST(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const data = await parseJson(req, schema);
    if (data.clientId && !(await db.client.findFirst({ where: { id: data.clientId, workspaceId: c.workspaceId } }))) throw new HttpError(400, "مشتری نامعتبر است.");
    const prefix = data.name.replace(/[^A-Za-z\d\u0600-\u06FF]/g, "").slice(0, 3).toUpperCase() || "PRJ";
    const project = await db.project.create({ data: { workspaceId: c.workspaceId, name: data.name, key: `${prefix}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, description: data.description, color: data.color, status: data.status, budget: data.budget, dueAt: data.dueAt ? new Date(data.dueAt) : null, clientId: data.clientId ?? null } });
    await logActivity(c.workspaceId, c.userId, "CREATE", "PROJECT", project.id, `پروژه «${project.name}» ساخته شد`);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
