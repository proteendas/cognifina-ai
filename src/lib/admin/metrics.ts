/**
 * Pure metric calculations for the Super Admin portal.
 * Dependency-free and timezone-explicit: all bucketing happens in UTC.
 * These functions are covered by scripts/test-admin-metrics.mjs.
 */

export type DayBucket = { day: string; count: number }; // day = 'YYYY-MM-DD' (UTC)

/** Percentage change current vs previous; null when previous is zero (undefined growth). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function eachDay(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())));
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  cursor.setTime(start);
  while (cursor.getTime() <= Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Count events per UTC day across [from, to], zero-filling missing days. */
export function bucketCountsByDay(dates: Date[], from: Date, to: Date): DayBucket[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = toDayKey(d);
    if (key < toDayKey(from) || key > toDayKey(to)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return eachDay(from, to).map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

/**
 * Distinct active users per UTC day. An "activity" is any timestamped,
 * user-attributed product event.
 */
export function dailyActiveUsers(
  events: { userId: string; at: Date }[],
  from: Date,
  to: Date
): { day: string; users: number }[] {
  const seen = new Map<string, Set<string>>();
  for (const e of events) {
    const key = toDayKey(e.at);
    if (key < toDayKey(from) || key > toDayKey(to)) continue;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key)!.add(e.userId);
  }
  return eachDay(from, to).map((day) => ({ day, users: seen.get(day)?.size ?? 0 }));
}

/** Distinct users active within the trailing `windowDays` ending at `now`. */
export function rollingActiveUsers(events: { userId: string; at: Date }[], now: Date, windowDays: number): number {
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const set = new Set<string>();
  for (const e of events) if (e.at.getTime() >= cutoff && e.at.getTime() <= now.getTime()) set.add(e.userId);
  return set.size;
}

export type FunnelStage = { stage: string; users: number; conversionFromPrev: number | null };

/** Funnel conversion between sequential user-count stages. */
export function funnel(stages: { stage: string; users: number }[]): FunnelStage[] {
  return stages.map((s, i) => ({
    ...s,
    conversionFromPrev: i === 0 ? null : stages[i - 1].users === 0 ? null : (s.users / stages[i - 1].users) * 100,
  }));
}

export type RetentionRow = {
  cohortStart: string; // 'YYYY-MM-DD'
  cohortSize: number;
  /** retention[periodIndex] = % of cohort active in that period window */
  retention: (number | null)[];
};

/**
 * Weekly signup-cohort retention. Period N covers [cohortStart + N*7d, +7d).
 * A user is "retained" in a period with ≥1 activity event inside the window.
 * `now` is injectable for deterministic tests.
 */
export function weeklyRetention(
  signups: { userId: string; at: Date }[],
  activity: { userId: string; at: Date }[],
  cohortWeeksBack: number,
  periods = 6,
  now: Date = new Date()
): RetentionRow[] {
  const msWeek = 7 * 24 * 60 * 60 * 1000;
  // Align cohort starts to UTC Monday for stable weeks
  const alignToMonday = (d: Date) => {
    const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dow = (out.getUTCDay() + 6) % 7; // Mon=0
    out.setUTCDate(out.getUTCDate() - dow);
    return out.getTime();
  };
  const thisMonday = alignToMonday(now);
  const rows: RetentionRow[] = [];
  const activityByUser = new Map<string, number[]>();
  for (const a of activity) {
    if (!activityByUser.has(a.userId)) activityByUser.set(a.userId, []);
    activityByUser.get(a.userId)!.push(a.at.getTime());
  }
  const cohortOf = new Map<string, number>();
  for (const s of signups) cohortOf.set(s.userId, alignToMonday(s.at));

  for (let w = cohortWeeksBack - 1; w >= 0; w--) {
    const start = thisMonday - w * msWeek;
    const members = [...cohortOf.entries()].filter(([, c]) => c === start);
    const size = members.length;
    const retention: (number | null)[] = [];
    for (let p = 0; p < periods; p++) {
      const winStart = start + p * msWeek;
      const winEnd = winStart + msWeek;
      if (winEnd > now.getTime()) {
        retention.push(null); // future period — not observable yet
        continue;
      }
      let active = 0;
      for (const [uid] of members) {
        const stamps = activityByUser.get(uid);
        if (stamps?.some((t) => t >= winStart && t < winEnd)) active++;
      }
      retention.push(size === 0 ? null : (active / size) * 100);
    }
    rows.push({ cohortStart: new Date(start).toISOString().slice(0, 10), cohortSize: size, retention });
  }
  return rows;
}

export type RiskSignal =
  | "no_activity_14d"
  | "no_runs_ever"
  | "declining_activity"
  | "recent_failures";

export type RiskAssessment = { reasons: RiskSignal[]; confidence: "high" | "medium" };

/**
 * Classify at-risk accounts from real signals only. Confidence is high when
 * multiple independent signals agree. Brand-new accounts (≤3d) are never
 * flagged — they simply haven't had time to engage.
 */
export function assessRisk(input: {
  accountCreatedAt: Date;
  lastActivityAt: Date | null;
  totalRuns: number;
  runsPrevPeriod: number;
  runsCurrentPeriod: number;
  failedRunsLast30d: number;
  now?: Date;
}): RiskAssessment {
  const now = input.now ?? new Date();
  const reasons: RiskSignal[] = [];
  const ageDays = (now.getTime() - input.accountCreatedAt.getTime()) / 86400000;
  const daysSinceActivity = input.lastActivityAt
    ? (now.getTime() - input.lastActivityAt.getTime()) / 86400000
    : Infinity;

  if (ageDays >= 3 && input.totalRuns === 0) reasons.push("no_runs_ever");
  else if (input.totalRuns > 0 && (!input.lastActivityAt || daysSinceActivity >= 14)) reasons.push("no_activity_14d");
  if (input.totalRuns > 0 && input.runsPrevPeriod >= 2 && input.runsCurrentPeriod < Math.ceil(input.runsPrevPeriod / 2))
    reasons.push("declining_activity");
  if (input.failedRunsLast30d >= 2) reasons.push("recent_failures");

  return { reasons, confidence: reasons.length >= 2 ? "high" : "medium" };
}

export const RISK_REASON_LABELS: Record<RiskSignal, string> = {
  no_activity_14d: "No activity in 14+ days",
  no_runs_ever: "Never started an analysis (3+ days since signup)",
  declining_activity: "Run activity dropped vs prior 30d",
  recent_failures: "Repeated run failures in last 30d",
};
