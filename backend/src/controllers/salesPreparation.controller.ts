import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/isAuth.js';
import { postgres } from '../config/postgres.js';
import { UUID } from '../services/accountContext.service.js';
import { getTargetAccount, TargetConflictError, TargetValidationError } from '../services/targetAccounts.service.js';
import { createSalesDraft, editSalesDraft, listSalesDrafts, validateDraftCreate, validateDraftEdit } from '../services/salesPreparation.service.js';
import { readLatestResearchEvidence, readLatestTargetIntelligence } from '../services/research/researchJobs.service.js';
import { readLatestOpportunities } from '../services/opportunityMatching.service.js';

const action = (kind: 'list' | 'create' | 'edit' | 'export') => async (req: AuthRequest, res: Response) => {
  try {
    if (!req.workspaceId || !req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const id = String(req.params.id);
    if (!UUID.test(id) || (kind === 'edit' && !UUID.test(String(req.params.draftId)))) return res.status(400).json({ message: 'Invalid record ID' });
    const account = await getTargetAccount(req.workspaceId,id);
    if (!account) return res.status(404).json({ message: 'Target account not found' });
    if (kind === 'list') return res.json({ drafts: await listSalesDrafts(req.workspaceId,id,req.userId) });
    if (kind === 'export') {
      const [evidence,intelligence,opportunities,drafts] = await Promise.all([
        readLatestResearchEvidence(req.workspaceId,id), readLatestTargetIntelligence(req.workspaceId,id),
        readLatestOpportunities(req.workspaceId,id), listSalesDrafts(req.workspaceId,id,req.userId)
      ]);
      res.setHeader('Content-Disposition', `attachment; filename="salesdig-account-${id}.json"`);
      return res.json({ schemaVersion: 'account-export-v1', exportedAt: new Date().toISOString(),
        notice: 'Research contains facts, hypotheses and recommendations. Scores are priority rubrics, not purchase probabilities. Drafts are unsent and may contain user edits.',
        account,evidence,intelligence,opportunities,drafts });
    }
    if (account.archivedAt) return res.status(409).json({ message: 'Restore account before preparing drafts' });
    const draft = kind === 'create'
      ? await createSalesDraft(req.workspaceId,id,req.userId,validateDraftCreate(req.body))
      : await editSalesDraft(req.workspaceId,id,req.userId,String(req.params.draftId),validateDraftEdit(req.body));
    return draft ? res.status(kind === 'create' ? 201 : 200).json(draft) : res.status(404).json({ message: kind === 'create' ? 'Active approved opportunity not found; refresh offering matches' : 'Draft not found' });
  } catch(error) {
    if (error instanceof TargetValidationError) return res.status(400).json({ message: error.message });
    if (error instanceof TargetConflictError) return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: 'Sales preparation failed' });
  }
};
export const readDrafts = action('list');
export const generateDraft = action('create');
export const updateDraft = action('edit');
export const exportAccount = action('export');

export const readDashboard = async (req: AuthRequest,res: Response) => {
  try {
    if (!req.workspaceId || !req.userId) return res.status(401).json({ message: 'Unauthorized' });
    const data = (await postgres.query(`SELECT
      (SELECT count(*)::int FROM target_accounts WHERE workspace_id=$1 AND archived_at IS NULL) AS accounts,
      (SELECT count(*)::int FROM analysis_runs WHERE workspace_id=$1 AND account_id IS NOT NULL AND status IN ('queued','running')) AS "activeResearch",
      (SELECT count(*)::int FROM target_accounts a WHERE a.workspace_id=$1 AND a.archived_at IS NULL AND EXISTS (SELECT 1 FROM analysis_runs r WHERE r.workspace_id=a.workspace_id AND r.account_id=a.id AND r.status='completed')) AS "researchedAccounts",
      (SELECT count(*)::int FROM opportunities o WHERE o.workspace_id=$1 AND o.set_id IN (SELECT DISTINCT ON (account_id) id FROM opportunity_sets WHERE workspace_id=$1 AND status='completed' ORDER BY account_id,ended_at DESC,id DESC)) AS opportunities,
      (SELECT count(*)::int FROM sales_drafts WHERE workspace_id=$1 AND created_by=$2) AS "myDrafts"`, [req.workspaceId,req.userId])).rows[0];
    return res.json(data);
  } catch { return res.status(500).json({ message: 'Could not load dashboard' }); }
};
