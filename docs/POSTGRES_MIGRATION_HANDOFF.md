# PostgreSQL Migration Handoff

Updated: 2026-09-30

## Completed

- PostgreSQL stores users, reports, analysis runs, chat sessions/messages, activity, workspaces, and report embeddings.
- pgvector replaces Pinecone for report retrieval.
- Mongoose, MongoDB runtime configuration, and the legacy Mongo import tool are removed. There is no MongoDB data to migrate.
- Workmates remains the default workspace configuration; new companies can create isolated workspaces and customize their settings.
- `backend/.env.example` lists the current environment variables.

## Run the app

1. Provision PostgreSQL with pgvector available and create a database.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` in `backend/.env`. Set `PGSSLMODE=require` if the host requires TLS. Email variables are optional.
3. Run `cd backend && npm install && npm run dev`. Startup creates the application tables and Workmates default workspace.
4. Run the frontend separately and set `VITE_BACKEND_URL` to the backend URL.

## Validation

Frontend and backend production builds pass. A live PostgreSQL instance was not available in the implementation environment, so verify startup and core flows against the configured database before deployment. Use `npm run backfill:embeddings` only if existing PostgreSQL reports need their vectors rebuilt.
