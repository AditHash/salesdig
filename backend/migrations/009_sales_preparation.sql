-- Drafts are private to their author; source snapshots survive edits and refreshes.
CREATE TABLE sales_drafts (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL,
  account_id uuid NOT NULL,
  run_id text NOT NULL,
  opportunity_id uuid NOT NULL,
  created_by text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pitch_short','pitch_long','cold_email','discovery','meeting_brief','objections','roadmap')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 20000),
  source_snapshot jsonb NOT NULL,
  generator_version text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id,account_id,run_id,opportunity_id)
    REFERENCES opportunities(workspace_id,account_id,run_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,created_by) REFERENCES users(workspace_id,id) ON DELETE CASCADE
);
CREATE INDEX sales_drafts_author_account_idx ON sales_drafts(workspace_id,account_id,created_by,created_at DESC,id);
CREATE TABLE sales_draft_revisions (
  draft_id uuid NOT NULL REFERENCES sales_drafts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (draft_id,version)
);
