import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asResponse } from "@/lib/access";

// Public, read-only snapshot of ONE explicit demonstration workspace.
// Never use request cookies, user-provided workspace IDs or privileged sessions here.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const DEMO_SLUG = "projectflow-public-demo";

export async function GET() {
  try {
    const workspace = await db.workspace.findUnique({
      where: { slug: DEMO_SLUG }, select: { id: true, name: true, slug: true }
    });
    if (!workspace) return NextResponse.json({ error: "فضای نمایشی هنوز آماده نیست." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const wid = workspace.id;
    const owner = await db.membership.findFirst({ where: { workspaceId: wid, role: "OWNER" }, select: { userId: true } });
    if (!owner) return NextResponse.json({ error: "داده‌های نمایشی ناقص‌اند." }, { status: 503 });
    const [projects,tasks,memberships,clients,approvals,entries,activities,notifications,contracts,attachments,templates] = await Promise.all([
      db.project.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
      db.task.findMany({ where: { project: { workspaceId: wid } }, include: {
        checklists: { orderBy: { position: "asc" } },
        dependencies: { select: { dependsOnId: true } },
        _count: { select: { comments: true, attachments: true } },
        assignee: { select: { name: true, avatarColor: true } }
      }, orderBy: [{ position: "asc" }, { createdAt: "desc" }] }),
      db.membership.findMany({ where: { workspaceId: wid }, include: { user: {
        select: { id: true, name: true, email: true, avatarColor: true }
      } } }),
      db.client.findMany({ where: { workspaceId: wid }, orderBy: { createdAt: "desc" } }),
      db.approval.findMany({ where: { project: { workspaceId: wid } }, include: { steps: { orderBy: { sequence: "asc" } } }, orderBy: { createdAt: "desc" } }),
      db.timeEntry.findMany({ where: { task: { project: { workspaceId: wid } } }, orderBy: { createdAt: "desc" }, take: 250 }),
      db.activity.findMany({ where: { workspaceId: wid }, include: { actor: { select: { name: true, avatarColor: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
      db.notification.findMany({ where: { workspaceId: wid, userId: owner.userId }, orderBy: { createdAt: "desc" }, take: 30,
        select: { id: true, title: true, body: true, href: true, readAt: true, createdAt: true }
      }),
      db.contract.findMany({ where: { project: { workspaceId: wid } }, include: { installments: { orderBy: { dueAt: "asc" } } }, orderBy: { createdAt: "desc" } }),
      db.attachment.findMany({ where: { task: { project: { workspaceId: wid } } }, orderBy: { createdAt: "desc" }, take: 300,
        select: { id: true, taskId: true, name: true, mime: true, size: true, createdAt: true }
      }),
      db.projectTemplate.findMany({ where: { workspaceId: wid }, select: { id: true, name: true, description: true, color: true, createdAt: true, structure: true }, orderBy: { createdAt: "desc" } })
    ]);
    const availableWorkspaces = [{ workspaceId: wid, role: "VIEWER", workspace: { id: wid, name: workspace.name } }];
    return NextResponse.json({
      demoMode: true, workspace, currentUserId: owner.userId, role: "VIEWER",
      projects,tasks,memberships,clients,approvals,entries,activities,notifications,contracts,attachments,availableWorkspaces,templates
    }, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  } catch (err) { return asResponse(err); }
}