import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { authorizedPortalProject } from "../src/lib/portal-auth";
import { decideApproval } from "../src/lib/approval-flow";
import { createDueReminders } from "../src/lib/automation";

const enabled=process.env.INTEGRATION_TESTS==="true";
const unique=randomUUID().slice(0,10);
test("project access and staged approval + reminders",{skip:!enabled},async()=>{
  if(!process.env.DATABASE_URL?.includes("project_management"))throw new Error("Refusing integration tests outside project_management test DB");
  const account=await db.user.create({data:{email:`test-${unique}@example.test`,name:"test owner",passwordHash:"dummy"}});
  const reviewer=await db.user.create({data:{email:`reviewer-${unique}@example.test`,name:"test reviewer",passwordHash:"dummy"}});
  const workspace=await db.workspace.create({data:{name:"Test Workspace",slug:`test-${unique}`,ownerId:account.id,memberships:{create:[{userId:account.id,role:"OWNER"},{userId:reviewer.id,role:"MANAGER"}]}}});
  try{
    const client=await db.client.create({data:{workspaceId:workspace.id,name:"Client",email:`client-${unique}@example.test`}});
    const p=await db.project.create({data:{workspaceId:workspace.id,name:"Client project",key:`CP${unique}`,clientId:client.id}});
    const otherClient=await db.client.create({data:{workspaceId:workspace.id,name:"Other client",email:`other-client-${unique}@example.test`}});
    const other=await db.project.create({data:{workspaceId:workspace.id,name:"Other project",key:`OP${unique}`,clientId:otherClient.id}});
    try{
      assert.equal((await authorizedPortalProject(client.id,p.id)).project.id,p.id);
      await assert.rejects(()=>authorizedPortalProject(client.id,other.id),/در دسترس/);
      const approval=await db.approval.create({data:{projectId:p.id,requesterId:account.id,title:"Review",steps:{create:[{sequence:1,kind:"TEAM",projectId:p.id,reviewerId:reviewer.id},{sequence:2,kind:"CLIENT",projectId:p.id,clientId:client.id}]}},include:{steps:true}});
      await assert.rejects(()=>decideApproval(approval.id,{type:"TEAM",userId:account.id},"APPROVED",""),/واگذار/);
      const first=await decideApproval(approval.id,{type:"TEAM",userId:reviewer.id},"APPROVED","ok");
      assert.equal(first.finished,false);
      await assert.rejects(()=>decideApproval(approval.id,{type:"TEAM",userId:reviewer.id},"APPROVED",""),/واگذار/);
      const final=await decideApproval(approval.id,{type:"CLIENT",clientId:client.id},"APPROVED","great");
      assert.equal(final.finished,true);
      assert.equal((await db.approval.findUniqueOrThrow({where:{id:approval.id}})).status,"APPROVED");
      await assert.rejects(()=>decideApproval(approval.id,{type:"CLIENT",clientId:client.id},"APPROVED",""),/تعیین تکلیف/);
      const task=await db.task.create({data:{projectId:p.id,createdById:account.id,assigneeId:reviewer.id,title:"Due test",dueAt:new Date(Date.now()+2*3600_000)}});
      const once=await createDueReminders();const twice=await createDueReminders();
      assert.ok(once.created>=1);assert.equal(twice.created,0);
      assert.equal(await db.notification.count({where:{dedupeKey:{startsWith:`due:${task.id}:`}}}),1);
      assert.equal(await db.deliveryJob.count({where:{uniqueKey:{startsWith:`email:due:${task.id}:`}}}),1);
    }finally{await db.deliveryJob.deleteMany({where:{destination:reviewer.email}});}
  }finally{await db.workspace.delete({where:{id:workspace.id}});await db.user.deleteMany({where:{id:{in:[account.id,reviewer.id]}}})}
});
