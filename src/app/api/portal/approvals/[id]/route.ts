import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { asResponse, parseJson, HttpError } from "@/lib/access";
import { authorizedPortalProject, portalIdentity, sameOrigin } from "@/lib/portal-auth";
import { decideApproval } from "@/lib/approval-flow";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(req: Request,{params}:Params) {
  try {
    sameOrigin(req); const user = await portalIdentity(); const {id} = await params;
    const {status,decisionNote} = await parseJson(req,z.object({status:z.enum(["APPROVED","REJECTED"]),decisionNote:z.string().max(1000).default("")}));
    const approval = await db.approval.findUnique({where:{id},select:{projectId:true}});
    if(!approval) throw new HttpError(404,"درخواست یافت نشد.");
    const grant=await authorizedPortalProject(user.id,approval.projectId);
    const outcome=await decideApproval(id,{type:"CLIENT",clientId:grant.clientId},status,decisionNote);
    return NextResponse.json({ok:true,outcome});
  }catch(e){return asResponse(e)}
}
