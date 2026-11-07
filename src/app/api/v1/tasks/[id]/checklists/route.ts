import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, getTask, parseJson, requireWrite } from "@/lib/access";
type Params = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role); const { id } = await params; await getTask(id, c.workspaceId);
    const { title } = await parseJson(req, z.object({ title: z.string().trim().min(1).max(200) }));
    const item = await db.checklist.create({ data: { taskId: id, title } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
