/**
 * Unit tests for the pure metric calculations (src/lib/admin/metrics.ts).
 * Run: node --test scripts/test-admin-metrics.mjs   (Node ≥ 22.6 runs TS natively)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pctChange,
  bucketCountsByDay,
  dailyActiveUsers,
  rollingActiveUsers,
  funnel,
  weeklyRetention,
  assessRisk,
} from "../src/lib/admin/metrics.ts";

const d = (iso) => new Date(iso);

test("pctChange: basic growth, decline, zero-previous", () => {
  assert.equal(pctChange(150, 100), 50);
  assert.equal(pctChange(50, 200), -75);
  assert.equal(pctChange(10, 0), 100);
  assert.equal(pctChange(0, 0), null);
  assert.equal(pctChange(0, 50), -100);
});

test("bucketCountsByDay: zero-fills missing days in UTC", () => {
  const from = d("2025-01-01T00:00:00Z");
  const to = d("2025-01-04T23:59:59Z");
  const buckets = bucketCountsByDay([d("2025-01-02T10:00:00Z"), d("2025-01-02T22:00:00Z"), d("2025-01-04T01:00:00Z")], from, to);
  assert.deepEqual(buckets, [
    { day: "2025-01-01", count: 0 },
    { day: "2025-01-02", count: 2 },
    { day: "2025-01-03", count: 0 },
    { day: "2025-01-04", count: 1 },
  ]);
});

test("dailyActiveUsers: dedupes users per day", () => {
  const from = d("2025-02-01T00:00:00Z");
  const to = d("2025-02-02T23:59:59Z");
  const events = [
    { userId: "a", at: d("2025-02-01T09:00:00Z") },
    { userId: "a", at: d("2025-02-01T18:00:00Z") }, // same user, same day
    { userId: "b", at: d("2025-02-01T12:00:00Z") },
    { userId: "a", at: d("2025-02-02T08:00:00Z") }, // next day
  ];
  assert.deepEqual(dailyActiveUsers(events, from, to), [
    { day: "2025-02-01", users: 2 },
    { day: "2025-02-02", users: 1 },
  ]);
});

test("rollingActiveUsers: window boundaries", () => {
  const now = d("2025-03-10T12:00:00Z");
  const events = [
    { userId: "a", at: d("2025-03-10T11:00:00Z") }, // 1h ago — inside 1d
    { userId: "b", at: d("2025-03-08T13:00:00Z") }, // ~2 days ago — inside 7d only
    { userId: "c", at: d("2025-03-01T12:00:00Z") }, // 9 days ago — inside 30d only
  ];
  assert.equal(rollingActiveUsers(events, now, 1), 1);
  assert.equal(rollingActiveUsers(events, now, 7), 2);
  assert.equal(rollingActiveUsers(events, now, 30), 3);
});

test("funnel: conversion percentages", () => {
  const stages = funnel([
    { stage: "A", users: 100 },
    { stage: "B", users: 50 },
    { stage: "C", users: 0 },
  ]);
  assert.equal(stages[0].conversionFromPrev, null);
  assert.equal(stages[1].conversionFromPrev, 50);
  assert.equal(stages[2].conversionFromPrev, 0);
});

test("weeklyRetention: retained users counted per period window", () => {
  const now = d("2025-01-20T00:00:00Z"); // a Monday
  // Cohort aligned to Monday 2025-01-06 (two weeks before `now`)
  const signups = [
    { userId: "u1", at: d("2025-01-06T10:00:00Z") },
    { userId: "u2", at: d("2025-01-08T10:00:00Z") },
  ];
  const activity = [
    { userId: "u1", at: d("2025-01-06T11:00:00Z") }, // W0
    { userId: "u1", at: d("2025-01-15T11:00:00Z") }, // W1 (Jan 13–20)
    { userId: "u2", at: d("2025-01-08T12:00:00Z") }, // W0 only
  ];
  const rows = weeklyRetention(signups, activity, 3, 2, now);
  const row = rows.find((r) => r.cohortStart === "2025-01-06");
  assert.equal(row.cohortSize, 2);
  assert.equal(row.retention[0], 100); // both active in week 0
  assert.equal(row.retention[1], 50); // only u1 returned in week 1
});

test("weeklyRetention: future periods are null, not fabricated", () => {
  const now = d("2025-01-20T00:00:00Z"); // Monday
  const signups = [
    { userId: "u1", at: d("2025-01-13T10:00:00Z") }, // last week's cohort
    { userId: "u2", at: d("2025-01-06T10:00:00Z") }, // two weeks ago
  ];
  const activity = [
    { userId: "u1", at: d("2025-01-14T10:00:00Z") }, // u1 active in W0 only
    { userId: "u2", at: d("2025-01-07T10:00:00Z") }, // u2 active in W0 only
  ];
  const rows = weeklyRetention(signups, activity, 3, 3, now);
  const lastWeek = rows.find((r) => r.cohortStart === "2025-01-13");
  assert.equal(lastWeek.retention[0], 100);
  assert.equal(lastWeek.retention[1], null); // W1 starts at `now` — not observable
  assert.equal(lastWeek.retention[2], null);
  const twoWeeksAgo = rows.find((r) => r.cohortStart === "2025-01-06");
  assert.equal(twoWeeksAgo.retention[0], 100);
  assert.equal(twoWeeksAgo.retention[1], 0); // W1 fully elapsed, zero activity → honest 0
  assert.equal(twoWeeksAgo.retention[2], null);
});

test("assessRisk: reason codes and confidence escalation", () => {
  const now = d("2025-06-20T00:00:00Z");
  // brand-new account (≤3d) with no runs → never flagged
  const fresh = assessRisk({ accountCreatedAt: d("2025-06-19T00:00:00Z"), lastActivityAt: null, totalRuns: 0, runsPrevPeriod: 0, runsCurrentPeriod: 0, failedRunsLast30d: 0, now });
  assert.deepEqual(fresh.reasons, []);
  // 3+ days old, never ran → onboarding signal, medium confidence (single signal)
  const stale = assessRisk({ accountCreatedAt: d("2025-05-01T00:00:00Z"), lastActivityAt: null, totalRuns: 0, runsPrevPeriod: 0, runsCurrentPeriod: 0, failedRunsLast30d: 0, now });
  assert.deepEqual(stale.reasons, ["no_runs_ever"]);
  assert.equal(stale.confidence, "medium");
  // declining activity + failures
  const declining = assessRisk({ accountCreatedAt: d("2025-01-01T00:00:00Z"), lastActivityAt: d("2025-06-18T00:00:00Z"), totalRuns: 10, runsPrevPeriod: 6, runsCurrentPeriod: 2, failedRunsLast30d: 2, now });
  assert.ok(declining.reasons.includes("declining_activity"));
  assert.ok(declining.reasons.includes("recent_failures"));
  assert.equal(declining.confidence, "high");
  // silent 14+ days with prior runs
  const silent = assessRisk({ accountCreatedAt: d("2025-01-01T00:00:00Z"), lastActivityAt: d("2025-05-30T00:00:00Z"), totalRuns: 4, runsPrevPeriod: 1, runsCurrentPeriod: 1, failedRunsLast30d: 0, now });
  assert.ok(silent.reasons.includes("no_activity_14d"));
  // healthy account → no reasons
  const healthy = assessRisk({ accountCreatedAt: d("2025-06-01T00:00:00Z"), lastActivityAt: d("2025-06-19T23:00:00Z"), totalRuns: 5, runsPrevPeriod: 2, runsCurrentPeriod: 3, failedRunsLast30d: 0, now });
  assert.deepEqual(healthy.reasons, []);
});
