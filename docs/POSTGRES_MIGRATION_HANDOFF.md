# PostgreSQL Migration Handoff

Updated: 2026-10-08

## Completed

- PostgreSQL stores users, reports, analysis runs, chat sessions/messages, activity, workspaces, and report embeddings.
- pgvector replaces Pinecone for report retrieval.
- Mongoose, MongoDB runtime configuration, and the legacy Mongo import tool are removed. There is no MongoDB data to migrate.
- Workmates remains the default workspace configuration; new companies can create isolated workspaces and customize their settings.
- `backend/.env.example` lists the current environment variables.
- Additive migrations `001`–`007` add seller profiles, catalog data, seller documents, target accounts, evidence-backed research, target intelligence, and opportunity matching. They run automatically on backend startup through `schema_migrations`.

## Run the app

1. Provision PostgreSQL with pgvector available and create a database.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` in `backend/.env`. Set `PGSSLMODE=require` if the host requires TLS. Email variables are optional.
3. Run `cd backend && npm install && npm run dev`. Startup creates the application tables and Workmates default workspace.
4. Run the frontend separately and set `VITE_BACKEND_URL` to the backend URL.

## Validation

Frontend and backend production builds pass. The V2 migration and authorization flows were exercised against an isolated PostgreSQL database whose name ends in `_test`; no shared Neon data was changed. Before using a shared Neon database, take a backup and start the backend once to apply pending additive migrations. Use `npm run backfill:embeddings` only if existing PostgreSQL reports need their vectors rebuilt.

## Migration recovery

Migrations execute under a transaction and advisory lock. A failed migration rolls back and prevents backend startup. Correct the migration or apply a forward fix, then restart. Do not edit a migration already recorded in `schema_migrations`; add a new numbered migration. `007_opportunity_matching.sql` is additive and preserves historical reports, research runs, and seller-offering versions. Removing its tables would discard V2 match history.
