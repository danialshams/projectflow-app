import { context, asResponse } from "@/lib/access";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function GET(req:Request){
  try {
    const c=await context();
    const encoder=new TextEncoder();
    let timer:ReturnType<typeof setInterval>|undefined;
    let endTimer:ReturnType<typeof setTimeout>|undefined;
    let closed=false,busy=false,last="";
    const stream=new ReadableStream<Uint8Array>({
      start(controller){
        const close=()=>{if(closed)return;closed=true;if(timer)clearInterval(timer);if(endTimer)clearTimeout(endTimer);try{controller.close()}catch{}};
        const send=async()=>{
          if(closed||busy)return;busy=true;
          try{
            const list=await db.notification.findMany({where:{workspaceId:c.workspaceId,userId:c.userId},orderBy:{createdAt:"desc"},take:30,select:{id:true,readAt:true,createdAt:true}});
            const signature=list.map(n=>`${n.id}:${n.readAt?.getTime()||0}`).join("|");
            if(signature!==last){last=signature;controller.enqueue(encoder.encode(`event: changed\ndata: ${JSON.stringify({count:list.filter(n=>!n.readAt).length})}\n\n`));}
            else controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }catch{close()}finally{busy=false}
        };
        void send();timer=setInterval(()=>void send(),3000);endTimer=setTimeout(close,22000);req.signal.addEventListener("abort",close,{once:true});
      },
      cancel(){closed=true;if(timer)clearInterval(timer);if(endTimer)clearTimeout(endTimer)}
    });
    return new Response(stream,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no","X-Robots-Tag":"noindex"}});
  }catch(e){return asResponse(e)}
}
