import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, getProject, getTask, logActivity, HttpError } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const data = await parseJson(req, z.object({ projectId: z.string().cuid(), taskId: z.string().cuid().nullable().optional(), title: z.string().trim().min(2).max(200), description: z.string().max(2000).default(""), reviewerId: z.string().cuid().nullable().optional(), reviewerIds: z.array(z.string().cuid()).max(8).optional(), includeClient: z.boolean().default(false) }));
    const project=await getProject(data.projectId,c.workspaceId);
    if(data.taskId && (await getTask(data.taskId,c.workspaceId)).projectId !== data.projectId)throw new HttpError(400,"وظیفه متعلق به این پروژه نیست.");
    const reviewers=data.reviewerIds?.length?data.reviewerIds:(data.reviewerId?[data.reviewerId]:[]);
    if(new Set(reviewers).size!==reviewers.length)throw new HttpError(400,"بررسی‌کننده تکراری است.");
    const members=await db.membership.count({where:{workspaceId:c.workspaceId,userId:{in:reviewers}}});
    if(members!==reviewers.length)throw new HttpError(400,"تمام بررسی‌کنندگان باید عضو تیم باشند.");
    if(data.includeClient&&!project.clientId)throw new HttpError(400,"پروژه مشتری ندارد.");
    const sequence: {sequence:number;kind:"TEAM"|"CLIENT";projectId:string;reviewerId?:string;clientId?:string}[] = reviewers.length ? reviewers.map((reviewerId,i)=>({sequence:i+1,kind:"TEAM",reviewerId,projectId:project.id})):(!data.includeClient?[{sequence:1,kind:"TEAM",projectId:project.id}]:[]);
    if(data.includeClient) sequence.push({sequence:sequence.length+1,kind:"CLIENT",projectId:project.id,clientId:project.clientId!});
    const approval=await db.approval.create({data:{projectId:project.id,taskId:data.taskId??null,title:data.title,description:data.description,requesterId:c.userId,reviewerId:reviewers[0]??null,steps:{create:sequence}},include:{steps:{orderBy:{sequence:"asc"}}}});
    await logActivity(c.workspaceId,c.userId,"CREATE","APPROVAL",approval.id,`درخواست تأیید «${approval.title}» ایجاد شد`);
    const first=approval.steps[0];
    if(first?.kind==="TEAM" && first.reviewerId && first.reviewerId!==c.userId)await db.notification.create({data:{workspaceId:c.workspaceId,userId:first.reviewerId,title:"درخواست تأیید جدید",body:approval.title,href:"/dashboard/approvals"}});
    return NextResponse.json({approval},{status:201});
  }catch(e){return asResponse(e)}
}
