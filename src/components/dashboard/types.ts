export type ProjectStatus = "PLANNED" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export interface Workspace { id: string; name: string; slug: string }
export interface Project { id: string; name: string; key: string; description: string; color: string; status: ProjectStatus; budget: string; clientId: string | null; startAt: string | null; dueAt: string | null; createdAt: string }
export interface ChecklistItem { id: string; title: string; checked: boolean }
export interface Task { id: string; projectId: string; parentId: string | null; title: string; description: string; status: TaskStatus; priority: Priority; assigneeId: string | null; assignee: { name: string; avatarColor: string } | null; dueAt: string | null; startAt: string | null; estimatedMinutes: number; createdAt: string; checklists: ChecklistItem[]; dependencies: { dependsOnId: string }[]; _count: { comments: number; attachments: number } }
export interface Member { id: string; userId: string; role: string; user: { id: string; name: string; email: string; avatarColor: string } }
export interface Client { id: string; name: string; email: string | null; phone: string | null; company: string | null; notes: string | null; createdAt: string }
export interface ApprovalStep {id:string;sequence:number;kind:"TEAM"|"CLIENT";reviewerId:string|null;clientId:string|null;status:"PENDING"|"APPROVED"|"REJECTED";decisionNote:string;decidedAt:string|null}
export interface Approval { id: string; projectId: string; taskId: string | null; title: string; description: string; status: "PENDING" | "APPROVED" | "REJECTED"; requesterId: string; reviewerId: string | null; decisionNote: string; createdAt: string; steps: ApprovalStep[] }
export interface Entry { id: string; taskId: string; userId: string; minutes: number; note: string; createdAt: string; startedAt: string }
export interface Activity { id: string; action: string; summary: string; createdAt: string; actor: { name: string; avatarColor: string } }
export interface Notice { id: string; title: string; body: string; href: string; readAt: string | null; createdAt: string }
export interface Installment { id: string; title: string; amount: string; dueAt: string | null; paidAt: string | null }
export interface Contract { id: string; title: string; projectId: string; clientId: string; amount: string; installments: Installment[]; createdAt: string }
export interface Attachment { id: string; taskId: string; name: string; mime: string; size: number; createdAt: string }
export interface ProjectTemplate { id: string; name: string; description: string; color: string; createdAt: string; structure: unknown }
export interface DashboardData {
  templates: ProjectTemplate[]; availableWorkspaces: { workspaceId: string; role: string; workspace: { id: string; name: string } }[]; workspace: Workspace; currentUserId: string; role: string; projects: Project[]; tasks: Task[]; memberships: Member[]; clients: Client[]; approvals: Approval[]; entries: Entry[]; activities: Activity[]; notifications: Notice[]; contracts: Contract[]; attachments: Attachment[];
}
export const statuses: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "برای انجام", color: "#8a94a9" }, { id: "IN_PROGRESS", label: "در حال انجام", color: "#5379e3" }, { id: "REVIEW", label: "در انتظار بررسی", color: "#dd9f4b" }, { id: "DONE", label: "انجام‌شده", color: "#36ad8d" },
];
export const priorities: Record<Priority, { label: string; color: string }> = { LOW: { label: "کم", color: "#8a94a9" }, MEDIUM: { label: "متوسط", color: "#5985df" }, HIGH: { label: "زیاد", color: "#eb9a56" }, URGENT: { label: "فوری", color: "#e16470" } };
export const projectStatuses: Record<ProjectStatus, string> = { PLANNED: "برنامه‌ریزی", ACTIVE: "در حال انجام", ON_HOLD: "متوقف‌شده", COMPLETED: "تکمیل‌شده", ARCHIVED: "بایگانی" };
export const roleLabels: Record<string, string> = { OWNER: "مالک", ADMIN: "مدیر", MANAGER: "مدیر پروژه", MEMBER: "عضو", VIEWER: "مشاهده‌گر" };
export const fmt = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
export const money = (v: number | string) => fmt(Number(v) || 0) + " تومان";
export const faDate = (date?: string | Date | null) => date ? new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date)) : "بدون تاریخ";
export const shortDate = (date?: string | Date | null) => date ? new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(new Date(date)) : "—";
export const isOverdue = (date: string | null, done = false) => !!date && !done && new Date(date).getTime() < Date.now();
export const iso = (value: string) => value ? new Date(value + "T12:00:00").toISOString() : null;
export const isoInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";
