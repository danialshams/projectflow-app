import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

// Run only against CI's disposable database while the built Next.js server is running.
const db = new PrismaClient();
const host = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const suffix = randomBytes(5).toString("hex");
const workspaceIds = [];
const userIds = [];

async function main() {
  const demoUser = await db.user.create({ data: { name: "Demo smoke", email: `demo-${suffix}@example.invalid`, passwordHash: "!no-login" } });
  userIds.push(demoUser.id);
  const demo = await db.workspace.create({ data: { slug: "projectflow-public-demo", name: "آزمایش عمومی", ownerId: demoUser.id } });
  workspaceIds.push(demo.id);
  await db.membership.create({ data: { workspaceId: demo.id, userId: demoUser.id, role: "OWNER" } });
  await db.project.create({ data: { workspaceId: demo.id, key: `D-${suffix}`, name: "پروژه عمومی تست" } });

  const privateUser = await db.user.create({ data: { name: "Private smoke", email: `private-${suffix}@example.invalid`, passwordHash: "!no-login" } });
  userIds.push(privateUser.id);
  const privateWs = await db.workspace.create({ data: { slug: `private-${suffix}`, name: "Private work", ownerId: privateUser.id } });
  workspaceIds.push(privateWs.id);
  await db.membership.create({ data: { workspaceId: privateWs.id, userId: privateUser.id, role: "OWNER" } });
  await db.project.create({ data: { workspaceId: privateWs.id, key: `P-${suffix}`, name: "SECRET_PRIVATE_PROJECT_NEVER_PUBLIC" } });

  const publicApi = await fetch(host + "/api/public/demo", { redirect: "manual" });
  assert.equal(publicApi.status, 200, "public demo endpoint must be available without login");
  const raw = await publicApi.text();
  assert.ok(raw.includes("پروژه عمومی تست"), "demo project must be visible");
  assert.ok(!raw.includes("SECRET_PRIVATE_PROJECT_NEVER_PUBLIC"), "other workspaces must not leak");
  const data = JSON.parse(raw);
  assert.equal(data.role, "VIEWER");
  assert.equal(data.projects.length, 1);
  assert.ok(!raw.includes("passwordHash"), "password hashes must never be exposed");

  const publicPage = await fetch(host + "/dashboard", { redirect: "manual" });
  assert.equal(publicPage.status, 200, "dashboard must be accessible without login");
  assert.match(await publicPage.text(), /ProjectFlow/);
  const login = await fetch(host + "/login", { redirect: "manual" });
  assert.ok([307,308].includes(login.status), "login should redirect visitors to public demo");
  assert.equal(new URL(login.headers.get("location"),host).pathname, "/dashboard");

  const privateApi = await fetch(host + "/api/v1/bootstrap", { redirect: "manual" });
  assert.equal(privateApi.status, 401, "private bootstrap must keep authentication");
  const blockedWrite = await fetch(host + "/api/v1/projects", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Unauthorized project" }), redirect: "manual"
  });
  assert.equal(blockedWrite.status, 401, "public visitor must not be able to mutate projects");
  console.log("Public demo smoke passed: public read, private isolation, no login, protected API writes.");
}
try { await main(); }
finally {
  for(const id of workspaceIds.reverse()) await db.workspace.delete({ where: { id } }).catch(()=>{});
  for(const id of userIds.reverse()) await db.user.delete({ where: { id } }).catch(()=>{});
  await db.$disconnect();
}