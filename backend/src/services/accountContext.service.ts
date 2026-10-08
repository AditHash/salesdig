import { postgres } from '../config/postgres.js';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export interface ContextReference { claimId: string; sourceId: string; runId: string; url: string; title: string; excerpt: string; classification: string; certainty: string; retrievedAt: string; publishedAt: string | null }

// Scope and snapshot filtering happen before ordering/limits. No cross-account RAG.
export const loadAccountContext = async (workspaceId: string, accountId: string) => {
  const account = (await postgres.query(`SELECT id,name,normalized_domain,notes FROM target_accounts WHERE workspace_id=$1 AND id=$2`, [workspaceId, accountId])).rows[0];
  if (!account) return null;
  const run = (await postgres.query(`SELECT id,ended_at FROM analysis_runs WHERE workspace_id=$1 AND account_id=$2 AND status='completed' ORDER BY ended_at DESC,id DESC LIMIT 1`, [workspaceId, accountId])).rows[0];
  const claims = run ? (await postgres.query(`SELECT id,statement,classification,certainty,event_date FROM research_claims
    WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3 ORDER BY id LIMIT 20`, [workspaceId, accountId, run.id])).rows : [];
  const references: ContextReference[] = claims.length ? (await postgres.query(`SELECT e.claim_id AS "claimId",e.source_id AS "sourceId",e.run_id AS "runId",s.canonical_url AS url,s.title,e.excerpt,
      c.classification,c.certainty,s.retrieved_at AS "retrievedAt",s.published_at AS "publishedAt"
    FROM research_claim_evidence e JOIN research_sources s ON (s.workspace_id,s.account_id,s.run_id,s.id)=(e.workspace_id,e.account_id,e.run_id,e.source_id)
    JOIN research_claims c ON (c.workspace_id,c.account_id,c.run_id,c.id)=(e.workspace_id,e.account_id,e.run_id,e.claim_id)
    WHERE e.workspace_id=$1 AND e.account_id=$2 AND e.run_id=$3 AND e.claim_id=ANY($4::uuid[]) ORDER BY e.claim_id,e.source_id LIMIT 40`, [workspaceId, accountId, run.id, claims.map(c => c.id)])).rows : [];
  const opportunities = run ? (await postgres.query(`SELECT o.id,o.offering_id,o.offering_version,o.target_need,o.need_kind,o.why_now,o.entry_action,o.uncertainties,
    ARRAY(SELECT oe.claim_id FROM opportunity_evidence oe WHERE oe.workspace_id=o.workspace_id AND oe.account_id=o.account_id AND oe.run_id=o.run_id AND oe.opportunity_id=o.id ORDER BY oe.claim_id) AS claim_ids
    FROM opportunities o JOIN opportunity_sets s ON (s.workspace_id,s.account_id,s.run_id,s.id)=(o.workspace_id,o.account_id,o.run_id,o.set_id)
    JOIN seller_offerings f ON f.workspace_id=o.workspace_id AND f.id=o.offering_id AND f.version=o.offering_version AND f.review_status='approved' AND f.archived_at IS NULL
    WHERE o.workspace_id=$1 AND o.account_id=$2 AND o.run_id=$3 AND s.id=(SELECT id FROM opportunity_sets WHERE workspace_id=$1 AND account_id=$2 AND run_id=$3 AND status='completed' ORDER BY ended_at DESC,id DESC LIMIT 1)
    AND EXISTS (SELECT 1 FROM opportunity_evidence oe WHERE oe.workspace_id=o.workspace_id AND oe.account_id=o.account_id AND oe.run_id=o.run_id AND oe.opportunity_id=o.id)
    AND NOT EXISTS (SELECT 1 FROM opportunity_evidence oe WHERE oe.workspace_id=o.workspace_id AND oe.account_id=o.account_id AND oe.run_id=o.run_id AND oe.opportunity_id=o.id AND NOT (oe.claim_id=ANY($4::uuid[])))
    ORDER BY o.score DESC,o.id LIMIT 10`, [workspaceId, accountId, run.id, references.map(r => r.claimId)])).rows : [];
  const offerings = (await postgres.query(`SELECT id,name,description,capabilities,business_outcomes,version FROM seller_offerings
    WHERE workspace_id=$1 AND review_status='approved' AND archived_at IS NULL ORDER BY id LIMIT 10`, [workspaceId])).rows;
  // Serialize bounded fields; URLs/excerpts remain available separately for inspection.
  const text = JSON.stringify({ contextLimits: 'Up to 20 claims, 40 excerpts, 10 opportunities and 10 approved offerings; omitted findings are not evidence of absence.', account: { name: account.name, domain: account.normalized_domain, notes: account.notes.slice(0, 2000) },
    researchRun: run ?? null, claims: claims.filter(c => references.some(r => r.claimId === c.id)),
    sources: references.map(r => ({ claimId: r.claimId, sourceId: r.sourceId, excerpt: r.excerpt })),
    opportunities: opportunities.map(o => ({ ...o, target_need: o.target_need.slice(0,1000), why_now: o.why_now.slice(0,1000), entry_action: o.entry_action.slice(0,1000) })),
    approvedOfferings: offerings.map(o => ({ ...o, name: o.name.slice(0,160), description: o.description.slice(0,500), capabilities: o.capabilities.slice(0,5).map((s: string) => s.slice(0,160)), business_outcomes: o.business_outcomes.slice(0,5).map((s: string) => s.slice(0,160)) })) });
  return { text, references, runId: run?.id ?? null };
};
