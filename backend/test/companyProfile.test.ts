import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to an isolated database ending in _test");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "salesdig-company-profile-test-secret";

const { postgres, initializePostgres } = await import("../src/config/postgres.js");
const { DEFAULT_WORKSPACE_SETTINGS } = await import("../src/config/workspaceDefaults.js");
const { default: app } = await import("../src/app.js");
const workspaceA = randomUUID();
const workspaceB = randomUUID();
const adminA = randomUUID();
const memberA = randomUUID();
const adminB = randomUUID();
const legacyWorkspace = randomUUID();
const legacyUser = randomUUID();
const legacyRun = randomUUID();
const legacyReport = randomUUID();
let server: Server;
let base = "";

const token = (id: string, workspaceId?: string) => jwt.sign({ id, workspaceId }, process.env.JWT_SECRET!);
const request = async (path: string, user?: string, method = "GET", body?: unknown, forgedWorkspace?: string) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(user ? { Authorization: `Bearer ${token(user, forgedWorkspace)}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
};

before(async () => {
  await initializePostgres();
  for (const [id, name] of [[workspaceA, "Alpha Seller"], [workspaceB, "Beta Seller"]]) {
    await postgres.query("INSERT INTO workspaces (id, slug, settings) VALUES ($1, $2, $3::jsonb)",
      [id, `profile-test-${id}`, JSON.stringify({ ...DEFAULT_WORKSPACE_SETTINGS, companyName: name, companyDescription: "Existing description" })]);
  }
  for (const [id, workspaceId, role] of [[adminA, workspaceA, "admin"], [memberA, workspaceA, "user"], [adminB, workspaceB, "admin"]]) {
    await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, $2, $3, $4, $5)",
      [id, "Fixture User", `${id}@example.test`, role, workspaceId]);
  }
  await postgres.query("UPDATE users SET password = $2 WHERE id = $1", [adminA, await bcrypt.hash("fixture-password", 10)]);
  await postgres.query("INSERT INTO workspaces (id, slug, settings) VALUES ($1, $2, $3::jsonb)",
    [legacyWorkspace, `legacy-profile-test-${legacyWorkspace}`, JSON.stringify({ ...DEFAULT_WORKSPACE_SETTINGS, companyName: "Legacy Seller", companyDescription: "Existing V1 context" })]);
  await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, 'Legacy User', $2, 'admin', $3)",
    [legacyUser, `${legacyUser}@example.test`, legacyWorkspace]);
  await postgres.query("UPDATE users SET password = $2 WHERE id = $1", [legacyUser, await bcrypt.hash("legacy-password", 10)]);
  await postgres.query(
    `INSERT INTO analysis_runs (id, user_id, workspace_id, status, input, started_at, report_id)
     VALUES ($1, $2, $3, 'completed', '{}'::jsonb, now(), $4)`, [legacyRun, legacyUser, legacyWorkspace, legacyReport]);
  await postgres.query(
    `INSERT INTO analysis_reports (id, user_id, workspace_id, run_id, customer_name, company_domain,
      annual_spend, validated_profile, overall_confidence)
     VALUES ($1, $2, $3, $4, 'Fixture Target', 'fixture.example', 0, '{}'::jsonb, 0)`,
    [legacyReport, legacyUser, legacyWorkspace, legacyRun]);
  await postgres.query("INSERT INTO chat_sessions (id, user_id, workspace_id) VALUES ($1, $2, $3)",
    [`session-${legacyUser}`, legacyUser, legacyWorkspace]);
  await postgres.query("INSERT INTO chat_messages (session_id, role, content) VALUES ($1, 'user', 'Legacy question')",
    [`session-${legacyUser}`]);
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  base = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await postgres.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [[workspaceA, workspaceB, legacyWorkspace]]);
  await postgres.end();
});

test("profile access is based on database membership and admin role", async () => {
  assert.equal((await request("/workspace/current/company-profile")).status, 401);
  const a = await request("/workspace/current/company-profile", adminA);
  assert.equal(a.status, 200);
  assert.equal(a.data.companyName, "Alpha Seller");
  assert.equal(a.data.onboardingStatus, "not_started");
  const b = await request(`/workspace/current/company-profile?workspaceId=${workspaceA}`, adminB, "GET", undefined, workspaceA);
  assert.equal(b.status, 200);
  assert.equal(b.data.companyName, "Beta Seller");
  assert.equal((await request("/workspace/current/company-profile", memberA, "PATCH", { version: 0, companyName: "Unauthorized" })).status, 403);
  assert.equal((await request("/workspace/current/company-profile", adminA)).data.companyName, "Alpha Seller");
});

test("draft, completion, validation, concurrency, and V1 settings stay compatible", async () => {
  assert.equal((await request("/workspace/current/company-profile", adminA, "PATCH", { version: 0, website: "javascript:bad" })).status, 400);
  assert.equal((await request("/workspace/current/company-profile", adminA, "PATCH", { version: 0, onboardingStatus: "complete" })).status, 400);
  const draft = await request("/workspace/current/company-profile", adminA, "PATCH", {
    version: 0, companyName: "Alpha Updated", website: "alpha.example", industriesServed: ["Retail"],
    idealCustomerProfile: "Growing retailers", differentiators: ["Specialist team"], onboardingStatus: "in_progress"
  });
  assert.equal(draft.status, 200);
  assert.equal(draft.data.version, 1);
  assert.equal(draft.data.website, "https://alpha.example/");
  assert.equal((await request("/workspace/current/company-profile", adminA, "PATCH", { version: 0, companyName: "Stale" })).status, 409);
  const complete = await request("/workspace/current/company-profile", adminA, "PATCH", { version: 1, onboardingStatus: "complete" });
  assert.equal(complete.status, 200);
  assert.equal(complete.data.onboardingStatus, "complete");
  const edited = await request("/workspace/current/company-profile", adminA, "PATCH", { version: 2, companyDescription: "New seller context" });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.onboardingStatus, "complete");
  const settings = await request("/workspace/current", memberA);
  assert.equal(settings.data.companyName, "Alpha Updated");
  assert.equal(settings.data.companyDescription, "New seller context");
  const legacySettingsSave = await request("/workspace/current", adminA, "PUT", { ...settings.data, companyName: "Alpha via V1 settings" });
  assert.equal(legacySettingsSave.status, 200);
  const afterLegacySave = await request("/workspace/current/company-profile", adminA);
  assert.equal(afterLegacySave.data.version, 4);
  assert.equal(afterLegacySave.data.companyName, "Alpha via V1 settings");
  const preferences = await request("/workspace/current/preferences", adminA, "PATCH", { tagline: "New tagline" });
  assert.equal(preferences.status, 200);
  assert.equal(preferences.data.companyName, "Alpha via V1 settings");
  assert.equal(preferences.data.tagline, "New tagline");
  assert.equal((await request("/workspace/current/preferences", adminA, "PATCH", { companyName: "Forbidden field" })).status, 400);
  assert.equal((await request("/workspace/current/preferences", adminA, "PATCH", { primaryColor: "invalid" })).status, 400);
  assert.equal((await request("/workspace/current/preferences", memberA, "PATCH", { tagline: "Forbidden" })).status, 403);
  const bPreferences = await request("/workspace/current/preferences", adminB, "PATCH", { tagline: "Beta tagline" }, workspaceA);
  assert.equal(bPreferences.status, 200);
  assert.equal(bPreferences.data.companyName, "Beta Seller");
  assert.equal((await request("/workspace/current", adminA)).data.tagline, "New tagline");
  const b = await request("/workspace/current/company-profile", adminB);
  assert.equal(b.data.version, 0);
  assert.equal(b.data.companyName, "Beta Seller");
  assert.equal((await request("/workspace/current/company-profile", adminB, "PATCH", { version: 0, companyName: "Beta New" }, workspaceA)).status, 200);
  assert.equal((await request("/workspace/current/company-profile", adminA)).data.companyName, "Alpha via V1 settings");
});

test("legacy report remains accessible while seller profile is incomplete", async () => {
  const profile = await request("/workspace/current/company-profile", legacyUser);
  assert.equal(profile.data.onboardingStatus, "not_started");
  const report = await request(`/analysis/v2/report/${legacyReport}`, legacyUser);
  assert.equal(report.status, 200);
  assert.equal(report.data.id, legacyReport);
  const outside = await request(`/analysis/v2/report/${legacyReport}`, adminB);
  assert.equal(outside.status, 404);
});

test("V1 login, report history, run, chat history, and export access survive profile migration", async () => {
  const login = await request("/auth/login", undefined, "POST", { email: `${adminA}@example.test`, password: "fixture-password" });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.workspaceId, workspaceA);
  assert.equal((await request("/auth/me", adminA)).status, 200);

  const legacyLogin = await request("/auth/login", undefined, "POST", { email: `${legacyUser}@example.test`, password: "legacy-password" });
  assert.equal(legacyLogin.status, 200);
  const legacyProfileResponse = await fetch(`${base}/workspace/current/company-profile`, {
    headers: { Authorization: `Bearer ${legacyLogin.data.token}` }
  });
  assert.equal(legacyProfileResponse.status, 200);
  assert.equal((await legacyProfileResponse.json()).onboardingStatus, "not_started");

  const reports = await request("/analysis/v2/reports", legacyUser);
  assert.equal(reports.status, 200);
  assert.ok(reports.data.some((report: { id: string }) => report.id === legacyReport));
  const run = await request(`/analysis/v2/run/${legacyRun}`, legacyUser);
  assert.equal(run.status, 200);
  assert.equal(run.data.reportId, legacyReport);
  assert.equal((await request(`/analysis/v2/run/${legacyRun}`, adminB)).status, 404);
  assert.equal((await request(`/analysis/v2/report/${legacyReport}/pdf`, adminB)).status, 404);

  const history = await request("/chat/history", legacyUser);
  assert.equal(history.status, 200);
  assert.equal(history.data.messages[0].content, "Legacy question");
  const otherHistory = await request("/chat/history", adminB);
  assert.equal(otherHistory.status, 200);
  assert.deepEqual(otherHistory.data.messages, []);

  const exportResponse = await fetch(`${base}/analysis/v2/report/${legacyReport}/pdf`, {
    headers: { Authorization: `Bearer ${legacyLogin.data.token}` }
  });
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get("content-type") ?? "", /application\/pdf/);
  const pdfHeader = new Uint8Array(await exportResponse.arrayBuffer()).slice(0, 4);
  assert.equal(new TextDecoder().decode(pdfHeader), "%PDF");
});

test("invalid and unauthenticated research requests create no run", async () => {
  const before = await postgres.query<{ count: string }>("SELECT count(*) FROM analysis_runs WHERE workspace_id = $1", [workspaceA]);
  assert.equal((await request("/analysis/v2/run", memberA, "POST", {})).status, 400);
  assert.equal((await request("/analysis/v2/run", randomUUID(), "POST", { customerName: "Fixture", companyDomain: "fixture.example" })).status, 401);
  const after = await postgres.query<{ count: string }>("SELECT count(*) FROM analysis_runs WHERE workspace_id = $1", [workspaceA]);
  assert.equal(after.rows[0].count, before.rows[0].count);
});

test("blocked users cannot read a profile", async () => {
  await postgres.query("UPDATE users SET is_blocked = true WHERE id = $1", [memberA]);
  assert.equal((await request("/workspace/current/company-profile", memberA)).status, 403);
});
