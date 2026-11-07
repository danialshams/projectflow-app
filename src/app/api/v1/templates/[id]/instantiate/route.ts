import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, HttpError, logActivity } from "@/lib/access";
const structureSchema = z.array(z.object({title:z.string().min(2).max(180),description:z.string().max(6000),priority:z.enum(["LOW","MEDIUM","HIGH","URGENT"]),estimatedMinutes:z.number().int().min(0).max(100000),parentIndex:z.number().int().nullable(),checklists:z.array(z.string().min(1).max(200)).max(80),dependencyIndexes:z.array(z.number().int().nonnegative()).max(80)})).max(250);
type Params = {params:Promise<{id:string}>};
export async function POST(req:Request,{params}:Params){
  try{
    const c=await context();requireWrite(c.role);const {id}=await params;
    const template=await db.projectTemplate.findFirst({where:{id,workspaceId:c.workspaceId}});
    if(!template)throw new HttpError(404,"قالب پیدا نشد.");
    const {name}=await parseJson(req,z.object({name:z.string().trim().min(2).max(120)}));
    const parsed=structureSchema.safeParse(template.structure);
    if(!parsed.success)throw new HttpError(422,"ساختار قالب معتبر نیست.");
    const tasks=parsed.data;
    const project=await db.$transaction(async tx=>{
      const p=await tx.project.create({data:{workspaceId:c.workspaceId,name,key:`TPL-${crypto.randomUUID().slice(0,8).toUpperCase()}`,description:template.description,color:template.color}});
      const ids:string[]=[];
      for(const t of tasks){const row=await tx.task.create({data:{projectId:p.id,title:t.title,description:t.description,status:"TODO",priority:t.priority,estimatedMinutes:t.estimatedMinutes,createdById:c.userId}});ids.push(row.id)}
      for(let i=0;i<tasks.length;i++){
        const t=tasks[i];
        if(t.parentIndex!==null&&ids[t.parentIndex]&&t.parentIndex!==i)await tx.task.update({where:{id:ids[i]},data:{parentId:ids[t.parentIndex]}});
        if(t.checklists.length)await tx.checklist.createMany({data:t.checklists.map((title,position)=>({taskId:ids[i],title,position}))});
        const deps=t.dependencyIndexes.filter(k=>ids[k]&&k!==i);
        if(deps.length)await tx.taskDependency.createMany({data:[...new Set(deps)].map(k=>({taskId:ids[i],dependsOnId:ids[k]})),skipDuplicates:true});
      }
      return p;
    });
    await logActivity(c.workspaceId,c.userId,"INSTANTIATE","TEMPLATE",template.id,`پروژه «${project.name}» از قالب ساخته شد`);
    return NextResponse.json({project},{status:201});
  }catch(err){return asResponse(err)}
}
