import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asResponse, context } from "@/lib/access";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const c = await context();
    const [workspace, projects, tasks, memberships, clients, approvals, entries, activities, notifications, contracts, attachments, availableWorkspaces, templates] = await Promise.all([
      db.workspace.findUnique({ where: { id: c.workspaceId }, select: { id: true, name: true, slug: true } }),
      db.project.findMany({ where: { workspaceId: c.workspaceId }, orderBy: { createdAt: "desc" } }),
      db.task.findMany({ where: { project: { workspaceId: c.workspaceId } }, include: { checklists: { orderBy: { position: "asc" } }, dependencies: { select: { dependsOnId: true } }, _count: { select: { comments: true, attachments: true } }, assignee: { select: { name: true, avatarColor: true } } }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] }),
      db.membership.findMany({ where: { workspaceId: c.workspaceId }, include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } }),
      db.client.findMany({ where: { workspaceId: c.workspaceId }, orderBy: { createdAt: "desc" } }),
      db.approval.findMany({ where: { project: { workspaceId: c.workspaceId } }, orderBy: { createdAt: "desc" } }),
      db.timeEntry.findMany({ where: { task: { project: { workspaceId: c.workspaceId } } }, orderBy: { createdAt: "desc" }, take: 250 }),
      db.activity.findMany({ where: { workspaceId: c.workspaceId }, include: { actor: { select: { name: true, avatarColor: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
      db.notification.findMany({ where: { workspaceId: c.workspaceId, userId: c.userId }, orderBy: { createdAt: "desc" }, take: 30 }),
      db.contract.findMany({ where: { project: { workspaceId: c.workspaceId } }, include: { installments: { orderBy: { dueAt: "asc" } } }, orderBy: { createdAt: "desc" } }),
      db.attachment.findMany({ where: { task: { project: { workspaceId: c.workspaceId } } }, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, taskId: true, name: true, mime: true, size: true, createdAt: true } }),
      db.membership.findMany({ where: { userId: c.userId }, select: { workspaceId: true, role: true, workspace: { select: { id: true, name: true } } } }),
      db.projectTemplate.findMany({ where: { workspaceId: c.workspaceId }, select: { id: true, name: true, description: true, color: true, createdAt: true, structure: true }, orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ workspace, currentUserId: c.userId, role: c.role, projects, tasks, memberships, clients, approvals, entries, activities, notifications, contracts, attachments, availableWorkspaces, templates });
  } catch (err) { return asResponse(err); }
}
