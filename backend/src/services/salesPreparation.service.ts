import { randomUUID } from 'node:crypto';
import { postgres } from '../config/postgres.js';
import { mapDbRow, mapDbRows } from '../utils/dbRows.js';
import { TargetConflictError, TargetValidationError } from './targetAccounts.service.js';
import { UUID } from './accountContext.service.js';

export const DRAFT_KINDS = ['pitch_short','pitch_long','cold_email','discovery','meeting_brief','objections','roadmap'] as const;
export type DraftKind = typeof DRAFT_KINDS[number];
type Row = Record<string, any>;

export const buildSalesDraft = (kind: DraftKind, source: Row): string => {
  const seller = source.sellerName;
  const offering = source.offering.name;
  const finding = source.claims.map((c: Row) => `${c.classification === 'fact' ? 'Source reports' : 'Research hypothesis'}: ${c.statement}`).join('\n');
  const question = `Does this finding reflect a current priority for ${source.accountName}, and what would you want to improve?`;
  const opening = `${seller} offers ${offering}. We would like to explore whether this offering fits ${source.accountName}'s priorities.`;
  const validate = `Needs, urgency, budget and decision process require discovery. ${source.uncertainties.join(' ')}`;
  switch (kind) {
    case 'pitch_short': return `${opening}\n${source.claims[0]?.statement.length <= 200 ? `Research to validate: ${source.claims[0].statement}\n` : ''}${question}\nWould a short discovery conversation be useful?`;
    case 'pitch_long': return `${opening}\n\nResearch to validate:\n${finding}\n\n${question}\nOur approved offering: ${source.offering.description || offering}\n\nSuggested next step: agree a scoped discovery conversation. ${validate}`;
    case 'cold_email': return `Subject: Exploring ${offering} with ${source.accountName}\n\nHello,\n\n${opening}\n${question}\nWould you be open to a short conversation to check fit?\n\n${seller}`;
    case 'discovery': return `Research to validate:\n${finding}\n\n1. ${question}\n2. How do you handle this today, and what works well?\n3. What outcome would make a change worthwhile?\n4. Is there a deadline or event driving urgency?\n5. Who should help evaluate technical and business fit?\n6. What constraints and approval process should we understand?\n7. Would a scoped ${offering} assessment be useful?`;
    case 'meeting_brief': return `Account: ${source.accountName}\nSeller offering: ${offering}\n\nEvidence and hypotheses:\n${finding}\n\nGoal: validate fit, current priorities and desired outcomes.\nTiming context: ${source.whyNow}\n\nAgenda: confirm research, explore current process, identify stakeholders, agree next step.\n${validate}`;
    case 'objections': return `Suggested responses, to adapt after discovery:\n\n“We already have a solution.” — What works well, and is there any unmet outcome worth exploring?\n“No budget.” — Understood. Is there a business priority we should revisit later? No savings or funding assumptions.\n“Why your offering?” — ${seller} offers ${offering}. Let us compare its documented capabilities against your requirements before claiming fit.\n\n${validate}`;
    case 'roadmap': return `Proposed engagement; each step requires customer agreement:\n\n1. Discovery: validate research and ask: ${question}\n2. Fit assessment: map approved ${offering} capabilities to confirmed requirements; identify owners and constraints.\n3. Scope: agree success criteria, estimate effort and confirm approvals. No budget or timeline is presumed.\n4. Review: decide whether to proceed, revise scope or stop.\n\n${validate}`;
  }
};

const object = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TargetValidationError('Draft request must be an object');
  return value as Row;
};
export const validateDraftCreate = (value: unknown) => {
  const body = object(value);
  if (Object.keys(body).some(k => !['opportunityId','kind'].includes(k)) || typeof body.opportunityId !== 'string' || !UUID.test(body.opportunityId) || !DRAFT_KINDS.includes(body.kind)) {
    throw new TargetValidationError('Provide an opportunityId and supported draft kind');
  }
  return { opportunityId: body.opportunityId as string, kind: body.kind as DraftKind };
};
export const validateDraftEdit = (value: unknown) => {
  const body = object(value);
  if (Object.keys(body).some(k => !['version','content'].includes(k)) || !Number.isSafeInteger(body.version) || body.version < 1 || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 20000 || /[\u0000]/.test(body.content)) {
    throw new TargetValidationError('Provide positive version and non-empty content of at most 20000 characters');
  }
  return { version: body.version as number, content: body.content.trim() as string };
};

export const createSalesDraft = async (workspaceId: string, accountId: string, actorId: string, input: ReturnType<typeof validateDraftCreate>) => {
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT o.*,a.name AS account_name,f.name AS offering_name,v.snapshot AS offering_snapshot,w.settings->>'companyName' AS seller_name,s.seller_profile_version
      FROM opportunities o JOIN target_accounts a ON a.workspace_id=o.workspace_id AND a.id=o.account_id
      JOIN opportunity_sets s ON (s.workspace_id,s.account_id,s.run_id,s.id)=(o.workspace_id,o.account_id,o.run_id,o.set_id)
      JOIN seller_offerings f ON f.workspace_id=o.workspace_id AND f.id=o.offering_id
      JOIN seller_offering_versions v ON (v.workspace_id,v.offering_id,v.version)=(o.workspace_id,o.offering_id,o.offering_version)
      JOIN workspaces w ON w.id=o.workspace_id
      WHERE o.workspace_id=$1 AND o.account_id=$2 AND o.id=$3 AND s.status='completed' AND a.archived_at IS NULL
      AND f.review_status='approved' AND f.archived_at IS NULL AND f.version=o.offering_version FOR SHARE OF a,f`, [workspaceId,accountId,input.opportunityId]);
    const o = result.rows[0];
    if (!o) { await client.query('ROLLBACK'); return null; }
    const evidence = (await client.query(`SELECT c.id,c.statement,c.classification,c.certainty,c.event_date,e.source_id,s.canonical_url AS url,s.title,e.excerpt,s.retrieved_at,s.published_at
      FROM opportunity_evidence oe JOIN research_claims c ON (c.workspace_id,c.account_id,c.run_id,c.id)=(oe.workspace_id,oe.account_id,oe.run_id,oe.claim_id)
      JOIN research_claim_evidence e ON (e.workspace_id,e.account_id,e.run_id,e.claim_id)=(c.workspace_id,c.account_id,c.run_id,c.id)
      JOIN research_sources s ON (s.workspace_id,s.account_id,s.run_id,s.id)=(e.workspace_id,e.account_id,e.run_id,e.source_id)
      WHERE oe.workspace_id=$1 AND oe.account_id=$2 AND oe.run_id=$3 AND oe.opportunity_id=$4 ORDER BY c.id,e.source_id`, [workspaceId,accountId,o.run_id,o.id])).rows;
    if (!evidence.length) throw new TargetConflictError('Opportunity has no supported evidence');
    const source = { accountName: o.account_name, sellerName: o.seller_name, offering: { ...o.offering_snapshot, name: o.offering_name },
      offeringId: o.offering_id, offeringVersion: o.offering_version, sellerProfileVersion: o.seller_profile_version,
      runId: o.run_id, setId: o.set_id, opportunityId: o.id, targetNeed: o.target_need, needKind: o.need_kind,
      whyNow: o.why_now, uncertainties: o.uncertainties, claims: [...new Map(evidence.map(e => [e.id,{ id:e.id,statement:e.statement,classification:e.classification,certainty:e.certainty }])).values()], evidence };
    const content = buildSalesDraft(input.kind,source);
    if (content.length > 20000) throw new TargetConflictError('Opportunity context is too large for this draft');
    const draft = await client.query(`INSERT INTO sales_drafts (id,workspace_id,account_id,run_id,opportunity_id,created_by,kind,content,source_snapshot,generator_version)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,'evidence-template-v1') RETURNING *`, [randomUUID(),workspaceId,accountId,o.run_id,o.id,actorId,input.kind,content,JSON.stringify(source)]);
    await client.query('INSERT INTO sales_draft_revisions (draft_id,version,content) VALUES ($1,1,$2)', [draft.rows[0].id,content]);
    await client.query('COMMIT');
    return mapDbRow(draft.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};

export const listSalesDrafts = async (workspaceId: string, accountId: string, actorId: string) => mapDbRows((await postgres.query(`SELECT * FROM sales_drafts WHERE workspace_id=$1 AND account_id=$2 AND created_by=$3 ORDER BY created_at DESC,id LIMIT 50`, [workspaceId,accountId,actorId])).rows);

export const editSalesDraft = async (workspaceId: string, accountId: string, actorId: string, draftId: string, input: ReturnType<typeof validateDraftEdit>) => {
  const client = await postgres.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT version FROM sales_drafts WHERE workspace_id=$1 AND account_id=$2 AND created_by=$3 AND id=$4 FOR UPDATE', [workspaceId,accountId,actorId,draftId]);
    if (!found.rows[0]) { await client.query('ROLLBACK'); return null; }
    if (found.rows[0].version !== input.version) throw new TargetConflictError('Draft changed; reload before saving');
    const result = await client.query('UPDATE sales_drafts SET content=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING *', [draftId,input.content]);
    await client.query('INSERT INTO sales_draft_revisions (draft_id,version,content) VALUES ($1,$2,$3)', [draftId,result.rows[0].version,input.content]);
    await client.query('COMMIT');
    return mapDbRow(result.rows[0]);
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};
