# Salesdig V2 Handoff

Updated: 2026-10-08. Work from branch `v2`.

## Committed baseline

V2 Steps 0–5 are committed locally. The latest commits are `96f3e5d` (evidence-backed opportunity matching) and `3678f2a` (documentation). The branch is seven commits ahead of `origin/v2`; nothing was pushed during the V2 task.

Completed slices: workspace seller profile, approved seller catalog, reviewed seller documents, target accounts, durable evidence research, target intelligence, and opportunity matching. Read [V2 baseline](V2_BASELINE.md), [migration handoff](POSTGRES_MIGRATION_HANDOFF.md), and `plan.md` before editing.

## Verification already run

On the isolated database URL ending `salesdig_v2_step11_test`, backend `npm test` passed: 21 tests, including V1 regression, workspace isolation, research retry, evidence, intelligence, and matching coverage. Backend and frontend `npm run build` also passed. No shared Neon data or paid Gemini calls were used for those checks.

## Uncommitted Step 6 work

Do not treat the following as complete or publish it without review. These files contain a partial account-chat slice:

- `backend/migrations/008_account_chat.sql`
- `backend/src/controllers/chat.controller.ts`
- `frontend/App.tsx`
- `frontend/components/ChatPanel.tsx`
- `frontend/services/chat.service.ts`

Intent: separate global and account-specific chat sessions, scope a selected account’s claims/opportunities by workspace and account, and reset chat history when the target route changes. The migration drops the old single-session-per-user constraint and adds nullable `account_id` to `chat_sessions`.

Before continuing, review the SQL compatibility on isolated PostgreSQL, add authorization and regression tests, bound account context size, retain inspectable claim/source references, and test global V1 chat unchanged. Then finish Step 6.1 saved pitch/discovery drafts and Step 6.3 journey/dashboard/export work. Do not mark Step 6 checkboxes complete yet.

## Working tree protection

Leave these unrelated user changes untouched: `AGENTS.md`, `frontend/package-lock.json`, `AGENTS.md:Zone.Identifier`, `package-lock.json`, and `plan.md:Zone.Identifier`.

## Start commands

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Use `backend/.env` for `DATABASE_URL`, `JWT_SECRET`, and `GEMINI_API_KEY`; keep it untracked. Run migrations only through backend startup, first against an isolated PostgreSQL database. Do not deploy, push, or modify shared Neon data without an explicit new instruction.
