# Salesdig V2 implementation plan

Status: Step 0 and Steps 1.1–1.3 implemented locally; Steps 2–6 remain planned.

## Goal and working agreement

Build Salesdig V2 on top of the existing Salesdig V1 repository. Preserve working authentication, workspaces, research, reports, chat, and retrieval while adding seller intelligence, structured target intelligence, evidence-backed opportunities, and sales preparation.

Read the repository's `AGENTS.md` before executing this plan. That file defines engineering rules; this file defines delivery order and acceptance criteria. Implement the requested step, verify it, and update its status with evidence. Do not interpret the existence of this plan as authorization to implement every milestone, deploy, or change production data.

This plan began from the agreed product design. Step 0 findings for the inspected checkout are recorded in `docs/V2_BASELINE.md`. Later paths, table names, and endpoints remain proposals until their milestones are implemented. Preserve React/Vite/TypeScript, Express/TypeScript, PostgreSQL/pgvector, and the existing Gemini/research integrations. No framework rewrite is planned.

## Delivery sequence

| Order | Milestone | User-visible result |
| --- | --- | --- |
| 0 | V1 baseline and isolation foundation | Existing flows are understood and critical access boundaries verified |
| 1 | V2.1 — Seller DNA | A workspace can describe and manage what its company sells |
| 2 | V2.2 — Target accounts | Prospects have persistent account pages and research history |
| 3 | V2.3 — Evidence-based research | Research produces stored, traceable claims and durable progress |
| 4 | V2.4 — Target intelligence | Account findings are organized into technology, people, signals, and gaps |
| 5 | V2.5 — Opportunity matching | Reps see which offerings fit, supporting evidence, and explainable scores |
| 6 | V2.6 — Sales copilot | Reps can prepare pitches, discovery calls, and meetings from account evidence |

Ship a usable slice at a time. Within a milestone, prefer one complete database → API → UI → verification flow over building every table first and postponing the product experience.

## Step 0 — Establish the V1 baseline

### 0.1 Inspect and record the current system

- [x] Read README, applicable agent instructions, package manifests, lockfiles, migration files, and relevant handoff documents.
- [x] Check Git status and preserve unrelated user changes.
- [x] Trace login, workspace selection, research submission, report viewing/export, and report chat through the actual code.
- [x] Identify current routes, schemas, data-access patterns, model clients, background-job support, upload/storage support, and progress transport.
- [x] Identify current tests and available build/typecheck/lint/test commands. If no test framework exists, choose a minimal one appropriate to the changed code.
- [x] Record verified commands and architecture in existing documentation, or a concise V2 implementation note if none exists.

### 0.2 Verify the foundation

- [x] Run the available frontend/backend build and type checks.
- [x] Use an isolated PostgreSQL database to verify relevant V1 migrations and representative persisted flows.
- [x] Capture representative V1 API responses and user journeys to guide compatibility checks.
- [x] Review server-side workspace membership and ownership checks, vector retrieval filters, caches, exports, chat, and progress access.
- [x] Add targeted isolation coverage and fix demonstrated defects before extending affected paths.

Use at least two workspaces and distinct users in authorization fixtures. Verify that a user from workspace B cannot read or modify workspace A's private record by supplying its ID, workspace selector, or nested-resource ID. Verify no unauthorized mutation or paid job occurs.

### 0.3 Resolve design decisions from the checkout

- [x] Decide whether the current workspace model already represents the selling organization; avoid a redundant organization layer.
- [x] Map intended Owner/Admin/Sales Manager/Sales Rep/Viewer permissions to the current role system.
- [x] Choose the existing migration mechanism, job mechanism, storage abstraction, and API-versioning approach.
- [x] Inspect Workmates-specific behavior and plan a compatible path toward generic tenants.
- [x] Decide how old reports and analysis runs will link to V2 accounts without inventing evidence.

**Exit criteria:** the actual V1 architecture and verification commands are documented; relevant baseline checks have executed; demonstrated access defects affecting V2 are addressed. Any unavailable live-database or provider checks are explicitly recorded, never described as passing.

## Step 1 — V2.1: Seller DNA

### 1.1 Deliver a structured seller profile

**What:** company name, website, description, industries, target-customer characteristics, differentiators, and onboarding status.

**How:** add or extend a workspace-owned company profile using an additive migration. Implement validated read/update APIs and a company-settings/onboarding screen. Reuse the current workspace identity and authentication.

- [x] Define minimum required fields and optional fields; existing V1 users must not lose access because their profile is incomplete.
- [x] Store profile revisions or a version identifier for later research reproducibility.
- [x] Enforce member/role access server-side.
- [x] Support save/resume and edit after onboarding.

### 1.2 Deliver the offering catalog

**What:** products, services, consulting, and managed services represented as structured offerings.

**How:** add workspace-scoped offerings with name, type, description, business outcomes, technical capabilities, relevant industries, ideal customer profile, review status, and active/archived status. Implement CRUD and an offerings screen.

- [x] Add partner records and case studies, with relevant offering links where useful.
- [x] Preserve differentiators, credentials, and case-study results as seller-supplied or document-backed claims.
- [x] Use archive/version behavior so historical opportunities can still identify the offering they referenced.
- [x] Keep hypothetical/draft offerings out of approved capability matching.

### 1.3 Deliver document ingestion and reviewed extraction

**What:** a company can upload supporting material and review AI suggestions for its profile/catalog.

**How:** use existing storage/extraction clients where suitable. Process documents through explicit ingestion states, keep chunks linked to document versions, and store extraction results as suggestions.

- [x] Choose an initial supported-format set based on existing parsers; show it in the UI.
- [x] Validate file type/size and authorize upload/download paths.
- [x] Implement upload, ingestion status, retry, and deletion/update behavior.
- [x] Have the model return validated structured suggestions with document provenance.
- [x] Let an authorized user accept, edit, or reject suggestions before they become approved seller data.
- [x] Ensure replaced/deleted documents cannot leave stale chunks available to retrieval.

**Acceptance criteria:** two workspaces can independently manage seller data; an authorized user can finish onboarding, add offerings and a case study, upload a supported document, and review suggestions. Cross-workspace access fails. Existing V1 research remains usable.

## Step 2 — V2.2: Persistent target accounts

### 2.1 Deliver account creation and listing

**What:** company name and website/domain create a persistent prospect inside the selected workspace. Optional fields include industry, geography, targeting reason, owner, tags, and notes.

**How:** add or extend the target-account entity. Normalize domains, preserve user-entered display values, and document duplicate handling. Do not silently merge distinct companies merely because they share a parent domain.

- [ ] Add validated account create/read/update/archive APIs and paginated listing.
- [ ] Add account list, create form, and account overview shell.
- [ ] Validate any assigned owner is an eligible member of the same workspace.
- [ ] Define duplicate research submission behavior separately from duplicate account behavior.

### 2.2 Connect V1 research and reports

**How:** add optional account references to suitable existing runs/reports or use an association table if safer. Launch existing research from an account through an adapter, and display its history there.

- [ ] Keep existing research endpoints and historical report viewing compatible.
- [ ] Offer explicit linking of legacy reports where identity and ownership are known.
- [ ] Do not automatically backfill ambiguous company matches or unowned records.
- [ ] Keep archived accounts' historical reports available under the chosen retention rules.

**Acceptance criteria:** a rep can create a prospect, run the existing research flow from it, and see its reports. Workspace boundaries hold for list/detail/mutation paths. A pre-V2 report still opens.

## Step 3 — V2.3: Evidence-based research

### 3.1 Establish the evidence contracts

**What:** sources and claims become persisted research objects rather than only text inside a report.

**How:** agree on schemas before changing provider prompts. A source records URL/title, type, retrieved timestamp, publication date if known, extracted content or a content pointer, and deduplication identity. A claim records its statement, classification, source references/excerpts, target/run scope, uncertainty, and freshness.

- [ ] Distinguish publication date, event date, and retrieval date.
- [ ] Define facts, inferences, and recommendations explicitly.
- [ ] Validate evidence references against the same tenant, target, and research snapshot.
- [ ] Preserve unknown dates and missing information instead of filling them with guesses.

### 3.2 Extend collection and extraction

**How:** wrap existing search/crawler/extraction utilities to persist provenance. Resolve the correct company before matching findings. Deduplicate repeated content and syndicated sources.

- [ ] Bound source count, crawl depth, response sizes, concurrency, and timeouts.
- [ ] Apply destination/redirect validation to prevent private-network and metadata fetches.
- [ ] Treat retrieved content as untrusted data and validate model output.
- [ ] Store facts separately from inferred business needs.
- [ ] Mark unsupported or conflicting claims instead of fabricating citations.

### 3.3 Make research durable

**How:** extend existing analysis-run/job infrastructure if it supports durable execution. Otherwise introduce the smallest maintainable worker mechanism that supports persistence, retry, and recovery.

- [ ] Persist stage transitions: queued, discovering, crawling, extracting, analyzing, matching, generating, completed; include explicit failure handling.
- [ ] Return a run ID promptly and expose authorized status/progress through existing transport or polling.
- [ ] Make stage writes idempotent; use bounded retries/backoff for transient failures.
- [ ] Keep usable partial results labelled incomplete.
- [ ] Preserve the last successful report while refresh runs; publish a new snapshot on success.
- [ ] Record seller-profile version, prompt/schema version, model metadata, and resource usage where available.

### 3.4 Surface provenance

- [ ] Add sources and claim evidence to the account/report UI.
- [ ] Preserve source links and fact/inference distinctions in exports.
- [ ] Show research date, partial/stale states, and unsupported sections clearly.

**Acceptance criteria:** a completed research run has persisted sources and evidence-linked claims; users can inspect supporting excerpts. A failed stage is visible and retry does not duplicate persisted results. Progress and evidence cannot be retrieved across workspaces. Legacy reports remain readable without synthetic citations.

## Step 4 — V2.4: Target intelligence

Build each section as a view/projection over persisted evidence. Introduce additional structured entities only when they improve retrieval, refresh, filtering, or relationships.

### 4.1 Company overview and Tech DNA

- [ ] Organize sourced company profile fields and recent developments.
- [ ] Normalize technologies into cloud/data/backend/infrastructure/AI/monitoring/CRM categories.
- [ ] Use confirmed/likely/unknown status with source dates and rationale.
- [ ] Keep “job requests AWS experience” distinct from “company operates production AWS workloads.”

### 4.2 Stakeholders and buying signals

- [ ] Store sourced professional names/roles and currentness; leave unavailable contact details unknown.
- [ ] Map potential economic buyer, technical buyer, champion, influencer, procurement, and sponsor roles with uncertainty visible.
- [ ] Normalize signal type, event date, strength rubric, evidence, and interpretation.
- [ ] Deduplicate one event mentioned by multiple sources.
- [ ] Avoid claiming a hiring trend without comparable observations across time.

### 4.3 Potential gaps and account page

- [ ] Derive gap hypotheses from affirmative evidence; missing public information alone is not a gap.
- [ ] Show an initial account page with Overview, Tech DNA, Stakeholders, Buying Signals, Potential Gaps, and Sources.
- [ ] Display empty, partial, and stale states instead of inventing findings for every section.

**Acceptance criteria:** every material finding is traceable; professional roles can be verified from sources; inference badges and uncertainty are consistent. Repeated signals are not double-counted. Sparse research renders honestly.

## Step 5 — V2.5: Opportunity matching

### 5.1 Match offerings to evidence

**What:** opportunities describe a target need/hypothesis, matching approved seller offering, supporting facts, rationale, uncertainty, timing, stakeholders, and recommended entry action.

**How:** first select plausible offering/evidence pairs using structured fields and scoped retrieval. Use validated model analysis to assess those pairs. Persist the resulting opportunity and evidence links rather than regenerating an unstructured list on every page load.

- [ ] Match only approved/active seller capabilities from the relevant version.
- [ ] Preserve offering and research version references for historical results.
- [ ] Require evidence for claims; distinguish discovery hypotheses from confirmed needs.
- [ ] Support a transparent no-supported-opportunity result.

### 5.2 Implement explainable scoring

Start with the proposed rubric, subject to a documented product decision:

| Component | Weight |
| --- | ---: |
| Offering fit | 30% |
| Identified business pain | 20% |
| Buying signals | 15% |
| Technology compatibility | 10% |
| Financial capacity | 10% |
| Decision-maker accessibility | 5% |
| Strategic timing | 10% |

- [ ] Define component rubrics, ranges, evidence requirements, and treatment of missing data.
- [ ] Calculate the total in application code and persist the breakdown/scoring version.
- [ ] Keep priority, evidence coverage, and confidence separate; a score is not a purchase probability.
- [ ] Explain normalization if used and guard against inflated scores from sparse evidence.
- [ ] Avoid repeated contribution from the same event or correlated signals unless justified.
- [ ] Verify arithmetic, bounds, missing-data behavior, and consistent results from unchanged inputs.

### 5.3 Deliver opportunity map and sales plays

- [ ] Show target need → evidence → seller offering → rationale/priority.
- [ ] Generate a few supported plays with why now, relevant stakeholder, entry offer, and assumptions to validate.
- [ ] Explain low-priority or unsuitable offerings when useful.
- [ ] Keep incentive eligibility and funding amounts unverified unless supported by current program information.

**Acceptance criteria:** a rep can inspect why an offering was recommended and how its score was calculated. No unsupported seller capability is pitched. Changing seller offerings or refreshing research yields a new version rather than silently rewriting historical recommendations.

## Step 6 — V2.6: Sales copilot

### 6.1 Pitch and discovery preparation

- [ ] Generate a 30-second pitch, longer pitch, cold-email draft, discovery questions, and meeting-preparation brief from selected opportunities.
- [ ] Add objection-handling suggestions and a recommended engagement roadmap.
- [ ] Retain source and version references even when citations are kept outside customer-facing draft copy.
- [ ] Frame uncertain pains as discovery questions; never invent customer problems, budgets, commitments, or seller achievements.
- [ ] Let reps edit and save drafts. Draft creation does not send email or messages.

### 6.2 Account-aware chat

**How:** extend current chat/RAG rather than replacing it. Bind conversations to workspace and account. Retrieve approved seller knowledge plus the selected target's sources, findings, opportunities, and permitted notes.

- [ ] Apply workspace/account/version filters inside retrieval queries before ranking/limiting.
- [ ] Clear stale context on workspace/account switching.
- [ ] Provide inspectable evidence and admit when research cannot answer a question.
- [ ] Protect against document/page instructions attempting to override tenant context or application policy.
- [ ] Preserve existing V1 report-chat access and behavior through compatible routing/context handling.

### 6.3 Complete the integrated user journey

- [ ] Update the dashboard with real account/research/opportunity aggregates.
- [ ] Link account intelligence, opportunity map, sales plays, meeting preparation, and chat coherently.
- [ ] Support export of available findings with provenance and uncertainty intact.

**Acceptance criteria:** a user can complete onboarding → add target → research → inspect evidence → select opportunity → prepare pitch/questions → ask account chat. V1 flows still work; drafts remain drafts; account context and retrieval remain isolated.

## Proposed API surface

Use these as domain contracts, not mandatory exact URLs. Confirm existing routing and reuse compatible endpoints. `workspaceId` is a selector requiring server-side membership checks, never proof of access.

| Domain | Representative operations |
| --- | --- |
| Seller profile | `GET/PATCH /api/v2/workspaces/:workspaceId/company-profile` |
| Offerings/partners/case studies | Scoped list/create/update/archive under the workspace |
| Seller documents | Upload, status, download, delete, review suggestions |
| Targets | `GET/POST /api/v2/workspaces/:workspaceId/targets` and scoped detail/update/archive |
| Research | `POST .../targets/:targetId/research`, run status/history, authorized progress |
| Intelligence | Scoped overview/technologies/people/signals/sources |
| Opportunities | Scoped list/detail, explicit recomputation with versions |
| Sales preparation | Generate/save content and meeting-preparation output |
| Chat | Existing chat extended with authorized account context |

Validate nested parent/child ownership on every operation. Version contracts only where necessary; do not relocate working V1 endpoints merely for naming consistency.

## Repository implementation approach

After inspection, place code in the existing conventions. Likely boundaries are route/controller validation and authorization, domain services, persistence/repositories, research-stage utilities, provider adapters, worker execution, and frontend feature modules. These are responsibilities, not a requirement to introduce a new framework or directory hierarchy.

Keep SQL, authorization, model prompting, matching, and UI presentation independently understandable. Reuse existing clients and shared contracts. Update environment examples and deployment notes when a requested change introduces a worker, storage setting, or configuration requirement; never include real credentials.

For each slice:

1. Inspect the affected flow and record contracts/compatibility needs.
2. Write the additive migration and data-access behavior where needed.
3. Implement validated APIs and authorization.
4. Connect the frontend, including loading/empty/error states.
5. Add meaningful behavior/isolation checks appropriate to the change.
6. Run relevant build/type/test/database checks and the affected V1 flow.
7. Document migration/configuration steps and update this plan's completion evidence.

## V2 release gate

- [ ] Requested V2 milestones are complete; unfinished future functionality is not presented as available.
- [ ] Migrations have been exercised against representative V1 data on an isolated database.
- [ ] Relevant V1 auth/workspace/research/report/export/chat journeys still pass.
- [ ] Workspace boundaries cover APIs, workers, storage, caches, retrieval, exports, and progress access.
- [ ] Evidence, unsupported claims, freshness, and scoring explanations are inspectable.
- [ ] Invalid model output and worker/provider failures have controlled user-visible behavior.
- [ ] Research has bounded time, page/model usage, retries, and cost visibility where providers expose usage.
- [ ] Configuration and operational recovery instructions are documented.
- [ ] Executed checks and remaining verification gaps are recorded honestly.

Publishing/deploying is a separate authorized action. Completion of this release gate alone does not authorize production deployment.

## Deferred work

Continuous account monitoring, CRM sync, internal-document connectors, collaboration mentions/teams, automated prospect discovery, licensed data enrichment, full partner-funding matching, autonomous outreach, and elaborate multi-agent orchestration follow the core V2 loop. They do not block Seller DNA or the initial account-intelligence delivery unless separately requested.

## Recommended first Codex task

```text
Read AGENTS.md and plan.md. Execute Step 0 against the actual checkout:
inspect V1, run available checks, review workspace isolation, and document
the verified baseline and any blockers. Make only the foundational fixes
necessary for the upcoming Seller DNA slice.

Then implement Step 1.1: a workspace-scoped seller company profile with an
additive migration, validated read/update APIs, and editable onboarding UI.
Preserve V1 access and flows. Run relevant checks and report what passed,
what was not verified, and required migration/configuration steps.

Do not implement the remaining milestones or deploy in this task.
```

## Completion log

When a slice is completed, add a dated entry identifying the code revision if available, migration names, checks actually executed, results, and any unresolved limitation. Update task status only from observed implementation and verification evidence.

**2026-10-06 — Step 0 and Step 1.1:** Added `001_workspace_seller_profile.sql`, versioned workspace profile APIs, and an editable Company Settings form. Backend/frontend builds passed. Backend HTTP tests passed against isolated local PostgreSQL with pgvector (two workspaces, role checks, forged workspace claim, incomplete legacy-profile report access). Applied the additive migration to an isolated database containing a pre-migration V1 workspace, run, and report; all persisted. No Neon/production migration or paid Gemini call was made. Initial revision: `1259685`.

**2026-10-06 — verification follow-up:** Added preference-only saves to prevent stale Company Settings tabs from replacing profile fields. Six backend tests passed against isolated local PostgreSQL, covering login, profile/API authorization, V1 settings, report history/detail/run, PDF generation, chat history, and invalid or unauthenticated research requests with no new run. Both builds passed. Repeated migration initialization preserved the V1 fixture and one migration record. A Chromium walkthrough passed profile validation, completion, and reload persistence. Full paid Gemini research and chat answers remain unverified; Neon/production was not touched.

**2026-10-06 — Step 1.2:** Added `002_seller_catalog.sql`, workspace-scoped offerings, partners, linked case studies, admin review, archive/restore, and version snapshots. Approved-offering query filters drafts and archived rows before matching. Backend integration tests on isolated local PostgreSQL cover two workspaces, forged workspace claims, cross-tenant case-study links, role checks, approval, archive, and history. Frontend/backend builds passed. Chromium walkthrough created an approved offering, partner, and linked approved case study. No production database was modified. Document ingestion and later milestones remain pending.

**2026-10-07 — Step 1.3:** Added `003_seller_documents.sql`, bounded UTF-8 text/Markdown upload, versioned PostgreSQL storage and pgvector chunks, queued extraction worker, validated excerpt-backed suggestions, and admin review into draft catalog entries. Replacement/deletion removes chunks and retires unchanged document-backed catalog entries. Both builds and 11 backend tests passed against an isolated local PostgreSQL database, including two-workspace authorization, invalid evidence, retry, replacement, and deletion. A Chromium walkthrough passed upload → process → review → accept as draft. Gemini extraction and Neon production migration were not exercised; tests used mock providers and no production data was changed.
