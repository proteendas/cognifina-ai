// Shared DTOs mirroring API responses (Pydantic-equivalent contracts)

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type RiskBand = "Low" | "Moderate" | "Elevated" | "Severe";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export type RunSummaryDto = {
  riskScore: number;
  riskBand: RiskBand;
  severityCounts: Record<Severity, number>;
  topFindingRefs: string[];
  documentsAnalyzed: number;
  blocksExtracted: number;
  tablesExtracted: number;
};

export type RunDto = {
  id: string;
  workflowId: string;
  workflowName: string;
  entityName: string;
  periodLabel: string;
  status: RunStatus;
  currentStage: number;
  progress: number;
  error?: string | null;
  modelProvider: string | null;
  modelName: string | null;
  riskScore: number | null;
  riskBand: RiskBand | null;
  summary: RunSummaryDto | null;
  reportMd: string | null;
  enabledChecks: string[];
  createdAt: string;
  finishedAt: string | null;
};

export type RunListItem = {
  id: string;
  workflowId: string;
  workflowName: string;
  entityName: string;
  periodLabel: string;
  status: RunStatus;
  progress: number;
  currentStage: number;
  riskScore: number | null;
  riskBand: RiskBand | null;
  summary: RunSummaryDto | null;
  createdAt: string;
  finishedAt: string | null;
};

export type DocumentDto = {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
  sha256: string;
  pageCount: number;
  parseMode: string;
  scannedPages: number[];
};

export type FindingDto = {
  id: string;
  ref: string;
  title: string;
  category: string;
  severity: Severity;
  description: string;
  recommendation: string;
  agent: string;
  metricRef: string | null;
};

export type BBoxDto = [number, number, number, number] | null;

export type CitationDto = {
  id: string;
  findingId: string | null;
  documentName: string;
  documentId: string | null;
  pageNumber: number;
  rawExcerpt: string;
  bbox: BBoxDto;
  confidence: number;
};

export type BenfordDigitStat = {
  digit: number;
  observedCount: number;
  observedFreq: number;
  expectedFreq: number;
  zScore: number;
  pValue: number;
  deviation: number;
};

export type MetricDto = {
  id: string;
  ref: string;
  key: string;
  displayName: string;
  verdict: string;
  severity: Severity;
  value: Record<string, unknown>;
  detailMd: string;
};

export type EntityNodeDto = {
  key: string;
  name: string;
  type: string;
  attrs: Record<string, string>;
  confidence: number;
};

export type EntityEdgeDto = {
  source: string;
  target: string;
  relation: string;
  weight: number;
  confidence: number;
};

export type TableMetaDto = {
  id: string;
  documentId: string;
  title: string;
  statementType: string;
  pageNumber: number;
  rowCount: number;
  colCount: number;
};

export type ChatCitationDto = {
  documentName: string;
  documentId: string | null;
  pageNumber: number;
  excerpt: string;
  bbox: number[] | null;
};

export type ChatMessageDto = {
  role: "user" | "assistant";
  content: string;
  citations: ChatCitationDto[];
};

export type RunDetailDto = {
  run: RunDto;
  documents: DocumentDto[];
  findings: FindingDto[];
  citations: CitationDto[];
  metrics: MetricDto[];
  entities: { nodes: EntityNodeDto[]; edges: EntityEdgeDto[] };
  tables: TableMetaDto[];
  chat: ChatMessageDto[];
};

export type WorkflowDto = {
  id: string;
  name: string;
  category: string;
  description: string;
  recommendedDocs: string[];
  checks: string[];
};

export type ApiKeyDto = {
  provider: string;
  hint: string;
  baseUrl: string | null;
  defaultModel: string | null;
  status: string;
  lastTestedAt: string | null;
};

export type ProviderDto = {
  id: string;
  label: string;
  models: string[];
  docsUrl: string;
};

export type AuditEventDto = {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type UsageStatsDto = {
  totals: {
    runs: number;
    completed: number;
    failed: number;
    activeRuns: number;
    documents: number;
    findings: number;
    avgRiskScore: number | null;
  };
  severityTotals: Record<Severity, number>;
  keysConfigured: number;
  recentRuns: RunListItem[];
  events: AuditEventDto[];
};

export const STAGE_LABELS = [
  "Ingestion & Layout Parsing",
  "Deterministic Forensic Math",
  "Entity Graph & Registry",
  "Cross-Document Reconciliation",
  "Gap & Omission Detection",
  "Report Compilation & Citations",
];
