# Salesdig V2 Handoff

Updated: 2026-10-08. Work from branch `v2`.

## Completed phase

Steps 0–6 are implemented: seller profile/catalog/documents, persistent targets, durable evidence research, intelligence, opportunity matching, and sales copilot. Read [baseline](V2_BASELINE.md), [migration handoff](POSTGRES_MIGRATION_HANDOFF.md), and `plan.md` for contracts and limits.

The partial account-chat work was reviewed and completed. `008_account_chat.sql` preserves V1 global sessions and adds scoped account sessions and supplied-context references. Account mode uses bounded latest-run claims/excerpts, approved active offerings, compatible matches, and notes. Unsupported claim citation IDs are rejected. Account/user/workspace changes remount private state. Global report retrieval and follow-up rewriting remain compatible. Empty evidence skips the provider.

`009_sales_preparation.sql` adds author-private drafts, immutable source snapshots and edit revision history. Seven deterministic evidence-template types cover short/long pitches, unsent cold email, discovery questions, meeting briefs, objection responses and engagement roadmaps. New drafts require an unchanged approved active offering; existing snapshots remain readable after research refreshes or offering changes. User edits are unverified.

Account export downloads JSON with available intelligence, source dates/excerpts, uncertainty, score breakdowns and the author's drafts. V1 PDF export remains available. Analysis shows real workspace totals. Matching progress polls automatically; historical offering names come from saved version snapshots.

## Verification

Backend integration suite passed on disposable local PostgreSQL 16.15 with pgvector: V1 regressions, workspace isolation, draft privacy/revisions, cross-tenant foreign keys, account/global chat separation, source snapshot refresh, revoked offering approval, invalid citations, and pre-migration V1 chat preservation. Both package builds passed. Chromium walkthrough passed draft create/edit/save, evidence inspection, account chat/switching, empty-evidence response, dashboard and export API. Research/chat providers were mocked; PostgreSQL was real.

Neon remains the app database; its configured host failed DNS during a read-only test-database check. No shared Neon migration, paid Gemini call, deployment or outreach occurred. No provider/stack/dependency switch was introduced. Live Gemini answers and Neon startup remain unverified.

## Migration and runtime

Keep `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY` in untracked `backend/.env`. No new configuration is required. Startup applies migrations 001–009 transactionally. Back up or use an isolated Neon branch before starting the updated backend against shared data. Recovery limits are documented in the migration handoff.

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Working tree and stopping point

Preserve unrelated user files: `AGENTS.md`, `frontend/package-lock.json`, `AGENTS.md:Zone.Identifier`, root `package-lock.json`, and `plan.md:Zone.Identifier`. They are excluded from this phase's commit.

The user explicitly authorized committing and pushing this completed phase to `origin/v2`, then stopping. Do not start another phase, deploy, or modify shared Neon data under this task.
