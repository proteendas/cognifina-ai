/**
 * Promote (or demote) an account to/from SUPER_ADMIN.
 *
 *   DATABASE_URL="postgres://…" node scripts/promote-admin.mjs admin@yourdomain.com
 *   DATABASE_URL="postgres://…" node scripts/promote-admin.mjs admin@yourdomain.com --revoke
 *
 * Safe for production: refuses when the account doesn't exist, bumps the
 * session epoch so the change takes effect on next sign-in.
 */
const [email, flag] = process.argv.slice(2);
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required: DATABASE_URL=<url> node scripts/promote-admin.mjs <email> [--revoke]");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Usage: DATABASE_URL=<url> node scripts/promote-admin.mjs <email> [--revoke]");
  process.exit(1);
}

const { default: postgres } = await import("postgres");
const client = postgres(process.env.DATABASE_URL, { max: 1 });

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
