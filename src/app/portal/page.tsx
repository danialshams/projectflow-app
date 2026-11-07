import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import PortalClient from "@/components/PortalClient";
export const dynamic="force-dynamic";
export const metadata={title:"پرتال مشتری | ProjectFlow",robots:{index:false,follow:false},referrer:"no-referrer"};
export default async function PortalPage(){
 const token=(await cookies()).get("projectflow_client")?.value;
 const session=token&&/^[a-f0-9]{64}$/.test(token)?await db.clientPortalSession.findUnique({where:{tokenHash:createHash("sha256").update(token).digest("hex")},include:{client:{select:{id:true,name:true,email:true}}}}):null;
 if(!session||session.revokedAt||session.expiresAt<=new Date())return <main dir="rtl" className="portal-login"><div className="panel portal-auth-card"><h1>دسترسی فعال نیست</h1><p>برای مشاهده پروژه‌ها از لینک دعوت اختصاصی و یک‌بارمصرفی که مدیر پروژه صادر می‌کند وارد شوید. ممکن است نشست قبلی شما منقضی یا لغو شده باشد.</p><a className="btn btn-secondary" href="/login">ورود به پنل تیم</a></div></main>;
 const user=session.client;
 const projects=await db.project.findMany({where:{clientId:user.id,status:{not:"ARCHIVED"}},select:{id:true,name:true,key:true,status:true,description:true,clientId:true,tasks:{select:{id:true,title:true,status:true,dueAt:true,priority:true},orderBy:{createdAt:"desc"},take:150},approvals:{select:{id:true,title:true,description:true,status:true,createdAt:true,steps:{orderBy:{sequence:"asc"},select:{id:true,sequence:true,kind:true,clientId:true,status:true}}},orderBy:{createdAt:"desc"},take:50},portalComments:{select:{id:true,body:true,createdAt:true,client:{select:{name:true}}},orderBy:{createdAt:"desc"},take:100}}},orderBy:{createdAt:"desc"}});
 const payload={account:{id:user.id,name:user.name,email:user.email||""},projects:projects.map(p=>({...p,tasks:p.tasks.map(t=>({...t,dueAt:t.dueAt?.toISOString()||null})),approvals:p.approvals.map(a=>({...a,createdAt:a.createdAt.toISOString()})),portalComments:p.portalComments.map(c=>({id:c.id,body:c.body,createdAt:c.createdAt.toISOString(),account:{name:c.client.name}}))}))};
 return <PortalClient initialData={payload}/>;
}
