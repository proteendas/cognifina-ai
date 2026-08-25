# Cognifina — What It Is & Who It's For

> The plain-language product overview: what this tool does, the exact problems it solves, who it is built for, and — just as importantly — who it is *not* for.
>
> For how it works internally, see [ARCHITECTURE.md](ARCHITECTURE.md). For hands-on usage, see [USER_GUIDE.md](USER_GUIDE.md).

---

## 1. What Cognifina actually does

Cognifina is a **deterministic forensic analysis engine for financial documents**.

You pick a workflow (due diligence, statutory audit prep, KYC/AML screening, tax checks…), upload documents — PDFs, spreadsheets, ledgers, filings — and a fixed six-agent pipeline:

1. **Reads every page** of every file, recording exact page coordinates for every line of text
2. **Runs pure mathematics** — Benford's Law digit-frequency analysis, the Beneish M-Score (8 earnings-manipulation ratios), Altman Z′ solvency zones, a seeded Isolation Forest for journal-entry anomalies, and ratio-volatility checks
3. **Maps the ownership graph** — companies, directors, ultimate beneficial owners, related parties, registry identifiers (CIN / PAN / GSTIN / DIN)
4. **Cross-checks documents against each other** — the same label in two files must agree within 0.5%; balance sheets must tie internally
5. **Flags missing evidence explicitly** — a missing bank reconciliation or an unexplained invoice-sequence gap is reported as a finding, never silently skipped
6. **Compiles the deliverable** — a weighted 0–100 risk score, severity-ranked findings, a full markdown report, and an interactive entity map

…and every single finding carries a **citation**: document name, page number, exact excerpt, and bounding-box coordinates. Click a citation and the app re-renders that page with the evidence highlighted.

### The core promise

> **Same documents in → same verdict out. Every time.**

The statistics produce the numbers; the language model never originates a finding. It only summarizes results and answers questions over the already-computed evidence — and when the evidence doesn't cover a question, it says so instead of guessing. That is what "deterministic" buys you: conclusions you can defend to a partner, an auditor, an investment committee, or a court.

---

## 2. The problem it solves

A serious financial review today is a weeks-long, human-hours exercise:

| Pain | Reality today | With Cognifina |
|---|---|---|
| **Time** | 3–6 weeks of senior analyst time per target | The mechanical cross-checking completes in minutes; humans review ranked findings |
| **Cost** | Forensic accountants bill $500–$1,500/hour, largely for manual tie-outs | The engine does the mechanical 80%; experts spend time on judgment |
| **Missed signals** | Cross-document patterns hide in volume: a figure that disagrees between versions, receivables that balloon overnight, round-sum entries posted on weekends | Every cross-document comparison and statistical test runs on 100% of the data, every time |
| **"Trust me" AI** | Chatbots hallucinate; two runs give two answers | Identical evidence reproduces an identical report — and every claim points to its source page |
| **Multi-entity sprawl** | Each added entity multiplies the checklist | Ownership chains, registry filings and related-party webs are mapped automatically |

---

## 3. Who it is built for

### Primary audiences

| Audience | What they do with it | Concrete scenario |
|---|---|---|
| **Investors & deal teams** — VCs, PE analysts, angel syndicates, family offices | Pre-investment due diligence on startups and SME targets | Before wiring a seed cheque, upload 2 years of management accounts + bank statements + the cap-table note. Get a cited report on revenue authenticity, burn reconciliation, related-party leakage and cap-table-adjacent red flags — in hours, not weeks |
| **Chartered accountants & audit firms** | Statutory audit prep, going-concern assessment, internal-financial-controls review, tax-audit file assembly | The engine ties the balance sheet, tests every journal population against Benford, flags volatility — the engagement team starts from ranked findings, not from a pile of PDFs |
| **Forensic accountants & fraud examiners** | First-pass forensic screening with court-ready workpapers | Digit distributions that indicate fabrication, weekend round-sum postings, and duplicate invoices surface automatically — each with page-level citations suitable for an exhibit |
| **Lenders & credit analysts** — banks, NBFCs, debt funds | Bankability and borrower-quality checks | Project-finance appraisals and working-capital reviews get Altman Z′ zone placement, ratio volatility and reconciliation status before credit committee |
| **Compliance & AML officers** | Entity screening and ownership tracing | PEP/sanctions deep-tier checks, UBO unmasking across layered holdings, FEMA/GST/FCPA compliance files — from documents you already collected during onboarding |
| **SMB acquirers & corporate development teams** | Vendor, customer and acquisition diligence without a forensic retainer | Buying a distributor? Run vendor diligence on their financials and invoices; sequence gaps and duplicate billing surface before the contract is signed |

### Secondary audiences

- **Founders raising capital** — run your own numbers through Startup Diligence *before* an investor does; fix the findings, then share the clean report
- **Internal audit & finance controllers** — monthly self-checks: reconciliation status, ratio drift, anomaly counts across periods
- **Legal professionals** in financial disputes — reproducible, source-cited analysis that survives scrutiny
- **Grant administrators & NGOs** — utilization-certificate reconciliation and spend-integrity checks

---

## 4. Who it helps most

1. **Teams that can't afford a forensic retainer.** The engine delivers the mechanical 80% of a forensic review — cross-checks, statistical screens, completeness tracking — so a single analyst reviews findings instead of manually tracing 1,300 journal entries.
2. **Anyone burned by unverifiable AI output.** Determinism + citations means conclusions hold up in front of partners, auditors, regulators or courts. Re-run the analysis in front of a sceptic; the report is byte-identical.
3. **Multi-document, multi-entity situations.** The sharpest edge is catching what tired humans miss: two documents disagreeing on the same total, a balance sheet that doesn't tie, an invoice sequence with holes.
4. **Privacy-sensitive firms.** BYOK architecture: documents live in *your* Postgres, provider keys are AES-256-GCM encrypted in your own vault, and the deterministic engines work with **zero** AI keys configured.

---

## 5. Who it is *not* for (honest positioning)

- **Not an audit opinion.** It prepares and evidences; a human chartered accountant still signs. It is decision support, not a regulated attestation.
- **Not a fraud guarantee.** It surfaces *indicators* (statistical anomalies, inconsistencies, gaps) with citations — it does not prove intent.
- **Not for consumer finance** — no personal credit scoring, budgeting, or retail use cases.
- **Not a substitute for OCR on scanned documents** — scanned/image-only pages are detected and *reported as a coverage gap*; bring text-layer PDFs or OCR upstream for full coverage.
- **Not for tiny document sets** — Benford needs ≥100 positive amounts and two periods for Beneish; below those thresholds the engines report *inconclusive* rather than guessing (and the report says exactly which inputs were missing).

---

## 6. Two example journeys

### Journey A — VC analyst, seed diligence (≈2 hours of work)

1. **Workflows → Startup Diligence** → upload management accounts, bank statements, journal export, board note
2. Watch the six agents run: ingestion → math → entities → reconciliation → gaps → report
3. Read: risk score **61/100 (Elevated)** — HIGH: Benford deviation (digit 6, Z=16.5), 25 isolation-forest outliers (weekend round-sums), Beneish −0.55 (above −1.78); MEDIUM: bank reconciliation and burn runway missing from evidence
4. Open the citation on the receivables finding — the exact ledger line is highlighted on the source page
5. Ask Evidence Chat: *"Why is the M-Score flagged and which indices drive it?"* → cited answer
6. **Export .md** → attach to the investment memo

### Journey B — CA firm, statutory audit prep (per client, recurring)

1. **Statutory Audit Prep** workflow → upload trial balance, ledgers, prior-year file
2. Gap agent lists exactly which expected evidence the client still hasn't provided
3. Reconciliation agent confirms the trial balance ties and prior-year figures match restated comparatives
4. Findings register + citation annexure exported as the audit workpaper base

---

## 7. The 25 workflows at a glance

| Domain | Workflows |
|---|---|
| **Due Diligence** (6) | Startup Diligence · M&A Buy-side Diligence · Asset Quality Review · Vendor Diligence · Red Flag Forensic Sweep · Custom Analysis |
| **Audit & Assurance** (6) | Statutory Audit Prep · Revenue Recognition (ASC 606) · Related Party Disclosures · Going Concern Assessment · Inventory Integrity Review · Fixed Asset Register Audit |
| **Tax & Regulatory** (5) | Transfer Pricing Cross-Check · GST/VAT Reconciliation · FDI/FEMA Compliance Audit · TDS & Payroll Compliance · Customs & Import Compliance |
| **Compliance & AML** (8) | PEP & Sanctions Deep-Tier · UBO Unmasking · Anti-Bribery/FCPA Audit · AML Transaction Monitoring Tuning · Sanctions Evasion Patterns · Crypto-Fiat Bridge Review · NGO/Grant Utilization Audit · ESG Claim Substantiation |

---

## 8. Design principles (why it behaves the way it does)

| Principle | What it means in the product |
|---|---|
| **Statistics lead. Models follow.** | Deterministic engines compute every number; LLMs only enrich, summarize and answer over computed artifacts |
| **Reproducible, provably** | Seeded PRNGs, fixed stage order, temperature 0 — identical inputs give byte-identical reports |
| **Cited to the page** | Findings bind `{document, page, excerpt, bbox, confidence}`; the citation drawer reconstructs the page |
| **Gaps are findings too** | Missing evidence, scanned pages and sequence breaks are reported — coverage is never silently partial |
| **Your keys, your data** | BYOK vault (AES-256-GCM) in your own Postgres; no shared key store, no silent retention |

---

*Questions or feedback? **prot.das15@gmail.com***
