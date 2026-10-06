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
process.env.JWT_SECRET = "salesdig-catalog-test-secret";

const { postgres, initializePostgres } = await import("../src/config/postgres.js");
const { getApprovedOfferings } = await import("../src/services/sellerCatalog.service.js");
const { DEFAULT_WORKSPACE_SETTINGS } = await import("../src/config/workspaceDefaults.js");
const { default: app } = await import("../src/app.js");
const workspaces = [randomUUID(), randomUUID()];
const admins = [randomUUID(), randomUUID()];
const member = randomUUID();
let server: Server;
let base = "";

const request = async (path: string, user: string, method = "GET", body?: unknown, forgedWorkspace?: string) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt.sign({ id: user, workspaceId: forgedWorkspace }, process.env.JWT_SECRET!)}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
};

before(async () => {
  await initializePostgres();
  for (const [index, workspaceId] of workspaces.entries()) {
    await postgres.query("INSERT INTO workspaces (id, slug, settings) VALUES ($1, $2, $3::jsonb)",
      [workspaceId, `catalog-test-${workspaceId}`, JSON.stringify({ ...DEFAULT_WORKSPACE_SETTINGS, companyName: `Seller ${index}` })]);
    await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, 'Catalog Admin', $2, 'admin', $3)",
      [admins[index], `${admins[index]}@example.test`, workspaceId]);
  }
  await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, 'Catalog Member', $2, 'user', $3)",
    [member, `${member}@example.test`, workspaces[0]]);
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  base = `http://127.0.0.1:${address.port}/api/seller`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await postgres.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [workspaces]);
  await postgres.end();
});

test("offerings require review, retain versions, and archive without losing history", async () => {
  const denied = await request("/offerings", member, "POST", { name: "Blocked" });
  assert.equal(denied.status, 403);
  const created = await request("/offerings", admins[0], "POST", {
    name: "Cloud modernization", offeringType: "consulting", description: "Modernize cloud infrastructure",
    capabilities: ["AWS migration"], businessOutcomes: ["Lower operating cost"], relevantIndustries: ["Retail"],
    idealCustomerProfile: "Growing retailers"
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.reviewStatus, "draft");
  assert.equal(created.data.sourceKind, "seller_supplied");
  assert.equal(created.data.version, 1);
  const id = created.data.id;
  assert.ok(!(await getApprovedOfferings(workspaces[0])).some(item => item.id === id));
  assert.equal((await request(`/offerings/${id}`, admins[1], "GET", undefined, workspaces[0])).status, 404);
  assert.equal((await request(`/offerings/${id}`, admins[1], "PATCH", { version: 1, reviewStatus: "approved" }, workspaces[0])).status, 404);
  assert.equal((await request(`/offerings/${id}`, admins[0], "PATCH", { version: 0, reviewStatus: "approved" })).status, 400);
  const approved = await request(`/offerings/${id}`, admins[0], "PATCH", { version: 1, reviewStatus: "approved" });
  assert.equal(approved.status, 200);
  assert.equal(approved.data.version, 2);
  assert.ok((await getApprovedOfferings(workspaces[0])).some(item => item.id === id));
  assert.equal((await request(`/offerings/${id}`, admins[0], "PATCH", { version: 1, name: "Stale" })).status, 409);
  const archived = await request(`/offerings/${id}`, admins[0], "PATCH", { version: 2, archived: true });
  assert.equal(archived.status, 200);
  assert.ok(archived.data.archivedAt);
  assert.ok(!(await getApprovedOfferings(workspaces[0])).some(item => item.id === id));
  assert.equal((await request("/offerings", member)).data.total, 0);
  assert.equal((await request("/offerings?includeArchived=true", member)).data.total, 1);
  const versions = await request(`/offerings/${id}/versions`, member);
  assert.equal(versions.status, 200);
  assert.deepEqual(versions.data.data.map((entry: { version: number }) => entry.version), [3, 2, 1]);
  assert.equal(versions.data.data[0].snapshot.reviewStatus, "approved");
});

test("partners and case studies stay tenant-scoped and seller-supplied", async () => {
  const offering = await request("/offerings", admins[0], "POST", {
    name: "Managed operations", offeringType: "managed_service", description: "Manage cloud operations",
    capabilities: ["24/7 monitoring"]
  });
  assert.equal(offering.status, 201);
  const partner = await request("/partners", admins[0], "POST", {
    name: "Example Partner", description: "Seller-reported partner relationship", credentials: ["Seller supplied claim"]
  });
  assert.equal(partner.status, 201);
  assert.equal(partner.data.sourceKind, "seller_supplied");
  assert.equal((await request(`/partners/${partner.data.id}`, admins[1])).status, 404);
  const invalidLink = await request("/case-studies", admins[1], "POST", {
    title: "Foreign link", summary: "Should not be saved", offeringId: offering.data.id
  });
  assert.equal(invalidLink.status, 400);
  const caseStudy = await request("/case-studies", admins[0], "POST", {
    title: "Retail migration", clientName: "Example Client", summary: "Seller-reported migration result",
    outcomes: ["Reduced deployment time"], offeringId: offering.data.id
  });
  assert.equal(caseStudy.status, 201);
  assert.equal(caseStudy.data.offeringId, offering.data.id);
  assert.equal(caseStudy.data.reviewStatus, "draft");
  assert.equal((await request(`/case-studies/${caseStudy.data.id}`, admins[1])).status, 404);
  const approved = await request(`/case-studies/${caseStudy.data.id}`, admins[0], "PATCH", { version: 1, reviewStatus: "approved" });
  assert.equal(approved.status, 200);
  assert.equal((await request(`/case-studies/${caseStudy.data.id}/versions`, admins[0])).data.data.length, 2);
});
