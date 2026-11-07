import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireManage, logActivity } from "@/lib/access";
const schema = z.object({ name: z.string().trim().min(2).max(140), company: z.string().max(140).optional(), email: z.union([z.string().email(), z.literal("")]).optional(), phone: z.string().max(30).optional(), notes: z.string().max(1500).optional() });
export async function POST(req: Request) {
  try {
    const c = await context(); requireManage(c.role);
    const data = await parseJson(req, schema);
    const client = await db.client.create({ data: { ...data, email: data.email || null, workspaceId: c.workspaceId } });
    await logActivity(c.workspaceId, c.userId, "CREATE", "CLIENT", client.id, `مشتری «${client.name}» اضافه شد`);
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
