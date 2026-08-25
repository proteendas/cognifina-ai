/**
 * Super Admin authorization integration tests.
 * Run against a live server:  node scripts/test-admin-security.mjs [baseUrl]
 *
 * Verifies (no credentials → regular user → tampered cookie):
 *   1. /super-admin page redirects anonymous users to /login
 *   2. /api/admin/* returns 401 for anonymous callers
 *   3. /api/admin/* returns 403 for authenticated non-admin users
 *   4. /api/admin/* returns 403 for tampered/forged session cookies
 *   5. privilege-escalation attempts via request bodies are rejected
 * Exits non-zero if any assertion fails. Safe to run in CI against a preview env.
 */
const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`  ✔ ${name}`);
  else {
    failures++;
    console.error(`  ✖ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function registerUser(email) {
  const res = await fetch(`${BASE}/api/auth?action=register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name: "Sec Test", password: "test-security-pw-123" }),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { ok: res.ok, cookie };
}

console.log(`Super Admin security tests → ${BASE}\n`);

// ---------- 1. anonymous access ----------
{
  console.log("anonymous:");
  const page = await fetch(`${BASE}/super-admin`, { redirect: "manual" });
  check("GET /super-admin redirects (3xx)", page.status >= 300 && page.status < 400, `got ${page.status}`);
  check("redirect target is /login", (page.headers.get("location") ?? "").startsWith("/login"));

  for (const path of ["/api/admin/overview", "/api/admin/users", "/api/admin/audit", "/api/admin/flags", "/api/admin/system", "/api/admin/recommendations"]) {
    const res = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" } });
    check(`GET ${path} → 401`, res.status === 401, `got ${res.status}`);
  }
  const mutation = await fetch(`${BASE}/api/admin/users`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "grant_admin", userId: "00000000-0000-0000-0000-000000000000", password: "x" }),
  });
  check("PUT /api/admin/users (grant_admin) anonymous → 401", mutation.status === 401, `got ${mutation.status}`);
}

// ---------- 2. authenticated non-admin ----------
{
  console.log("\nregular user:");
  const email = `sec-test-${Date.now()}@example.com`;
  const { ok, cookie } = await registerUser(email);
  check("registration works", ok);
  if (!cookie) {
    failures++;
    console.error("  ✖ no session cookie returned — cannot continue user tests");
  } else {
    const page = await fetch(`${BASE}/super-admin`, { redirect: "manual", headers: { cookie } });
    check("GET /super-admin redirects non-admin away (3xx)", page.status >= 300 && page.status < 400, `got ${page.status}`);
    check("non-admin is NOT sent to login (they keep their session)", !(page.headers.get("location") ?? "").includes("/login"));

    const overview = await fetch(`${BASE}/api/admin/overview`, { headers: { cookie } });
    check("GET /api/admin/overview → 403", overview.status === 403, `got ${overview.status}`);

    // privilege escalation attempts via body/params
    const grant = await fetch(`${BASE}/api/admin/users`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ action: "grant_admin", userId: "00000000-0000-0000-0000-000000000000", password: "anything" }),
    });
    check("PUT grant_admin as non-admin → 403", grant.status === 403, `got ${grant.status}`);

    const selfRole = await fetch(`${BASE}/api/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "Sec Test", role: "SUPER_ADMIN" }),
    });
    const selfJson = await selfRole.json().catch(() => ({}));
    check("PATCH /api/profile ignores injected role claim", selfJson.user?.role !== "SUPER_ADMIN");

    // verify the escalation truly didn't land
    const me = await fetch(`${BASE}/api/auth`, { headers: { cookie } });
    const meJson = await me.json().catch(() => ({}));
    check("session still resolves role USER after escalation attempt", meJson.user?.role === "USER");

    // stats endpoint remains available to normal users (product feature, not admin)
    const stats = await fetch(`${BASE}/api/stats`, { headers: { cookie } });
    check("GET /api/stats (own data) still works → 200", stats.status === 200, `got ${stats.status}`);

    // cleanup
    await fetch(`${BASE}/api/profile`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ password: "test-security-pw-123" }),
    });
  }
}

// ---------- 3. tampered cookie ----------
{
  console.log("\nforged cookie:");
  const forged = "cognifina_session=eyJ1aWQiOiJkZWFkYmVlZi0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJlcCI6MCwiZXhwOjk5OTk5OTk5OTl9.c2lnbmF0dXJl";
  for (const path of ["/api/admin/overview", "/api/stats"]) {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie: forged } });
    check(`GET ${path} with forged cookie → 401`, res.status === 401, `got ${res.status}`);
  }
  const page = await fetch(`${BASE}/super-admin`, { redirect: "manual", headers: { cookie: forged } });
  check("GET /super-admin with forged cookie redirects to login", (page.headers.get("location") ?? "").startsWith("/login"));
}

console.log(failures === 0 ? "\nAll security checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
