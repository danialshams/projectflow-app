import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireManage, HttpError } from "@/lib/access";
type Params = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Params) {
  try {
    const c = await context(); requireManage(c.role); const { id } = await params;
    const contract = await db.contract.findFirst({ where: { id, project: { workspaceId: c.workspaceId } } });
    if (!contract) throw new HttpError(404, "قرارداد پیدا نشد.");
    const data = await parseJson(req, z.object({ title: z.string().trim().min(2).max(120), amount: z.number().int().positive().max(1e15), dueAt: z.string().datetime().nullable().optional() }));
    const sum = await db.installment.aggregate({ where: { contractId: id }, _sum: { amount: true } });
    if ((sum._sum.amount?.toNumber() ?? 0) + data.amount > contract.amount.toNumber()) throw new HttpError(400, "مجموع اقساط از مبلغ قرارداد بیشتر می‌شود.");
    const installment = await db.installment.create({ data: { contractId: id, title: data.title, amount: data.amount, dueAt: data.dueAt ? new Date(data.dueAt) : null } });
    return NextResponse.json({ installment }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
