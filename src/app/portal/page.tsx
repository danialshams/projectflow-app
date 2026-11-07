import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const statuses: Record<string, string> = {
  PLANNED: "برنامه‌ریزی", ACTIVE: "در حال انجام",
  ON_HOLD: "متوقف شده", COMPLETED: "تکمیل شده", ARCHIVED: "بایگانی",
  TODO: "برای انجام", IN_PROGRESS: "در حال انجام", REVIEW: "در حال بررسی", DONE: "تکمیل شده"
};
const formatDate = (value: Date | null) => value
  ? new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(value)
  : "تاریخ مشخص نشده";

export default async function ClientPortal() {
  const token = (await cookies()).get("projectflow_client")?.value;
  const valid = token && /^[0-9a-f]{64}$/.test(token);
  const session = valid ? await db.clientPortalSession.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    include: { client: {
      select: { name: true, company: true,
        workspace: { select: { name: true } },
        projects: {
          where: { status: { not: "ARCHIVED" } },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, status: true, dueAt: true,
            tasks: {
              orderBy: [{ position: "asc" }, { createdAt: "desc" }],
              select: { id: true, title: true, status: true, dueAt: true }
            }
          }
        }
      }
    } }
  }) : null;
  const client = session && !session.revokedAt && session.expiresAt > new Date() ? session.client : null;
  return <main dir="rtl" className="portal-shell">
    <meta name="referrer" content="no-referrer"/>
    <div className="portal-layout">
      <header className="portal-header">
        <div className="portal-identity"><span className="portal-mark">PF</span><span><strong>ProjectFlow</strong><small>پرتال اختصاصی مشتری</small></span></div>
        {client && <form action="/api/portal/logout" method="POST"><button type="submit" className="portal-secondary">خروج از پرتال</button></form>}
      </header>
      {!client ? <section className="portal-entry portal-blocked">
        <h1>دسترسی فعال نیست</h1>
        <p>برای مشاهده پروژه‌ها از لینک دعوت جدیدی که مدیر پروژه برای شما صادر می‌کند استفاده کنید. نشست قبلی ممکن است منقضی یا لغو شده باشد.</p>
        <Link className="portal-secondary" href="/login">ورود به پنل تیم</Link>
      </section> : <section className="portal-content">
        <div className="portal-hero"><div><span className="portal-eyebrow">خوش آمدید</span><h1>{client.company || client.name}</h1><p>وضعیت پروژه‌های شما در {client.workspace.name}</p></div><span className="portal-count">{client.projects.length.toLocaleString("fa-IR")} پروژه</span></div>
        {client.projects.length === 0 ? <div className="portal-empty">هنوز پروژه‌ای برای این مشتری ثبت نشده است.</div> :
          <div className="portal-project-grid">{client.projects.map(project => {
            const total = project.tasks.length;
            const done = project.tasks.filter(task => task.status === "DONE").length;
            const percent = total ? Math.round(done / total * 100) : 0;
            return <article key={project.id} className="portal-project">
              <div className="portal-project-top"><h2>{project.name}</h2><span className="portal-status">{statuses[project.status]}</span></div>
              <p className="portal-due">زمان تحویل: {formatDate(project.dueAt)}</p>
              <div className="portal-progress-label"><span>پیشرفت</span><strong>{percent.toLocaleString("fa-IR")}٪</strong></div>
              <div className="portal-progress"><span style={{ width: percent + "%" }}/></div>
              <h3>وظایف پروژه</h3>
              {total ? <ul className="portal-tasks">{project.tasks.map(task => <li key={task.id}>
                <span className={task.status === "DONE" ? "portal-done" : ""}>{task.title}</span>
                <small>{statuses[task.status]}{task.dueAt ? " · " + formatDate(task.dueAt) : ""}</small>
              </li>)}</ul> : <p className="portal-empty">هنوز وظیفه‌ای ثبت نشده است.</p>}
            </article>;
          })}</div>}
      </section>}
      <footer className="portal-footer">ProjectFlow · اطلاعات فقط برای مشاهده نمایش داده می‌شوند.</footer>
    </div>
  </main>;
}
