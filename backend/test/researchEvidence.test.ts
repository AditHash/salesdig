import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHash, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must point to an isolated database ending in _test");
}
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "salesdig-research-evidence-test-secret";

const { postgres, initializePostgres } = await import("../src/config/postgres.js");
const { DEFAULT_WORKSPACE_SETTINGS } = await import("../src/config/workspaceDefaults.js");
const { processNextAccountResearch } = await import("../src/services/research/researchJobs.service.js");
const { processNextOpportunityMatching, calculateSalesPotential } = await import("../src/services/opportunityMatching.service.js");
const { validateResearchClaims } = await import("../src/services/research/evidenceExtraction.service.js");
const { validateTargetIntelligence } = await import("../src/services/research/intelligenceExtraction.service.js");
const { isPublicAddress, parsePublicUrl, extractPageText } = await import("../src/services/research/publicSourceFetch.service.js");
const { default: app } = await import("../src/app.js");
const workspaces = [randomUUID(), randomUUID()];
const users = [randomUUID(), randomUUID()];
let server: Server;
let base = "";
const token = (id: string, forgedWorkspace?: string) => jwt.sign({ id, workspaceId: forgedWorkspace }, process.env.JWT_SECRET!);
const request = async (path: string, userId: string, method = "GET", body?: unknown, forgedWorkspace?: string) => {
  const response = await fetch(`${base}${path}`, {
    method, headers: { Authorization: `Bearer ${token(userId, forgedWorkspace)}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, data: await response.json() };
};
const usage = { promptTokens: 12, outputTokens: 8, totalTokens: 20 };
const sourceFor = (url: string, domain: string) => {
  const content = "Acme Research builds cloud applications for retail companies. The company publishes engineering updates on its official website.";
  return { url, title: "Acme Research", content,
    contentHash: createHash("sha256").update(content).digest("hex"),
    retrievedAt: new Date(), publishedAt: null, sourceType: "company" as const };
};
const validClaims = (sources: any[]) => validateResearchClaims({ claims: [{
  statement: "Acme Research builds cloud applications for retail companies.",
  classification: "fact", certainty: "confirmed", eventDate: null,
  evidence: [{ sourceId: sources[0].id, excerpt: "Acme Research builds cloud applications for retail companies" }]
}] }, sources);
const intelligenceFor = (claims: any[]) => ({ intelligence: {
  technologies: claims.length ? [{ claimId: claims[0].id, name: "AWS", category: "cloud", status: "confirmed", rationale: "The source directly describes cloud applications.", observedAt: null }] : [],
  people: [], signals: [], gaps: []
}, usage });

before(async () => {
  await initializePostgres();
  for (const [index, workspaceId] of workspaces.entries()) {
    await postgres.query("INSERT INTO workspaces (id, slug, settings) VALUES ($1, $2, $3::jsonb)",
      [workspaceId, `evidence-test-${workspaceId}`, JSON.stringify({ ...DEFAULT_WORKSPACE_SETTINGS, companyName: `Seller ${index}` })]);
    await postgres.query("INSERT INTO users (id, name, email, role, workspace_id) VALUES ($1, 'Research User', $2, 'admin', $3)",
      [users[index], `${users[index]}@example.test`, workspaceId]);
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

test("public fetch validation blocks private destinations and keeps unknown dates unknown", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "169.254.169.254", "::1", "fc00::1", "fe80::1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.throws(() => parsePublicUrl("http://127.0.0.1/"));
  assert.throws(() => parsePublicUrl("http://user:pass@example.com/"));
  assert.throws(() => parsePublicUrl("file:///etc/passwd"));
  assert.equal(extractPageText("<html><title>Title</title><body>Content here</body></html>").publishedAt, null);
});

test("queued account research stores evidence and preserves workspace boundaries", async () => {
  const created = await request("/targets", users[0], "POST", { name: "Acme Research", website: "acme-research.example" });
  assert.equal(created.status, 201);
  const id = created.data.id;
  const queued = await request(`/targets/${id}/research`, users[0], "POST");
  assert.equal(queued.status, 202);
  const runId = queued.data.runId;
  assert.equal((await request(`/targets/${id}/research`, users[0], "POST")).status, 409);
  assert.equal((await request(`/targets/${id}/research/${runId}`, users[1], "GET", undefined, workspaces[0])).status, 404);
  let fetched = 0;
  assert.equal(await processNextAccountResearch({
    discover: async () => ({ urls: [], usage }),
    fetch: async (url, domain) => { fetched++; return sourceFor(url, domain); },
    extract: async (_name, _domain, sources) => ({ claims: validClaims(sources), usage }),
    analyze: async (_name, claims) => intelligenceFor(claims)
  }), true);
  assert.equal(fetched, 1);
  const run = await request(`/targets/${id}/research/${runId}`, users[0]);
  assert.equal(run.data.status, "completed");
  assert.equal(run.data.researchStage, "completed");
  assert.equal(run.data.resourceUsage.discovery.totalTokens, 20);
  const evidence = await request(`/targets/${id}/research/${runId}/evidence`, users[0]);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.data.sources.length, 1);
  assert.equal(evidence.data.claims.length, 1);
  assert.equal(evidence.data.claims[0].classification, "fact");
  const sourceId = evidence.data.sources[0].id;
  assert.equal(evidence.data.claims[0].evidence[0].sourceId, sourceId);
  assert.equal((await request(`/targets/${id}/research/${runId}/evidence`, users[1])).status, 404);
  assert.equal((await request(`/targets/${id}/research/${runId}/sources/${sourceId}`, users[1])).status, 404);
  assert.equal((await request(`/targets/${id}/research/${runId}/sources/${sourceId}`, users[0])).data.content.includes("Acme Research"), true);
  const intelligence = await request(`/targets/${id}/intelligence`, users[0]);
  assert.equal(intelligence.status, 200);
  assert.equal(intelligence.data.technologies[0].status, "confirmed");
  assert.equal((await request(`/targets/${id}/intelligence`, users[1])).status, 404);
  const offeringId = randomUUID();
  await postgres.query(`INSERT INTO seller_offerings (id,workspace_id,name,offering_type,description,capabilities,review_status,created_by)
    VALUES ($1,$2,'Cloud application consulting','consulting','Cloud application consulting for retail teams.',ARRAY['cloud applications','retail'], 'approved',$3)`, [offeringId, workspaces[0], users[0]]);
  await postgres.query("INSERT INTO seller_offering_versions (workspace_id,offering_id,version,snapshot,changed_by) VALUES ($1,$2,1,$3::jsonb,$4)", [workspaces[0], offeringId, JSON.stringify({ name: "Cloud application consulting" }), users[0]]);
  const match = await request(`/targets/${id}/opportunities`, users[0], "POST");
  assert.equal(match.status, 202);
  assert.equal((await request(`/targets/${id}/opportunities`, users[0])).data.latestAttempt.status, 'queued');
  assert.equal(await processNextOpportunityMatching(), true);
  const opportunities = await request(`/targets/${id}/opportunities`, users[0]);
  assert.equal(opportunities.status, 200);
  assert.equal(opportunities.data.latestAttempt.status, 'completed');
  assert.equal(opportunities.data.opportunities.length, 1);
  assert.equal(opportunities.data.opportunities[0].evidence.length, 1);
  assert.equal((await request(`/targets/${id}/opportunities`, users[1])).status, 404);
  assert.equal((await request(`/analysis/v2/report/${run.data.reportId}`, users[0])).status, 200);
  const pdf = await fetch(`${base}/analysis/v2/report/${run.data.reportId}/pdf`, {
    headers: { Authorization: `Bearer ${token(users[0])}` }
  });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get("content-type") || "", /application\/pdf/);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
  assert.equal((await request(`/analysis/v2/report/${run.data.reportId}/regenerate`, users[0], "POST")).status, 409);
  const report = await postgres.query("SELECT research_status, account_id FROM analysis_reports WHERE id = $1", [run.data.reportId]);
  assert.equal(report.rows[0].research_status, "complete");
  assert.equal(report.rows[0].account_id, id);
});

test("sales potential scoring is deterministic and does not treat missing data as a negative", () => {
  const input = { offeringText: "cloud application retail", claim: "retail company builds cloud applications", needKind: "confirmed_need" as const, signals: [], technologies: [], people: [] };
  const first = calculateSalesPotential(input);
  const second = calculateSalesPotential(input);
  assert.deepEqual(first, second);
  assert.equal(first.coverage, 50);
  assert.equal(first.breakdown.financialCapacity.value, null);
});

test("invalid evidence leaves labelled partial sources; retry reuses sources and publishes once", async () => {
  const created = await request("/targets", users[0], "POST", { name: "Acme Research", website: "retry-research.example" });
  const id = created.data.id;
  const queued = await request(`/targets/${id}/research`, users[0], "POST");
  const runId = queued.data.runId;
  await processNextAccountResearch({
    discover: async () => ({ urls: [], usage }),
    fetch: async (url, domain) => sourceFor(url, domain),
    extract: async (_name, _domain, sources) => ({ claims: validateResearchClaims({ claims: [{
      statement: "Unsupported statement", classification: "fact", certainty: "confirmed", eventDate: null,
      evidence: [{ sourceId: sources[0].id, excerpt: "Not present in source" }]
    }] }, sources), usage }),
    analyze: async (_name, claims) => intelligenceFor(claims)
  });
  const failed = await request(`/targets/${id}/research/${runId}`, users[0]);
  assert.equal(failed.data.status, "failed");
  assert.equal(failed.data.partialResults, true);
  const partial = await request(`/targets/${id}/research/latest/evidence`, users[0]);
  assert.equal(partial.data.sources.length, 1);
  assert.equal(partial.data.claims.length, 0);
  assert.equal((await request(`/targets/${id}/research/${runId}/retry`, users[1], "POST")).status, 404);
  assert.equal((await request(`/targets/${id}/research/${runId}/retry`, users[0], "POST")).status, 202);
  let discoveryCalls = 0;
  await processNextAccountResearch({
    discover: async () => { discoveryCalls++; throw new Error("Should reuse stored sources"); },
    fetch: async () => { throw new Error("Should reuse stored sources"); },
    extract: async (_name, _domain, sources) => ({ claims: validClaims(sources), usage }),
    analyze: async (_name, claims) => intelligenceFor(claims)
  });
  assert.equal(discoveryCalls, 0);
  const completed = await request(`/targets/${id}/research/${runId}`, users[0]);
  assert.equal(completed.data.status, "completed");
  assert.equal((await postgres.query("SELECT count(*)::int AS n FROM research_sources WHERE run_id = $1", [runId])).rows[0].n, 1);
  assert.equal((await postgres.query("SELECT count(*)::int AS n FROM analysis_reports WHERE run_id = $1", [runId])).rows[0].n, 1);
});

test("claim validation rejects foreign source IDs, absent excerpts, and invented event dates", () => {
  const source = { ...sourceFor("https://acme-research.example/", "acme-research.example"), id: randomUUID() };
  assert.throws(() => validateResearchClaims({ claims: [{
    statement: "Unsupported fact", classification: "fact", certainty: "confirmed", eventDate: null,
    evidence: [{ sourceId: randomUUID(), excerpt: "Acme Research builds cloud applications" }]
  }] }, [source]));
  assert.throws(() => validateResearchClaims({ claims: [{
    statement: "Unsupported fact", classification: "fact", certainty: "confirmed", eventDate: null,
    evidence: [{ sourceId: source.id, excerpt: "Text absent from source" }]
  }] }, [source]));
  assert.throws(() => validateResearchClaims({ claims: [{
    statement: "Unsupported fact", classification: "fact", certainty: "confirmed", eventDate: "2026-02-31",
    evidence: [{ sourceId: source.id, excerpt: "Acme Research builds cloud applications" }]
  }] }, [source]));
});

test("intelligence keeps job evidence likely and rejects gaps based only on missing information", () => {
  const claim = { id: randomUUID(), statement: "The company has a job posting for an AWS engineer.", classification: "fact" as const, certainty: "confirmed" as const, eventDate: null };
  const result = validateTargetIntelligence({ technologies: [{ claimId: claim.id, name: "AWS", category: "cloud", status: "confirmed", rationale: "Job posting requests AWS experience.", observedAt: null }], people: [], signals: [], gaps: [] }, [claim]);
  assert.equal(result.technologies[0].status, "likely");
  assert.throws(() => validateTargetIntelligence({ technologies: [], people: [], signals: [], gaps: [{ claimId: claim.id, statement: "No evidence of monitoring means a gap.", certainty: "likely", rationale: "No public evidence." }] }, [claim]));
});
