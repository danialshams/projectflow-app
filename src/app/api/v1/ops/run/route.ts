import { NextResponse } from "next/server";
import { asResponse,context,requireManage } from "@/lib/access";
import { createDueReminders } from "@/lib/automation";
import { processDeliveryQueue } from "@/lib/delivery";
export async function POST(){
 try{const c=await context();requireManage(c.role);
  return NextResponse.json({reminders:await createDueReminders(),delivery:await processDeliveryQueue()});
 }catch(e){return asResponse(e)}
}
