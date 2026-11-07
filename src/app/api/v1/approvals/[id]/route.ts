import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireManage, HttpError, logActivity } from "@/lib/access";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(req: Request, { params }: Params) {
  try {
    const c = await context(); requireManage(c.role); const { id } = await params;
    const data = await parseJson(req, z.object({ status: z.enum(["APPROVED", "REJECTED"]), decisionNote: z.string().max(1000).default("") }));
    const old = await db.approval.findFirst({ where: { id, project: { workspaceId: c.workspaceId } } });
    if (!old) throw new HttpError(404, "درخواست پیدا نشد.");
    if (old.status !== "PENDING") throw new HttpError(409, "این درخواست قبلاً بررسی شده است.");
    if (old.reviewerId && old.reviewerId !== c.userId && c.role !== "OWNER" && c.role !== "ADMIN") throw new HttpError(403, "این درخواست برای بررسی‌کننده دیگری است.");
    const approval = await db.approval.update({ where: { id }, data: { status: data.status, decisionNote: data.decisionNote, decidedAt: new Date(), reviewerId: c.userId } });
    await logActivity(c.workspaceId, c.userId, "DECIDE", "APPROVAL", id, `درخواست «${approval.title}» ${data.status === "APPROVED" ? "تأیید" : "رد"} شد`);
    if (old.requesterId !== c.userId) await db.notification.create({ data: { workspaceId: c.workspaceId, userId: old.requesterId, title: `درخواست شما ${data.status === "APPROVED" ? "تأیید" : "رد"} شد`, body: approval.title, href: "/dashboard/approvals" } });
    return NextResponse.json({ approval });
  } catch (err) { return asResponse(err); }
}
