import { NextResponse } from "next/server";
import { asResponse } from "@/lib/access";
import { portalIdentity } from "@/lib/portal-auth";
import { getClientProjects } from "@/lib/portal-data";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await portalIdentity();
    const projects = await getClientProjects(user.id);
    return NextResponse.json({
      account: user,
      projects: projects.map(project => ({
        ...project,
        portalComments: project.portalComments.map(comment => ({
          id: comment.id, body: comment.body, createdAt: comment.createdAt,
          account: { name: comment.client.name },
        })),
      })),
    });
  } catch (e) { return asResponse(e); }
}
