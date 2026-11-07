"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowLeft, Eye, EyeOff, FolderKanban, LockKeyhole, Mail, UserRound, ArrowUpLeft } from "lucide-react";
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [workspaceName, setWorkspaceName] = useState(""); const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [queryString, setQueryString] = useState("");
  useEffect(() => { setQueryString(window.location.search); }, []);
  const register = mode === "register";
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (register) {
        const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, workspaceName }) });
        const payload = await r.json(); if (!r.ok) throw new Error(payload.error || "خطای ثبت‌نام");
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("ایمیل یا رمز عبور نادرست است.");
      const callback = new URLSearchParams(window.location.search).get("callbackUrl");
      window.location.assign(callback?.startsWith("/invite/") ? callback : "/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "خطایی رخ داد."); setBusy(false); }
  }
  return <div className="auth-page"><div className="auth-visual">
    <div className="auth-brand"><div className="brand-mark"><FolderKanban size={23}/></div><span>ProjectFlow</span></div>
    <div className="auth-visual-content"><div className="auth-visual-badge"><span className="pulse-dot"/> مدیریت مدرن پروژه‌ها</div><h1>از ایده تا اجرا،<br/><em>همه‌چیز در یک جریان.</em></h1><p>برنامه‌ریزی، همکاری تیمی و پیگیری پیشرفت؛ یک فضای منظم برای تمام کارهای شما.</p><div className="auth-demo-board"><div className="demo-board-top"><span>پروژه طراحی وب‌سایت</span><span className="mini-live">فعال</span></div><div className="demo-board-line"/><div className="demo-board-card"><span className="mini-dot blue"/> طراحی رابط کاربری <span className="demo-tag">در حال انجام</span></div><div className="demo-board-card"><span className="mini-dot green"/> توسعه پنل مدیریت <span className="demo-tag">انجام‌شده</span></div><div className="demo-board-card"><span className="mini-dot yellow"/> تست نهایی محصول <span className="demo-tag">در انتظار</span></div></div></div>
    <div className="auth-visual-bottom">ساخته‌شده برای تیم‌های دقیق و خلاق <ArrowUpLeft size={16}/></div>
  </div><main className="auth-form-side"><div className="mobile-auth-brand"><span className="brand-mark"><FolderKanban size={21}/></span> ProjectFlow</div><div className="auth-form-wrap"><div className="tiny-label">{register ? "شروع مسیر شما" : "خوش آمدید"}</div><h2>{register ? "فضای کاری‌ات را بساز" : "ورود به حساب کاربری"}</h2><p className="auth-sub">{register ? "در چند قدم ساده، مدیریت پروژه‌ها را شروع کن." : "برای ادامه، اطلاعات حساب خود را وارد کن."}</p><form onSubmit={submit} className="auth-form">
    {register && <><label>نام و نام خانوادگی<div className="input-icon"><UserRound size={18}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="نام شما" required minLength={2}/></div></label><label>نام تیم یا مجموعه<div className="input-icon"><FolderKanban size={18}/><input value={workspaceName} onChange={e=>setWorkspaceName(e.target.value)} placeholder="مثلاً استودیو من" required minLength={2}/></div></label></>}
    <label>آدرس ایمیل<div className="input-icon"><Mail size={18}/><input type="email" dir="ltr" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" required autoComplete="email"/></div></label>
    <label>رمز عبور<div className="input-icon"><LockKeyhole size={18}/><input type={visible?"text":"password"} dir="ltr" value={password} onChange={e=>setPassword(e.target.value)} placeholder={register?"حداقل ۱۰ کاراکتر":"رمز عبور"} minLength={register?10:1} required autoComplete={register?"new-password":"current-password"}/><button aria-label="نمایش رمز" type="button" onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
    {error && <div className="form-error" role="alert">{error}</div>}<button className="auth-submit" type="submit" disabled={busy}>{busy ? "در حال پردازش..." : register?"ساخت فضای کاری":"ورود به پنل"}<ArrowLeft size={19}/></button></form><p className="auth-switch">{register?"حساب کاربری دارید؟":"هنوز عضو نشده‌اید؟"} <Link href={(register?"/login":"/register") + queryString}>{register?"وارد شوید":"ساخت حساب جدید"}</Link></p></div><p className="auth-form-foot">© {new Date().getFullYear()} ProjectFlow · مدیریت یکپارچه کارها</p></main></div>;
}
