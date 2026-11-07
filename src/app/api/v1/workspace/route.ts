import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { asResponse, HttpError, parseJson } from "@/lib/access";
export async function POST(req: Request) {
  try {
    const session=await getAuth(); if(!session?.user?.id) throw new HttpError(401,"ابتدا وارد شوید.");
    const {workspaceId}=await parseJson(req,z.object({workspaceId:z.string().cuid()}));
    const membership=await db.membership.findUnique({where:{workspaceId_userId:{workspaceId,userId:session.user.id}}});
    if(!membership) throw new HttpError(403,"شما عضو این فضای کاری نیستید.");
    const r=NextResponse.json({ok:true});
    r.cookies.set("projectflow_workspace",workspaceId,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
    return r;
  }catch(e){return asResponse(e)}
}
