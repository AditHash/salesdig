# PostgreSQL Migration Handoff

Updated: 2026-10-08

## Completed

- PostgreSQL stores users, reports, analysis runs, chat sessions/messages, activity, workspaces, and report embeddings.
- pgvector replaces Pinecone for report retrieval.
- Mongoose, MongoDB runtime configuration, and the legacy Mongo import tool are removed. There is no MongoDB data to migrate.
- Workmates remains the default workspace configuration; new companies can create isolated workspaces and customize their settings.
- `backend/.env.example` lists the current environment variables.
- Additive migrations `001`–`009` add seller profiles, catalog data, seller documents, target accounts, evidence-backed research, target intelligence, opportunity matching, account chat, and saved sales preparation. They run automatically on backend startup through `schema_migrations`.

## Run the app

1. Provision PostgreSQL with pgvector available and create a database.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` in `backend/.env`. Set `PGSSLMODE=require` if the host requires TLS. Email variables are optional.
3. Run `cd backend && npm install && npm run dev`. Startup creates the application tables and Workmates default workspace.
4. Run the frontend separately and set `VITE_BACKEND_URL` to the backend URL.

## Validation

Frontend and backend production builds pass. The V2 migration and authorization flows were exercised against an isolated PostgreSQL database whose name ends in `_test`; no shared Neon data was changed. Before using a shared Neon database, take a backup and start the backend once to apply pending additive migrations. Use `npm run backfill:embeddings` only if existing PostgreSQL reports need their vectors rebuilt.

## Migration recovery

Migrations execute under a transaction and advisory lock. A failed migration rolls back and prevents backend startup. Correct the migration or apply a forward fix, then restart. Do not edit a migration already recorded in `schema_migrations`; add a new numbered migration. `007_opportunity_matching.sql` is additive and preserves historical reports, research runs, and seller-offering versions. Removing its tables would discard V2 match history.

`008_account_chat.sql` preserves existing sessions as global sessions with `account_id=NULL`, replaces the single-user uniqueness constraint with scoped global/account indexes, and adds tenant-aware user/account foreign keys and stored context references. It supports PostgreSQL 14+ without `NULLS NOT DISTINCT`. Existing mismatched user/workspace records cause migration failure rather than guessed reassignment; resolve ownership explicitly before retrying. `009_sales_preparation.sql` adds author-private drafts, immutable source snapshots, and revision history. Both run after `007`. Dropping the new tables/columns loses draft revisions or account chat context, and restoring V1 single-session uniqueness requires resolving additional sessions; use a forward fix or backup restore instead.

Neon remains the application database. Keep its connection string in `backend/.env`; no database/provider switch or new environment variable is required. This phase did not apply migrations to Neon. Backend startup will apply pending migrations, so back up or use an isolated Neon branch before starting the updated backend against a shared database. Local disposable PostgreSQL/pgvector tests and mocked-provider browser checks do not verify Neon connectivity or live Gemini answers.
