CREATE TABLE target_technologies (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  claim_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  category text NOT NULL CHECK (category IN ('cloud', 'data', 'backend', 'infrastructure', 'ai', 'monitoring', 'crm', 'other')),
  status text NOT NULL CHECK (status IN ('confirmed', 'likely', 'unknown')),
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 8 AND 1000),
  observed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_id, run_id, claim_id, name, category),
  FOREIGN KEY (workspace_id, account_id, run_id, claim_id)
    REFERENCES research_claims(workspace_id, account_id, run_id, id) ON DELETE CASCADE
);
CREATE INDEX target_technologies_account_idx ON target_technologies (workspace_id, account_id, run_id, category);

CREATE TABLE target_people (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  claim_id uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 160),
  role text NOT NULL CHECK (length(role) BETWEEN 2 AND 200),
  buying_role text NOT NULL CHECK (buying_role IN ('economic_buyer', 'technical_buyer', 'champion', 'influencer', 'procurement', 'sponsor', 'unknown')),
  currentness text NOT NULL CHECK (currentness IN ('confirmed', 'likely', 'unknown')),
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 8 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_id, run_id, claim_id, name, role),
  FOREIGN KEY (workspace_id, account_id, run_id, claim_id)
    REFERENCES research_claims(workspace_id, account_id, run_id, id) ON DELETE CASCADE
);
CREATE INDEX target_people_account_idx ON target_people (workspace_id, account_id, run_id, buying_role);

CREATE TABLE buying_signals (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  claim_id uuid NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('hiring', 'funding', 'expansion', 'partnership', 'product_launch', 'modernization', 'leadership_change', 'other')),
  strength text NOT NULL CHECK (strength IN ('low', 'medium', 'high')),
  event_date date,
  interpretation text NOT NULL CHECK (length(interpretation) BETWEEN 8 AND 1000),
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_id, run_id, fingerprint),
  FOREIGN KEY (workspace_id, account_id, run_id, claim_id)
    REFERENCES research_claims(workspace_id, account_id, run_id, id) ON DELETE CASCADE
);
CREATE INDEX buying_signals_account_idx ON buying_signals (workspace_id, account_id, run_id, event_date DESC);

CREATE TABLE target_gap_hypotheses (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  claim_id uuid NOT NULL,
  statement text NOT NULL CHECK (length(statement) BETWEEN 8 AND 1000),
  certainty text NOT NULL CHECK (certainty IN ('likely', 'unknown')),
  rationale text NOT NULL CHECK (length(rationale) BETWEEN 8 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, account_id, run_id, claim_id, statement),
  FOREIGN KEY (workspace_id, account_id, run_id, claim_id)
    REFERENCES research_claims(workspace_id, account_id, run_id, id) ON DELETE CASCADE
);
CREATE INDEX target_gap_hypotheses_account_idx ON target_gap_hypotheses (workspace_id, account_id, run_id);
