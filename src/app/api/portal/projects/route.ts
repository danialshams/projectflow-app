import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asResponse } from "@/lib/access";
import { portalIdentity } from "@/lib/portal-auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await portalIdentity();
    const projects=await db.project.findMany({where:{clientId:user.id,status:{not:"ARCHIVED"}},select:{id:true,name:true,key:true,status:true,description:true,clientId:true,tasks:{select:{id:true,title:true,status:true,dueAt:true,priority:true},orderBy:{createdAt:"desc"},take:150},approvals:{select:{id:true,title:true,description:true,status:true,createdAt:true,steps:{orderBy:{sequence:"asc"},select:{id:true,sequence:true,kind:true,clientId:true,status:true}}},orderBy:{createdAt:"desc"},take:50},portalComments:{select:{id:true,body:true,createdAt:true,client:{select:{name:true}}},orderBy:{createdAt:"desc"},take:100}}},orderBy:{createdAt:"desc"}});
    return NextResponse.json({ account:user, projects:projects.map(p=>({...p,portalComments:p.portalComments.map(c=>({id:c.id,body:c.body,createdAt:c.createdAt,account:{name:c.client.name}}))})) });
  } catch(e) { return asResponse(e); }
}
