import crypto from "node:crypto";
import { postgres } from "../config/postgres.js";
import { mapDbRow, mapDbRows } from "../utils/dbRows.js";

const SCORING_VERSION = "sales-potential-v1";
const PROMPT_VERSION = "deterministic-evidence-match-v1";
const MODEL_ID = "application-score";
type Row = Record<string, any>;
const words = (value: string) => new Set((value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(word => !["with", "from", "that", "this", "their", "will", "into", "have"].includes(word)));
const overlap = (left: string, right: string) => {
  const a = words(left); const b = words(right); let hits = 0;
  for (const word of a) if (b.has(word)) hits++;
  return hits;
};
const fingerprint = (value: unknown) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export type ScoreBreakdown = Record<string, { weight: number; value: number | null; contribution: number | null; reason: string }>;
export const calculateSalesPotential = (input: {
  offeringText: string; claim: string; needKind: "confirmed_need" | "discovery_hypothesis";
  signals: Row[]; technologies: Row[]; people: Row[];
}): { score: number; coverage: number; confidence: "low" | "medium" | "high"; breakdown: ScoreBreakdown } => {
  const fit = Math.min(100, 50 + overlap(input.offeringText, input.claim) * 10);
  const signalCount = new Set(input.signals.map(item => item.fingerprint)).size;
  const technologyHits = input.technologies.filter(item => overlap(input.offeringText, `${item.name} ${item.category}`) > 0).length;
  const people = input.people.filter(item => item.currentness === "confirmed" || item.currentness === "likely").length;
  const components: Array<[string, number, number | null, string]> = [
    ["offeringFit", 30, fit, "Approved offering overlaps the supported account finding."],
    ["businessPain", 20, input.needKind === "confirmed_need" ? 100 : 50, input.needKind === "confirmed_need" ? "Finding is framed as a supported need." : "Finding is a discovery hypothesis."],
    ["buyingSignals", 15, signalCount ? Math.min(100, signalCount * 35) : null, signalCount ? `${signalCount} distinct supported signal(s).` : "No supported buying signal."],
    ["technologyCompatibility", 10, input.technologies.length ? Math.min(100, technologyHits * 50) : null, input.technologies.length ? `${technologyHits} relevant technology match(es).` : "Technology information is unavailable."],
    ["financialCapacity", 10, null, "Financial capacity is unavailable; it is excluded from the score."],
    ["decisionMakerAccessibility", 5, people ? Math.min(100, people * 50) : null, people ? `${people} supported stakeholder(s).` : "Stakeholder information is unavailable."],
    ["strategicTiming", 10, signalCount ? Math.min(100, signalCount * 40) : null, signalCount ? "Supported signal(s) provide timing context." : "Timing information is unavailable."]
  ];
  const breakdown: ScoreBreakdown = {};
  let availableWeight = 0; let weighted = 0;
  for (const [key, weight, value, reason] of components) {
    const contribution = value === null ? null : (value * weight) / 100;
    breakdown[key] = { weight, value, contribution, reason };
    if (value !== null) { availableWeight += weight; weighted += contribution!; }
  }
  const score = availableWeight ? Math.round((weighted / availableWeight) * 10000) / 100 : 0;
  const coverage = availableWeight;
  const confidence = coverage >= 70 && input.needKind === "confirmed_need" ? "high" : coverage >= 40 ? "medium" : "low";
  return { score, coverage, confidence, breakdown };
};

const loadInput = async (workspaceId: string, accountId: string, runId: string) => {
  const [offerings, claims, signals, technologies, people, run] = await Promise.all([
    postgres.query(`SELECT o.id,o.name,o.description,o.capabilities,o.business_outcomes,o.relevant_industries,o.ideal_customer_profile,o.version
      FROM seller_offerings o WHERE o.workspace_id=$1 AND o.review_status='approved' AND o.archived_at IS NULL ORDER BY o.id`, [workspaceId]),
    postgres.query(`SELECT id,statement,classification,certainty FROM research_claims WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3
      AND classification IN ('fact','inference') AND certainty IN ('confirmed','likely') ORDER BY id`, [workspaceId, accountId, runId]),
    postgres.query("SELECT fingerprint,signal_type,strength FROM buying_signals WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3", [workspaceId, accountId, runId]),
    postgres.query("SELECT name,category,status FROM target_technologies WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3", [workspaceId, accountId, runId]),
    postgres.query("SELECT id,name,role,buying_role,currentness FROM target_people WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3", [workspaceId, accountId, runId]),
    postgres.query("SELECT seller_profile_version FROM analysis_runs WHERE workspace_id=$1 AND account_id=$2 AND id=$3 AND status='completed'", [workspaceId, accountId, runId])
  ]);
  return { offerings: offerings.rows, claims: claims.rows, signals: signals.rows, technologies: technologies.rows, people: people.rows, sellerProfileVersion: run.rows[0]?.seller_profile_version as number | undefined };
};

export const queueOpportunityMatching = async (workspaceId: string, accountId: string, actorId: string) => {
  const latest = await postgres.query<{ id: string }>("SELECT id FROM analysis_runs WHERE workspace_id=$1 AND account_id=$2 AND status='completed' ORDER BY ended_at DESC,id DESC LIMIT 1", [workspaceId, accountId]);
  if (!latest.rows[0]) return { kind: "missing_research" as const };
  const runId = latest.rows[0].id; const input = await loadInput(workspaceId, accountId, runId);
  const snapshot = { offerings: input.offerings.map(o => ({ id: o.id, version: o.version })), claims: input.claims.map(c => c.id), runId };
  const inputFingerprint = fingerprint(snapshot);
  const existing = await postgres.query<Row>("SELECT id,status FROM opportunity_sets WHERE workspace_id=$1 AND account_id=$2 AND input_fingerprint=$3 AND status IN ('queued','running','completed') ORDER BY created_at DESC LIMIT 1", [workspaceId, accountId, inputFingerprint]);
  if (existing.rows[0]) return { kind: existing.rows[0].status === "completed" ? "completed" as const : "queued" as const, setId: existing.rows[0].id };
  const active = await postgres.query<Row>("SELECT id FROM opportunity_sets WHERE workspace_id=$1 AND account_id=$2 AND status IN ('queued','running') LIMIT 1", [workspaceId, accountId]);
  if (active.rows[0]) return { kind: "active" as const, setId: active.rows[0].id };
  const id = crypto.randomUUID();
  await postgres.query(`INSERT INTO opportunity_sets (id,workspace_id,account_id,run_id,requested_by,input_fingerprint,input_snapshot,seller_profile_version,scoring_version,prompt_version,model_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11)`, [id, workspaceId, accountId, runId, actorId, inputFingerprint, JSON.stringify(snapshot), input.sellerProfileVersion ?? 1, SCORING_VERSION, PROMPT_VERSION, MODEL_ID]);
  return { kind: "queued" as const, setId: id };
};

export const processNextOpportunityMatching = async (): Promise<boolean> => {
  const claimed = await postgres.query<Row>(`UPDATE opportunity_sets SET status='running',attempts=attempts+1,lease_expires_at=now()+interval '5 minutes'
    WHERE id=(SELECT id FROM opportunity_sets WHERE status='queued' AND (next_attempt_at IS NULL OR next_attempt_at<=now()) ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`);
  const set = claimed.rows[0]; if (!set) return false;
  try {
    const input = await loadInput(set.workspace_id, set.account_id, set.run_id);
    const client = await postgres.connect();
    try {
      await client.query("BEGIN");
      for (const offering of input.offerings) {
        const offeringText = [offering.name, offering.description, ...(offering.capabilities ?? []), ...(offering.business_outcomes ?? []), ...(offering.relevant_industries ?? []), offering.ideal_customer_profile].join(" ");
        const claim = input.claims.map(c => ({ ...c, hits: overlap(offeringText, c.statement) })).sort((a,b) => b.hits-a.hits || a.id.localeCompare(b.id))[0];
        if (!claim || claim.hits < 1) continue;
        const needKind = claim.classification === "fact" ? "confirmed_need" : "discovery_hypothesis" as const;
        const score = calculateSalesPotential({ offeringText, claim: claim.statement, needKind, signals: input.signals, technologies: input.technologies, people: input.people });
        const opportunityId = crypto.randomUUID();
        await client.query(`INSERT INTO opportunities (id,workspace_id,account_id,run_id,set_id,offering_id,offering_version,title,target_need,need_kind,matched_capabilities,rationale,uncertainties,why_now,entry_action,score,coverage,evidence_confidence,score_breakdown,sales_play)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::jsonb,$20::jsonb)`,
          [opportunityId,set.workspace_id,set.account_id,set.run_id,set.id,offering.id,offering.version,`${offering.name} for ${claim.statement.slice(0,90)}`,claim.statement,needKind,offering.capabilities ?? [],`The approved ${offering.name} offering shares supported account terms with this finding.`, needKind === "confirmed_need" ? [] : ["Validate this hypothesis in discovery."], input.signals.length ? "Supported account signals make this worth exploring now." : "No supported timing signal; confirm urgency in discovery.",`Ask whether ${claim.statement.toLowerCase()} and offer a scoped ${offering.name} discovery conversation.`,score.score,score.coverage,score.confidence,JSON.stringify(score.breakdown),JSON.stringify({ stakeholder: null, entryAction: `Ask whether ${claim.statement.toLowerCase()}`, assumptions: needKind === "confirmed_need" ? [] : ["The need is a hypothesis, not a confirmed requirement."] })]);
        await client.query("INSERT INTO opportunity_evidence (workspace_id,account_id,run_id,opportunity_id,claim_id) VALUES ($1,$2,$3,$4,$5)", [set.workspace_id,set.account_id,set.run_id,opportunityId,claim.id]);
      }
      const count = await client.query<{ n: number }>("SELECT count(*)::int n FROM opportunities WHERE set_id=$1", [set.id]);
      await client.query("UPDATE opportunity_sets SET status='completed',result_reason=$2,ended_at=now(),lease_expires_at=NULL WHERE id=$1", [set.id, count.rows[0].n ? null : "No approved offering had enough supported account evidence to match."]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  } catch (error) {
    await postgres.query("UPDATE opportunity_sets SET status='failed',error=$2,ended_at=now(),lease_expires_at=NULL WHERE id=$1", [set.id, "Opportunity matching failed."]);
    console.error("Opportunity matching failed", { setId: set.id, error: error instanceof Error ? error.message : "Unknown" });
  }
  return true;
};

export const readLatestOpportunities = async (workspaceId: string, accountId: string) => {
  const set = await postgres.query<Row>("SELECT * FROM opportunity_sets WHERE workspace_id=$1 AND account_id=$2 AND status='completed' ORDER BY ended_at DESC,id DESC LIMIT 1", [workspaceId, accountId]);
  if (!set.rows[0]) return { set: null, opportunities: [] };
  const opportunities = await postgres.query<Row>(`SELECT o.*, so.name AS offering_name, COALESCE(jsonb_agg(jsonb_build_object('claimId',c.id,'statement',c.statement)) FILTER (WHERE c.id IS NOT NULL),'[]'::jsonb) AS evidence
    FROM opportunities o JOIN seller_offerings so ON so.workspace_id=o.workspace_id AND so.id=o.offering_id
    LEFT JOIN opportunity_evidence oe ON oe.opportunity_id=o.id LEFT JOIN research_claims c ON c.id=oe.claim_id AND c.workspace_id=oe.workspace_id AND c.account_id=oe.account_id AND c.run_id=oe.run_id
    WHERE o.workspace_id=$1 AND o.account_id=$2 AND o.set_id=$3 GROUP BY o.id,so.name ORDER BY o.score DESC,o.id`, [workspaceId, accountId, set.rows[0].id]);
  return { set: mapDbRow(set.rows[0]), opportunities: mapDbRows(opportunities.rows) };
};

export const startOpportunityMatchingWorker = (): void => { let active=false; const tick=async()=>{ if(active)return; active=true; try { await processNextOpportunityMatching(); } finally { active=false; } }; void tick(); setInterval(()=>void tick(),5000).unref(); };
