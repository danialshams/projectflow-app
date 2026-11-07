import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createDueReminders } from "@/lib/automation";
import { processDeliveryQueue } from "@/lib/delivery";
import { asResponse } from "@/lib/access";
export const dynamic="force-dynamic";
async function tick(req:Request){
  if(!process.env.CRON_SECRET||process.env.CRON_SECRET.length<24)return NextResponse.json({error:"CRON_SECRET is not configured"},{status:503});
  const provided=req.headers.get("authorization")||"";
  const wanted=`Bearer ${process.env.CRON_SECRET}`;
  if(provided.length!==wanted.length||!timingSafeEqual(Buffer.from(provided),Buffer.from(wanted)))return NextResponse.json({error:"Unauthorized"},{status:401});
  try{return NextResponse.json({ok:true,reminders:await createDueReminders(),delivery:await processDeliveryQueue()})}catch(e){return asResponse(e)}
}
export async function GET(req:Request){return tick(req)}
export async function POST(req:Request){return tick(req)}
