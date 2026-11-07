import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { asResponse, context, getTask, requireWrite } from "@/lib/access";
type Params = { params: Promise<{ id: string; dependencyId: string }> };
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role); const { id, dependencyId } = await params; await getTask(id, c.workspaceId);
    await db.taskDependency.deleteMany({ where: { taskId: id, dependsOnId: dependencyId } });
    return NextResponse.json({ ok: true });
  } catch (err) { return asResponse(err); }
}
