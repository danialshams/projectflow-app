import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, parseJson, requireWrite, getProject, HttpError, logActivity } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const c = await context(); requireWrite(c.role);
    const { projectId, name } = await parseJson(req, z.object({ projectId: z.string().cuid(), name: z.string().trim().min(2).max(140) }));
    const project = await getProject(projectId,c.workspaceId);
    const tasks = await db.task.findMany({where:{projectId},orderBy:{createdAt:"asc"},take:250,include:{checklists:true,dependencies:true}});
    const index = new Map(tasks.map((t,i)=>[t.id,i]));
    const structure = tasks.map(t=>({title:t.title,description:t.description,priority:t.priority,estimatedMinutes:t.estimatedMinutes,parentIndex:t.parentId && index.has(t.parentId)?index.get(t.parentId):null,checklists:t.checklists.map(i=>i.title),dependencyIndexes:t.dependencies.map(d=>index.get(d.dependsOnId)).filter((v):v is number=>v!==undefined)}));
    const template = await db.projectTemplate.create({data:{workspaceId:c.workspaceId,createdById:c.userId,name,description:project.description,color:project.color,structure}});
    await logActivity(c.workspaceId,c.userId,"CREATE","TEMPLATE",template.id,`قالب «${name}» از پروژه ${project.name} ذخیره شد`);
    return NextResponse.json({template},{status:201});
  }catch(err){return asResponse(err)}
}
