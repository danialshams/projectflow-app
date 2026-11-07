import { db } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { createHash } from "node:crypto";
import InviteAccept from "@/components/InviteAccept";
export default async function Page({params}:{params:Promise<{token:string}>}) {
  const {token}=await params;
  const hash=createHash("sha256").update(token).digest("hex");
  const invite=await db.workspaceInvitation.findUnique({where:{tokenHash:hash},include:{workspace:{select:{name:true}}}});
  const valid=Boolean(invite&&!invite.acceptedAt&&invite.expiresAt>new Date());
  const session=await getAuth();
  return <InviteAccept token={token} valid={valid} workspaceName={invite?.workspace.name||""} invitedEmail={invite?.invitedEmail||""} signedIn={Boolean(session?.user)} email={session?.user?.email||""}/>;
}
