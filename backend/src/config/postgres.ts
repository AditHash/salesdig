import pg from "pg";
import { DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_SETTINGS, WorkspaceSettings } from "./workspaceDefaults.js";
import { applyMigrations } from "./migrations.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const postgres = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
});

export const initializePostgres = async (): Promise<void> => {
  await postgres.query("CREATE EXTENSION IF NOT EXISTS vector");
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id uuid PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      settings jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS report_embeddings (
      report_id text PRIMARY KEY,
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id text NOT NULL,
      embedding vector(768) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      password text NOT NULL DEFAULT '',
      role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      last_login timestamptz,
      is_blocked boolean NOT NULL DEFAULT false,
      password_reset_token text,
      password_reset_expiry timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS users_workspace_idx ON users(workspace_id)`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS analysis_runs (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      status text NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
      input jsonb NOT NULL,
      agent_runs jsonb NOT NULL DEFAULT '{}'::jsonb,
      validated_profile jsonb,
      final_recommendations jsonb,
      overall_confidence double precision,
      report_id text,
      error text,
      started_at timestamptz NOT NULL,
      ended_at timestamptz,
      duration_ms integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS analysis_runs_workspace_created_idx ON analysis_runs(workspace_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS analysis_runs_user_created_idx ON analysis_runs(user_id, created_at DESC)`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS analysis_reports (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      run_id text NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
      customer_name text NOT NULL,
      company_domain text NOT NULL,
      annual_spend double precision NOT NULL,
      validated_profile jsonb NOT NULL,
      recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
      strategy jsonb NOT NULL DEFAULT '{}'::jsonb,
      overall_confidence double precision NOT NULL,
      digest_text text,
      partner_product_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
      zoho_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS analysis_reports_workspace_created_idx ON analysis_reports(workspace_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS analysis_reports_user_created_idx ON analysis_reports(user_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS analysis_reports_run_idx ON analysis_reports(run_id)`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id bigserial PRIMARY KEY,
      session_id text NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('user', 'assistant')),
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      used_report_ids text[] NOT NULL DEFAULT ARRAY[]::text[]
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages(session_id, id)`);
  await postgres.query(`
    CREATE TABLE IF NOT EXISTS footprints (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      action text NOT NULL,
      page text NOT NULL,
      meta text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await postgres.query(`CREATE INDEX IF NOT EXISTS footprints_workspace_created_idx ON footprints(workspace_id, created_at DESC)`);
  await postgres.query(`CREATE INDEX IF NOT EXISTS footprints_user_created_idx ON footprints(user_id, created_at DESC)`);
  await postgres.query(`
    CREATE INDEX IF NOT EXISTS report_embeddings_workspace_user_idx
      ON report_embeddings (workspace_id, user_id)
  `);
  await postgres.query(`
    CREATE INDEX IF NOT EXISTS report_embeddings_embedding_idx
      ON report_embeddings USING hnsw (embedding vector_cosine_ops)
  `);
  await postgres.query(
    `INSERT INTO workspaces (id, slug, settings)
     VALUES ($1, 'workmates', $2::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_WORKSPACE_ID, JSON.stringify(DEFAULT_WORKSPACE_SETTINGS)]
  );
  await applyMigrations(postgres);
};

export const getWorkspaceSettings = async (workspaceId: string): Promise<WorkspaceSettings | null> => {
  const result = await postgres.query<{ settings: WorkspaceSettings }>(
    "SELECT settings FROM workspaces WHERE id = $1",
    [workspaceId]
  );
  return result.rows[0]?.settings ?? null;
};

export const getWorkspaceSettingsBySlug = async (slug: string): Promise<WorkspaceSettings | null> => {
  const result = await postgres.query<{ settings: WorkspaceSettings }>(
    "SELECT settings FROM workspaces WHERE slug = $1",
    [slug]
  );
  return result.rows[0]?.settings ?? null;
};

export const getWorkspaceSlug = async (workspaceId: string): Promise<string> => {
  const result = await postgres.query<{ slug: string }>("SELECT slug FROM workspaces WHERE id = $1", [workspaceId]);
  return result.rows[0]?.slug || "workmates";
};

export const saveWorkspaceSettings = async (
  workspaceId: string,
  settings: WorkspaceSettings
): Promise<WorkspaceSettings | null> => {
  const result = await postgres.query<{ settings: WorkspaceSettings }>(
    `UPDATE workspaces
     SET settings = $2::jsonb,
         profile_version = profile_version + CASE WHEN
           (settings->>'companyName') IS DISTINCT FROM ($2::jsonb->>'companyName') OR
           (settings->>'companyDescription') IS DISTINCT FROM ($2::jsonb->>'companyDescription')
         THEN 1 ELSE 0 END,
         profile_updated_at = CASE WHEN
           (settings->>'companyName') IS DISTINCT FROM ($2::jsonb->>'companyName') OR
           (settings->>'companyDescription') IS DISTINCT FROM ($2::jsonb->>'companyDescription')
         THEN now() ELSE profile_updated_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING settings`,
    [workspaceId, JSON.stringify(settings)]
  );
  return result.rows[0]?.settings ?? null;
};
