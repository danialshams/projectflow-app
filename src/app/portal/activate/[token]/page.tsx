import Link from "next/link";

type Props = { params: Promise<{ token: string }> };
export default async function ActivatePortal({ params }: Props) {
  const { token } = await params;
  const valid = /^[0-9a-f]{64}$/.test(token);
  return <main dir="rtl" className="portal-shell">
    <meta name="referrer" content="no-referrer"/>
    <section className="portal-entry">
      <span className="portal-mark">PF</span>
      <h1>ورود به پرتال مشتری</h1>
      <p>با ورود، وضعیت پروژه‌های مربوط به مجموعه خود را مشاهده می‌کنید. این لینک یک‌بار مصرف است و پس از ۷ روز منقضی می‌شود.</p>
      {valid ? <form action="/api/portal/activate" method="POST">
        <input type="hidden" name="token" value={token}/>
        <button className="portal-primary" type="submit">ورود امن به پرتال</button>
      </form> : <p className="portal-error">لینک معتبر نیست.</p>}
      <Link href="/login" className="portal-secondary">بازگشت به سامانه مدیریت پروژه</Link>
    </section>
  </main>;
}
