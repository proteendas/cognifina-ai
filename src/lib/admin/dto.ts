import type { RiskSignal } from "@/lib/admin/metrics";

export type TrendPoint = { day: string; value: number };
export type DualTrendPoint = { day: string; current: number; previous: number };

export type MetricStat = {
  key: string;
  label: string;
  value: number | string | null;
  previous?: number | string | null;
  changePct?: number | null;
  /** How this metric is calculated — shown in a tooltip. */
  formula: string;
  unavailableReason?: string;
};

export type OverviewDto = {
  rangeDays: number;
  generatedAt: string;
  totals: {
    users: MetricStat;
    newUsers: MetricStat;
    dau: MetricStat;
    wau: MetricStat;
    mau: MetricStat;
    runs: MetricStat;
    completedRuns: MetricStat;
    errorRate: MetricStat;
    avgRiskScore: MetricStat;
    documents: MetricStat;
    findings: MetricStat;
    workspacesNew: MetricStat;
  };
  trends: {
    signups: TrendPoint[];
    active: TrendPoint[];
    runs: DualTrendPoint[];
  };
  topWorkflows: { workflowId: string; name: string; runs: number }[];
  attention: AtRiskUser[];
  recentAdminEvents: { id: string; actor: string; action: string; detail: string; at: string }[];
  unavailable: { metric: string; reason: string; required: string }[];
};

export type AtRiskUser = {
  userId: string;
  name: string;
  email: string;
  createdAt: string;
  lastActivityAt: string | null;
  totalRuns: number;
  reasons: RiskSignal[];
  confidence: "high" | "medium";
};

export type UserListRow = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SUPER_ADMIN";
  status: "active" | "suspended";
  createdAt: string;
  lastActivityAt: string | null;
  totalRuns: number;
  completedRuns: number;
  keysConfigured: number;
  risk?: AtRiskUser["reasons"];
};

export type UserDetailDto = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    internalNotes: string;
    createdAt: string;
  };
  stats: {
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    documents: number;
    findings: number;
    avgRiskScore: number | null;
    keysConfigured: number;
    chatMessages: number;
    lastActivityAt: string | null;
  };
  recentRuns: { id: string; workflowName: string; entityName: string; status: string; riskScore: number | null; createdAt: string }[];
  auditHistory: { id: string; action: string; detail: string; at: string }[];
  risk: AtRiskUser | null;
};

export type AnalyticsDto = {
  rangeDays: number;
  signupsOverTime: TrendPoint[];
  activeOverTime: TrendPoint[];
  newVsReturning: { day: string; New: number; Returning: number }[];
  funnel: { stage: string; users: number; conversionFromPrev: number | null }[];
  engagement: {
    avgRunsPerActiveUser: number | null;
    powerUsers: number;
    neverUsed: number;
    startedNotCompleted: number;
    inactive30d: number;
    reengaged: number;
  };
  segments: {
    byRole: { segment: string; users: number }[];
    byStatus: { segment: string; users: number }[];
  };
};

export type RetentionDto = {
  cohorts: { cohortStart: string; cohortSize: number; retention: (number | null)[] }[];
  churned: { userId: string; name: string; email: string; lastActivityAt: string | null; totalRuns: number }[];
  avgLifetimeBeforeChurnDays: number | null;
  atRisk: AtRiskUser[];
};

export type FeatureRow = {
  feature: string;
  users: number;
  adoptionPct: number;
  usesCurrent: number;
  usesPrevious: number;
  changePct: number | null;
  errors: number;
};

export type FeaturesDto = { rangeDays: number; rows: FeatureRow[] };

export type RecommendationRow = {
  id: string;
  ruleKey: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  priority: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low";
  affectedSegment: string;
  affectedArea: string;
  recommendation: string;
  expectedOutcome: string;
  status: string;
  generatedAt: string;
};

export type AuditPage = {
  rows: { id: string; actorName: string; actorEmail: string; action: string; detail: string; meta: Record<string, unknown>; at: string }[];
  page: number;
  pageSize: number;
  total: number;
};

export type SystemHealthDto = {
  dbLatencyMsP50: number;
  dbLatencyMsP95: number;
  dbOk: boolean;
  uptimeHours: number;
  nodeVersion: string;
  failedRuns24h: number;
  runs24h: number;
  totalUsers: number;
  activeSessionsNote: string;
};
