import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { asResponse, context, getProject, HttpError, parseJson, requireManage, logActivity } from "@/lib/access";
import { tokenHash } from "@/lib/portal-auth";
import { queueEmail } from "@/lib/delivery";
export async function POST(req: Request) {
  try {
    const c = await context(); requireManage(c.role);
    const { projectId } = await parseJson(req, z.object({ projectId: z.string().cuid() }));
    const project = await getProject(projectId, c.workspaceId);
    if (!project.clientId) throw new HttpError(400, "ابتدا مشتری را به پروژه اختصاص دهید.");
    const client = await db.client.findFirst({ where: { id: project.clientId, workspaceId: c.workspaceId } });
    if (!client?.email) throw new HttpError(400, "برای مشتری این پروژه ایمیل ثبت کنید.");
    const token = randomBytes(32).toString("hex");
    const invite = await db.clientPortalInvitation.create({ data: { clientId: client.id, createdById:c.userId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now()+7*86400000) } });
    const base = process.env.NEXTAUTH_URL || new URL(req.url).origin;
    const url = `${base.replace(/\/$/, "")}/portal/activate/${token}`;
    await queueEmail(`portal-invite:${invite.id}`, client.email, "دعوت به پرتال مشتری", `شما برای مشاهده پروژه «${project.name}» دعوت شده‌اید. لینک فعال‌سازی تا ۷ روز معتبر است:\n${url}`);
    await logActivity(c.workspaceId, c.userId, "INVITE", "CLIENT", client.id, `دسترسی پرتال پروژه «${project.name}» صادر شد`);
    return NextResponse.json({ inviteUrl: url, expiresAt: invite.expiresAt }, { status: 201 });
  } catch(e) { return asResponse(e); }
}

export async function GET() {
  try {
    const c=await context();requireManage(c.role);
    const [invites,sessions]=await Promise.all([
      db.clientPortalInvitation.findMany({where:{client:{workspaceId:c.workspaceId}},include:{client:{select:{name:true,email:true,projects:{select:{id:true,name:true}}}}},orderBy:{createdAt:"desc"},take:100}),
      db.clientPortalSession.findMany({where:{client:{workspaceId:c.workspaceId},revokedAt:null,expiresAt:{gt:new Date()}},include:{client:{select:{name:true,email:true,projects:{select:{id:true,name:true}}}}},orderBy:{createdAt:"desc"},take:100})
    ]);
    const label=(projects:{id:string;name:string}[],name:string)=>({id:projects[0]?.id||"",name:projects.map(p=>p.name).join("، ")||name});
    const invitations=invites.map(i=>({id:i.id,invitedEmail:i.client.email||"",acceptedAt:i.redeemedAt,expiresAt:i.expiresAt,createdAt:i.createdAt,project:label(i.client.projects,i.client.name)}));
    const grants=sessions.map(s=>({id:s.id,createdAt:s.createdAt,account:{name:s.client.name,email:s.client.email||""},project:label(s.client.projects,s.client.name)}));
    return NextResponse.json({invitations,grants});
  }catch(e){return asResponse(e)}
}
