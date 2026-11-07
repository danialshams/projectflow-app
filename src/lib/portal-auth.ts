import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/access";

// The existing single-use invitation and ClientPortalSession remain the single portal identity system.
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function portalIdentity() {
  const token=(await cookies()).get("projectflow_client")?.value;
  if(!token||!/^[0-9a-f]{64}$/.test(token))throw new HttpError(401,"دسترسی فعال نیست؛ از لینک دعوت مشتری وارد شوید.");
  const session=await db.clientPortalSession.findUnique({where:{tokenHash:tokenHash(token)},include:{client:{select:{id:true,name:true,email:true,workspaceId:true}}}});
  if(!session||session.revokedAt||session.expiresAt<=new Date())throw new HttpError(401,"نشست منقضی شده است.");
  return session.client;
}
export async function authorizedPortalProject(clientId:string,projectId:string){
  const project=await db.project.findFirst({where:{id:projectId,clientId},select:{id:true,name:true,key:true,status:true,clientId:true,workspaceId:true}});
  if(!project)throw new HttpError(404,"این پروژه در دسترس شما نیست.");
  return {clientId,project};
}
export function sameOrigin(req:Request){
 const origin=req.headers.get("origin");
 if(origin&&origin!==new URL(req.url).origin)throw new HttpError(403,"مبدأ درخواست نامعتبر است.");
 if(!origin&&req.headers.get("sec-fetch-site")==="cross-site")throw new HttpError(403,"درخواست مجاز نیست.");
}
