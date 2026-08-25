# Cognifina AI — User Guide

A practical walkthrough of every module: what it does, why it exists, and exactly how its numbers are produced.

---

## Part I — Getting started

### 1. Create your workspace

1. Open the app and click **Get started**.
2. Register with email + password (min 8 characters). A session cookie signs you in for 30 days.
3. Password fields include a **show/hide eye toggle** — your password never has to be typed blind.

> Self-hosting? Set `ENCRYPTION_KEY` and `SESSION_SECRET` (`openssl rand -hex 32`) before your first login — they derive the vault key and session signatures.

### 2. Connect a model provider (BYOK) — optional but recommended

Go to **Settings → Model providers** (sidebar). The deterministic engines never need a key; keys power the optional entity-enrichment pass and **Evidence Chat**.

For each provider card:

| Field | Guidance |
|---|---|
| API key | Paste once (eye toggle included). Stored AES-256-GCM encrypted; only a `••••last4` hint is ever shown again. |
| Default model | Custom dropdown — searchable list from the provider (e.g. `gpt-4o`, `claude-3-5-sonnet-latest`, `gemini-2.0-flash`, `llama-3.3-70b-versatile`). |
| Base URL | Optional override — proxies, gateways, or your local Ollama (`http://localhost:11434/v1`). |

**Test & save** pings the provider with a 1-token completion before persisting; **Save without test** stores it as-is. Per-request overrides: send `x-cognifina-provider` / `x-custom-api-key` / `x-custom-base-url` headers to any run or chat endpoint.

Resolution order: request headers → your saved vault → server env fallback.

### 3. Pick a workflow

**Workflows** (sidebar) lists all 24 templates across four categories:

- **Due Diligence** — Startup Diligence, M&A Buy-side, Asset Quality Review, Vendor Diligence, Red Flag Forensic Sweep
- **Audit & Assurance** — Statutory Audit Prep, Revenue Recognition (ASC 606), Related Party Disclosures, Going Concern, Inventory Integrity, Fixed Asset Register
- **Tax & Regulatory** — Transfer Pricing Cross-Check, GST/VAT Reconciliation, FDI/FEMA Audit, TDS & Payroll, Customs & Import
- **Compliance & AML** — PEP & Sanctions Deep-Tier, UBO Unmasking, Anti-Bribery/FCPA, AML Monitoring Tuning, Sanctions Evasion Patterns, Crypto-Fiat Bridge, NGO Grant Utilization, ESG Substantiation

Filter by category chips or the search box; every card shows its category badge and an always-visible **Open workflow** action. Each workflow defines which checks run and its **evidence checklist** — the gap agent flags missing items explicitly rather than staying silent.

### 4. Upload & launch

On the workflow page:

1. **Drop documents** (up to 12 files, 25 MB each): PDF (text layer), XLSX/XLS, CSV, DOCX, TXT/MD.
2. Enter **Entity under review** and a free-form **Period label** — both appear on every report and finding.
3. Toggle the deterministic checks you want (pre-set per workflow).
4. **Start analysis** → redirected to the live run page.

#### What the six agents do (visible as progress)

| # | Agent | You'll see it… |
|---|---|---|
| 1 | Ingestion & Layout Parsing | read every page, tag text blocks with page + bounding-box coordinates, lift tables out of statements/spreadsheets |
| 2 | Deterministic Forensic Math | compute Benford χ²/Z/MAD, Beneish M-Score, Altman Z′ zones, Isolation-Forest outliers, ratio volatility |
| 3 | Entity Graph & Registry | resolve companies, directors, UBOs, related parties + identifiers (CIN/PAN/GSTIN/DIN) into a graph |
| 4 | Cross-Document Reconciliation | compare identical totals across documents (0.5% tolerance), tie balance sheets, fuzzy-match statement lines between versions |
| 5 | Gap & Omission Detection | flag missing checklist evidence, invoice-sequence discontinuities, scanned-page coverage limits |
| 6 | Report Compiler & Citation Binder | produce the weighted 0–100 score, ranked findings and the full markdown forensic report |

Stages advance automatically. If one fails (usually a malformed file), the run stops at that stage with the reason shown — earlier stages stay usable.

---

## Part II — The product modules

### 5. Dashboard (post-login home)

**What it is:** your usage cockpit — the first screen after signing in (configurable, see Profile → preferences).

**What you see and how each number is computed:**

| Element | How it's calculated | Why it's useful |
|---|---|---|
| **Total runs** | `count(*)` on your runs | overall workload |
| **Completed** | runs with `status='completed'` | how much finished successfully; sub-line shows active + failed |
| **Documents analyzed** | rows in `documents` joined to your runs | ingestion volume |
| **Findings reported** | rows in `findings` joined to your runs | total issues surfaced across all analyses |
| **Avg risk score** | mean of `runs.risk_score` over your **completed** runs, rounded | portfolio-level risk posture; sub-line shows how many provider keys are configured |
| **Findings by severity strip** | sums `summary.severityCounts` across runs (critical/high/medium/low/info) | instant read on where risk concentrates |
| **Recent runs** | latest 5 runs with status pill or `score/100` | one-click resume into any analysis |
| **Audit log** | latest 12 rows from `audit_events` for your account — every login/logout, run start/complete/fail/delete, key save/remove, profile change, with relative timestamps | self-service transparency: you can always see what happened on your account, and when |

**Benefits:** no need to open Runs to know where you stand; the audit feed doubles as a personal activity trail for compliance-minded teams.

### 6. Run pages (Overview · Entity Map · Forensic Ledger · Evidence Chat)

#### Overview tab
- **Risk gauge** — donut ring, weighted composite `min(100, Σ severity weights)` (critical 25 / high 15 / medium 8 / low 3 / info 1), banded Low <25 · Moderate <50 · Elevated <75 · Severe. Deterministic: same findings → same score, always.
- **Severity breakdown tiles** — counts feeding that score, plus an evidence tile (docs/tables/blocks extracted).
- **Ranked findings** — expandable cards with description, *recommended action*, agent origin, and **citation chips** that open the citation drawer.
- **Forensic report** — the full markdown deliverable.

#### Citation drawer
Document name, page, excerpt and confidence, plus a **page reconstruction**: the extracted text layer re-rendered from stored bounding-box coordinates with the cited block highlighted. This is what makes findings reviewable — no "trust me" black boxes.

#### Entity Map tab
Interactive ownership graph. Node colors encode type (company/subsidiary/UBO/director/person/related party/registry); edges carry relations like `holds 72.4%`. Built purely from document evidence — regex-first determinism, with LLM enrichment only if a provider is configured.

#### Forensic Ledger tab
- **Benford chart** — observed vs expected digit frequencies; deviation chips mark digits beyond ±2σ (red = excess, blue = deficit).
- **Metric cards** — Beneish M-Score (all eight ratios, threshold −1.78), Altman Z′ zone placement with component ratios, Isolation-Forest top anomalies with reasons (round-sum, weekend posting…), ratio suite table with volatility flags.

If a metric shows *inconclusive*, the detail line names exactly which inputs were missing from your uploads.

#### Evidence Chat tab (after completion)
Ask questions about the finished run. Grounding rules: answers retrieve only from this run's extracted passages **and** computed metrics, citing `[seg-N]` sources rendered as clickable chips; insufficient evidence produces an explicit refusal, never a guess. Without a provider key you still get the strictly extractive fallback. Suggestion chips (when the `chat_suggestions` flag is on) give you proven first questions.

### 7. Runs index
Every analysis with status, progress, score and timestamps — completed runs are immutable artifacts you can revisit anytime.

### 8. Profile

Open from the sidebar → **Profile**.

| Section | What it does | Notes |
|---|---|---|
| **Display name** | Update the name shown in the sidebar, chat and reports | saved via `PATCH /api/profile`; audited as `profile.renamed` |
| **Password** | Change password (current + new + confirm, all with eye toggles) | verifies current password server-side; audited as `password.changed`; other sessions stay valid until natural expiry |
| **Workspace preferences** | **Default landing page** (Dashboard/Workflows/Runs — honored at next sign-in) and **Compact tables** toggle | stored server-side in `users.preferences` (JSONB), merged on save; audited |
| **Danger zone** | Permanently delete the account | requires password + typing `DELETE`; wipes runs, documents, findings, citations, keys via DB cascade; audited before deletion |

**Benefits:** self-service identity management with a full audit trail — no support ticket needed for a name change, and deletion is immediate and complete (GDPR-style erasure).

### 9. Settings — Model providers
Covered in §2. The page also lists your keys' verification status and links the support email (`prot.das15@gmail.com`).

---

## Part III — Super Admin portal (`/super-admin`)

An internal administrative area. **Only accounts with the `SUPER_ADMIN` role can reach it** — enforced server-side on every page and API (role checks in handlers, never just redirects). The first super admin is bootstrapped via SQL (see `docs/DEPLOYMENT.md`); further grants happen inside the portal and are audited.

The portal uses the same warm-paper design system, with a date-range picker (7/14/30/90 days, UTC) that every analytics module respects, and every metric card shows **how it's calculated** on hover.

### 10. Overview
The state of the whole tool in one screen.

- **Stat cards** (each with previous-period value, % change and trend arrow): total users · new users · DAU/WAU/MAU · analyses started · completed · failure rate · avg risk score · documents ingested · findings · new workspaces.
  - *DAU/WAU/MAU* = distinct users with ≥1 event (run created, chat message, or account activity) in the trailing 1/7/30 days **in UTC**.
  - *Failure rate* = failed ÷ started runs in the window.
  - *Change %* = (current − previous) ÷ previous vs the equivalent earlier window.
- **Trends** — signups per day (area), active users per day (area), runs vs failures per day (bars).
- **Top workflows** — most-run templates in the window.
- **Accounts needing attention** — at-risk users with explicit reasons (see §13).
- **Recent admin events** — the newest rows from the audit trail.
- **Honest gaps** — metrics that cannot be computed today (revenue, AI token cost, request latency percentiles) render as *Unavailable* with the exact reason and the schema/integration that would enable them. Nothing is ever invented.

### 11. Users
Searchable, filterable (query/status/role), paginated list — 20 per page.

Each row: name, email (masked to non-privileged viewers is N/A — only super admins see this page), role, status, created, last activity, run counts, keys configured. Actions (all audited, sensitive ones password-confirmed):

| Action | Effect |
|---|---|
| **Suspend** | account can no longer sign in or hold valid sessions (epoch bump); super-admin targets require password re-auth |
| **Reactivate** | restore access |
| **Revoke sessions** | bump `session_epoch` — every issued token dies instantly |
| **Grant / revoke super admin** | role change, password-confirmed; revocation also clears sessions |
| **Internal notes** | admin-only notes stored on the account |

The user detail page shows full stats (runs by status, docs, findings, avg score, chat volume, keys), recent runs, the account's audit history and its risk assessment.

### 12. Product analytics
- **Signups over time / active users over time** — daily UTC buckets.
- **New vs returning** — a day's activity counts as *New* if it's the user's first-ever activity day, else *Returning*.
- **Activation funnel** (the real product flow): Account created → Started an analysis → Analysis completed → Used Evidence Chat → Returned (2+ distinct days). Each stage shows conversion from the previous.
- **Engagement** — avg runs per active user, power users (≥5 runs in window), never-used accounts, started-but-not-completed, inactive 30d, re-engaged (active before the window and again within it).
- **Segments** — by role and account status.

### 13. Retention & churn
- **Weekly cohort grid** — accounts grouped by signup week (Monday-aligned UTC); each cell = % of the cohort with ≥1 activity in that week of life. Future periods render as "not yet observable".
- **Churned** — users with ≥1 run but zero activity in 30 days, with last-activity date and lifetime run count; average lifetime-before-churn shown.
- **At-risk view** — every flagged account displays its **actual reason codes** and a confidence level: `no_runs_ever`, `no_activity_14d`, `declining_activity` (current 30d runs < ½ of prior 30d with a ≥2 baseline), `recent_failures` (≥2 failed runs/30d), `onboarding_incomplete` (3d+ old, never ran). Confidence is *high* when ≥2 independent signals agree. No account is flagged without visible evidence.

### 14. Feature analytics
A performance table for every product surface, derived from real usage rows:

| Column | Meaning |
|---|---|
| Feature | workflow template, Evidence Chat, BYOK vault |
| Users | distinct users in the window |
| Adoption % | users ÷ total accounts |
| Uses (cur/prev) | usage events this window vs previous |
| Change % | growth or decline |
| Errors | failed runs attributed to the workflow |

Sorted by usage; use it to spot under-adopted or error-prone features.

### 15. Recommendations & insights
A rule engine runs over the same aggregates and **persists** each finding to the database with a stable key, so insights have review lifecycle (New → Reviewed → In Progress → Completed / Dismissed) with reviewer + timestamp. Every insight cites its evidence (metric, values, window, source query) — rules with insufficient data stay silent. Typical rules:

- activation drop-off (share of accounts older than 3d with zero runs)
- failure rate above 15% and rising vs previous window
- workflow abandonment (started − completed − failed)
- Evidence Chat adoption below 30% of completers
- signup momentum falling >30% window-over-window

Each carries priority, confidence, affected segment/area, a recommended action and the expected outcome.

### 16. Feature flags
Server-side flags with real consumers. Toggling requires **password re-confirmation** and is audited (actor, flag, value). Current flags:

- `chat_suggestions` — the pre-written question chips on Evidence Chat
- `marketing_cta_band` — the closing CTA band on marketing pages

Flags are read by the app through a public, non-PII `/api/flags` endpoint.

### 17. System health
- **DB latency p50/p95** — measured live from 8 sequential `select 1` probes.
- **Runs (24h)** — total + failed counts.
- **Uptime & runtime** — server process uptime, Node version.
- **Session model note** — sessions are stateless epoch-bound cookies; revocation is instant.

### 18. Audit logs
Every account event and every admin action, paginated (25/page) and filterable by free-text, action type or user. Each row: actor (name + email), action, human-readable detail, structured metadata (target ids, actor role), UTC timestamp. Admin actions use the `admin.*` namespace (`admin.user_suspended`, `admin.grant_super_admin`, `admin.flag_toggled`, …).

---

## Troubleshooting

| Symptom | Meaning & fix |
|---|---|
| Run fails at Ingestion with a parse error | One file is malformed or password-protected. Re-export it and start a new run. |
| "N scanned pages lack a text layer" finding | Those pages were images. OCR them upstream (or export searchable PDFs) and re-run. |
| Beneish/Altman show *inconclusive* | Upload a Cash Flow statement (for TATA) and both current + prior period columns in Balance Sheet & P&L. The missing-field list tells you exactly what's absent. |
| Benford section empty | Fewer than 100 positive amounts were extractable — include transaction-level registers, not just summarized statements. |
| Chat answers feel short | No provider key configured → extractive mode. Add a key in Settings. |
| Provider test fails with HTTP 401 | Key rejected by the vendor. Re-paste it; check base URL overrides. |
| Signed out unexpectedly | An administrator revoked sessions or suspended the account — contact the workspace admin. |
| "Super admin access required" | Your account lacks the SUPER_ADMIN role. Ask an existing super admin (see the deployment guide for the bootstrap). |

## Tips for high-quality runs

1. **Two+ periods** unlock Beneish, Altman trajectories and volatility checks.
2. **Transaction-level ledgers** (journal/CSV exports) unlock Benford + Isolation Forest at full power.
3. **Upload overlapping statements deliberately** (management accounts vs audited) — reconciliation is strongest when it can cross-compare.
4. Name the **entity exactly** as it appears in documents; the entity agent anchors the ownership graph to it.

---

Need help? **prot.das15@gmail.com**
