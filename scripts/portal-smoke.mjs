import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const uid = randomBytes(7).toString("hex");
let workspace;
let user;

async function main() {
  user = await db.user.create({ data: {
    name: "Portal Test", email: "portal-smoke-" + uid + "@example.invalid",
    passwordHash: await bcrypt.hash(randomBytes(20).toString("hex"), 6)
  } });
  workspace = await db.workspace.create({ data: { name: "Portal Test Workspace", slug: "portal-test-" + uid, ownerId: user.id } });
  await db.membership.create({ data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" } });
  const clientA = await db.client.create({ data: { workspaceId: workspace.id, name: "مشتری آ " + uid } });
  const clientB = await db.client.create({ data: { workspaceId: workspace.id, name: "مشتری ب " + uid } });
  const visible = "پروژه مخصوص مشتری آ " + uid;
  const hidden = "پروژه مخصوص مشتری ب " + uid;
  const projectA = await db.project.create({ data: { workspaceId: workspace.id, clientId: clientA.id, name: visible, key: "A" + uid } });
  const projectB = await db.project.create({ data: { workspaceId: workspace.id, clientId: clientB.id, name: hidden, key: "B" + uid } });
  await db.task.create({ data: { projectId: projectA.id, title: "کار قابل مشاهده " + uid, createdById: user.id } });
  await db.task.create({ data: { projectId: projectB.id, title: "کار خصوصی " + uid, createdById: user.id } });

  const noCookie = await fetch(base + "/portal");
  assert.equal(noCookie.status, 200);
  assert.match(await noCookie.text(), /دسترسی فعال نیست/);

  const sessionSecret = randomBytes(32).toString("hex");
  const session = await db.clientPortalSession.create({
    data: { clientId: clientA.id, tokenHash: hash(sessionSecret), expiresAt: new Date(Date.now() + 600000) }
  });
  const cookie = "projectflow_client=" + sessionSecret;
  const accessible = await fetch(base + "/portal", { headers: { Cookie: cookie } });
  const html = await accessible.text();
  assert.equal(accessible.status, 200);
  assert.ok(html.includes(visible), "client A project must be visible");
  assert.ok(!html.includes(hidden), "client B project must never be visible");
  assert.ok(!html.includes("کار خصوصی " + uid), "client B tasks must never leak");

  const internalApi = await fetch(base + "/api/v1/bootstrap", { headers: { Cookie: cookie } });
  assert.equal(internalApi.status, 401, "customer cookie cannot enter team API");
  const privateNotices = await fetch(base + "/api/v1/notifications", { headers: { Cookie: cookie } });
  assert.equal(privateNotices.status, 401, "customer cookie cannot read internal notifications");
  const privateMutation = await fetch(base + "/api/v1/notifications/read-all", {
    method: "PATCH", headers: { Cookie: cookie }
  });
  assert.equal(privateMutation.status, 401, "customer cookie cannot modify team notifications");

  await db.clientPortalSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  const revoked = await fetch(base + "/portal", { headers: { Cookie: cookie } });
  assert.ok(!(await revoked.text()).includes(visible), "revoked session must not retain access");

  const inviteToken = randomBytes(32).toString("hex");
  await db.clientPortalInvitation.create({ data: {
    clientId: clientA.id, createdById: user.id,
    tokenHash: hash(inviteToken), expiresAt: new Date(Date.now() + 3600000)
  } });
  const submitInvite = () => fetch(base + "/api/portal/activate", {
    method: "POST", body: new URLSearchParams({ token: inviteToken }), redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });
  const activation = await submitInvite();
  assert.equal(activation.status, 303);
  assert.equal(new URL(activation.headers.get("location")).pathname, "/portal");
  const setCookie = activation.headers.get("set-cookie") || "";
  assert.match(setCookie, /projectflow_client=/);

  const replay = await submitInvite();
  assert.equal(replay.status, 303);
  assert.equal(new URL(replay.headers.get("location")).searchParams.get("expired"), "1", "invitation must be single-use");

  const portalCookie = setCookie.split(";")[0];
  const portalAfterLogin = await fetch(base + "/portal", { headers: { Cookie: portalCookie } });
  const loggedInHtml = await portalAfterLogin.text();
  assert.ok(loggedInHtml.includes(visible), "new portal session should work");
  assert.ok(!loggedInHtml.includes(hidden), "new portal session must remain isolated");

  const logout = await fetch(base + "/api/portal/logout", {
    method: "POST", headers: { Cookie: portalCookie }, redirect: "manual"
  });
  assert.equal(logout.status, 303);
  const portalAfterLogout = await fetch(base + "/portal", { headers: { Cookie: portalCookie } });
  assert.ok(!(await portalAfterLogout.text()).includes(visible), "logout invalidates session");

  console.log("Portal smoke checks passed: isolation, internal API protection, revocation, single-use invitation, logout.");
}
try { await main(); }
finally {
  if (workspace) await db.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
  if (user) await db.user.delete({ where: { id: user.id } }).catch(() => {});
  await db.$disconnect();
}
