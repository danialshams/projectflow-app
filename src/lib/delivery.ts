import { db } from "@/lib/db";

export async function queueEmail(key: string, email: string, subject: string, body: string) {
  if (!email) return;
  await db.deliveryJob.upsert({where:{uniqueKey:key},create:{uniqueKey:key,channel:"EMAIL",destination:email.toLowerCase().trim(),subject,body},update:{}});
}
export async function queueSms(key: string, phone: string, message: string) {
  if (!phone) return;
  await db.deliveryJob.upsert({where:{uniqueKey:key},create:{uniqueKey:key,channel:"SMS",destination:phone,subject:"",body:message},update:{}});
}

// Provider-neutral JSON bridge. The future paid email/SMS gateway can be changed without schema changes.
export async function dispatchDelivery(job: { channel: string; destination:string; subject:string; body:string }) {
  const prefix = job.channel === "SMS" ? "SMS" : "EMAIL";
  const url = process.env[`${prefix}_GATEWAY_URL`];
  const key = process.env[`${prefix}_GATEWAY_TOKEN`];
  if (!url || !key) return {status:"WAITING_CONFIG" as const, error:`${prefix} gateway not configured`};
  const target = new URL(url);
  if (target.protocol !== "https:") throw new Error("Only HTTPS gateways are permitted");
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),10_000);
  try {
    const response = await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({to:job.destination,subject:job.subject,message:job.body}),signal:controller.signal,cache:"no-store"});
    if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);
    return {status:"SENT" as const,error:null};
  } finally {clearTimeout(timeout)}
}

export async function processDeliveryQueue(limit=30){
  // Recover jobs abandoned by a crashed worker; unique keys prevent duplicate enqueue.
  await db.deliveryJob.updateMany({where:{status:"SENDING",claimedAt:{lt:new Date(Date.now()-5*60_000)}},data:{status:"RETRY"}});
  const jobs=await db.deliveryJob.findMany({where:{status:{in:["PENDING","RETRY","WAITING_CONFIG"]},nextAttemptAt:{lte:new Date()},attempts:{lt:8}},orderBy:{createdAt:"asc"},take:limit});
  let sent=0,failed=0,notConfigured=0;
  for(const job of jobs){
    const claim=await db.deliveryJob.updateMany({where:{id:job.id,status:job.status},data:{status:"SENDING",claimedAt:new Date(),attempts:{increment:1}}});
    if(!claim.count)continue;
    try{
      const result=await dispatchDelivery(job);
      if(result.status==="SENT"){
        await db.deliveryJob.update({where:{id:job.id},data:{status:"SENT",sentAt:new Date(),lastError:null}});sent++;
      }else{
        await db.deliveryJob.update({where:{id:job.id},data:{status:"WAITING_CONFIG",lastError:result.error,nextAttemptAt:new Date(Date.now()+24*3600_000)}});notConfigured++;
      }
    }catch(e){
      const message=e instanceof Error?e.message:"Delivery failed";
      const status=job.attempts+1>=8?"FAILED":"RETRY";
      await db.deliveryJob.update({where:{id:job.id},data:{status,lastError:message.slice(0,500),nextAttemptAt:new Date(Date.now()+Math.min(24*3600_000,2**Math.min(job.attempts+1,8)*60_000))}});failed++;
    }
  }
  return {sent,failed,notConfigured};
}
