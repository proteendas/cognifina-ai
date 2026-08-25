import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/session";
import { requireAdmin, type AdminPermission } from "@/lib/auth/admin";
import { rateLimit } from "@/lib/rate-limit";

type Handler = (ctx: { req: Request; admin: Awaited<ReturnType<typeof requireAdmin>> }) => Promise<Response>;

/**
 * Shared guard pipeline for every /api/admin route:
 * session → role/permission check → per-admin rate limit → error mapping.
 */
export function withAdmin(permission: AdminPermission, handler: Handler, limit = { req: 60, windowMs: 60_000 }) {
  return async (req: Request): Promise<Response> => {
    try {
      const admin = await requireAdmin(permission);
      const rl = rateLimit(`admin:${admin.id}:${new URL(req.url).pathname}`, limit.req, limit.windowMs);
      if (!rl.ok) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
        );
      }
      return await handler({ req, admin });
    } catch (err) {
      if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (err instanceof ForbiddenError) {
        // Deliberately vague toward non-admins probing the surface.
        console.warn("[admin] forbidden:", err.message);
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      console.error("[admin-api]", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/** Parses an explicit UTC date range from ?days= (bounded for expensive reports). */
export function rangeFromUrl(url: string): { days: number; from: Date; to: Date } {
  const parsed = Number(new URL(url).searchParams.get("days") ?? 30);
  const days = [7, 14, 30, 90].includes(parsed) ? parsed : 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  return { days, from, to };
}
