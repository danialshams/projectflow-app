"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Activity, ArrowLeft, BarChart3, Bell, CalendarDays, CheckCircle2, ChevronDown, CircleHelp, Clock3, ContactRound, FileStack, FolderKanban, GanttChartSquare, LayoutDashboard, LayoutGrid, ListTodo, LogOut, Menu, Plus, Search, Settings2, ShieldCheck, UsersRound, Wallet, X, Zap } from "lucide-react";
import { DashboardData, Task, fmt, faDate } from "./types";
import { Overview, ProjectsView, TasksView, CalendarView, TimelineView, TeamView, TimeView, ApprovalsView, ClientsView, FinanceView, ReportsView, FilesView, SettingsView, TemplatesView } from "./Views";
import { CreateModal, DetailModal } from "./Modals";

export type ViewName = "overview" | "projects" | "tasks" | "board" | "calendar" | "timeline" | "team" | "time" | "approvals" | "files" | "clients" | "finance" | "reports" | "settings" | "templates";
const navSections = [
  { title: "محیط کار", links: [ { id: "overview", label: "نمای کلی", icon: LayoutDashboard }, { id: "projects", label: "پروژه‌ها", icon: FolderKanban }, { id: "tasks", label: "وظایف", icon: ListTodo } ] },
  { title: "برنامه‌ریزی", links: [ { id: "board", label: "برد کانبان", icon: LayoutGrid }, { id: "calendar", label: "تقویم", icon: CalendarDays }, { id: "timeline", label: "نمودار گانت", icon: GanttChartSquare }, { id: "templates", label: "قالب‌های پروژه", icon: FileStack } ] },
  { title: "همکاری و تیم", links: [ { id: "team", label: "اعضای تیم", icon: UsersRound }, { id: "time", label: "ثبت زمان", icon: Clock3 }, { id: "approvals", label: "تأییدیه‌ها", icon: ShieldCheck }, { id: "files", label: "فایل‌ها", icon: FileStack } ] },
  { title: "کسب‌وکار", links: [ { id: "clients", label: "مشتریان", icon: ContactRound }, { id: "finance", label: "امور مالی", icon: Wallet }, { id: "reports", label: "گزارش‌ها", icon: BarChart3 } ] },
] as const;
const headings: Record<ViewName, [string, string]> = {
  templates: ["قالب‌های پروژه", "ساخت سریع پروژه‌ها بر اساس ساختارهای آماده"], overview: ["نمای کلی", "تصویری روشن از عملکرد تیم و پروژه‌ها"], projects: ["پروژه‌ها", "تمام پروژه‌ها را در یک نگاه مدیریت کنید"], tasks: ["وظایف", "برنامه‌ریزی و پیگیری ریزترین کارها"], board: ["برد کانبان", "جریان انجام کارها، ساده و شفاف"], calendar: ["تقویم وظایف", "مهلت‌ها و برنامه‌های پیش رو"], timeline: ["نمودار گانت", "زمان‌بندی و پیشرفت پروژه‌ها"], team: ["اعضای تیم", "افراد و نقش‌های فضای کاری"], time: ["ثبت زمان", "مدیریت زمان صرف‌شده برای وظایف"], approvals: ["تأییدیه‌ها", "تصمیم‌ها و درخواست‌های نیازمند بررسی"], files: ["فایل‌ها", "اسناد و فایل‌های مرتبط با وظایف"], clients: ["مشتریان", "اطلاعات و پروژه‌های مشتریان"], finance: ["امور مالی", "بودجه پروژه‌ها، قراردادها و اقساط"], reports: ["گزارش‌ها", "شاخص‌های عملکرد و بهره‌وری تیم"], settings: ["تنظیمات", "مشخصات فضای کاری و حساب شما"],
};
export type ModalKind = "project" | "editProject" | "task" | "client" | "approval" | "time" | "team" | "contract" | "installment" | null;
export type ActionProps = { data: DashboardData; action: (method: string, path: string, body?: unknown) => Promise<unknown>; open: (name: ModalKind, context?: string) => void; selectTask: (task: Task) => void; projectFilter: string; setProjectFilter: (id: string) => void };
export default function Dashboard({ userName }: { userName: string }) {
  const router = useRouter(); const pathname = usePathname();
  const view = (pathname.split("/")[2] || "overview") as ViewName;
  const active: ViewName = headings[view] ? view : "overview";
  const [data, setData] = useState<DashboardData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); const [workspacesOpen,setWorkspacesOpen]=useState(false); const [noticesOpen, setNoticesOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState(""); const [toast, setToast] = useState(""); const [modal, setModal] = useState<ModalKind>(null); const [modalContext, setModalContext] = useState(""); const [selectedTask, setSelectedTask] = useState<Task | null>(null); const [projectFilter, setProjectFilter] = useState("all");
  const refresh = useCallback(async () => {
    try { const r = await fetch("/api/v1/bootstrap", { cache: "no-store" }); if (r.status === 401) { window.location.assign("/login"); return; } const obj = await r.json(); if (!r.ok) throw new Error(obj.error || "دریافت داده‌ها انجام نشد."); setData(obj as DashboardData); setError(""); }
    catch(e) { setError(e instanceof Error ? e.message : "خطا در دریافت داده‌ها"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timeout); }, [toast]);
  const action = useCallback(async (method: string, path: string, body?: unknown) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/v1${path}`, { method, headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error || "عملیات ناموفق بود.");
      await refresh(); setToast("تغییرات با موفقیت ذخیره شد."); return result;
    } catch (e) { const msg = e instanceof Error ? e.message : "خطا"; setToast(msg); throw e; }
    finally { setBusy(false); }
  }, [refresh]);
  const open = (name: ModalKind, context = "") => { setModal(name); setModalContext(context); };
  const navigate = (id: string) => { setMenuOpen(false); router.push(id === "overview" ? "/dashboard" : `/dashboard/${id}`); };
  const results = useMemo(() => data && query.trim() ? data.tasks.filter(t => (t.title+" "+t.description).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 7) : [], [data, query]);
  const unread = data?.notifications.filter(n => !n.readAt).length ?? 0;
  const props: ActionProps | null = data ? { data, action, open, selectTask: setSelectedTask, projectFilter, setProjectFilter } : null;
  return <div className="app-shell">
    {menuOpen && <button className="mobile-overlay" onClick={() => setMenuOpen(false)} aria-label="بستن منو" />}
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="sidebar-brand"><span className="brand-mark"><FolderKanban size={23}/></span><div><strong>ProjectFlow</strong><small>فضای مدیریت تیم</small></div><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="بستن"><X size={20}/></button></div>
      <div className="workspace-wrap"><button className="workspace-picker" onClick={()=>setWorkspacesOpen(v=>!v)}><div className="workspace-icon">{data?.workspace.name?.charAt(0) || "پ"}</div><div className="workspace-label"><strong>{data?.workspace.name || "فضای کاری"}</strong><small>{fmt(data?.availableWorkspaces?.length||1)} فضای کاری</small></div><ChevronDown size={15}/></button>{workspacesOpen&&<div className="workspace-options">{data?.availableWorkspaces.map(w=><button key={w.workspaceId} className={data.workspace.id===w.workspaceId?"active":""} onClick={async()=>{try{const r=await fetch("/api/v1/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({workspaceId:w.workspaceId})});if(r.ok){setWorkspacesOpen(false);setProjectFilter("all");await refresh()}else setToast("امکان تغییر فضای کاری وجود ندارد.")}catch{setToast("خطا در تغییر فضای کاری")}}}><span>{w.workspace.name}</span>{data.workspace.id===w.workspaceId&&<CheckCircle2 size={15}/>}</button>)}</div>}</div>
      <div className="sidebar-scroll">{navSections.map(section => <div className="nav-group" key={section.title}><div className="nav-heading">{section.title}</div>{section.links.map(link => <button type="button" key={link.id} onClick={() => navigate(link.id)} className={`nav-link ${active===link.id?"active":""}`}><link.icon size={19} strokeWidth={1.85}/><span>{link.label}</span>{link.id === "approvals" && data && data.approvals.filter(a=>a.status==="PENDING").length>0 && <span className="nav-count">{fmt(data.approvals.filter(a=>a.status==="PENDING").length)}</span>}</button>)}</div>)}</div>
      <div className="sidebar-bottom"><button className={`nav-link ${active==="settings"?"active":""}`} onClick={() => navigate("settings")}><Settings2 size={19}/> تنظیمات</button><button className="nav-link" onClick={()=>signOut({callbackUrl:"/login"})}><LogOut size={19}/> خروج از حساب</button><div className="sidebar-help"><div className="help-icon"><CircleHelp size={20}/></div><div><strong>همه‌چیز تحت کنترل</strong><small>از برنامه‌ریزی تا تحویل نهایی</small></div></div></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="topbar-start"><button className="icon-btn mobile-menu" aria-label="نمایش منو" onClick={()=>setMenuOpen(true)}><Menu size={22}/></button><div className="breadcrumb"><span>{data?.workspace.name || "فضای کاری"}</span><span className="breadcrumb-sep">/</span><strong>{headings[active][0]}</strong></div></div><div className="topbar-end"><button className="top-search" onClick={()=>setSearchOpen(true)}><Search size={18}/><span>جستجو در وظایف...</span><kbd>⌘ K</kbd></button><div className="pop-anchor"><button className="icon-btn bell-btn" aria-label="اعلان‌ها" onClick={()=>setNoticesOpen(v=>!v)}><Bell size={20}/>{unread>0 && <i/>}</button>{noticesOpen && <div className="notice-popover"><div className="pop-head"><strong>اعلان‌ها</strong><span>{fmt(unread)} خوانده‌نشده</span></div><div className="notice-list">{data?.notifications.length?data.notifications.map(n=><button key={n.id} className={`notice-item ${!n.readAt?"new":""}`} onClick={async()=>{await action("PATCH",`/notifications/${n.id}`);setNoticesOpen(false); router.push(n.href)}}><span className="notice-icon"><Bell size={15}/></span><span><strong>{n.title}</strong><small>{n.body}</small><small>{faDate(n.createdAt)}</small></span></button>):<div className="empty-small">اعلان جدیدی ندارید.</div>}</div></div>}</div><div className="topbar-divider"/><div className="profile-top"><span className="avatar" style={{background:"#dce6ff",color:"#345cc0"}}>{userName.slice(0,1)}</span><div><strong>{userName}</strong><small>{data?.role === "OWNER" ? "مالک فضا" : "عضو تیم"}</small></div></div></div></header>
      <div className="main-scroll"><div className="content-container"><div className="page-heading"><div><div className="eyebrow"><span className="pulse-dot"/> محیط کاری شما <span className="heading-dash">/</span> {new Intl.DateTimeFormat("fa-IR", { weekday:"long", day:"numeric", month:"long" }).format(new Date())}</div><h1>{headings[active][0]}</h1><p>{headings[active][1]}</p></div><div className="heading-action">{["overview","projects"].includes(active) ? <button className="btn btn-primary" onClick={()=>open("project")}>پروژه جدید <Plus size={18}/></button> : ["tasks","board","calendar","timeline"].includes(active) ? <button className="btn btn-primary" onClick={()=>open("task")}>وظیفه جدید <Plus size={18}/></button> : active==="team"?<button className="btn btn-primary" onClick={()=>open("team")}>افزودن عضو <Plus size={18}/></button> : active==="approvals"?<button className="btn btn-primary" onClick={()=>open("approval")}>درخواست تأیید <Plus size={18}/></button> : active==="time"?<button className="btn btn-primary" onClick={()=>open("time")}>ثبت زمان <Plus size={18}/></button> : active==="clients"?<button className="btn btn-primary" onClick={()=>open("client")}>مشتری جدید <Plus size={18}/></button> : active==="finance"?<button className="btn btn-primary" onClick={()=>open("contract")}>قرارداد جدید <Plus size={18}/></button>:null}</div></div>
      {error && <div className="alert-error"><Activity size={18}/><span>{error}</span><button onClick={()=>{setLoading(true);void refresh()}}>تلاش مجدد <ArrowLeft size={16}/></button></div>}
      {loading && !data ? <div className="loading-skeleton"><div/><div/><div/><div/></div> : props ? <>
        {active === "overview" && <Overview {...props} navigate={navigate}/>}
        {active === "projects" && <ProjectsView {...props}/>}
        {(active === "tasks" || active === "board") && <TasksView {...props} mode={active} />}
        {active === "calendar" && <CalendarView {...props}/>}
        {active === "timeline" && <TimelineView {...props}/>}
        {active === "team" && <TeamView {...props}/>}
        {active === "time" && <TimeView {...props}/>}
        {active === "approvals" && <ApprovalsView {...props}/>}
        {active === "files" && <FilesView {...props}/>}
        {active === "clients" && <ClientsView {...props}/>}
        {active === "finance" && <FinanceView {...props}/>}
        {active === "reports" && <ReportsView {...props}/>}
        {active === "templates" && <TemplatesView {...props} navigate={navigate}/>}
        {active === "settings" && <SettingsView {...props} userName={userName}/>}
      </> : null}
      <footer className="app-footer">ProjectFlow <span>·</span> مدیریت یکپارچه پروژه‌ها</footer></div></div>
    </div>
    {searchOpen && <div className="search-backdrop" onClick={()=>setSearchOpen(false)}><div className="search-modal" onClick={e=>e.stopPropagation()}><div className="search-input-row"><Search size={21}/><input autoFocus placeholder="نام یا توضیحات وظیفه را جستجو کنید..." value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={()=>setSearchOpen(false)}><X size={19}/></button></div><div className="search-results">{results.length ? results.map(t=><button key={t.id} onClick={()=>{setSelectedTask(t); setSearchOpen(false)}}><ListTodo size={18}/><span>{t.title}<small>{data?.projects.find(p=>p.id===t.projectId)?.name}</small></span><ArrowLeft size={17}/></button>) : <div className="empty-small">{query?"موردی پیدا نشد.":"برای جستجوی وظایف شروع به تایپ کنید."}</div>}</div></div></div>}
    {modal && data && <CreateModal kind={modal} context={modalContext} data={data} close={()=>setModal(null)} action={action} busy={busy}/>}
    {selectedTask && data && <DetailModal key={selectedTask.id} task={data.tasks.find(t=>t.id===selectedTask.id)||selectedTask} data={data} close={()=>setSelectedTask(null)} action={action} open={open}/>}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast("")}><X size={16}/></button></div>}
  </div>;
}
