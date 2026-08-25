# Cognifina AI

**Deterministic forensic & compliance AI meta-harness** — *"Math before Models."*

Cognifina runs **25 finance & compliance workflows** (due diligence, statutory audit prep, KYC/AML screening, tax & regulatory checks) through a **6-agent deterministic pipeline** over your uploaded documents. Every number is produced by pure statistical engines (Benford's Law, Beneish M-Score, Altman Z′-Score, seeded Isolation Forest, ratio volatility) *before* any language model is consulted — and every finding is bound to an exact **page-level citation** (document · page · excerpt · bounding box).

> Same evidence. Same verdict. Every time.

---

## Highlights

| | |
|---|---|
| 🧮 **Deterministic engines** | Benford χ²/Z-statistic + Nigrini MAD · 8-variable Beneish M-Score · Altman Z′ zones · seeded Isolation Forest (100 trees, seed=42) · ratio volatility (CV) |
| 🤖 **6 specialized agents** | Ingestion → Forensic Math → Entity Graph → Reconciliation → Gap Detection → Report Compiler |
| 🔑 **BYOK multi-provider** | OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, Mistral, local Ollama — AES-256-GCM encrypted vault, per-request header overrides |
| 📎 **Citation binder** | Every claim carries `{document, page, excerpt, bbox[], confidence}`; the citation drawer reconstructs the cited page and highlights it |
| 🕸️ **Entity graph** | Directors / UBOs / subsidiaries / related parties with registry identifiers (CIN · PAN · GSTIN · DIN), rendered as an interactive React Flow canvas |
| 💬 **Grounded chat** | Post-run Q&A strictly over the evidence pack — refuses speculation when evidence is insufficient |
| 📊 **0–100 weighted risk score** | Severity-weighted composite (critical 25 / high 15 / medium 8 / low 3 / info 1), banded Low → Severe |
| ▲ **Vercel-native** | One Next.js app, Vercel Postgres, stage-based pipeline execution — no workers, no queues to babysit |

---

## Quick start (local)

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local        # then edit values (see below)

# 3. Create the schema (any Postgres; a throwaway Docker one works)
docker run -d --name cognifina-pg -e POSTGRES_PASSWORD=cognifina \
  -e POSTGRES_DB=cognifina -p 5432:5432 postgres:16-alpine
DATABASE_URL="postgres://postgres:cognifina@localhost:5432/cognifina" npx drizzle-kit push

# 4. Run
npm run dev                       # http://localhost:3000
```

Generate secrets with `openssl rand -hex 32` for both `ENCRYPTION_KEY` and `SESSION_SECRET`.

Then: **register → pick a workflow → drop documents → watch the six agents run → interrogate the run in Evidence Chat.**

---

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset auto-detects Next.js).
2. Provision **Vercel Postgres** (or Neon) and set the environment variables:

   | Variable | Notes |
   |---|---|
   | `DATABASE_URL` | From the Vercel Postgres dashboard |
   | `ENCRYPTION_KEY` | `openssl rand -hex 32` — derives the AES-256-GCM vault key |
   | `SESSION_SECRET` | `openssl rand -hex 32` — signs session cookies |
   | `NEXT_PUBLIC_APP_URL` | Your production URL |
   | `OPENAI_API_KEY` … *(optional)* | Server-wide fallback keys; per-user BYOK vault is preferred |

3. Create the schema once against the production database:
   ```bash
   DATABASE_URL="<prod url>" npx drizzle-kit push
   ```
4. Deploy. No extra services required — the pipeline executes as stage-per-request (`POST /api/runs/:id/advance`), which fits serverless execution limits by design.

---

## Repository map

```
src/
├── app/
│   ├── (site)/                 # marketing site: / features engines pipeline security pricing
│   ├── (app)/                  # product shell: workflows · runs · settings
│   │   ├── workflows/[id]/     # uploader & run launcher
│   │   └── runs/[runId]/       # dashboard + entity-map + forensic-ledger + chat tabs
│   ├── login/ register/
│   └── api/                    # auth · settings · workflows · runs (+advance, chat) · documents
├── components/                 # ui kit · visualizers · dashboard widgets · marketing chrome
├── db/                         # drizzle schema + client
├── lib/
│   ├── agents/                 # 6 agents + orchestrator (stage machine)
│   ├── ai/                     # BYOK registry, unified client, key resolution, prompts
│   ├── extraction/             # pdf (bbox) · xlsx/csv/docx · table inference · chunker
│   ├── forensic/               # stats · benford · beneish · altman · isolationForest · ratios
│   ├── workflows/              # 25 definitions
│   └── auth/                   # sessions + vault encryption
└── middleware.ts               # route protection
docs/                           # ARCHITECTURE.md · USER_GUIDE.md
scripts/e2e-fixture.mjs         # deterministic test documents used for validation
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run db:push` | Push drizzle schema to `DATABASE_URL` |

---

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — system diagrams (Mermaid), data model, engine math, tech-stack rationale with pinned versions, security model.
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** — end-to-end walkthrough: accounts, BYOK setup, running analyses, reading the dashboard, entity maps, forensic ledger, evidence chat, troubleshooting.

## Scope notes & honest limitations

- OCR for scanned pages is **detected and reported** (gap finding narrows assurance scope) rather than silently skipped; bring text-layer PDFs or OCR upstream for full coverage.
- The Beneish implementation ships the platform coefficient set (`4.037·TATA + 0.0327·LVGI`) and also exposes the original 1999 paper coefficients for comparison.
- Language models never originate numeric findings; they only enrich entities and answer questions over already-computed artifacts.

© Cognifina — deterministic forensic & compliance AI.
