ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_key;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_account_workspace_fk
  FOREIGN KEY (workspace_id, account_id) REFERENCES target_accounts(workspace_id, id) ON DELETE CASCADE;
ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_user_workspace_fk
  FOREIGN KEY (workspace_id, user_id) REFERENCES users(workspace_id, id) ON DELETE CASCADE;
CREATE UNIQUE INDEX chat_sessions_global_scope_idx ON chat_sessions(workspace_id, user_id) WHERE account_id IS NULL;
CREATE UNIQUE INDEX chat_sessions_account_scope_idx ON chat_sessions(workspace_id, user_id, account_id) WHERE account_id IS NOT NULL;
CREATE INDEX chat_sessions_account_idx ON chat_sessions(workspace_id, account_id, updated_at DESC) WHERE account_id IS NOT NULL;
ALTER TABLE chat_messages ADD COLUMN context_references jsonb NOT NULL DEFAULT '[]'::jsonb;
