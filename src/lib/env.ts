export const SERVER_ENV = {
  get ENCRYPTION_KEY(): string {
    return process.env.ENCRYPTION_KEY || "cognifina-dev-insecure-encryption-key-change-me";
  },
  get SESSION_SECRET(): string {
    return process.env.SESSION_SECRET || "cognifina-dev-insecure-session-secret-change-me";
  },
  get APP_URL(): string {
    return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  },
};

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

export function warnInsecureDefaults(): void {
  if (isProd()) {
    if (SERVER_ENV.ENCRYPTION_KEY.startsWith("cognifina-dev")) {
      console.warn("[cognifina] WARNING: ENCRYPTION_KEY uses an insecure development default.");
    }
    if (SERVER_ENV.SESSION_SECRET.startsWith("cognifina-dev")) {
      console.warn("[cognifina] WARNING: SESSION_SECRET uses an insecure development default.");
    }
  }
}
