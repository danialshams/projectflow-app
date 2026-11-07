import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { asResponse, parseJson } from "@/lib/access";
import { authorizedPortalProject, portalIdentity, sameOrigin } from "@/lib/portal-auth";
type Params = { params: Promise<{ id: string }> };
export async function POST(req: Request, {params}:Params) {
  try {
    sameOrigin(req);
    const user = await portalIdentity(); const {id} = await params;
    const grant = await authorizedPortalProject(user.id,id);
    const {body} = await parseJson(req,z.object({ body:z.string().trim().min(1).max(3000) }));
    const comment = await db.clientPortalComment.create({data:{clientId:user.id,projectId:id,body}});
    const managers = await db.membership.findMany({where:{workspaceId:grant.project.workspaceId,role:{in:["OWNER","ADMIN","MANAGER"]}},select:{userId:true}});
    await db.notification.createMany({data:managers.map(m=>({workspaceId:grant.project.workspaceId,userId:m.userId,title:"پیام جدید مشتری",body:grant.project.name,href:"/dashboard/clients"}))});
    return NextResponse.json({comment},{status:201});
  } catch(e) {return asResponse(e)}
}
