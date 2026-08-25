import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SERVER_ENV } from "@/lib/env";

const SESSION_COOKIE = "cognifina_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ---------- passwords (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// ---------- session tokens (HMAC-signed payload) ----------

type SessionPayload = { uid: string; ep: number; exp: number };

function sign(data: string): string {
  return createHash("sha256")
    .update(`${data}.${SERVER_ENV.SESSION_SECRET}`)
    .digest("base64url");
}

export async function createSessionToken(userId: string): Promise<string> {
  // Bind the token to the account's session epoch so admins can revoke all
  // sessions server-side by bumping a single integer.
  const [row] = await db
    .select({ epoch: users.sessionEpoch })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const payload: SessionPayload = {
    uid: userId,
    ep: row?.epoch ?? 0,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    if (sign(body) !== sig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.uid || typeof payload.ep !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  cookies().set(SESSION_COOKIE, await createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "SUPER_ADMIN";
  status: "active" | "suspended";
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      epoch: users.sessionEpoch,
    })
    .from(users)
    .where(eq(users.id, payload.uid))
    .limit(1);
  const row = rows[0];
  // Suspended accounts and stale-epoch tokens (revoked sessions) resolve to no user.
  if (!row || row.status !== "active" || row.epoch !== payload.ep) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role, status: row.status };
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
