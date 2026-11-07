import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { asResponse, context } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const c = await context();
    const notifications = await db.notification.findMany({
      where: { workspaceId: c.workspaceId, userId: c.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, title: true, body: true, href: true, readAt: true, createdAt: true
      }
    });
    return NextResponse.json({ notifications }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) { return asResponse(err); }
}
