import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getClientProjects } from "@/lib/portal-data";
import PortalClient from "@/components/PortalClient";
export const dynamic = "force-dynamic";
export const metadata = { title: "پرتال مشتری | ProjectFlow", robots: { index: false, follow: false } };
export default async function PortalPage() {
  const token = (await cookies()).get("projectflow_client")?.value;
  const session = token && /^[a-f0-9]{64}$/.test(token)
    ? await db.clientPortalSession.findUnique({
        where: { tokenHash: createHash("sha256").update(token).digest("hex") },
        include: { client: { select: { id: true, name: true, email: true } } },
      })
    : null;
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    return <main dir="rtl" className="portal-login"><div className="panel portal-auth-card"><h1>دسترسی فعال نیست</h1><p>برای مشاهده پروژه‌ها از لینک دعوت اختصاصی و یک‌بارمصرفی که مدیر پروژه صادر می‌کند وارد شوید. ممکن است نشست قبلی شما منقضی یا لغو شده باشد.</p><a className="btn btn-secondary" href="/login">ورود به پنل تیم</a></div></main>;
  }
  const user = session.client;
  const projects = await getClientProjects(user.id);
  const payload = {
    account: { id: user.id, name: user.name, email: user.email || "" },
    projects: projects.map(project => ({
      ...project,
      tasks: project.tasks.map(task => ({ ...task, dueAt: task.dueAt?.toISOString() || null })),
      approvals: project.approvals.map(approval => ({ ...approval, createdAt: approval.createdAt.toISOString() })),
      portalComments: project.portalComments.map(comment => ({
        id: comment.id, body: comment.body, createdAt: comment.createdAt.toISOString(),
        account: { name: comment.client.name },
      })),
    })),
  };
  return <PortalClient initialData={payload}/>;
}
