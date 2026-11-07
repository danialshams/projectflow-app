/** Local-only sample data. Never run against a user database. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const randomDate = (offset: number) => new Date(Date.now() + offset * 86400000);
async function main() {
  if (process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Seed disabled. Set ALLOW_DEMO_SEED=true explicitly for a disposable development database.");
  if (!process.env.DATABASE_URL || !/localhost|127\.0\.0\.1|postgres:5432/.test(process.env.DATABASE_URL)) throw new Error("Refusing to seed non-local database.");
  const password = process.env.DEMO_PASSWORD || "Demo123456!";
  const hash = await bcrypt.hash(password, 12);
  const owner = await db.user.upsert({ where: { email: "demo@projectflow.local" }, update: {}, create: { name: "مدیر استودیو", email: "demo@projectflow.local", passwordHash: hash, avatarColor: "#5279e0" } });
  const designer = await db.user.upsert({ where: { email: "designer@projectflow.local" }, update: {}, create: { name: "سارا احمدی", email: "designer@projectflow.local", passwordHash: hash, avatarColor: "#b078cc" } });
  const developer = await db.user.upsert({ where: { email: "developer@projectflow.local" }, update: {}, create: { name: "امیر رضایی", email: "developer@projectflow.local", passwordHash: hash, avatarColor: "#38a995" } });
  const existing = await db.workspace.findUnique({ where: { slug: "projectflow-demo" } });
  if (existing) { console.log("Demo workspace already exists. No changes made."); return; }
  const workspace = await db.workspace.create({ data: { name: "استودیو پیکسل", slug: "projectflow-demo", ownerId: owner.id, memberships: { create: [ { userId: owner.id, role: "OWNER" }, { userId: designer.id, role: "MANAGER" }, { userId: developer.id, role: "MEMBER" } ] } } });
  const client1 = await db.client.create({ data: { workspaceId: workspace.id, name: "علی محمدی", company: "آوید تجارت", email: "hello@avid.example", phone: "09120000000" } });
  const client2 = await db.client.create({ data: { workspaceId: workspace.id, name: "مریم کریمی", company: "گروه ویستا", email: "info@vista.example" } });
  const defs = [
    { key: "WEB-01", name: "بازطراحی وب‌سایت آوید", description: "طراحی تجربه کاربری و توسعه وب‌سایت فروشگاهی با رویکرد مینیمال.", color: "#5277dd", budget: 85000000, clientId: client1.id, dueAt: randomDate(20), status: "ACTIVE" as const },
    { key: "APP-02", name: "اپلیکیشن مدیریت مشتری", description: "ساخت نسخه جدید محصول با قابلیت مدیریت ارتباط با مشتریان.", color: "#32a993", budget: 160000000, clientId: client2.id, dueAt: randomDate(47), status: "ACTIVE" as const },
    { key: "BRD-03", name: "هویت بصری برند ویستا", description: "تدوین سیستم طراحی، اجزای بصری و راهنمای برند.", color: "#b07ccc", budget: 35000000, clientId: client2.id, dueAt: randomDate(-3), status: "COMPLETED" as const },
    { key: "MKT-04", name: "کمپین پاییز", description: "طراحی صفحه فرود، کمپین شبکه‌های اجتماعی و گزارش اثربخشی.", color: "#e5a45d", budget: 21000000, clientId: client1.id, dueAt: randomDate(8), status: "ON_HOLD" as const },
  ];
  const projects = [];
  for (const p of defs) projects.push(await db.project.create({ data: { workspaceId: workspace.id, ...p, startAt: randomDate(-15) } }));
  const taskDefs = [
    [0,"تحقیق و تحلیل رقبا","DONE","HIGH",designer.id,-10],[0,"طراحی وایرفریم صفحات","DONE","MEDIUM",designer.id,-4],[0,"طراحی رابط کاربری اصلی","IN_PROGRESS","HIGH",designer.id,4],[0,"پیاده‌سازی صفحه اصلی","IN_PROGRESS","HIGH",developer.id,8],[0,"توسعه پنل مدیریت","TODO","URGENT",developer.id,16],[0,"تست واکنش‌گرایی","TODO","MEDIUM",owner.id,19],
    [1,"تدوین نیازمندی‌های CRM","DONE","HIGH",owner.id,-5],[1,"طراحی دیتابیس و نقش‌ها","IN_PROGRESS","HIGH",developer.id,10],[1,"طراحی داشبورد تحلیلی","REVIEW","MEDIUM",designer.id,12],[1,"توسعه API مشتریان","TODO","HIGH",developer.id,24],[1,"تست عملکرد نسخه اول","TODO","MEDIUM",owner.id,37],
    [2,"تحقیق برند و مودبورد","DONE","MEDIUM",designer.id,-20],[2,"طراحی لوگو","DONE","HIGH",designer.id,-10],[2,"تهیه راهنمای هویت بصری","DONE","MEDIUM",designer.id,-3],
    [3,"برنامه‌ریزی محتوای کمپین","DONE","MEDIUM",owner.id,-4],[3,"طراحی بنرهای تبلیغاتی","REVIEW","HIGH",designer.id,2],[3,"صفحه فرود کمپین","TODO","MEDIUM",developer.id,5],
  ] as const;
  const tasks = [];
  for (const [idx,title,status,priority,assigneeId,offset] of taskDefs) {
    const task = await db.task.create({ data: { projectId: projects[idx].id, title, status, priority, assigneeId, createdById: owner.id, dueAt: randomDate(offset), startAt: randomDate(offset-7), description: `پیگیری و تحویل مرحله «${title}» در پروژه ${projects[idx].name}.`, estimatedMinutes: status==="DONE"?240:480 } });
    tasks.push(task);
  }
  await db.checklist.createMany({ data: [
    { taskId: tasks[2].id, title: "طراحی دسکتاپ", checked: true }, { taskId: tasks[2].id, title: "طراحی موبایل", checked: false }, { taskId: tasks[2].id, title: "بازبینی با کارفرما", checked: false },
    { taskId: tasks[4].id, title: "لیست ویژگی‌ها", checked: true }, { taskId: tasks[4].id, title: "پیاده‌سازی مدیریت کاربران", checked: false }
  ] });
  await db.comment.createMany({ data: [{ taskId: tasks[2].id, authorId: owner.id, body: "لطفاً نسخه موبایل هم با جزئیات بازبینی شود." },{taskId:tasks[2].id,authorId:designer.id,body:"نسخه اصلی آماده است؛ نسخه موبایل در حال تکمیل است."}] });
  await db.timeEntry.createMany({ data: [{taskId:tasks[2].id,userId:designer.id,minutes:180,note:"طراحی صفحات اصلی"},{taskId:tasks[3].id,userId:developer.id,minutes:240,note:"ساخت کامپوننت‌های صفحه"},{taskId:tasks[7].id,userId:developer.id,minutes:210,note:"مدل‌های داده"},{taskId:tasks[0].id,userId:owner.id,minutes:90,note:"جلسه تحلیل"}] });
  await db.approval.create({ data: {projectId:projects[0].id,taskId:tasks[2].id,title:"تأیید طرح نهایی صفحه اصلی",description:"نسخه دسکتاپ طراحی شده و آماده بررسی است.",requesterId:designer.id,reviewerId:owner.id} });
  await db.approval.create({ data: {projectId:projects[1].id,title:"تأیید معماری پایگاه داده",description:"بررسی ساختار جداول و نقش‌ها",requesterId:developer.id,reviewerId:owner.id} });
  const contract = await db.contract.create({ data: { projectId:projects[0].id,clientId:client1.id,title:"قرارداد طراحی سایت آوید",amount:85000000 } });
  await db.installment.createMany({ data: [{contractId:contract.id,title:"پیش‌پرداخت",amount:35000000,paidAt:randomDate(-9)},{contractId:contract.id,title:"تأیید طرح",amount:25000000,dueAt:randomDate(7)},{contractId:contract.id,title:"تحویل نهایی",amount:25000000,dueAt:randomDate(23)}] });
  await db.activity.createMany({ data: [{workspaceId:workspace.id,actorId:owner.id,action:"CREATE",entityType:"PROJECT",entityId:projects[0].id,summary:"پروژه «بازطراحی وب‌سایت آوید» ایجاد شد"},{workspaceId:workspace.id,actorId:designer.id,action:"UPDATE",entityType:"TASK",entityId:tasks[2].id,summary:"وظیفه «طراحی رابط کاربری اصلی» به‌روزرسانی شد"},{workspaceId:workspace.id,actorId:developer.id,action:"LOG_TIME",entityType:"TASK",entityId:tasks[3].id,summary:"زمان توسعه صفحه اصلی ثبت شد"}] });
  await db.notification.createMany({ data: [{workspaceId:workspace.id,userId:owner.id,title:"تأییدیه جدید",body:"طرح صفحه اصلی نیازمند بررسی است.",href:"/dashboard/approvals"},{workspaceId:workspace.id,userId:owner.id,title:"مهلت تحویل نزدیک است",body:"پروژه کمپین پاییز",href:"/dashboard/projects"}] });
  console.log(`Demo seed completed. Email: demo@projectflow.local Password: ${password} (local only).`);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());
