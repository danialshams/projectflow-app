import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, getProject, parseJson, requireManage, HttpError, logActivity } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const c = await context(); requireManage(c.role);
    const data = await parseJson(req, z.object({ projectId: z.string().cuid(), clientId: z.string().cuid(), title: z.string().trim().min(2).max(150), amount: z.number().int().positive().max(1e15) }));
    await getProject(data.projectId, c.workspaceId);
    if (!(await db.client.findFirst({ where: { id: data.clientId, workspaceId: c.workspaceId } }))) throw new HttpError(400, "مشتری نامعتبر است.");
    const contract = await db.contract.create({ data });
    await logActivity(c.workspaceId, c.userId, "CREATE", "CONTRACT", contract.id, `قرارداد «${contract.title}» ثبت شد`);
    return NextResponse.json({ contract }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
