import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse,context,parseJson,HttpError,logActivity,requireWrite } from "@/lib/access";
import { decideApproval } from "@/lib/approval-flow";
type Params={params:Promise<{id:string}>};
export async function PATCH(req:Request,{params}:Params){
 try{
  const c=await context();requireWrite(c.role);const {id}=await params;
  const data=await parseJson(req,z.object({status:z.enum(["APPROVED","REJECTED"]),decisionNote:z.string().max(1000).default("")}));
  const old=await db.approval.findFirst({where:{id,project:{workspaceId:c.workspaceId}},include:{steps:{orderBy:{sequence:"asc"}}}});
  if(!old)throw new HttpError(404,"درخواست یافت نشد.");
  if(!old.steps.length){ // Existing pre-migration requests stay compatible.
    if(old.status!=="PENDING")throw new HttpError(409,"درخواست قبلاً بررسی شده است.");
    if(old.reviewerId&&old.reviewerId!==c.userId)throw new HttpError(403,"این درخواست برای شما نیست.");
    const result=await db.approval.updateMany({where:{id,status:"PENDING"},data:{status:data.status,reviewerId:c.userId,decisionNote:data.decisionNote,decidedAt:new Date()}});
    if(!result.count)throw new HttpError(409,"درخواست قبلاً بررسی شده است.");
    if(old.requesterId!==c.userId)await db.notification.create({data:{workspaceId:c.workspaceId,userId:old.requesterId,title:"نتیجه تأییدیه",body:old.title,href:"/dashboard/approvals"}});
  }else{
    const pending=old.steps.find(s=>s.status==="PENDING");
    if(!pending||pending.kind!=="TEAM")throw new HttpError(403,"مرحله فعلی متعلق به مشتری است یا قبلاً انجام شده است.");
    if(!pending.reviewerId&&!(["OWNER","ADMIN","MANAGER"].includes(c.role)))throw new HttpError(403,"تنها مدیران اجازه بررسی این مرحله را دارند.");
    await decideApproval(id,{type:"TEAM",userId:c.userId},data.status,data.decisionNote);
  }
  await logActivity(c.workspaceId,c.userId,"DECIDE","APPROVAL",id,`درخواست «${old.title}» بررسی شد`);
  return NextResponse.json({ok:true});
 }catch(e){return asResponse(e)}
}
