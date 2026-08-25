/**
 * Promote (or demote) an account to/from SUPER_ADMIN.
 *
 *   CFA_DATABASE_URL="postgres://…" node scripts/promote-admin.mjs admin@yourdomain.com
 *   CFA_DATABASE_URL="postgres://…" node scripts/promote-admin.mjs admin@yourdomain.com --revoke
 *
 * Safe for production: refuses when the account doesn't exist, bumps the
 * session epoch so the change takes effect on next sign-in.
 */
const [email, flag] = process.argv.slice(2);
const databaseUrl = process.env.CFA_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("CFA_DATABASE_URL is required: CFA_DATABASE_URL=<url> node scripts/promote-admin.mjs <email> [--revoke]");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Usage: CFA_DATABASE_URL=<url> node scripts/promote-admin.mjs <email> [--revoke]");
  process.exit(1);
}

const { default: postgres } = await import("postgres");
const client = postgres(databaseUrl, { max: 1 });

const role = flag === "--revoke" ? "USER" : "SUPER_ADMIN";
const rows = await client`
  UPDATE users SET role = ${role}, "session_epoch" = "session_epoch" + 1
  WHERE email = ${email.toLowerCase()}
  RETURNING email, role, status
`;
await client.end();

if (rows.length === 0) {
  console.error(`No account found for ${email}. Register it in the app first, then re-run.`);
  process.exit(1);
}
console.log(`✔ ${rows[0].email} → ${rows[0].role} (sessions revoked — sign in again).`);
