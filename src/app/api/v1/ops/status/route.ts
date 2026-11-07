import { NextResponse } from "next/server";
import { asResponse,context,requireManage } from "@/lib/access";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){
 try{const c=await context();requireManage(c.role);
  const queued=await db.deliveryJob.groupBy({by:["status","channel"],_count:{_all:true}});
  return NextResponse.json({emailConfigured:!!(process.env.EMAIL_GATEWAY_URL&&process.env.EMAIL_GATEWAY_TOKEN),smsConfigured:!!(process.env.SMS_GATEWAY_URL&&process.env.SMS_GATEWAY_TOKEN),storageConfigured:!!(process.env.S3_BUCKET&&process.env.S3_ACCESS_KEY_ID&&process.env.S3_SECRET_ACCESS_KEY),cronConfigured:!!process.env.CRON_SECRET,queue:queued.map(x=>({status:x.status,channel:x.channel,count:x._count._all}))});
 }catch(e){return asResponse(e)}
}
