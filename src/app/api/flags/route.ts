import { NextResponse } from "next/server";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { asc } from "drizzle-orm";

/** Public read-only flag map for client feature gating. No secrets, no PII. */
export async function GET() {
  try {
    const rows = await db.select({ key: featureFlags.key, enabled: featureFlags.enabled }).from(featureFlags).orderBy(asc(featureFlags.key));
    const flags: Record<string, boolean> = {};
    for (const r of rows) flags[r.key] = r.enabled;
    return NextResponse.json({ flags });
  } catch {
    // table not migrated yet — default everything to enabled-by-absence
    return NextResponse.json({ flags: {} });
  }
}
