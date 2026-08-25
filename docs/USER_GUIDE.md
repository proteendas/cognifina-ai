# Cognifina AI — User Guide

A practical walkthrough: from creating a workspace to interrogating a completed forensic run.

---

## 1. Create your workspace

1. Open the app and click **Get started**.
2. Register with email + password (min 8 characters). A session cookie signs you in for 30 days.

> Self-hosting? Set `ENCRYPTION_KEY` and `SESSION_SECRET` (`openssl rand -hex 32`) before your first login — they derive the vault key and session signatures.

## 2. Connect a model provider (BYOK) — optional but recommended

Go to **Settings → Model providers**. The deterministic engines never need a key; keys power the optional entity-enrichment pass and **Evidence Chat**.

For each provider card:

| Field | Guidance |
|---|---|
| API key | Paste once. Stored AES-256-GCM encrypted; only a `••••last4` hint is ever shown again. |
| Default model | Pick from the provider's list (e.g. `gpt-4o`, `claude-3-5-sonnet-latest`, `gemini-2.0-flash`, `llama-3.3-70b-versatile`). |
| Base URL | Optional override — proxies, gateways, or your local Ollama (`http://localhost:11434/v1`). |

**Test & save** pings the provider with a 1-token completion before persisting; **Save without test** stores it as-is. Per-request overrides are also supported by sending `x-cognifina-provider` / `x-custom-api-key` / `x-custom-base-url` headers to any run or chat endpoint.

Resolution order: request headers → your saved vault → server env fallback.

## 3. Pick a workflow

**Workflows** lists all 25 templates across four categories:

- **Due Diligence** — Startup Diligence, M&A Buy-side, Asset Quality Review, Vendor Diligence, Red Flag Forensic Sweep
- **Audit & Assurance** — Statutory Audit Prep, Revenue Recognition (ASC 606), Related Party Disclosures, Going Concern, Inventory Integrity, Fixed Asset Register
- **Tax & Regulatory** — Transfer Pricing Cross-Check, GST/VAT Reconciliation, FDI/FEMA Audit, TDS & Payroll, Customs & Import
- **Compliance & AML** — PEP & Sanctions Deep-Tier, UBO Unmasking, Anti-Bribery/FCPA, AML Monitoring Tuning, Sanctions Evasion Patterns, Crypto-Fiat Bridge, NGO Grant Utilization, ESG Substantiation

Each workflow defines which checks run and its **evidence checklist** — the gap agent will flag missing items explicitly rather than staying silent.

## 4. Upload & launch

On the workflow page:

1. **Drop documents** (up to 12 files, 25 MB each): PDF (text layer), XLSX/XLS, CSV, DOCX, TXT/MD.
2. Enter **Entity under review** and a free-form **Period label** — both appear on every report and finding.
3. Toggle the deterministic checks you want (they're pre-set per workflow).
4. **Start analysis** → you're redirected to the live run page.

### What the six agents do (visible as progress)

| # | Agent | You'll see it… |
|---|---|---|
| 1 | Ingestion & Layout Parsing | read every page, tag text blocks with page + bounding-box coordinates, lift tables out of statements/spreadsheets |
| 2 | Deterministic Forensic Math | compute Benford χ²/Z/MAD, Beneish M-Score, Altman Z′ zones, Isolation-Forest outliers, ratio volatility |
| 3 | Entity Graph & Registry | resolve companies, directors, UBOs, related parties + identifiers (CIN/PAN/GSTIN/DIN) into a graph |
| 4 | Cross-Document Reconciliation | compare identical totals across documents (0.5% tolerance), tie balance sheets, fuzzy-match statement lines between versions |
| 5 | Gap & Omission Detection | flag missing checklist evidence, invoice-sequence discontinuities, scanned-page coverage limits |
| 6 | Report Compiler & Citation Binder | produce the weighted 0–100 score, ranked findings and the full markdown forensic report |

Stages advance automatically. If one fails (usually a malformed file), the run stops at that stage with the reason shown — earlier stages stay usable.

## 5. Read the dashboard

The **Overview** tab shows:

- **Risk gauge** — weighted composite score and band (0–24 Low · 25–49 Moderate · 50–74 Elevated · 75–100 Severe).
- **Severity breakdown** — critical/high/medium/low/info counts feeding that score.
- **Ranked findings** — expandable cards with description, *recommended action*, agent origin, and **citation chips**: click one to open the citation drawer.
- **Forensic report** — the full markdown deliverable (executive summary → findings by severity → methodology & limitations).

### Citation drawer

Every citation shows document name, page, excerpt and confidence, plus a **page reconstruction**: the extracted text layer re-rendered from stored coordinates with the cited block highlighted. This is what makes findings reviewable — no "trust me" black boxes.

## 6. Entity Map tab

An interactive ownership graph. Node colors encode type (company/subsidiary/UBO/director/person); edges carry relations like `holds 72.4%`, `wholly owns`, `parent of`. Registry identifiers extracted from documents appear on the subject entity. Drag nodes, zoom, use the minimap. Built purely from document evidence — regex-first determinism, with LLM enrichment only if a provider is configured.

## 7. Forensic Ledger tab

- **Benford chart** — observed vs expected digit frequencies; red/blue deviation chips mark digits beyond ±2σ.
- **Metric cards** — Beneish M-Score (all eight ratios, threshold −1.78), Altman Z′ zone placement with component ratios, Isolation-Forest top anomalies with reasons (round-sum, weekend posting…), ratio suite table with volatility flags.

If a metric shows *inconclusive*, the detail line names exactly which inputs were missing from your uploads.

## 8. Evidence Chat tab (after completion)

Ask questions about the finished run. Grounding rules:

- Answers retrieve only from this run's extracted passages **and** computed metrics, citing `[seg-N]` sources that render as clickable citation chips.
- If the evidence doesn't cover the question, the assistant says so explicitly instead of guessing.
- Without any provider key you still get the strictly extractive fallback (top passages quoted verbatim with citations).

Good questions: *"Why is the M-Score flagged and which indices drive it?"* · *"Which two documents disagree on Total assets?"* · *"Summarize the weekend-posting anomalies."*

## 9. Runs index

**Runs** lists every analysis with status, score and timestamps — click through anytime; completed runs are immutable artifacts you can revisit or share with your team.

---

## Troubleshooting

| Symptom | Meaning & fix |
|---|---|
| Run fails at Ingestion with a parse error | One file is malformed or password-protected. Re-export it and start a new run. |
| "N scanned pages lack a text layer" finding | Those pages were images. OCR them upstream (or export searchable PDFs) and re-run for full coverage. |
| Beneish/Altman show *inconclusive* | Upload a Cash Flow statement (for TATA) and both current + prior period columns in Balance Sheet & P&L. The missing-field list tells you exactly what's absent. |
| Benford section empty | Fewer than 100 positive amounts were extractable — include transaction-level registers, not just summarized statements. |
| Chat answers feel short | No provider key configured → extractive mode. Add a key in Settings for full grounded synthesis. |
| Provider test fails with HTTP 401 | Key rejected by the vendor. Re-paste it; check base URL overrides. |

## Tips for high-quality runs

1. **Two+ periods** unlock Beneish, Altman trajectories and volatility checks.
2. **Transaction-level ledgers** (journal/CSV exports) unlock Benford + Isolation Forest at full power.
3. **Upload overlapping statements deliberately** (management accounts vs audited) — reconciliation is strongest when it can cross-compare.
4. Name the **entity exactly** as it appears in documents; the entity agent anchors the ownership graph to it.
