# Cognifina AI — Deployment Guide (Developers)

Everything needed to take this repo from clone to production, including the Super Admin bootstrap.

---

## 1. Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥ 18.17 | 20 LTS recommended |
| PostgreSQL | 16 | Vercel Postgres, Neon, RDS, or local Docker |
| Vercel CLI (optional) | latest | `npm i -g vercel` for CLI deploys |

---

## 2. Environment variables

| Variable | Required | How to generate / where to get |
|---|---|---|
| `DATABASE_URL` | ✅ | From Vercel Postgres / Neon dashboard, or `postgres://user:pass@host:5432/db` |
| `ENCRYPTION_KEY` | ✅ | `openssl rand -hex 32` — derives the AES-256-GCM vault key (rotating it makes stored API keys unreadable) |
| `SESSION_SECRET` | ✅ | `openssl rand -hex 32` — signs session cookies (rotating it signs everyone out) |
| `NEXT_PUBLIC_APP_URL` | ✅ | e.g. `https://your-domain.com` |
| `OPENAI_API_KEY` … | ⬜ | Server-wide fallback keys; per-user BYOK vault is the preferred model |

Local development uses `.env.local` (gitignored). Copy `.env.example` and fill it in.

---

## 3. Local setup

```bash
npm install
cp .env.example .env.local          # then edit values

# throwaway Postgres via Docker (or point DATABASE_URL anywhere reachable)
docker run -d --name cognifina-pg \
  -e POSTGRES_PASSWORD=cognifina -e POSTGRES_DB=cognifina \
  -p 54329:5432 postgres:16-alpine

# push the Drizzle schema (idempotent)
DATABASE_URL="postgres://postgres:cognifina@localhost:54329/cognifina" \
  npx drizzle-kit push

npm run dev                         # http://localhost:3000
```

### Verify the deployment locally

```bash
npm run typecheck                   # tsc --noEmit
npm run lint                        # eslint
npm run build                       # production build must pass
node scripts/test-admin-security.mjs http://localhost:3000   # authz integration tests
```

---

## 4. Database migrations

This project uses **drizzle-kit push** (schema-in-TS is the source of truth):

```bash
DATABASE_URL="<target-db-url>" npx drizzle-kit push
```

Run it against production once per schema change (it applies additive diffs; destructive changes prompt). For teams that prefer reviewed migrations, switch to `drizzle-kit generate` + `migrate` — the schema file does not change.

---

## 5. Deploying to Vercel

1. Push the repo to GitHub and **Import Project** in Vercel (framework auto-detects Next.js).
2. Provision **Vercel Postgres** (or Neon) and add the environment variables from §2 under *Settings → Environment Variables* (Production + Preview).
3. Apply the schema once against the production database:
   ```bash
   DATABASE_URL="<prod-url>" npx drizzle-kit push
   ```
4. Deploy. No workers/queues exist — the pipeline executes as stage-per-request (`POST /api/runs/:id/advance`), which fits serverless limits by design.
5. Warm-verify: load `/`, register an account, run a workflow end-to-end, open Evidence Chat.

### Custom domain
*Settings → Domains* → add domain → point DNS `CNAME` at `cname.vercel-dns.com`. Update `NEXT_PUBLIC_APP_URL` to match.

---

## 6. Bootstrapping the first Super Admin

Roles live in the database; there is no sign-up path to SUPER_ADMIN (by design). After your first deploy:

1. **Register a normal account** in the app (e.g. `you@yourdomain.com`).
2. **Promote it** from any machine that can reach the production database:

```bash
DATABASE_URL="<prod-url>" node scripts/promote-admin.mjs you@yourdomain.com
# → ✔ you@yourdomain.com → SUPER_ADMIN (sessions revoked — sign in again)
```

(Revoke later with `--revoke`. Raw SQL equivalent: `UPDATE users SET role='SUPER_ADMIN' WHERE email='…';`)

3. Sign in → open **`/super-admin`**.

Subsequent admins are granted inside the portal (**Super Admin → Users → Grant super admin**, password-confirmed + audited). Revocation there also kills the target's sessions instantly via the epoch bump.

---

## 7. Post-deploy checklist

- [ ] `/` loads with 200; favicon (teal mark) renders in the tab
- [ ] Register → dashboard redirect works; logout works
- [ ] `POST /api/admin/overview` returns **401** without a session and **403** for non-admin users
- [ ] Promoted super admin sees `/super-admin` overview with real aggregates
- [ ] A workflow run completes end-to-end (all 6 agents) and citations open
- [ ] Feature flag toggle in the portal flips the consumer (chat suggestion chips)
- [ ] Backups: enable PITR / scheduled dumps on the Postgres provider

---

## 8. Operations notes

- **Scaling analytics queries** — admin aggregates are indexed and window-bounded (7/14/30/90d). At >~100k runs, add materialized rollups or a `pg_partman` partition on `runs.created_at`; the API layer needs no changes.
- **Rate limiter scope** — the admin limiter is in-memory per instance. For multi-region production, back it with Upstash Redis (swap the implementation in `src/lib/rate-limit.ts`; the call signature stays).
- **MFA** — not implemented (no TOTP dependency). Compensating controls: password re-auth on every sensitive mutation, instant session revocation via epoch bump, full audit trail. Adding TOTP later means a new `users.totp_secret` column + a challenge step in `assertReauthenticated`.
- **Logs** — `console.error` in route handlers surfaces in Vercel *Functions → Logs*. No PII or secrets are logged by contract.
- **Rotating `SESSION_SECRET`** signs everyone out (expected). **Rotating `ENCRYPTION_KEY`** requires re-entering stored provider keys.
- **Support contact** shown across the product: `prot.das15@gmail.com`.

---

## 9. CI suggestions

Minimal pipeline (GitHub Actions):

```yaml
name: ci
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
      - run: node scripts/test-admin-metrics.mjs   # pure metric unit tests
```

Authorization integration tests (`scripts/test-admin-security.mjs`) need a running deployment + database; run them against a preview environment with a seeded fixture user.
