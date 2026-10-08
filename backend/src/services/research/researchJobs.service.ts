import crypto from "node:crypto";
import { postgres } from "../../config/postgres.js";
import { mapDbRow, mapDbRows } from "../../utils/dbRows.js";
import { RESEARCH_MODEL, RESEARCH_PROMPT_VERSION, discoverSourceUrls, extractClaims,
  type ProviderUsage, type ResearchClaim, type ResearchSource } from "./evidenceExtraction.service.js";
import { extractTargetIntelligence, type IntelligenceClaim, type TargetIntelligence } from "./intelligenceExtraction.service.js";
import { fetchPublicSource, type FetchedSource, SourceFetchError } from "./publicSourceFetch.service.js";

type Providers = {
  discover: typeof discoverSourceUrls;
  fetch: typeof fetchPublicSource;
  extract: typeof extractClaims;
  analyze: typeof extractTargetIntelligence;
};
const defaults: Providers = { discover: discoverSourceUrls, fetch: fetchPublicSource, extract: extractClaims, analyze: extractTargetIntelligence };
type ClaimedRun = { id: string; workspace_id: string; account_id: string; user_id: string; attempts: number; input: { customerName: string; companyDomain: string } };
class LeaseLostError extends Error {}

const verifyLease = async (run: ClaimedRun): Promise<void> => {
  const result = await postgres.query(
    `SELECT 1 FROM analysis_runs WHERE id = $1 AND workspace_id = $2 AND account_id = $3
     AND status = 'running' AND attempts = $4 AND lease_expires_at > now()`,
    [run.id, run.workspace_id, run.account_id, run.attempts]
  );
  if (!result.rowCount) throw new LeaseLostError("Research lease lost");
};

const setStage = async (run: ClaimedRun, stage: string, usage?: Record<string, ProviderUsage>): Promise<void> => {
  const result = await postgres.query(
    `UPDATE analysis_runs SET research_stage = $5, lease_expires_at = now() + interval '5 minutes',
       resource_usage = resource_usage || $6::jsonb, updated_at = now()
     WHERE id = $1 AND workspace_id = $2 AND account_id = $3 AND status = 'running' AND attempts = $4
       AND lease_expires_at > now() RETURNING id`,
    [run.id, run.workspace_id, run.account_id, run.attempts, stage, JSON.stringify(usage ?? {})]
  );
  if (!result.rowCount) throw new LeaseLostError("Research lease lost");
};

const verifyActor = async (run: ClaimedRun): Promise<void> => {
  const result = await postgres.query(
    `SELECT 1 FROM users u JOIN target_accounts a ON a.workspace_id = u.workspace_id
     WHERE u.id = $1 AND u.workspace_id = $2 AND u.is_blocked = false
       AND a.id = $3 AND a.archived_at IS NULL`, [run.user_id, run.workspace_id, run.account_id]
  );
  if (!result.rowCount) throw new Error("Research requester or account is no longer active");
};

export const queueAccountResearch = async (workspaceId: string, accountId: string, actorId: string, input: { customerName: string; companyDomain: string }) => {
  const runId = crypto.randomUUID();
  const result = await postgres.query(
    `INSERT INTO analysis_runs (id, user_id, workspace_id, account_id, status, input, started_at,
      research_stage, seller_profile_version, model_id, prompt_version)
     SELECT $1, $2, w.id, $3, 'queued', $4::jsonb, now(), 'queued',
       w.profile_version, $5, $6 FROM workspaces w WHERE w.id = $7 RETURNING id`,
    [runId, actorId, accountId, JSON.stringify(input), RESEARCH_MODEL, RESEARCH_PROMPT_VERSION, workspaceId]
  );
  if (!result.rowCount) throw new Error("Workspace disappeared before research was queued");
  return { runId, status: "queued" as const, stage: "queued" as const };
};

const claimNext = async (): Promise<ClaimedRun | null> => {
  await postgres.query(
    `UPDATE analysis_runs SET status = 'failed', research_stage = 'failed',
      error = 'Research worker timed out after three attempts.', ended_at = now(), updated_at = now()
     WHERE account_id IS NOT NULL AND status = 'running' AND attempts >= 3 AND lease_expires_at < now()`
  );
  const result = await postgres.query<ClaimedRun>(
    `UPDATE analysis_runs SET status = 'running', research_stage = 'discovering',
      attempts = attempts + 1, lease_expires_at = now() + interval '5 minutes',
      next_attempt_at = NULL, error = NULL, updated_at = now()
     WHERE id = (SELECT id FROM analysis_runs
       WHERE account_id IS NOT NULL AND attempts < 3 AND
         ((status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= now())) OR
          (status = 'running' AND lease_expires_at < now()))
       ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED)
     RETURNING id, workspace_id, account_id, user_id, attempts, input`
  );
  return result.rows[0] ?? null;
};

const existingSources = async (run: ClaimedRun): Promise<ResearchSource[]> => {
  const result = await postgres.query(
    `SELECT id, canonical_url AS url, title, content, content_hash, retrieved_at,
       published_at, source_type FROM research_sources
     WHERE workspace_id = $1 AND account_id = $2 AND run_id = $3 ORDER BY created_at, id`,
    [run.workspace_id, run.account_id, run.id]
  );
  return result.rows.map(row => ({ id: row.id, url: row.url, title: row.title,
    content: row.content, contentHash: row.content_hash, retrievedAt: row.retrieved_at,
    publishedAt: row.published_at, sourceType: row.source_type }));
};

const persistSources = async (run: ClaimedRun, fetched: FetchedSource[]): Promise<ResearchSource[]> => {
  await verifyLease(run);
  const unique = fetched.filter((item, index) => fetched.findIndex(other => other.contentHash === item.contentHash) === index);
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      "SELECT 1 FROM analysis_runs WHERE id = $1 AND workspace_id = $2 AND account_id = $3 AND status = 'running' AND attempts = $4 FOR UPDATE",
      [run.id, run.workspace_id, run.account_id, run.attempts]
    );
    if (!lock.rowCount) throw new LeaseLostError("Research lease lost");
    const saved: ResearchSource[] = [];
    for (const item of unique) {
      const row = await client.query<{ id: string }>(
        `INSERT INTO research_sources (id, workspace_id, account_id, run_id, canonical_url, title,
          source_type, content, content_hash, retrieved_at, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (run_id, canonical_url) DO UPDATE SET title = EXCLUDED.title,
           content = EXCLUDED.content, content_hash = EXCLUDED.content_hash,
           retrieved_at = EXCLUDED.retrieved_at, published_at = EXCLUDED.published_at
         RETURNING id`, [crypto.randomUUID(), run.workspace_id, run.account_id, run.id, item.url, item.title,
          item.sourceType, item.content, item.contentHash, item.retrievedAt, item.publishedAt]
      );
      saved.push({ ...item, id: row.rows[0].id });
    }
    await client.query("UPDATE analysis_runs SET partial_results = true WHERE id = $1", [run.id]);
    await client.query("COMMIT");
    return saved;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};

const persistClaims = async (run: ClaimedRun, claims: ResearchClaim[]): Promise<void> => {
  await verifyLease(run);
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      "SELECT 1 FROM analysis_runs WHERE id = $1 AND workspace_id = $2 AND account_id = $3 AND status = 'running' AND attempts = $4 FOR UPDATE",
      [run.id, run.workspace_id, run.account_id, run.attempts]
    );
    if (!lock.rowCount) throw new LeaseLostError("Research lease lost");
    await client.query("DELETE FROM research_claims WHERE workspace_id = $1 AND account_id = $2 AND run_id = $3",
      [run.workspace_id, run.account_id, run.id]);
    for (const claim of claims) {
      const claimId = crypto.randomUUID();
      await client.query(
        `INSERT INTO research_claims (id, workspace_id, account_id, run_id, statement,
          classification, certainty, event_date, fingerprint, model_id, prompt_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [claimId, run.workspace_id, run.account_id, run.id, claim.statement, claim.classification,
          claim.certainty, claim.eventDate, claim.fingerprint, RESEARCH_MODEL, RESEARCH_PROMPT_VERSION]
      );
      for (const evidence of claim.evidence) {
        await client.query(
          `INSERT INTO research_claim_evidence (workspace_id, account_id, run_id, claim_id, source_id, excerpt)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [run.workspace_id, run.account_id, run.id, claimId, evidence.sourceId, evidence.excerpt]
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};

const storedClaims = async (run: ClaimedRun): Promise<IntelligenceClaim[]> => {
  const result = await postgres.query(
    `SELECT id, statement, classification, certainty, event_date
     FROM research_claims WHERE workspace_id = $1 AND account_id = $2 AND run_id = $3 ORDER BY created_at, id`,
    [run.workspace_id, run.account_id, run.id]
  );
  return mapDbRows<IntelligenceClaim>(result.rows);
};

const persistTargetIntelligence = async (run: ClaimedRun, intelligence: TargetIntelligence): Promise<void> => {
  await verifyLease(run);
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      `SELECT 1 FROM analysis_runs WHERE id = $1 AND workspace_id = $2 AND account_id = $3
       AND status = 'running' AND attempts = $4 AND lease_expires_at > now() FOR UPDATE`,
      [run.id, run.workspace_id, run.account_id, run.attempts]
    );
    if (!lock.rowCount) throw new LeaseLostError("Research lease lost");
    for (const table of ["target_technologies", "target_people", "buying_signals", "target_gap_hypotheses"]) {
      await client.query(`DELETE FROM ${table} WHERE workspace_id = $1 AND account_id = $2 AND run_id = $3`,
        [run.workspace_id, run.account_id, run.id]);
    }
    for (const item of intelligence.technologies) await client.query(
      `INSERT INTO target_technologies (id,workspace_id,account_id,run_id,claim_id,name,category,status,rationale,observed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [crypto.randomUUID(), run.workspace_id, run.account_id, run.id, item.claimId, item.name, item.category, item.status, item.rationale, item.observedAt]
    );
    for (const item of intelligence.people) await client.query(
      `INSERT INTO target_people (id,workspace_id,account_id,run_id,claim_id,name,role,buying_role,currentness,rationale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [crypto.randomUUID(), run.workspace_id, run.account_id, run.id, item.claimId, item.name, item.role, item.buyingRole, item.currentness, item.rationale]
    );
    for (const item of intelligence.signals) await client.query(
      `INSERT INTO buying_signals (id,workspace_id,account_id,run_id,claim_id,signal_type,strength,event_date,interpretation,fingerprint)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [crypto.randomUUID(), run.workspace_id, run.account_id, run.id, item.claimId, item.signalType, item.strength, item.eventDate, item.interpretation, item.fingerprint]
    );
    for (const item of intelligence.gaps) await client.query(
      `INSERT INTO target_gap_hypotheses (id,workspace_id,account_id,run_id,claim_id,statement,certainty,rationale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [crypto.randomUUID(), run.workspace_id, run.account_id, run.id, item.claimId, item.statement, item.certainty, item.rationale]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};

const publishReport = async (run: ClaimedRun, sources: ResearchSource[]): Promise<void> => {
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      `SELECT id, started_at FROM analysis_runs WHERE id = $1 AND workspace_id = $2
       AND account_id = $3 AND status = 'running' AND attempts = $4 AND lease_expires_at > now() FOR UPDATE`,
      [run.id, run.workspace_id, run.account_id, run.attempts]
    );
    if (!lock.rowCount) throw new LeaseLostError("Research lease lost");
    const account = await client.query<{ id: string }>(
      "SELECT id FROM target_accounts WHERE workspace_id = $1 AND id = $2 AND archived_at IS NULL",
      [run.workspace_id, run.account_id]
    );
    if (!account.rows[0]) throw new Error("Target account is no longer active");
    const count = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM research_claims WHERE workspace_id = $1 AND account_id = $2 AND run_id = $3",
      [run.workspace_id, run.account_id, run.id]
    );
    if (!count.rows[0].n) throw new Error("No supported claims were extracted");
    const reportId = crypto.randomUUID();
    const profile = { verifiedCompany: {
      companyName: run.input.customerName, websiteUrl: `https://${run.input.companyDomain}/`,
      companyDomain: run.input.companyDomain, industry: "Unknown",
      segment: "Unknown", currentCloud: "Unknown", description: "See evidence-linked account findings.",
      techStack: [], painPoints: [], knownIssues: [], competitorAnalysis: [], revenueData: [],
      sourceUrls: sources.map(source => source.url)
    }, verifiedDirectors: [], rejectedDirectors: [], warnings: ["Findings require source review before sales use."] };
    await client.query(
      `INSERT INTO analysis_reports (id, user_id, workspace_id, account_id, run_id, customer_name,
        company_domain, annual_spend, validated_profile, recommendations, strategy, overall_confidence,
        research_status, research_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8::jsonb,'[]'::jsonb,$9::jsonb,0,'complete',now())`,
      [reportId, run.user_id, run.workspace_id, run.account_id, run.id, run.input.customerName,
        run.input.companyDomain, JSON.stringify(profile), JSON.stringify({ resolutions: [], roadmap: [], genAiOpportunities: [] })]
    );
    await client.query(
      `UPDATE analysis_runs SET status = 'completed', research_stage = 'completed',
        report_id = $2, partial_results = false, lease_expires_at = NULL, ended_at = now(),
        duration_ms = floor(extract(epoch from (now() - started_at)) * 1000)::int,
        updated_at = now() WHERE id = $1`, [run.id, reportId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
};

const failOrRetry = async (run: ClaimedRun, error: unknown): Promise<void> => {
  const status = (error as any)?.status;
  const transient = status === 429 || status === 503 || status === 504 ||
    (error instanceof Error && /timeout|timed out|ECONNRESET|EAI_AGAIN/i.test(error.message));
  const retry = transient && run.attempts < 3;
  const safeMessage = status === 429 ? "Provider quota exceeded; retry later." :
    error instanceof SourceFetchError ? error.message :
      error instanceof Error && /no supported claims|no readable|identity|no longer active/i.test(error.message) ? error.message :
        "Research failed during evidence collection or extraction.";
  await postgres.query(
    `UPDATE analysis_runs SET status = $5, research_stage = $6, error = $7,
       next_attempt_at = CASE WHEN $8::boolean THEN now() + ($9::int * interval '1 second') ELSE NULL END,
       lease_expires_at = NULL, ended_at = CASE WHEN $8::boolean THEN NULL ELSE now() END,
       updated_at = now() WHERE id = $1 AND workspace_id = $2 AND account_id = $3
         AND status = 'running' AND attempts = $4`,
    [run.id, run.workspace_id, run.account_id, run.attempts, retry ? "queued" : "failed",
      retry ? "queued" : "failed", safeMessage, retry, 30 * 2 ** (run.attempts - 1)]
  );
  console.error("Account research job failed", { runId: run.id, message: safeMessage, retry });
};

export const processNextAccountResearch = async (overrides: Partial<Providers> = {}): Promise<boolean> => {
  const providers = { ...defaults, ...overrides };
  const run = await claimNext();
  if (!run) return false;
  try {
    await verifyActor(run);
    let sources = await existingSources(run);
    if (!sources.length) {
      const discovery = await providers.discover(run.input.customerName, run.input.companyDomain);
      await setStage(run, "crawling", { discovery: discovery.usage });
      await verifyActor(run);
      const urls = [...new Set([`https://${run.input.companyDomain}/`, ...discovery.urls])].slice(0, 8);
      const fetched: FetchedSource[] = [];
      for (const url of urls) {
        if (fetched.length >= 5) break;
        try { fetched.push(await providers.fetch(url, run.input.companyDomain)); }
        catch (error) { console.warn("Research source skipped", { runId: run.id, reason: error instanceof SourceFetchError ? error.message : "Fetch failed" }); }
      }
      if (!fetched.length) throw new SourceFetchError("No readable public sources found");
      sources = await persistSources(run, fetched);
    }
    const nameTokens = run.input.customerName.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
    const official = sources.some(source => source.sourceType === "company" &&
      (nameTokens.length === 0 || nameTokens.some(token => source.content.toLowerCase().includes(token))));
    if (!official) throw new Error("Could not verify target identity on official domain");
    await setStage(run, "extracting");
    await verifyActor(run);
    const extracted = await providers.extract(run.input.customerName, run.input.companyDomain, sources);
    await persistClaims(run, extracted.claims);
    await setStage(run, "analyzing", { extraction: extracted.usage });
    await verifyActor(run);
    const intelligence = await providers.analyze(run.input.customerName, await storedClaims(run));
    await persistTargetIntelligence(run, intelligence.intelligence);
    await setStage(run, "generating", { intelligence: intelligence.usage });
    await verifyActor(run);
    await publishReport(run, sources);
  } catch (error) {
    if (!(error instanceof LeaseLostError)) await failOrRetry(run, error);
  }
  return true;
};

export const retryAccountResearch = async (workspaceId: string, accountId: string, runId: string, actorId: string, isAdmin: boolean) => {
  const result = await postgres.query(
    `UPDATE analysis_runs SET status = 'queued', research_stage = 'queued', error = NULL,
       next_attempt_at = NULL, ended_at = NULL, updated_at = now()
     WHERE id = $1 AND workspace_id = $2 AND account_id = $3 AND status = 'failed'
       AND attempts < 3 AND ($5::boolean OR user_id = $4) RETURNING id`,
    [runId, workspaceId, accountId, actorId, isAdmin]
  );
  return result.rowCount ? { runId, status: "queued" } : null;
};

export const readAccountResearch = async (workspaceId: string, accountId: string, runId: string) => {
  const result = await postgres.query(
    `SELECT id, account_id, user_id, status, research_stage, attempts, error, partial_results,
      seller_profile_version, model_id, prompt_version, resource_usage, report_id,
      started_at, ended_at, duration_ms FROM analysis_runs
     WHERE id = $1 AND workspace_id = $2 AND account_id = $3`, [runId, workspaceId, accountId]
  );
  return mapDbRow(result.rows[0]);
};

export const readResearchEvidence = async (workspaceId: string, accountId: string, runId: string) => {
  const run = await readAccountResearch(workspaceId, accountId, runId);
  if (!run) return null;
  const [sources, claims] = await Promise.all([
    postgres.query(
      `SELECT id, canonical_url AS url, title, source_type, retrieved_at, published_at,
        content_hash FROM research_sources
       WHERE workspace_id = $1 AND account_id = $2 AND run_id = $3 ORDER BY retrieved_at DESC, id`,
      [workspaceId, accountId, runId]
    ),
    postgres.query(
      `SELECT c.id, c.statement, c.classification, c.certainty, c.event_date, c.created_at,
        COALESCE(jsonb_agg(jsonb_build_object('sourceId', e.source_id, 'excerpt', e.excerpt))
          FILTER (WHERE e.source_id IS NOT NULL), '[]'::jsonb) AS evidence
       FROM research_claims c LEFT JOIN research_claim_evidence e
         ON e.workspace_id = c.workspace_id AND e.account_id = c.account_id
         AND e.run_id = c.run_id AND e.claim_id = c.id
       WHERE c.workspace_id = $1 AND c.account_id = $2 AND c.run_id = $3
       GROUP BY c.id ORDER BY c.created_at, c.id`, [workspaceId, accountId, runId]
    )
  ]);
  return { run, sources: mapDbRows(sources.rows), claims: mapDbRows(claims.rows) };
};

export const readLatestResearchEvidence = async (workspaceId: string, accountId: string) => {
  const result = await postgres.query<{ id: string }>(
    `SELECT id FROM analysis_runs WHERE workspace_id = $1 AND account_id = $2
       AND (status = 'completed' OR partial_results = true)
     ORDER BY CASE WHEN status = 'completed' THEN 0 ELSE 1 END,
       COALESCE(ended_at, created_at) DESC LIMIT 1`, [workspaceId, accountId]
  );
  return result.rows[0] ? readResearchEvidence(workspaceId, accountId, result.rows[0].id) : null;
};

export const readLatestTargetIntelligence = async (workspaceId: string, accountId: string) => {
  const result = await postgres.query<{ id: string }>(
    `SELECT id FROM analysis_runs WHERE workspace_id = $1 AND account_id = $2 AND status = 'completed'
     ORDER BY ended_at DESC, id DESC LIMIT 1`, [workspaceId, accountId]
  );
  if (!result.rows[0]) return { run: null, technologies: [], people: [], signals: [], gaps: [] };
  const run = await readAccountResearch(workspaceId, accountId, result.rows[0].id);
  const values = [workspaceId, accountId, result.rows[0].id];
  const [technologies, people, signals, gaps] = await Promise.all([
    postgres.query(`SELECT id,claim_id,name,category,status,rationale,observed_at,created_at FROM target_technologies WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3 ORDER BY category,name`, values),
    postgres.query(`SELECT id,claim_id,name,role,buying_role,currentness,rationale,created_at FROM target_people WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3 ORDER BY name,role`, values),
    postgres.query(`SELECT id,claim_id,signal_type,strength,event_date,interpretation,created_at FROM buying_signals WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3 ORDER BY event_date DESC NULLS LAST, created_at DESC`, values),
    postgres.query(`SELECT id,claim_id,statement,certainty,rationale,created_at FROM target_gap_hypotheses WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3 ORDER BY created_at`, values)
  ]);
  return { run, technologies: mapDbRows(technologies.rows), people: mapDbRows(people.rows), signals: mapDbRows(signals.rows), gaps: mapDbRows(gaps.rows) };
};

export const readResearchSourceContent = async (workspaceId: string, accountId: string, runId: string, sourceId: string) => {
  const result = await postgres.query(
    `SELECT s.id, s.canonical_url AS url, s.title, s.content, s.retrieved_at, s.published_at
     FROM research_sources s JOIN analysis_runs r ON r.id = s.run_id
       AND r.workspace_id = s.workspace_id AND r.account_id = s.account_id
     WHERE s.workspace_id = $1 AND s.account_id = $2 AND s.run_id = $3 AND s.id = $4`,
    [workspaceId, accountId, runId, sourceId]
  );
  return mapDbRow(result.rows[0]);
};

export const startAccountResearchWorker = (): void => {
  let active = false;
  const tick = async () => {
    if (active) return;
    active = true;
    try { await processNextAccountResearch(); }
    catch (error) { console.error("Account research worker tick failed", error instanceof Error ? error.message : "Unknown error"); }
    finally { active = false; }
  };
  void tick();
  setInterval(() => { void tick(); }, 5000).unref();
};
