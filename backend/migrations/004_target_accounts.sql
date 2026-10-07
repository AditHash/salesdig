-- Accounts are distinct within a workspace. Shared domains are allowed when names differ.
ALTER TABLE users ADD CONSTRAINT users_workspace_id_id_unique UNIQUE (workspace_id, id);

CREATE TABLE target_accounts (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  website text NOT NULL CHECK (length(website) BETWEEN 4 AND 500),
  normalized_domain text NOT NULL CHECK (length(normalized_domain) BETWEEN 4 AND 253),
  industry text NOT NULL DEFAULT '',
  geography text NOT NULL DEFAULT '',
  targeting_reason text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  owner_user_id text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at timestamptz,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, owner_user_id) REFERENCES users(workspace_id, id)
    ON DELETE SET NULL (owner_user_id)
);
CREATE UNIQUE INDEX target_accounts_active_identity_unique
  ON target_accounts (workspace_id, lower(name), normalized_domain)
  WHERE archived_at IS NULL;
CREATE INDEX target_accounts_workspace_created_idx
  ON target_accounts (workspace_id, created_at DESC, id DESC);
CREATE INDEX target_accounts_workspace_owner_idx
  ON target_accounts (workspace_id, owner_user_id) WHERE archived_at IS NULL;

ALTER TABLE analysis_runs ADD COLUMN account_id uuid;
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_account_scope_fk
  FOREIGN KEY (workspace_id, account_id) REFERENCES target_accounts(workspace_id, id);
CREATE INDEX analysis_runs_account_history_idx
  ON analysis_runs (workspace_id, account_id, created_at DESC) WHERE account_id IS NOT NULL;
CREATE UNIQUE INDEX analysis_runs_one_active_account_idx
  ON analysis_runs (workspace_id, account_id)
  WHERE account_id IS NOT NULL AND status IN ('queued', 'running');

ALTER TABLE analysis_reports ADD COLUMN account_id uuid;
ALTER TABLE analysis_reports ADD CONSTRAINT analysis_reports_account_scope_fk
  FOREIGN KEY (workspace_id, account_id) REFERENCES target_accounts(workspace_id, id);
CREATE INDEX analysis_reports_account_history_idx
  ON analysis_reports (workspace_id, account_id, created_at DESC) WHERE account_id IS NOT NULL;
