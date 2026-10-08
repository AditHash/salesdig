-- V2 account research uses existing analysis_runs and analysis_reports identities.
ALTER TABLE analysis_runs
  ADD COLUMN research_stage text CHECK (research_stage IN
    ('queued', 'discovering', 'crawling', 'extracting', 'analyzing', 'matching', 'generating', 'completed', 'failed')),
  ADD COLUMN attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  ADD COLUMN lease_expires_at timestamptz,
  ADD COLUMN next_attempt_at timestamptz,
  ADD COLUMN seller_profile_version integer,
  ADD COLUMN model_id text,
  ADD COLUMN prompt_version text,
  ADD COLUMN resource_usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN partial_results boolean NOT NULL DEFAULT false;
CREATE INDEX analysis_runs_research_queue_idx
  ON analysis_runs (next_attempt_at, created_at)
  WHERE account_id IS NOT NULL AND status IN ('queued', 'running');
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_scope_id_unique UNIQUE (workspace_id, account_id, id);

CREATE TABLE research_sources (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  canonical_url text NOT NULL CHECK (length(canonical_url) BETWEEN 12 AND 2000),
  title text NOT NULL DEFAULT '',
  source_type text NOT NULL CHECK (source_type IN ('company', 'news', 'jobs', 'other')),
  content text NOT NULL,
  content_hash text NOT NULL,
  retrieved_at timestamptz NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_id, run_id, id),
  UNIQUE (run_id, canonical_url),
  FOREIGN KEY (workspace_id, account_id, run_id)
    REFERENCES analysis_runs(workspace_id, account_id, id) ON DELETE CASCADE
);
CREATE INDEX research_sources_account_history_idx
  ON research_sources (workspace_id, account_id, retrieved_at DESC);

CREATE TABLE research_claims (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  statement text NOT NULL CHECK (length(statement) BETWEEN 8 AND 1000),
  classification text NOT NULL CHECK (classification IN ('fact', 'inference', 'recommendation')),
  certainty text NOT NULL CHECK (certainty IN ('confirmed', 'likely', 'unknown')),
  event_date date,
  fingerprint text NOT NULL,
  model_id text NOT NULL,
  prompt_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_id, run_id, id),
  UNIQUE (run_id, fingerprint),
  FOREIGN KEY (workspace_id, account_id, run_id)
    REFERENCES analysis_runs(workspace_id, account_id, id) ON DELETE CASCADE
);
CREATE INDEX research_claims_account_history_idx
  ON research_claims (workspace_id, account_id, created_at DESC);

CREATE TABLE research_claim_evidence (
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  claim_id uuid NOT NULL,
  source_id uuid NOT NULL,
  excerpt text NOT NULL CHECK (length(excerpt) BETWEEN 12 AND 500),
  PRIMARY KEY (claim_id, source_id, excerpt),
  FOREIGN KEY (workspace_id, account_id, run_id, claim_id)
    REFERENCES research_claims(workspace_id, account_id, run_id, id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id, account_id, run_id, source_id)
    REFERENCES research_sources(workspace_id, account_id, run_id, id) ON DELETE CASCADE
);
CREATE INDEX research_claim_evidence_source_idx ON research_claim_evidence(source_id);

ALTER TABLE analysis_reports
  ADD COLUMN research_status text NOT NULL DEFAULT 'legacy'
    CHECK (research_status IN ('legacy', 'complete', 'partial')),
  ADD COLUMN research_date timestamptz;
