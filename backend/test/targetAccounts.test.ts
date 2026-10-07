import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to an isolated database ending in _test");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "salesdig-target-accounts-test-secret";

const { postgres, initializePostgres } = await import("../src/config/postgres.js");
const { DEFAULT_WORKSPACE_SETTINGS } = await import("../src/config/workspaceDefaults.js");
const { default: app } = await import("../src/app.js");
const workspaces = [randomUUID(), randomUUID()];
const admins = [randomUUID(), randomUUID()];
const rep = randomUUID();
const otherRep = randomUUID();
let server: Server;
let base = "";

const token = (userId: string, forgedWorkspace?: string) => jwt.sign({ id: userId, workspaceId: forgedWorkspace }, process.env.JWT_SECRET!);
const request = async (path: string, userId?: string, method = "GET", body?: unknown, forgedWorkspace?: string) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(userId ? { Authorization: `Bearer ${token(userId, forgedWorkspace)}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
};

before(async () => {
  await initializePostgres();
  for (const [index, id] of workspaces.entries()) {
    await postgres.query("INSERT INTO workspaces (id, slug, settings) VALUES ($1, $2, $3::jsonb)",
      [id, `target-test-${id}`, JSON.stringify({ ...DEFAULT_WORKSPACE_SETTINGS, companyName: `Workspace ${index}` })]);
  }
  for (const [id, workspaceId, role] of [
    [admins[0], workspaces[0], "admin"], [admins[1], workspaces[1], "admin"],
    [rep, workspaces[0], "user"], [otherRep, workspaces[0], "user"]
  ]) {
    await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, 'Target Fixture', $2, $3, $4)",
      [id, `${id}@example.test`, role, workspaceId]);
  }
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  base = `http://127.0.0.1:${address.port}/api`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await postgres.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [workspaces]);
  await postgres.end();
});

test("account CRUD, ownership, duplicates, and archive remain scoped", async () => {
  assert.equal((await request("/targets")).status, 401);
  assert.equal((await request("/targets", rep, "POST", { name: "Bad", website: "http://localhost" })).status, 400);
  assert.equal((await request("/targets", rep, "POST", { name: "Acme", website: "acme.example", ownerUserId: otherRep })).status, 403);
  assert.equal((await request("/targets", admins[0], "POST", { name: "Acme", website: "acme.example", ownerUserId: admins[1] })).status, 400);
  const created = await request("/targets", rep, "POST", {
    name: "Acme", website: "https://www.acme.example/path", industry: "Retail",
    targetingReason: "Expansion", tags: ["priority", "priority"]
  });
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(created.data.normalizedDomain, "acme.example");
  assert.equal(created.data.ownerUserId, rep);
  assert.deepEqual(created.data.tags, ["priority"]);
  assert.equal((await request("/targets", rep, "POST", { name: "ACME", website: "acme.example" })).status, 409);
  assert.equal((await request("/targets", rep, "POST", { name: "Acme Subsidiary", website: "acme.example" })).status, 201);
  assert.equal((await request(`/targets/${id}`, admins[1], "GET", undefined, workspaces[0])).status, 404);
  assert.equal((await request("/targets", admins[1], "GET", undefined, workspaces[0])).data.total, 0);
  assert.equal((await request(`/targets/${id}`, otherRep)).status, 200);
  assert.equal((await request(`/targets/${id}`, otherRep, "PATCH", { version: 1, notes: "No" })).status, 403);
  assert.equal((await request(`/targets/${id}`, rep, "PATCH", { version: 1, ownerUserId: otherRep })).status, 403);
  assert.equal((await request(`/targets/${id}`, admins[1], "PATCH", { version: 1, notes: "No" })).status, 404);
  const edited = await request(`/targets/${id}`, rep, "PATCH", { version: 1, notes: "Follow up", tags: ["priority", "cloud"] });
  assert.equal(edited.status, 200);
  assert.equal(edited.data.version, 2);
  assert.equal((await request(`/targets/${id}`, rep, "PATCH", { version: 1, notes: "Stale" })).status, 409);
  const assigned = await request(`/targets/${id}`, admins[0], "PATCH", { version: 2, ownerUserId: otherRep });
  assert.equal(assigned.status, 200);
  assert.equal((await request(`/targets/${id}`, rep, "PATCH", { version: 3, notes: "No longer owner" })).status, 403);
  const archived = await request(`/targets/${id}`, otherRep, "PATCH", { version: 3, archived: true });
  assert.equal(archived.status, 200);
  assert.ok(archived.data.archivedAt);
  assert.equal((await request(`/targets/${id}/research`, admins[0], "POST")).status, 409);
  assert.equal((await request("/targets?search=Acme", admins[0])).data.total, 1);
  assert.equal((await request("/targets?search=Acme&includeArchived=true", admins[0])).data.total, 2);
  assert.equal((await request(`/targets/${id}`, admins[0], "PATCH", { version: 4, archived: false })).status, 200);
});

test("legacy report links only to owned, matching-domain account; history persists after archive", async () => {
  const created = await request("/targets", rep, "POST", { name: "Legacy Prospect", website: "legacy.example" });
  assert.equal(created.status, 201);
  const id = created.data.id;
  const runId = randomUUID();
  const reportId = randomUUID();
  await postgres.query(
    `INSERT INTO analysis_runs (id, user_id, workspace_id, status, input, started_at, report_id)
     VALUES ($1, $2, $3, 'completed', '{}'::jsonb, now(), $4)`, [runId, rep, workspaces[0], reportId]
  );
  await postgres.query(
    `INSERT INTO analysis_reports (id, user_id, workspace_id, run_id, customer_name, company_domain,
      annual_spend, validated_profile, overall_confidence)
     VALUES ($1, $2, $3, $4, 'Legacy Prospect', 'legacy.example', 0, '{}'::jsonb, 0)`,
    [reportId, rep, workspaces[0], runId]
  );
  assert.equal((await request(`/targets/${id}/link-report`, admins[1], "POST", { reportId }, workspaces[0])).status, 404);
  assert.equal((await request(`/targets/${id}/link-report`, otherRep, "POST", { reportId })).status, 404);
  const wrongTarget = await request("/targets", rep, "POST", { name: "Different Prospect", website: "different.example" });
  assert.equal(wrongTarget.status, 201);
  assert.equal((await request(`/targets/${wrongTarget.data.id}/link-report`, rep, "POST", { reportId })).status, 400);
  assert.equal((await postgres.query("SELECT account_id FROM analysis_reports WHERE id = $1", [reportId])).rows[0].account_id, null);
  assert.equal((await request(`/targets/${id}/link-report`, rep, "POST", { reportId })).status, 200);
  assert.equal((await request(`/targets/${id}/history`, rep)).data.reports[0].id, reportId);
  assert.equal((await request(`/analysis/v2/report/${reportId}`, rep)).status, 200);
  const archived = await request(`/targets/${id}`, rep, "PATCH", { version: 1, archived: true });
  assert.equal(archived.status, 200);
  assert.equal((await request(`/targets/${id}/history`, rep)).data.reports[0].id, reportId);
  assert.equal((await request(`/analysis/v2/report/${reportId}`, rep)).status, 200);
  assert.equal((await request(`/analysis/v2/report/${reportId}/regenerate`, rep, "POST")).status, 409);
  const scope = await postgres.query("SELECT account_id FROM analysis_runs WHERE id = $1", [runId]);
  assert.equal(scope.rows[0].account_id, id);
});

test("forged account IDs cannot create paid work or cross-tenant links", async () => {
  const created = await request("/targets", admins[0], "POST", { name: "Private Target", website: "private.example" });
  const id = created.data.id;
  const beforeRuns = await postgres.query<{ n: number }>("SELECT count(*)::int AS n FROM analysis_runs WHERE workspace_id = $1", [workspaces[1]]);
  assert.equal((await request(`/targets/${id}/research`, admins[1], "POST", undefined, workspaces[0])).status, 404);
  assert.equal((await request(`/targets/${id}/history`, admins[1])).status, 404);
  const afterRuns = await postgres.query<{ n: number }>("SELECT count(*)::int AS n FROM analysis_runs WHERE workspace_id = $1", [workspaces[1]]);
  assert.equal(afterRuns.rows[0].n, beforeRuns.rows[0].n);
  const foreignFk = await postgres.query("SELECT id FROM target_accounts WHERE workspace_id = $1 AND id = $2", [workspaces[0], id]);
  assert.equal(foreignFk.rowCount, 1);
  const bogusRunId = randomUUID();
  await postgres.query("INSERT INTO analysis_runs (id, user_id, workspace_id, status, input, started_at) VALUES ($1,$2,$3,'failed','{}'::jsonb,now())",
    [bogusRunId, admins[1], workspaces[1]]);
  await assert.rejects(
    postgres.query("UPDATE analysis_runs SET account_id = $1 WHERE id = $2", [id, bogusRunId]),
    (error: any) => error.code === "23503"
  );
});

test("account research rejects an active duplicate and records provider failure without a paid call", async () => {
  const created = await request("/targets", rep, "POST", { name: "Run Target", website: "run-target.example" });
  assert.equal(created.status, 201);
  const id = created.data.id;
  const activeRun = randomUUID();
  await postgres.query(
    `INSERT INTO analysis_runs (id, user_id, workspace_id, account_id, status, input, started_at)
     VALUES ($1, $2, $3, $4, 'running', '{}'::jsonb, now())`, [activeRun, rep, workspaces[0], id]
  );
  const before = await postgres.query<{ n: number }>("SELECT count(*)::int AS n FROM analysis_runs WHERE account_id = $1", [id]);
  assert.equal((await request(`/targets/${id}/research`, rep, "POST")).status, 409);
  const afterDuplicate = await postgres.query<{ n: number }>("SELECT count(*)::int AS n FROM analysis_runs WHERE account_id = $1", [id]);
  assert.equal(afterDuplicate.rows[0].n, before.rows[0].n);
  await postgres.query("UPDATE analysis_runs SET status = 'failed' WHERE id = $1", [activeRun]);
  const previousKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "";
  try {
    assert.equal((await request(`/targets/${id}/research`, rep, "POST")).status, 500);
  } finally { process.env.GEMINI_API_KEY = previousKey; }
  const history = await request(`/targets/${id}/history`, rep);
  assert.equal(history.status, 200);
  assert.equal(history.data.runs.length, 2);
  assert.equal(history.data.runs[0].status, "failed");
  assert.equal(history.data.runs[0].reportId, null);
});
