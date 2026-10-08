-- Matching snapshots use the existing workspace, target, research and offering identities.
ALTER TABLE seller_offering_versions ADD CONSTRAINT seller_offering_versions_scope_unique
  UNIQUE (workspace_id, offering_id, version);

CREATE TABLE opportunity_sets (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  requested_by text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  input_fingerprint text NOT NULL,
  input_snapshot jsonb NOT NULL,
  seller_profile_version integer NOT NULL,
  scoring_version text NOT NULL,
  prompt_version text NOT NULL,
  model_id text NOT NULL,
  result_reason text,
  error text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  lease_expires_at timestamptz,
  next_attempt_at timestamptz,
  resource_usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  UNIQUE (workspace_id, account_id, run_id, id),
  FOREIGN KEY (workspace_id, account_id, run_id)
    REFERENCES analysis_runs(workspace_id, account_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, requested_by) REFERENCES users(workspace_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX opportunity_sets_one_active_idx ON opportunity_sets(workspace_id, account_id)
  WHERE status IN ('queued', 'running');
CREATE UNIQUE INDEX opportunity_sets_completed_input_idx ON opportunity_sets(workspace_id, account_id, input_fingerprint)
  WHERE status = 'completed';
CREATE INDEX opportunity_sets_account_history_idx ON opportunity_sets(workspace_id, account_id, created_at DESC, id);
CREATE INDEX opportunity_sets_queue_idx ON opportunity_sets(next_attempt_at, created_at)
  WHERE status IN ('queued', 'running');

CREATE TABLE opportunities (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  set_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  offering_version integer NOT NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 8 AND 160),
  target_need text NOT NULL CHECK (length(target_need) BETWEEN 8 AND 1000),
  need_kind text NOT NULL CHECK (need_kind IN ('confirmed_need', 'discovery_hypothesis')),
  matched_capabilities text[] NOT NULL,
  rationale text NOT NULL,
  uncertainties text[] NOT NULL,
  why_now text NOT NULL,
  entry_action text NOT NULL,
  stakeholder_id uuid,
  score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  coverage numeric(5,2) NOT NULL CHECK (coverage BETWEEN 0 AND 100),
  evidence_confidence text NOT NULL CHECK (evidence_confidence IN ('low', 'medium', 'high')),
  score_breakdown jsonb NOT NULL,
  sales_play jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_id, run_id, id),
  UNIQUE (set_id, offering_id),
  FOREIGN KEY (workspace_id, account_id, run_id, set_id)
    REFERENCES opportunity_sets(workspace_id, account_id, run_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, offering_id, offering_version)
    REFERENCES seller_offering_versions(workspace_id, offering_id, version)
);
-- Tenant/run scope is checked for optional stakeholder relationships as well.
ALTER TABLE target_people ADD CONSTRAINT target_people_scope_unique UNIQUE (workspace_id, account_id, run_id, id);
ALTER TABLE opportunities ADD CONSTRAINT opportunities_stakeholder_scope_fk
  FOREIGN KEY (workspace_id, account_id, run_id, stakeholder_id)
    REFERENCES target_people(workspace_id, account_id, run_id, id) ON DELETE SET NULL (stakeholder_id);
CREATE INDEX opportunities_account_score_idx ON opportunities(workspace_id, account_id, set_id, score DESC, id);

CREATE TABLE opportunity_evidence (
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  opportunity_id uuid NOT NULL,
  claim_id uuid NOT NULL,
  PRIMARY KEY (opportunity_id, claim_id),
  FOREIGN KEY (workspace_id, account_id, run_id, opportunity_id)
    REFERENCES opportunities(workspace_id, account_id, run_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, account_id, run_id, claim_id)
    REFERENCES research_claims(workspace_id, account_id, run_id, id) ON DELETE CASCADE
);
