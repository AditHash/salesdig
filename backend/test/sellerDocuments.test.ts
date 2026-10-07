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
process.env.JWT_SECRET = "salesdig-documents-test-secret";

const { postgres, initializePostgres } = await import("../src/config/postgres.js");
const { DEFAULT_WORKSPACE_SETTINGS } = await import("../src/config/workspaceDefaults.js");
const { processNextSellerDocument } = await import("../src/services/sellerDocumentWorker.service.js");
const { default: app } = await import("../src/app.js");
const workspaces = [randomUUID(), randomUUID()];
const admins = [randomUUID(), randomUUID()];
const member = randomUUID();
let server: Server;
let base = "";

const token = (user: string, forgedWorkspace?: string) => jwt.sign({ id: user, workspaceId: forgedWorkspace }, process.env.JWT_SECRET!);
const json = async (path: string, user: string, method = "GET", body?: unknown, forgedWorkspace?: string) => {
  const response = await fetch(`${base}${path}`, {
    method, headers: { Authorization: `Bearer ${token(user, forgedWorkspace)}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
};
const upload = async (path: string, user: string, content: string, method = "POST", version?: number, name = "seller.txt") => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token(user)}`,
      "Content-Type": "application/octet-stream",
      "X-Document-Name": encodeURIComponent(name),
      "X-Document-Type": name.endsWith(".md") ? "text/markdown" : "text/plain",
      ...(version ? { "X-Document-Version": String(version) } : {})
    },
    body: Buffer.from(content)
  });
  return { status: response.status, data: await response.json() };
};

before(async () => {
  await initializePostgres();
  for (const [index, workspaceId] of workspaces.entries()) {
    await postgres.query("INSERT INTO workspaces (id, slug, settings) VALUES ($1, $2, $3::jsonb)",
      [workspaceId, `document-test-${workspaceId}`, JSON.stringify({ ...DEFAULT_WORKSPACE_SETTINGS, companyName: `Document Seller ${index}` })]);
    await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, 'Document Admin', $2, 'admin', $3)",
      [admins[index], `${admins[index]}@example.test`, workspaceId]);
  }
  await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, 'Document Member', $2, 'user', $3)",
    [member, `${member}@example.test`, workspaces[0]]);
  server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  base = `http://127.0.0.1:${address.port}/api/seller-documents`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await postgres.query("DELETE FROM workspaces WHERE id = ANY($1::uuid[])", [workspaces]);
  await postgres.end();
});

test("upload, extraction, review, replacement, and deletion keep tenant and version boundaries", async () => {
  const content = "Cloud migration service includes AWS migration and infrastructure modernization. Partner Example Partner supports implementation.";
  assert.equal((await upload("/", member, content)).status, 403);
  assert.equal((await upload("/", admins[0], "x".repeat(21 * 1024))).status, 413);
  const created = await upload("/", admins[0], content);
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal(created.data.status, "queued");
  assert.equal((await json(`/${id}`, admins[1], "GET", undefined, workspaces[0])).status, 404);
  assert.equal((await json(`/${id}/suggestions`, admins[1])).status, 404);
  assert.equal((await json("/", admins[1])).data.total, 0);
  const download = await fetch(`${base}/${id}/download`, { headers: { Authorization: `Bearer ${token(member)}` } });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), content);
  const foreignDownload = await fetch(`${base}/${id}/download`, { headers: { Authorization: `Bearer ${token(admins[1], workspaces[0])}` } });
  assert.equal(foreignDownload.status, 404);

  const excerpt = "Cloud migration service includes AWS migration";
  const partnerExcerpt = "Partner Example Partner supports implementation";
  assert.equal(await processNextSellerDocument({
    extract: async () => ({ suggestions: [
      { kind: "offering", payload: { name: "Cloud migration", offeringType: "service", description: "AWS migration and infrastructure modernization", capabilities: ["AWS migration"] }, evidenceExcerpt: excerpt },
      { kind: "partner", payload: { name: "Example Partner", description: "Supports implementation", credentials: [] }, evidenceExcerpt: partnerExcerpt }
    ] }),
    embed: async () => Array(768).fill(0.01)
  }), true);
  assert.equal((await json(`/${id}`, member)).data.status, "ready");
  const suggestions = await json(`/${id}/suggestions`, member);
  assert.equal(suggestions.status, 200);
  assert.equal(suggestions.data.data.length, 2);
  const offeringSuggestion = suggestions.data.data.find((item: { itemKind: string }) => item.itemKind === "offering");
  const partnerSuggestion = suggestions.data.data.find((item: { itemKind: string }) => item.itemKind === "partner");
  assert.equal((await json(`/${id}/suggestions/${offeringSuggestion.id}`, member, "PATCH", { decision: "accept" })).status, 403);
  assert.equal((await json(`/${id}/suggestions/${offeringSuggestion.id}`, admins[1], "PATCH", { decision: "accept" }, workspaces[0])).status, 404);
  const accepted = await json(`/${id}/suggestions/${offeringSuggestion.id}`, admins[0], "PATCH", { decision: "accept" });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.item.sourceKind, "document_backed");
  assert.equal(accepted.data.item.reviewStatus, "draft");
  assert.equal(accepted.data.item.name, "Cloud migration");
  assert.equal((await json(`/${id}/suggestions/${offeringSuggestion.id}`, admins[0], "PATCH", { decision: "accept" })).status, 409);
  assert.equal((await json(`/${id}/suggestions/${partnerSuggestion.id}`, admins[0], "PATCH", { decision: "reject" })).status, 200);
  assert.equal((await postgres.query("SELECT count(*)::int AS n FROM seller_document_chunks WHERE document_id = $1", [id])).rows[0].n, 1);

  assert.equal((await upload(`/${id}`, admins[0], "New content replaces previous seller claims.", "PUT", 2)).status, 409);
  const replaced = await upload(`/${id}`, admins[0], "New content replaces previous seller claims.", "PUT", 1, "seller.md");
  assert.equal(replaced.status, 200);
  assert.equal(replaced.data.currentVersion, 2);
  assert.equal((await postgres.query("SELECT count(*)::int AS n FROM seller_document_chunks WHERE document_id = $1", [id])).rows[0].n, 0);
  const retired = await postgres.query("SELECT archived_at, review_status FROM seller_offerings WHERE id = $1 AND workspace_id = $2", [accepted.data.item.id, workspaces[0]]);
  assert.ok(retired.rows[0].archived_at);
  assert.equal(retired.rows[0].review_status, "draft");
  assert.equal((await json(`/${id}/suggestions`, member)).data.data.length, 0);
  assert.equal((await json(`/${id}`, admins[1], "DELETE")).status, 404);
  assert.equal((await json(`/${id}`, admins[0], "DELETE")).status, 200);
  assert.equal((await json(`/${id}`, admins[0])).status, 404);
  assert.equal((await postgres.query("SELECT count(*)::int AS n FROM seller_document_versions WHERE document_id = $1", [id])).rows[0].n, 0);
});

test("invalid model evidence fails safely and explicit retry succeeds", async () => {
  const content = "Seller offers cloud migration services for retail customers.";
  const created = await upload("/", admins[0], content);
  assert.equal(created.status, 201);
  const id = created.data.id;
  await processNextSellerDocument({
    extract: async () => ({ suggestions: [{ kind: "offering", payload: { name: "Made up", offeringType: "service", description: "Unsupported", capabilities: [] }, evidenceExcerpt: "This text is absent" }] }),
    embed: async () => Array(768).fill(0.01)
  });
  const failed = await json(`/${id}`, admins[0]);
  assert.equal(failed.data.status, "failed");
  assert.match(failed.data.errorMessage, /validation/i);
  assert.equal((await json(`/${id}/retry`, admins[1], "POST")).status, 404);
  assert.equal((await json(`/${id}/retry`, admins[0], "POST")).status, 200);
  await processNextSellerDocument({ extract: async () => ({ suggestions: [] }), embed: async () => Array(768).fill(0.01) });
  assert.equal((await json(`/${id}`, admins[0])).data.status, "ready");
});

test("edited suggestions become seller-supplied claims", async () => {
  const content = "Partner Example Partner provides consulting support for cloud delivery.";
  const created = await upload("/", admins[0], content);
  assert.equal(created.status, 201);
  const id = created.data.id;
  await processNextSellerDocument({
    extract: async () => ({ suggestions: [{
      kind: "partner", payload: { name: "Example Partner", description: "Cloud delivery support", credentials: [] },
      evidenceExcerpt: "Partner Example Partner provides consulting support"
    }] }),
    embed: async () => Array(768).fill(0.01)
  });
  const suggestions = await json(`/${id}/suggestions`, admins[0]);
  const suggestion = suggestions.data.data[0];
  const reviewed = await json(`/${id}/suggestions/${suggestion.id}`, admins[0], "PATCH", {
    decision: "accept", payload: { ...suggestion.payload, description: "Seller-added detail" }
  });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.data.item.sourceKind, "seller_supplied");
  const itemId = reviewed.data.item.id;
  assert.equal((await json(`/${id}`, admins[0], "DELETE")).status, 200);
  const partner = await postgres.query("SELECT archived_at, source_kind FROM seller_partners WHERE id = $1", [itemId]);
  assert.equal(partner.rows[0].archived_at, null);
  assert.equal(partner.rows[0].source_kind, "seller_supplied");
});
