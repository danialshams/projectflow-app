import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { asResponse, context, requireManage, HttpError, logActivity } from "@/lib/access";
type Params={params:Promise<{id:string}>};
export async function DELETE(_req:Request,{params}:Params){
 try {const c=await context();requireManage(c.role);const {id}=await params;
  const grant=await db.clientPortalSession.findFirst({where:{id,client:{workspaceId:c.workspaceId}}});
  if(!grant)throw new HttpError(404,"دسترسی یافت نشد.");
  await db.clientPortalSession.updateMany({where:{id,client:{workspaceId:c.workspaceId},revokedAt:null},data:{revokedAt:new Date()}});
  await logActivity(c.workspaceId,c.userId,"REVOKE","PORTAL",id,"دسترسی مشتری به پروژه لغو شد");
  return NextResponse.json({ok:true});
 }catch(e){return asResponse(e)}
}
