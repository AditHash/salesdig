# PostgreSQL Migration Handoff

Updated: 2026-09-30

## Completed in this change

- Replaced Mongoose persistence with PostgreSQL queries for users, reports, analysis runs, chat sessions/messages, and activity.
- Added PostgreSQL tables, indexes, JSONB report/run payloads, and workspace/user foreign keys. Workspace settings and pgvector embeddings remain in PostgreSQL.
- Removed the Mongoose dependency and all runtime `MONGO_URI` requirements.
- Added a JSON export importer for legacy MongoDB collections and a PostgreSQL embedding backfill command.
- Added `backend/.env.example` and updated system/database docs for the PostgreSQL-only runtime.

## Current runtime requirements

Set `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY`. PostgreSQL must provide pgvector and allow the startup role to create the extension and application schema. Set `PGSSLMODE=require` when the hosted database requires TLS. Email variables are optional for invitation and password reset flows. There is no runtime MongoDB or Pinecone dependency.

## Before switching an existing deployment

1. Back up MongoDB and export `users`, `analysisruns`, `analysisreports`, `chatsessions`, and `footprints` as Extended JSON arrays.
2. Export workspace rows from the current PostgreSQL database to `workspaces.json` so custom IDs and settings are preserved.
3. Point `DATABASE_URL` to the destination PostgreSQL database and run `LEGACY_MONGO_EXPORT_DIR=/secure/path npm run migrate:legacy-export` from `backend/`.
4. Run `npm run backfill:embeddings`, then compare source/destination counts and inspect representative accounts, reports, chat histories, and activity.
5. Exercise signup/login, admin invites and blocking, analysis, report regeneration/deletion/PDF, chat retrieval, and workspace isolation before cutover. Keep the backup until validation passes.

The importer preserves record IDs and is safe to rerun for the same exports. Chat messages are imported only when the destination chat session has no messages. Run the migration during a maintenance window to avoid concurrent writes.

## Validation status

Frontend and backend production builds pass. No live PostgreSQL instance or legacy data export was available in this workspace, so runtime SQL, import behavior, and application flows still need environment-backed verification before cutover.
