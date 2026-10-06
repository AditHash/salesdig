import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

const migrationsDirectory = fileURLToPath(new URL("../../migrations/", import.meta.url));

export const applyMigrations = async (pool: Pool): Promise<void> => {
  const names = (await readdir(migrationsDirectory))
    .filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('salesdig_schema_migrations'))");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const name of names) {
      const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [name]);
      if (applied.rowCount) continue;

      const sql = await readFile(new URL(`../../migrations/${name}`, import.meta.url), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
