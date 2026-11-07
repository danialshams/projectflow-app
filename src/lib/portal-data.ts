import { db } from "@/lib/db";

export function getClientProjects(clientId: string) {
  return db.project.findMany({
    where: { clientId, status: { not: "ARCHIVED" } },
    select: {
      id: true, name: true, key: true, status: true, description: true, clientId: true,
      tasks: {
        select: { id: true, title: true, status: true, dueAt: true, priority: true },
        orderBy: { createdAt: "desc" }, take: 150,
      },
      approvals: {
        select: {
          id: true, title: true, description: true, status: true, createdAt: true,
          steps: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, kind: true, clientId: true, status: true } },
        },
        orderBy: { createdAt: "desc" }, take: 50,
      },
      portalComments: {
        select: { id: true, body: true, createdAt: true, client: { select: { name: true } } },
        orderBy: { createdAt: "desc" }, take: 100,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
