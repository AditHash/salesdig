import pg from "pg";
import { DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_SETTINGS, WorkspaceSettings } from "./workspaceDefaults.js";

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
     SET settings = $2::jsonb, updated_at = now()
     WHERE id = $1
     RETURNING settings`,
    [workspaceId, JSON.stringify(settings)]
  );
  return result.rows[0]?.settings ?? null;
};
