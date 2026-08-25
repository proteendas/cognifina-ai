import { db } from "@/db";
import { auditEvents } from "@/db/schema";

/**
 * Append an entry to the account audit trail. Never throws — auditing must not
 * break the request path it observes.
 */
export async function recordAudit(userId: string, action: string, detail = ""): Promise<void> {
  try {
    await db.insert(auditEvents).values({ userId, action, detail: detail.slice(0, 500) });
  } catch (err) {
    console.error("[audit] failed to record event", action, err);
  }
}
