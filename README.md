# Salesdig

Salesdig is an open-source company research and sales intelligence app. The frontend uses React and Vite; the backend uses Node.js, Express, and TypeScript. PostgreSQL stores application data, and pgvector stores report embeddings. Workmates is the default workspace; other companies can create isolated workspaces and customize their sales settings.

## Requirements

- Node.js 20 or newer (required by the Gemini SDK)
- PostgreSQL with pgvector installed
- Gemini API key for research, recommendations, embeddings, and chat

Create the database before starting the backend. The backend enables the `vector` extension and creates application tables on startup. Set a strong `JWT_SECRET` and valid `GEMINI_API_KEY` in `backend/.env`.

For Neon, use its PostgreSQL connection string as `DATABASE_URL` and ensure the role can enable pgvector. Keep Neon credentials in `backend/.env`; the app does not need the Neon CLI, object storage, or deployment command. Additive migrations in `backend/migrations/` run automatically on backend startup. Back up the database before applying them to a shared environment. Existing Workmates and other workspace rows keep their names, descriptions, users, reports, and V1 access; their new profile starts as `not_started`.

## First-time setup

Install dependencies once in each package directory:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`: set `DATABASE_URL` to your PostgreSQL database, `JWT_SECRET`, and `GEMINI_API_KEY`. Email settings are optional.

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local` with the backend API URL:

```dotenv
VITE_BACKEND_URL=http://localhost:5000/api
```

## Run in development

Start each service in its own terminal. `npm install` is not needed again unless dependencies change.

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Vite serves the frontend at `http://localhost:3000`; the API defaults to port `5000`.

## Run the built backend

Build before using `npm start`; start serves the compiled backend from `dist/`.

```bash
cd backend
npm run build
npm start
```

## Seller company profile and checks

Workspace admins can open **Company Settings** to save a seller profile draft, complete onboarding, and edit it later. Members can read the profile through `GET /api/workspace/current/company-profile`; admins can update it with `PATCH` and the current `version`. The other Company Settings fields save through `PATCH /api/workspace/current/preferences`, so a stale settings tab cannot overwrite a newer profile name or description. Completion requires a company name, website, and description. Industries, ideal customer profile, and differentiators are optional. Profile completion does not gate V1 research, reports, or chat.

Run builds from each package directory with `npm run build`. Backend integration tests use a disposable PostgreSQL database with pgvector and Puppeteer's installed Chromium for the PDF check. The database name must end in `_test`; never point this command at Neon production:

```bash
cd backend
TEST_DATABASE_URL='postgresql://test_user@localhost:5432/salesdig_test' npm test
```

The test suite creates and removes its own workspace and report fixtures.

## Seller catalog

Company Settings includes workspace-owned offerings, partners, and case studies. Admins create, edit, approve, archive, and restore items; members have read-only API access under `/api/seller`. Offerings record type, capabilities, business outcomes, industries, and ideal customers. Case studies can link to an offering in the same workspace. Each change keeps a version snapshot, and only approved, active offerings are eligible for opportunity matching. The additive catalog migration runs on backend startup after the profile migration.

## Seller documents

Workspace admins can upload UTF-8 `.txt` or `.md` files up to 20 KB in Company Settings. Files and versioned text are stored in PostgreSQL; no object storage is required. The backend worker starts with the API, extracts suggestions with Gemini, and stores pgvector chunks linked to the current document version. Admins review, edit, or reject suggestions. Accepted suggestions create draft catalog entries; approval is a separate catalog action. Replacing or deleting a document removes its chunks and retires unchanged document-backed entries. Members can read and download documents in their own workspace.

The worker retries interrupted processing up to three attempts and marks failures for manual retry in Company Settings. It needs `GEMINI_API_KEY` for extraction and embeddings. `SELLER_EXTRACTION_MODEL` optionally overrides its default extraction model. Migration `003_seller_documents.sql` runs on backend startup after the catalog migration. Run `npm run build` and `TEST_DATABASE_URL='postgresql://test_user@localhost:5432/salesdig_test' npm test` before using a shared database; the test URL must end in `_test`.

## Target accounts

The **Target accounts** page stores prospects per workspace. Any member can create an account and research it; the account owner or workspace admin can edit or archive it. Admins can assign an active workspace member as owner through the API. Exact active name-and-domain duplicates return a conflict, while differently named companies may share a domain. A second research request for the same account is rejected while one run is active; completed or failed runs do not block a refresh.

Research from an account creates a durable background run and returns immediately. The account page polls authorized run status and shows collected source excerpts and labelled facts, inferences, or recommendations. Source fetching is bounded and rejects private-network destinations; incomplete runs keep their partial evidence and can be retried. A completed evidence-backed run publishes a new report without overwriting older reports. Report access remains under existing V1 owner/admin rules. Users can explicitly link their own older reports only when the report domain matches the account domain. No historical report is linked automatically. Archived accounts keep their linked history, but cannot start new research until restored.

Completed evidence-backed research also builds account intelligence from its validated claims: an overview, Tech DNA, sourced stakeholders, discrete buying signals, and evidence-backed gap hypotheses. Each item links back to its source claim. Technology inferred from a hiring post stays **likely** rather than confirmed production usage; unknown information and unsourced contact details remain unknown. Gap hypotheses are discovery questions, never statements based only on missing public information.

## Opportunity matching

From a researched target account, select **Match offerings**. Salesdig compares only approved, active workspace offerings with saved, cited target findings. It saves the matching input and seller-offering versions, so a repeated unchanged request reuses the existing result. Sales Potential is a priority rubric with evidence coverage and score components; it is not a purchase probability. Missing data stays unavailable instead of becoming a negative score.

Additive migration `004_target_accounts.sql` runs after the seller-document migration. It adds account records and optional account references to runs and reports; existing references remain `NULL`. Back up shared databases before startup. A forward fix or backup restore is needed if a migration fails; removing the new table or columns would discard account links.

## Sales copilot

On a researched target account, match approved offerings and select an opportunity in **Sales preparation**. Create a saved 30-second or longer pitch, cold-email draft, discovery questions, meeting brief, objection responses, or engagement roadmap. Preparation uses evidence-based templates, with no paid model call. Needs remain discovery questions; drafts never send messages. Your drafts are private to you, editable with optimistic revision checks, and retain the original research, offering version, and source excerpts after refreshes or edits. Manual edits are unverified.

Open **Ask Salesdig** on an account page for account-specific chat. Its bounded context uses that account's latest completed research, approved active offerings, compatible offering matches, and notes. Evidence supplied to each answer is inspectable. Missing evidence produces a clear response without a provider call. Global V1 report chat and history remain separate. Account/user/workspace changes reset the chat panel.

The Analysis dashboard shows saved workspace account, research, and opportunity totals plus your draft count. **Export account with evidence** downloads JSON containing available intelligence, source dates/excerpts, uncertainty, score breakdowns, and your saved drafts. Existing report PDF export remains available.

Migrations `008_account_chat.sql` and `009_sales_preparation.sql` run automatically after `001`–`007` on backend startup. For Neon, retain the existing `DATABASE_URL`; back up or create a Neon test branch before applying migrations to a shared database. No new configuration is required. See [migration handoff](docs/POSTGRES_MIGRATION_HANDOFF.md) for recovery limitations.

## WSL with Windows PostgreSQL

When Node runs in WSL and PostgreSQL runs on Windows, `localhost` in `DATABASE_URL` points to WSL. Set its host to the Windows host address shown by `ip route` (the default route). When opening a WSL-hosted frontend from Windows, start Vite with `npm run dev -- --host 0.0.0.0`, then open the WSL IP shown by `hostname -I`. Set `VITE_BACKEND_URL` and `FRONTEND_URL` to matching reachable addresses. WSL addresses can change after a restart.

## Project notes

See [the migration handoff](docs/POSTGRES_MIGRATION_HANDOFF.md) for current PostgreSQL and workspace status. [Product context](docs/PRODUCT_CONTEXT.md) and [earlier system notes](docs/CURRENT_SYSTEM.md) record the original Cloud Catalyst review; use the current source and migration handoff for the implemented architecture.
