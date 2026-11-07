import { db } from "@/lib/db";
import { HttpError } from "@/lib/access";
import type { ApprovalStatus } from "@prisma/client";

export async function decideApproval(approvalId: string, actor: { type: "TEAM"; userId: string } | { type: "CLIENT"; clientId: string }, status: Extract<ApprovalStatus,"APPROVED"|"REJECTED">, note: string) {
  return db.$transaction(async tx => {
    const approval = await tx.approval.findUnique({ where: { id: approvalId }, include: { steps: { orderBy: { sequence: "asc" } }, project: { select: { workspaceId: true } } } });
    if (!approval) throw new HttpError(404, "درخواست پیدا نشد.");
    if (approval.status !== "PENDING") throw new HttpError(409, "این درخواست قبلاً تعیین تکلیف شده است.");
    const current = approval.steps.find(s=>s.status === "PENDING");
    if (!current) throw new HttpError(409, "مرحله فعال وجود ندارد.");
    if (actor.type === "TEAM" ? current.kind !== "TEAM" || (current.reviewerId !== null && current.reviewerId !== actor.userId) : current.kind !== "CLIENT" || current.clientId !== actor.clientId) throw new HttpError(403, "این مرحله به شما واگذار نشده است.");
    const updated = await tx.approvalStep.updateMany({ where: { id: current.id, status: "PENDING" }, data: { status, decisionNote: note, decidedAt: new Date(), ...(actor.type === "CLIENT" ? { decidedByClientId: actor.clientId } : {}) } });
    if (!updated.count) throw new HttpError(409, "این مرحله هم‌زمان توسط شخص دیگری بررسی شده است.");
    const remaining = approval.steps.some(s=>s.sequence > current.sequence && s.status === "PENDING");
    const finished = status === "REJECTED" || !remaining;
    if (finished) {
      const done = await tx.approval.updateMany({ where: { id: approval.id, status: "PENDING" }, data: { status, decisionNote: note, decidedAt: new Date(), reviewerId: actor.type === "TEAM" ? actor.userId : approval.reviewerId } });
      if (done.count !== 1) throw new HttpError(409, "نتیجه درخواست هم‌زمان تغییر کرده است.");
      if (approval.requesterId !== (actor.type === "TEAM" ? actor.userId : "")) await tx.notification.create({ data: { workspaceId: approval.project.workspaceId, userId: approval.requesterId, title: status === "REJECTED" ? "درخواست شما رد شد" : "درخواست شما تأیید شد", body: approval.title, href: "/dashboard/approvals" } });
    } else {
      const next = approval.steps.find(s=>s.sequence > current.sequence && s.status === "PENDING");
      if (next?.kind === "TEAM" && next.reviewerId) await tx.notification.create({ data: { workspaceId: approval.project.workspaceId, userId: next.reviewerId, title: "نوبت بررسی تأییدیه", body: approval.title, href: "/dashboard/approvals" } });
      // A client step is visible in the client portal; no external provider is required.
    }
    return { finished, nextSequence: finished ? null : current.sequence + 1, status: finished ? status : "PENDING" };
  }, { isolationLevel: "Serializable" });
}
