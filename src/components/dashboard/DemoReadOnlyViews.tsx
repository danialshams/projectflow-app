"use client";
import { CalendarDays, CheckCircle2, Clock3, FileStack, ShieldCheck, UsersRound, X } from "lucide-react";
import type { DashboardData, Task } from "./types";
import { faDate, money, priorities, projectStatuses, statuses } from "./types";

export function DemoTaskDetail({task,data,close}:{task:Task;data:DashboardData;close:()=>void}){
  const project=data.projects.find(x=>x.id===task.projectId);
  const state=statuses.find(x=>x.id===task.status)?.label||task.status;
  return <div className="demo-dialog-overlay" onClick={close}>
    <section className="demo-dialog" role="dialog" aria-modal="true" aria-label="جزئیات وظیفه" onClick={e=>e.stopPropagation()}>
      <div className="demo-dialog-head"><span>جزئیات وظیفه · نمایش فقط‌خواندنی</span><button onClick={close} aria-label="بستن"><X size={20}/></button></div>
      <h2>{task.title}</h2><p className="demo-task-description">{task.description||"توضیحی ثبت نشده است."}</p>
      <div className="demo-task-facts"><div><span>پروژه</span><b>{project?.name||"—"}</b></div><div><span>وضعیت</span><b>{state}</b></div>
        <div><span>اولویت</span><b>{priorities[task.priority].label}</b></div><div><span>مسئول</span><b>{task.assignee?.name||"تخصیص نیافته"}</b></div>
        <div><span>شروع</span><b>{faDate(task.startAt)}</b></div><div><span>موعد</span><b>{faDate(task.dueAt)}</b></div>
      </div>
      {!!task.checklists.length&&<div className="demo-checklist"><h3>چک‌لیست</h3>{task.checklists.map(x=><div key={x.id}><CheckCircle2 size={16} color={x.checked?"#36ad8d":"#a2adc0"}/>{x.title}</div>)}</div>}
      <p className="demo-dialog-note">این نسخه فقط برای آشنایی با امکانات است. هیچ تغییری در داده‌های نمونه ذخیره نمی‌شود.</p>
    </section>
  </div>;
}
export function DemoPortalView({data}:{data:DashboardData}){
  return <div className="advanced-stack"><section className="panel portal-pad"><div className="panel-header"><div><h2>نمایش پرتال مشتری</h2><p>پرتال واقعی با دعوت و دسترسی محدود کار می‌کند؛ در نسخه عمومی فقط اطلاعات ساختگی نمایش داده می‌شود.</p></div><UsersRound size={22}/></div>
    <div className="demo-portal-grid">{data.clients.map(c=><article className="demo-portal-item" key={c.id}><strong>{c.company||c.name}</strong><small>{c.name} · حساب نمونه</small><div>{data.projects.filter(p=>p.clientId===c.id).map(p=><div key={p.id}><span>{p.name}</span><em>{projectStatuses[p.status]}</em></div>)}</div></article>)}</div>
  </section><section className="panel portal-pad"><h3><ShieldCheck size={18}/> امنیت پرتال</h3><p className="portal-muted">در محصول اصلی، مشتری فقط پروژه‌های مجاز خود را می‌بیند و برای ثبت نظر یا تأیید باید با دعوت اختصاصی وارد شود. دسترسی عمومی به اطلاعات واقعی مشتریان وجود ندارد.</p></section></div>;
}
export function DemoAutomationView({data}:{data:DashboardData}){
  const items=[{title:"اعلان‌های داخل پنل",subtitle:`${data.notifications.length.toLocaleString("fa-IR")} اعلان آزمایشی`,icon:CheckCircle2},{title:"یادآوری زمان تحویل",subtitle:"زمان‌بندی و جلوگیری از ارسال تکراری",icon:Clock3},{title:"ارسال پیامک و ایمیل",subtitle:"زیرساخت آماده؛ سرویس پولی هنوز متصل نشده",icon:ShieldCheck},{title:"فایل و فضای ذخیره‌سازی",subtitle:"آماده اتصال به سرویس سازگار با S3",icon:FileStack}];
  return <div className="advanced-stack"><section className="panel portal-pad"><h2>اعلان‌ها و سرویس‌های آینده</h2><p className="portal-muted">در حالت عمومی عملیات ارسال یا اجرای زمان‌بندی‌شده انجام نمی‌شود.</p><div className="demo-portal-grid">{items.map(v=><div className="demo-service" key={v.title}><v.icon size={21}/><strong>{v.title}</strong><small>{v.subtitle}</small></div>)}</div></section></div>;
}