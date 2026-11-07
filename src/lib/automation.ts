import { db } from "@/lib/db";
import { queueEmail } from "@/lib/delivery";
export async function createDueReminders(){
  const now=new Date(), future=new Date(now.getTime()+25*3600_000), past=new Date(now.getTime()-7*86400_000);
  const tasks=await db.task.findMany({where:{status:{not:"DONE"},assigneeId:{not:null},dueAt:{gte:past,lte:future},project:{status:"ACTIVE"}},select:{id:true,title:true,assigneeId:true,dueAt:true,project:{select:{workspaceId:true,name:true}},assignee:{select:{email:true}}},take:300});
  let created=0;
  for(const task of tasks){
    if(!task.assigneeId||!task.dueAt)continue;
    const key=`due:${task.id}:${task.assigneeId}:${task.dueAt.toISOString().slice(0,10)}`;
    const out=await db.notification.createMany({data:[{dedupeKey:key,workspaceId:task.project.workspaceId,userId:task.assigneeId,title:task.dueAt < now ? "مهلت وظیفه گذشته است" : "مهلت انجام وظیفه نزدیک است",body:`${task.project.name} · ${task.title}`,href:"/dashboard/tasks"}],skipDuplicates:true});
    if(out.count){created++; if(task.assignee?.email)await queueEmail(`email:${key}`,task.assignee.email,"یادآوری وظیفه ProjectFlow",`${task.project.name}: ${task.title}\nبرای پیگیری وارد ProjectFlow شوید.`);}
  }
  return {scanned:tasks.length,created};
}
