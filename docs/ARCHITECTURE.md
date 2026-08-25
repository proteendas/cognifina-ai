# Cognifina AI — Architecture

> Deterministic forensic & compliance meta-harness. "Statistics lead. Models follow.": hard statistics always precede probabilistic inference, and every artifact is reproducible.

---

## 1. System context

```mermaid
flowchart LR
    subgraph Users["Browser sessions"]
        U["Analyst / Deal team"]
        A["Super Admin"]
    end

    subgraph Vercel["Vercel Edge Network"]
        MW["middleware.ts<br/>cookie-presence redirects only"]
        subgraph Next["Next.js 14 App Router — one deployment"]
            MKT["Marketing site<br/>/ · features · engines · pipeline · security · pricing"]
            APP["Product app<br/>dashboard · workflows · runs · profile · settings"]
            SA["Super Admin portal<br/>/super-admin/*"]
            API["Route handlers<br/>/api/auth · profile · stats · settings · workflows<br/>/api/runs(+advance, chat) · documents · flags"]
            AAPI["Admin route handlers<br/>/api/admin/* — role + permission gated"]
        end
        PG[("Postgres<br/>Vercel Postgres / Neon")]
    end

    subgraph Providers["BYOK LLM providers — optional"]
        OAI["OpenAI"]
        CLA["Anthropic"]
        GEM["Google Gemini"]
        GRQ["Groq"]
        DSK["DeepSeek"]
        MST["Mistral"]
        OLL["Ollama (local)"]
    end

    U -->|HTTPS| MW
    A -->|HTTPS| MW
    MW --> MKT
    MW --> APP
    MW --> SA
    APP --> API
    SA --> AAPI
    API <-->|drizzle-orm / postgres.js| PG
    AAPI <-->|drizzle-orm| PG
    API -.->|fetch, temperature=0| Providers

    classDef opt stroke-dasharray: 5 5;
    class Providers opt;
```

Everything ships as **one Next.js application**. The only external dependency is Postgres. LLM providers are strictly optional: the deterministic engines and the extractive-chat fallback work with **zero** keys configured.

---

## 2. Execution pipeline (serverless stage machine)

Long-running workers don't exist on serverless, so the 6-agent pipeline is a **stage machine advanced by the client**: each `POST /api/runs/:id/advance` executes exactly one agent to completion and returns progress. The run dashboard drives this loop automatically.

```mermaid
sequenceDiagram
    autonumber
    participant UI as Run Dashboard (client)
    participant ADV as POST /api/runs/:id/advance
    participant DB as Postgres

    UI->>ADV: advance()
    Note over ADV: Agent 1 — Ingestion & Layout Parsing
    ADV->>DB: parse stored bytes → text_blocks(bbox) + extracted_tables
    ADV-->>UI: {currentStage:1, progress:17%}

    UI->>ADV: advance()
    Note over ADV: Agent 2 — Deterministic Forensic Math
    ADV->>DB: benford/beneish/altman/isolation-forest/ratios → metrics + findings
    ADV-->>UI: {currentStage:2, progress:33%}

    UI->>ADV: advance()
    Note over ADV: Agent 3 — Entity Graph & Registry
    ADV->>DB: regex (+optional LLM) deduped nodes/edges
    ADV-->>UI: {currentStage:3, progress:50%}

    UI->>ADV: advance()
    Note over ADV: Agent 4 — Cross-Document Reconciliation
    ADV->>DB: total tie-outs, BS balance check, fuzzy line drift → findings + citations
    ADV-->>UI: {currentStage:4, progress:67%}

    UI->>ADV: advance()
    Note over ADV: Agent 5 — Gap & Omission Detection
    ADV->>DB: checklist scan, invoice-sequence gaps, scanned-page scope notes
    ADV-->>UI: {currentStage:5, progress:83%}

    UI->>ADV: advance()
    Note over ADV: Agent 6 — Report Compiler & Citation Binder
    ADV->>DB: weighted risk score, summary jsonb, report_md, scope citations
    ADV-->>UI: {status:"completed", progress:100}
```

**Failure semantics:** any agent exception marks the run `failed`, records the message with the stage name, and stops advancement — completed stages are preserved.

---

## 3. Workflow registry (all 25 definitions)

Every workflow is a pure-data definition in `src/lib/workflows/definitions.ts`: a document checklist, a category, and the deterministic checks it enables. `COMMON_CHECKS` (gaps + reconciliation) apply to all.

| # | Category | Workflow | Extra checks beyond common |
|---|----------|----------|----------------------------|
| 1 | Due Diligence | Startup Diligence | benford, beneish, altman, isolation_forest, ratios |
| 2 | Due Diligence | M&A Buy-side Diligence | benford, beneish, altman, ratios |
| 3 | Due Diligence | Asset Quality Review | benford, isolation_forest |
| 4 | Due Diligence | Vendor Diligence | benford, isolation_forest |
| 5 | Due Diligence | Red Flag Forensic Sweep | benford, isolation_forest |
| 6 | Audit & Assurance | Statutory Audit Prep | ratios |
| 7 | Audit & Assurance | Revenue Recognition (ASC 606) | benford |
| 8 | Audit & Assurance | Related Party Disclosures | isolation_forest |
| 9 | Audit & Assurance | Going Concern Assessment | altman, ratios |
| 10 | Audit & Assurance | Inventory Integrity Review | benford, isolation_forest |
| 11 | Audit & Assurance | Fixed Asset Register Audit | ratios |
| 12 | Tax & Regulatory | Transfer Pricing Cross-Check | isolation_forest, ratios |
| 13 | Tax & Regulatory | GST/VAT Reconciliation | — |
| 14 | Tax & Regulatory | FDI / FEMA Compliance Audit | — |
| 15 | Tax & Regulatory | TDS & Payroll Compliance | — |
| 16 | Tax & Regulatory | Customs & Import Compliance | benford, isolation_forest |
| 17 | Compliance & AML | PEP & Sanctions Deep-Tier | — |
| 18 | Compliance & AML | UBO Unmasking | — |
| 19 | Compliance & AML | Anti-Bribery / FCPA Audit | benford, isolation_forest |
| 20 | Compliance & AML | AML Transaction Monitoring Tuning | benford, isolation_forest |
| 21 | Compliance & AML | Sanctions Evasion Patterns | isolation_forest |
| 22 | Compliance & AML | Crypto-Fiat Bridge Review | isolation_forest |
| 23 | Compliance & AML | NGO / Grant Utilization Audit | benford |
| 24 | Compliance & AML | ESG Claim Substantiation | — |

Check keys map to engines: `benford` → Benford χ²/Z + MAD · `beneish` → M-Score · `altman` → Z′ zones · `isolation_forest` → seeded outlier ensemble · `ratios` → ratio volatility · `reconciliation` → cross-document tie-outs · `gaps` → checklist/sequence/coverage detection.

---

## 4. Data model

```mermaid
erDiagram
    users ||--o{ api_keys : "BYOK vault"
    users ||--o{ runs : owns
    users ||--o{ audit_events : "activity trail"
    runs ||--o{ documents : ingests
    runs ||--o{ text_blocks : extracts
    runs ||--o{ extracted_tables : normalizes
    runs ||--o{ findings : raises
    runs ||--o{ citations : binds
    runs ||--o{ forensic_metrics : computes
    runs ||--o{ entity_nodes : resolves
    runs ||--o{ entity_edges : relates
    runs ||--o{ chat_messages : logs
    documents ||--o{ text_blocks : contains
    documents ||--o{ extracted_tables : contains
    findings ||--o{ citations : evidenced-by
    users ||--o{ admin_insights : "reviewed-by"

    users {
        uuid id PK
        text email UK
        text password_hash "scrypt"
        text role "USER | SUPER_ADMIN"
        text status "active | suspended"
        int session_epoch "bump = revoke all sessions"
        jsonb preferences
        text internal_notes "admin-only"
    }
    audit_events {
        uuid id PK
        uuid user_id FK
        text action "account.* auth.* run.* key.* profile.* admin.*"
        text detail
        jsonb meta "target ids · actor role"
    }
    feature_flags {
        text key PK
        boolean enabled
        uuid updated_by FK
    }
    admin_insights {
        uuid id PK
        text rule_key UK
        text priority "high|medium|low"
        text confidence
        text status "new|reviewed|in_progress|completed|dismissed"
        jsonb evidence
    }
    api_keys {
        uuid id PK
        uuid user_id FK
        text provider "openai|anthropic|google|groq|deepseek|mistral|ollama"
        text encrypted_key "AES-256-GCM"
        text key_hint "••••last4"
    }
    runs {
        uuid id PK
        text workflow_id "one of 24 definitions"
        int current_stage "0..6"
        text status "queued|running|completed|failed"
        int risk_score "0..100 weighted"
        jsonb summary
        text report_md
        jsonb enabled_checks
    }
    documents {
        uuid id PK
        bytea bytes "original file ≤25MB"
        jsonb scanned_pages
        text sha256
    }
    text_blocks {
        int page_number
        jsonb bbox "[x0,y0,x1,y1]"
        text hash "sha256(text)"
    }
    extracted_tables {
        text statement_type "balance_sheet|profit_loss|cash_flow|trial_balance|journal|other"
        jsonb rows
        jsonb numeric_rows
    }
    findings {
        text ref "FINDING-001…"
        severity "critical|high|medium|low|info"
        int weight "25/15/8/3/1"
    }
    citations {
        text raw_excerpt
        jsonb bbox
        real confidence
    }
    forensic_metrics {
        text key "benford_first_digit | beneish_m_score | …"
        jsonb value
    }
```

**Indexes for analytics:** `users_role_idx`, `audit_events_user_created_idx`, `audit_events_action_idx`, `admin_insights_rule_key_idx` (unique), `admin_insights_status_idx`, plus the run/document/finding/citation run indexes that predate the portal.

---

## 5. Authentication, roles & sessions

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant MW as middleware.ts
    participant H as Route handler / server layout
    participant DB as Postgres

    B->>MW: request with cognifina_session cookie
    MW->>MW: cookie present? else redirect /login (URL-level gate only)
    MW->>H: forward
    H->>DB: getCurrentUser() — verify HMAC signature + exp + session_epoch + status
    alt role = SUPER_ADMIN and permission ok
        H->>H: execute (rate-limited for /api/admin/*)
    else role USER hitting /super-admin or /api/admin/*
        H-->>B: 403 Forbidden / redirect
    end
```

- **Stateless sessions**: HMAC-SHA256-signed payload `{uid, ep, exp}` in an HTTP-only cookie (30-day TTL). No session table.
- **`sessionEpoch`**: every token embeds the account's epoch; bumping `users.session_epoch` instantly invalidates all issued tokens (used by "revoke sessions" and suspension).
- **Roles**: `USER` | `SUPER_ADMIN` stored on `users.role`. Permissions are derived server-side from a role→permission map (`src/lib/auth/admin.ts`): analytics.view, users.view, workspaces.view, billing.view, ai.view, system.view, data.export, users.manage, flags.manage, admins.manage, audit.view, insights.manage.
- **Server-side enforcement only**: middleware performs cookie-presence redirects (URL hygiene); every page/layout and every API route re-checks role + permission. Manually typed URLs, forged bodies, or tampered cookies cannot elevate privilege — the cookie signature would fail, and role never comes from the client.
- **Sensitive admin mutations** (suspend, grant/revoke admin, flag toggle) require **re-authentication**: the admin's current password inside the request, verified against the scrypt hash.
- **Rate limiting**: in-memory sliding window per admin per endpoint (`src/lib/rate-limit.ts`).
- **Audit**: every admin action and every account event (register/login/logout, run create/complete/fail/delete, key save/remove, profile/password/preferences changes) appends to `audit_events` with actor, action, detail, structured meta and timestamp. Never throws into the request path.

---

## 6. Analytics & Super Admin portal — source of truth

The portal renders **only** aggregates computed from existing tables. Metrics that cannot be derived are rendered as explicitly *unavailable* with the reason and the schema/integration required — no invented numbers.

| Portal module | Source of truth | Calculation |
|---|---|---|
| Overview stats | `users`, `runs`, `documents`, `findings` | counts per UTC window vs previous equivalent window; `pctChange` |
| DAU / WAU / MAU | runs ∪ chats ∪ audit timestamps | distinct user_ids in trailing 1/7/30d |
| Signups / active trends | `users.created_at`, activity stream | zero-filled daily UTC buckets |
| Activation funnel | users → runs → completed runs → chat → 2-day returns | sequential distinct-user counts |
| Feature analytics | `runs.workflow_id`, `chat_messages`, `api_keys` | per-feature users/adoption/uses/errors |
| Retention cohorts | `users.created_at` vs activity | weekly Monday-aligned cohorts, % active per period |
| Churn & at-risk | last-activity vs 30d cutoff; risk rules | explicit reason codes (see below) |
| Recommendations | rule engine over the same aggregates | persisted to `admin_insights` keyed by `rule_key`, each citing its evidence |
| System health | `select 1` probes, `runs` 24h window, `process.uptime` | DB latency p50/p95, failed-run counts |
| Audit log | `audit_events` ⨝ `users` | paginated, filterable by actor/action/query |

**Unavailable by design (documented in-portal):** revenue/MRR (no billing tables — BYOK product), AI token cost & latency percentiles (provider calls are direct; no request log), device/region/source segmentation (not captured). Each card names the exact schema or integration needed to enable it.

**At-risk reason codes** (always shown with the account): `no_runs_ever` · `no_activity_14d` · `declining_activity` (runs last-30d < ½ of prior-30d with ≥2 baseline) · `recent_failures` (≥2 failed runs in 30d) · `onboarding_incomplete` (3d+ old, zero runs). Confidence is `high` when ≥2 independent signals agree.

---

## 7. Forensic engine internals

All engines are pure TypeScript in `src/lib/forensic/` — no native binaries, no ML runtime, deterministic across platforms.

### Benford (`benford.ts`)

- Populations: leading digits of positive finite amounts; first digit needs ≥100 values, first-two ≥300.
- `P(d)=log10(1+1/d)`; χ² = Σ(Oᵢ−Eᵢ)²/Eᵢ with dof=k−1; p-value via a hand-rolled regularized incomplete gamma (`stats.ts gammaQ`).
- Per-digit Z-scores `(p̂−p)/√(p(1−p)/n)` pinpoint which digits carry excess weight; Nigrini MAD bands grade conformity (close/acceptable/marginal/nonconforming).

### Beneish (`beneish.ts`)

- DSRI, GMI, AQI, SGI, DEPI, SGAI, LVGI, TATA computed from two consecutive periods with alias-tolerant field mapping.
- Ships both coefficient sets:
  - Platform spec (default): `M = −4.84 + .920·DSRI + .528·GMI + .404·AQI + .892·SGI + .115·DEPI − .172·SGAI + 4.037·TATA + .0327·LVGI`
  - Canonical 1999 paper: `TATA=4.679, LVGI=−0.327`
- Flag when `M > −1.78`; upward-driving indices reported alongside.

### Altman (`altman.ts`)

- Private-firm model Z′ = 6.56X₁+3.26X₂+6.72X₃+1.05X₄; zones Safe >2.6 / Grey 1.23–2.6 / Distress <1.23 (public-manufacturing Z also implemented).

### Isolation Forest (`isolationForest.ts`)

- 100 trees, subsample ψ=256, seeded Mulberry32 PRNG → identical anomalies on every run.
- Features per journal entry: log-amount, absolute amount, round-sum flags (×100/×1000), weekend posting, off-hours posting, account frequency.
- Score s(x)=2^(−E[h]/c(n)); threshold at the (1−contamination) quantile; top hits carry human-readable reasons.

### Ratios (`ratios.ts`)

- Current/quick, debt/equity, gross/net margin, interest coverage per period; coefficient-of-variation volatility flags across ≥3 periods against per-ratio ceilings.

---

## 8. Extraction pipeline

| Source           | Path                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF (text layer) | `unpdf` (bundled pdf.js, serverless-safe) → per-line grouping of glyph items into blocks **with bounding boxes** → sha256 per block |
| PDF tables       | `pdfTables.ts` — numeric-token x-grid clustering over consecutive candidate lines; dominant column-count mode; quantized column slots      |
| XLSX/XLS         | SheetJS → sheet matrices → header detection → numeric matrix                                                                               |
| CSV              | Hand-rolled RFC-4180-ish parser (quotes, escaped quotes, CRLF)                                                                                |
| DOCX             | mammoth raw text → virtual pages (35 paragraphs/page)                                                                                        |
| TXT/MD           | Line-windowed pages                                                                                                                           |

Scanned pages (no text layer ≥40 chars) are recorded on the document and surfaced as an explicit gap finding — coverage is never silently partial.

---

## 9. BYOK provider layer

```mermaid
flowchart TD
    REQ[Request headers\nx-cognifina-provider / x-custom-api-key / x-custom-base-url] --> R{resolveCredential}
    VAULT[(api_keys table\nAES-256-GCM)] --> R
    ENV[Process env fallbacks] --> R
    R --> C[Unified client]
    C -->|openai-compatible| A1[chat/completions\nOpenAI·Groq·DeepSeek·Mistral·Ollama]
    C -->|anthropic| A2[Messages API]
    C -->|google| A3[generateContent]
    A1 & A2 & A3 --> J[extractJson + zod validation\n1 deterministic repair retry]
```

- **temperature = 0 everywhere**; structured outputs validated by Zod schemas.
- Resolution order: headers → user vault → env → none (engines still run; LLM passes degrade gracefully).
- Vault: AES-256-GCM, key derived from `ENCRYPTION_KEY` via scrypt; only masked hints ever leave the server.

---

## 10. Risk score

`score = min(100, Σ severity weights)` with weights critical 25 / high 15 / medium 8 / low 3 / info 1; bands Low <25 ≤ Moderate <50 ≤ Elevated <75 ≤ Severe. Monotonic, explainable, stable across reruns.

## 11. Grounded chat retrieval

Deterministic TF-IDF lexical scoring over up to 3,000 blocks (English stopword list, token len >2). Top-8 segments form the evidence pack; computed metrics are prepended as authoritative context. With a provider: strict JSON answer + segment citations + `sufficientEvidence` gate. Without one: extractive fallback quoting top passages verbatim with citations, or an explicit refusal.

---

## 12. Tech stack & why (versions pinned in `package.json`)

| Layer        | Choice                                            | Version          | Why                                                                                                                                                                       |
| ------------ | ------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js (App Router)                              | **14.2.5** | One deployable for marketing + app + admin + API; route handlers cover the backend without a second service; first-class Vercel fit. React**18.3.1** pinned (Next 14 peer). |
| Language     | TypeScript (strict)                               | ^5.5             | The whole product*is* typed contracts between DTOs (`lib/types.ts`, `lib/admin/dto.ts`) and SQL rows; strict mode caught real integration bugs pre-build.             |
| Styling      | Tailwind CSS                                      | ^3.4             | Token-driven design system in`globals.css` (warm-paper light theme, type scale) compiled away; no CSS-in-JS runtime cost.                                                            |
| Motion       | framer-motion                                     | ^11.2            | Spring physics with interruptible layout animations (active-nav pill),`useReducedMotion` respected throughout — Apple-style fluidity.                                  |
| Graph        | @xyflow/react                                     | ^12.3            | Purpose-built node-link canvas (entity ownership maps): drag, zoom, minimap, custom nodes out of the box.                                                                 |
| Charts       | recharts                                          | ^2.12            | Declarative SVG areas/bars for trends, distributions and admin analytics.                                                            |
| Icons        | lucide-react                                      | ^0.395           | Consistent 24px grid, tree-shakeable.                                                                                                                                     |
| ORM          | drizzle-orm + postgres.js                         | 0.36.4 / ^3.4    | Typed schema-in-TS, zero-codegen, edge/serverless-friendly driver with`prepare:false` for pooled providers (Neon/Vercel). drizzle-kit **0.28.1** for push/studio. |
| DB           | PostgreSQL 16 (Vercel Postgres/Neon/local Docker) | —               | JSONB for structured artifacts (bboxes, metric payloads, evidence), bytea for stored source files, cascading deletes per run/user.                                                       |
| PDF          | unpdf                                             | ^0.12            | Wraps a serverless-safe pdf.js build: no canvas/native deps, works in Lambda-scale limits, exposes glyph transforms needed for citation bboxes.                           |
| Spreadsheets | SheetJS (xlsx)                                    | ^0.18.5          | Battle-tested multi-sheet parsing incl. legacy .xls.                                                                                                                      |
| DOCX         | mammoth                                           | ^1.8             | Pure-JS docx→text; no LibreOffice requirement.                                                                                                                            |
| Validation   | zod                                               | ^3.23            | Runtime contracts for every mutating endpoint and every LLM structured output.                                                                                            |
| Crypto       | node:crypto                                       | built-in         | scrypt password hashing, HMAC-signed session cookies, AES-256-GCM vault — no third-party auth service, no key ever leaves your infra.                                    |

### Deliberate omissions

- **No Celery/Redis** — the stage-machine pattern removes queue infrastructure entirely on serverless; swapping in ARQ later only touches `orchestrator.advanceRun`.
- **No scipy/sklearn/pandas** — chi-square p-values, isolation forests and matrix handling are implemented natively (~300 LOC), cutting cold starts and the 250 MB serverless budget to near-zero.
- **No tesseract binary** — incompatible with Vercel functions; scanned-page detection keeps coverage honest instead.
- **No third-party auth service** — roles, sessions, revocation and re-auth are first-party, keeping the security surface auditable in one repo.

---

## 13. Security model summary

1. Passwords: scrypt + per-user salt, constant-time compare.
2. Sessions: HTTP-only cookie, HMAC-SHA256 signed payload `{uid, ep, exp}`, 30-day TTL, `secure` in production; **epoch-bound** for instant server-side revocation.
3. RBAC: `SUPER_ADMIN` role + permission map enforced in every admin layout and API handler (never in middleware alone, never client-side).
4. Sensitive admin actions require in-request **password re-authentication** + explicit confirmation UI, and are audited with actor/target/meta.
5. Admin endpoints are rate-limited per identity; forbidden responses are deliberately vague.
6. BYOK vault: AES-256-GCM (scrypt-derived key); masked hints only in reads; test-before-save flow.
7. Authorization: every `/api/runs/*`, `/api/documents/*`, `/api/settings/*`, `/api/profile/*` query is user-scoped; admin queries are role-scoped.
8. No secret is ever logged or returned; provider calls go browser-independent server-side.
