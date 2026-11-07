import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asResponse, context, getTask, HttpError, parseJson, requireWrite } from "@/lib/access";
type Params = { params: Promise<{ id: string }> };
export async function POST(req: Request, { params }: Params) {
  try {
    const c = await context(); requireWrite(c.role); const { id } = await params;
    const task = await getTask(id, c.workspaceId);
    const { dependsOnId } = await parseJson(req, z.object({ dependsOnId: z.string().cuid() }));
    if (dependsOnId === id) throw new HttpError(400, "وابستگی به خود وظیفه امکان‌پذیر نیست.");
    const other = await getTask(dependsOnId, c.workspaceId);
    if (other.projectId !== task.projectId) throw new HttpError(400, "وابستگی باید داخل یک پروژه باشد.");
    const all = await db.taskDependency.findMany({ where: { task: { projectId: task.projectId } }, select: { taskId: true, dependsOnId: true } });
    const graph = new Map<string, string[]>();
    for (const dep of all) graph.set(dep.taskId, [...(graph.get(dep.taskId) || []), dep.dependsOnId]);
    const stack = [dependsOnId], visited = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (current === id) throw new HttpError(409, "این وابستگی یک چرخه ایجاد می‌کند.");
      if (visited.has(current)) continue;
      visited.add(current);
      stack.push(...(graph.get(current) || []));
    }
    const dependency = await db.taskDependency.upsert({ where: { taskId_dependsOnId: { taskId: id, dependsOnId } }, create: { taskId: id, dependsOnId }, update: {} });
    return NextResponse.json({ dependency }, { status: 201 });
  } catch (err) { return asResponse(err); }
}
