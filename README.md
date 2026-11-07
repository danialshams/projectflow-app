# ProjectFlow — سامانه مدیریت پروژه

یک سامانه مستقل و فارسی (RTL) با Next.js, TypeScript, Prisma و PostgreSQL؛ طراحی‌شده برای استقرار روی Vercel یا سرور Node/Docker بدون وابستگی به دیتابیس اختصاصی Vercel.

## راه‌اندازی روی سیستم شخصی

1. `cp .env.example .env` و تغییر رمز دیتابیس و `NEXTAUTH_SECRET`.
2. `docker compose up -d postgres`
3. `npm install`
4. `npm run db:migrate` برای اعمال مهاجرت‌های همراه مخزن (در محیط توسعه هم قابل استفاده است).
5. `ALLOW_DEMO_SEED=true npm run db:seed` برای دیتای نمونه محلی. حساب: `demo@projectflow.local` و گذرواژه را در خروجی `seed` تعیین/مشاهده کنید (تنظیم از `DEMO_PASSWORD`).
6. `npm run dev`

## استقرار

- پایگاه داده: PostgreSQL 16+ با URL استاندارد Prisma.
- تولید: `npm install && npm run db:migrate && npm run build && npm start`.
- Vercel: متغیرهای `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` را برای محیط production تعریف کنید. migration را در CI / release step جدا اجرا کنید.
- VPS: Dockerfile و محیط Node.js معمولی. فقط DNS و متغیرهای محیط تغییر می‌کنند.
- ذخیره‌سازی فایل: S3-compatible (مانند MinIO یا سرویس ایرانی)؛ در صورت تنظیم نکردن کلیدها، آپلود فایل غیرفعال است.

## امنیت

- تمام مسیرهای API با JWT session و عضویت در Workspace بررسی می‌شوند؛ role gating برای ویرایش.
- تأیید دسترسی هر Project/Task در سمت سرور؛ اعتبارسنجی ورودی‌ها با Zod؛ ثبت وقایع حساس.
- نام کاربری و رمز هش‌شده با bcrypt؛ درخواست‌های مهم با session cookie SameSite محافظت می‌شوند.
- دیتای نمونه صرفاً با `ALLOW_DEMO_SEED=true` وارد می‌شود. از seed روی دیتابیس کاربران واقعی استفاده نکنید.

## قابلیت‌های پیاده‌سازی‌شده در سورس فعلی

- حساب کاربری، احراز هویت و فضای کاری چندگانه با نقش‌های OWNER / ADMIN / MANAGER / MEMBER / VIEWER
- لینک دعوت اعضا با توکن هش‌شده، اعتبار ۷ روزه و کنترل تطابق ایمیل
- مدیریت پروژه، ویرایش/حذف، مشتری پروژه و بودجه
- وظایف، زیرکارها، چک‌لیست، وابستگی و جلوگیری از وابستگی چرخه‌ای، اولویت و مسئول
- برد کانبان، فهرست، تقویم شمسی، نمای زمانی گانت
- یادداشت‌ها و کامنت‌های وظایف، اعلان‌های پایگاه‌داده‌ای و لاگ فعالیت
- ثبت زمان، تأییدیه، مشتریان، قراردادها و اقساط
- آپلود اسناد به S3 سازگار (در صورت تنظیم متغیرهای لازم) با لینک امضاشده؛ گزارش CSV
- قالب پروژه و ایجاد پروژه جدید بر اساس ساختار وظایف قالب
- API سلامت سرویس در `/api/health`

## موارد تکمیل‌نشده در این مرحله

پورتال مشتری با ورود و سطح دسترسی اختصاصی، نسخه‌بندی کامل فایل‌ها، گردش تأیید چندمرحله‌ای، اتوماسیون صف‌محور، ارسال ایمیل/SMS دعوت‌نامه‌ها، اعلان زنده SSE/WebSocket، پرداخت آنلاین، تست‌های E2E و تست اتصال واقعی به PostgreSQL. صرف تعریف مدل داده به معنی آماده‌بودن همه این قابلیت‌ها نیست.

## وضعیت کنترل کیفیت

در محیط تهیه این خروجی به رجیستری npm و سرور PostgreSQL دسترسی وجود نداشت؛ بنابراین صحت Build، Migration و کارکرد زمان اجرا **هنوز تأیید نشده** و باید در CI یا سرور آزمایش شوند. بررسی ایستای نحو فایل‌های TS/TSX به‌تنهایی کافی نیست.

## انتشار در GitHub و Vercel

این بسته مستقل از CRM است و برای مخزن جداگانه طراحی شده است. بعد از ایجاد مخزن GitHub، فایل‌ها در ریشه مخزن قرار بگیرند. در Vercel، پروژه را به همان مخزن متصل کنید و `DATABASE_URL` مربوط به PostgreSQL در دسترس از اینترنت، `NEXTAUTH_SECRET` و `NEXTAUTH_URL` را تنظیم کنید. **در GitHub Actions ابتدا Migration و Build موفق بررسی شود؛ سپس شاخه main را منتشر کنید.**


## پرتال اختصاصی مشتری (Client Portal)
- مدیر از بخش «مشتریان» برای هر مشتری لینک دعوت یک‌بارمصرف با انقضای ۷ روز می‌سازد.
- دعوت صرفاً یک توکن تصادفی هش‌شده در PostgreSQL نگه می‌دارد؛ مصرف دعوت به‌صورت اتمیک انجام می‌شود.
- پس از مصرف، نشست ۱۴روزه در کوکی HttpOnly و SameSite=Strict ثبت می‌شود؛ امکان خروج و لغو همه دسترسی‌ها از پنل وجود دارد.
- مشتری فقط عنوان، وضعیت، پیشرفت، تاریخ و وظایف پروژه‌های مرتبط با Client خودش را می‌بیند؛ توضیحات داخلی، فایل‌ها، اعضای تیم، گزارش زمان و اطلاعات قرارداد نمایش داده نمی‌شود.
- ارسال خودکار ایمیل/SMS دعوت در این نسخه پیاده‌سازی نشده؛ مدیر لینک را دستی با مخاطب مورد نظر به اشتراک می‌گذارد.


## اعلان‌های به‌روزشونده
داشبورد هر ۲۰ ثانیه، فقط در زمان فعال بودن زبانه مرورگر، اعلان‌های همان کاربر و فضای کاری را دریافت می‌کند؛ بدون بارگذاری مجدد داده‌های سنگین پروژه‌ها. همچنین امکان «خواندن همه» وجود دارد. این شیوه Polling نزدیک‌به‌لحظه‌ای است و **SSE/WebSocket واقعی نیست**.


## Customer portal and notifications (completion stage)

- Workspace managers open **پرتال مشتری** in the sidebar, select a project with an assigned client and email, and create a single-use client invitation. The link allows access to all projects owned by that client. The invitation expires after seven days.
- Invited clients activate a one-time, seven-day link at `/portal/activate/{token}`. Their 14-day httpOnly session cookie is separate from staff/NextAuth accounts. The existing passwordless invitation model is retained. Portal data is scoped to the Client record for the invitation, and clients see only projects linked to that Client. Managers may revoke sessions.
- Requests for approval now accept ordered `reviewerIds` and an optional `includeClient` final step. Only the reviewer for the current step may approve it. Client review is available within the portal, and every decision is stored with a note and timestamp.
- Internal notifications use SSE (`/api/v1/notifications/stream`); the client reconnects automatically and uses a visibility-aware polling fallback. SSE connections expire after ~22 seconds to support serverless hosting. Do not assume this is a durable push notification system when the browser is closed.
- Idempotent due-date notifications are generated through `/api/cron/tick`. On Vercel Hobby the scheduled task runs **once daily** at 08:00 UTC. Managers may use the manual check in **اعلان‌ها و اتصال‌ها**. A 25-hour reminder window means it is not a precise per-minute alarm.
- Email/SMS requests enter `DeliveryJob`. Until an external gateway is configured, they remain in `WAITING_CONFIG` and are not discarded. Provider adapters use HTTPS JSON `POST {to, subject, message}` with `Authorization: Bearer <TOKEN>`; configure `EMAIL_GATEWAY_URL/TOKEN` or `SMS_GATEWAY_URL/TOKEN` when you purchase a provider. They can point to any custom bridge for domestic providers. Set the gateway URL only to a trusted service. Failures retry with bounded backoff and are auditable.
- S3 storage remains optional and uses portable S3-compatible credentials.

### Required deployment variables

`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` must be set for production. For automated reminders also set `CRON_SECRET` to a random high-entropy string (minimum 24 characters). Do not expose secrets as `NEXT_PUBLIC_*`. The Vercel cron attaches `Authorization: Bearer <CRON_SECRET>` automatically. When migrating to a dedicated host, invoke `/api/cron/tick` with this header once daily from the host scheduler.

### Verification

Run `npm run db:migrate`, `npm run db:generate`, `npm run typecheck`, `npm run build`. On a disposable database, `INTEGRATION_TESTS=true npm run test:integration` covers grant isolation, serialized approval stages, reminder deduplication and queued provider behavior. Never run integration tests against production data.


## Public read-only demo (temporary)
The homepage, `/login`, and `/register` now lead to `/dashboard` for visitors without accounts. The unauthenticated dashboard only uses `GET /api/public/demo`, a hard-scoped read-only projection of the `projectflow-public-demo` workspace. Admin APIs still require normal authentication and enforce workspace membership. Public visitors cannot mutate data, upload files, create invitations, or execute automation jobs. Sample accounts use `.invalid` addresses and disabled, non-bcrypt password hashes. **Never store genuine customer information in this public demo workspace.** To restore sign-in, revert the temporary redirects in the home/login/register pages and the guest branch in the dashboard page. The normal private login backend remains intact.

The scheduled reminder worker explicitly excludes `projectflow-public-demo` so fake recipients are never enqueued for real SMS/email providers. CI includes a demo-smoke test for read-only access, isolation from a second workspace and protected private API writes.
