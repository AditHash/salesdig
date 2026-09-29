# PostgreSQL Migration Handoff

Updated: 2026-09-29

## Current state

The app supports isolated company workspaces. New workspaces inherit editable Workmates settings by default; workspace admins can customize branding, sales services, partner products, and recommendation options.

The database migration is only partial. PostgreSQL with pgvector stores workspace settings and report embeddings. MongoDB via Mongoose still stores users, analysis reports, analysis runs, chat sessions, and activity records. The backend currently needs both `DATABASE_URL` and `MONGO_URI`; Pinecone has been removed from the current code path.

## Completed and pushed

- Workspace registration, workspace scoped access, and admin settings customization.
- Workmates default workspace configuration and per workspace branding/product settings.
- PostgreSQL workspace settings and pgvector report retrieval, replacing Pinecone.
- Frontend and backend production builds passed for commit `2e54a90` (`Add customizable company workspaces`).
- App source baseline and lockfiles are committed and pushed to `origin/main`.

## Work remaining for PostgreSQL only

1. Define PostgreSQL tables and constraints for users, reports, analysis runs, chat messages/sessions, and activity. Keep flexible AI report payloads in JSONB and stable ownership/status fields relational.
2. Replace all Mongoose models, connection setup, and queries across auth, admin, reports, analysis orchestration, chat, activity, retrieval, PDF, and scripts.
3. Add a repeatable migration for existing MongoDB records, preserving IDs or mapping references consistently. Document backup, rerun, and cutover steps before removing the old database.
4. Remove Mongoose and `MONGO_URI`; update package manifests, environment documentation, startup and migration scripts so PostgreSQL is the only application database.
5. Verify workspace isolation and ownership checks across every query, then run frontend/backend builds and database-backed flow checks.

## Resume point

Start by auditing remaining Mongoose imports and designing the relational schema plus legacy-data migration. At handoff, no PostgreSQL-only migration work has started. The user's existing `README.md` edit is unstaged and must be preserved.
