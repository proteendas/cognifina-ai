import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { SERVER_ENV } from "@/lib/env";

/**
 * AES-256-GCM encryption for BYOK API keys at rest.
 * Vault key is derived from ENCRYPTION_KEY via scrypt (salted with a fixed
 * app context string; rotation requires re-encrypting stored keys).
 */
const VAULT_KEY = scryptSync(SERVER_ENV.ENCRYPTION_KEY, "cognifina.vault.v1", 32);

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", VAULT_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== "v1") throw new Error("Unsupported vault payload version");
  const decipher = createDecipheriv("aes-256-gcm", VAULT_KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Mask a secret for display: keep last 4 chars only. */
export function keyHint(secret: string): string {
  if (secret.length <= 4) return "••••";
  return `••••${secret.slice(-4)}`;
}

export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}
