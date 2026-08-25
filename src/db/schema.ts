import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export type BBox = [number, number, number, number];

export type RunSummary = {
  riskScore: number;
  riskBand: RiskBand;
  severityCounts: Record<Severity, number>;
  topFindingRefs: string[];
  documentsAnalyzed: number;
  blocksExtracted: number;
  tablesExtracted: number;
};

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type RiskBand = "Low" | "Moderate" | "Elevated" | "Severe";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  })
);

/** Append-only account activity trail rendered on the dashboard & profile pages. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // account.created | auth.login | run.created | key.saved …
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userEventsIdx: index("audit_events_user_created_idx").on(t.userId, t.createdAt),
  })
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    keyHint: text("key_hint").notNull().default(""),
    baseUrl: text("base_url"),
    defaultModel: text("default_model"),
    status: text("status").notNull().default("unverified"),
    lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userProviderIdx: uniqueIndex("api_keys_user_provider_idx").on(t.userId, t.provider),
  })
);

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workflowId: text("workflow_id").notNull(),
    workflowName: text("workflow_name").notNull(),
    entityName: text("entity_name").notNull().default(""),
    periodLabel: text("period_label").notNull().default(""),
    status: text("status").notNull().default("queued"), // queued|running|completed|failed
    currentStage: integer("current_stage").notNull().default(0), // 0..6
    progress: integer("progress").notNull().default(0),
    error: text("error"),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    riskScore: integer("risk_score"),
    riskBand: text("risk_band").$type<RiskBand>(),
    reportMd: text("report_md"),
    summary: jsonb("summary").$type<RunSummary>(),
    enabledChecks: jsonb("enabled_checks").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => ({
    userRunsIdx: index("runs_user_idx").on(t.userId),
  })
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    pageCount: integer("page_count").notNull().default(1),
    parseMode: text("parse_mode").notNull().default("native"), // native|native-partial|tabular|text
    scannedPages: jsonb("scanned_pages").$type<number[]>().notNull().default([]),
    bytes: bytea("bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runDocsIdx: index("documents_run_idx").on(t.runId),
  })
);

export const textBlocks = pgTable(
  "text_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    seq: integer("seq").notNull(),
    text: text("text").notNull(),
    bbox: jsonb("bbox").$type<BBox>().notNull(),
    hash: text("hash").notNull(),
    source: text("source").notNull().default("native"), // native|ocr
  },
  (t) => ({
    docPageIdx: index("text_blocks_doc_page_idx").on(t.documentId, t.pageNumber),
  })
);

export type TableCell = string;

export const extractedTables = pgTable(
  "extracted_tables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled table"),
    statementType: text("statement_type").notNull().default("other"),
    pageNumber: integer("page_number").notNull().default(1),
    rowCount: integer("row_count").notNull().default(0),
    colCount: integer("col_count").notNull().default(0),
    columns: jsonb("columns").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    rows: jsonb("rows").$type<TableCell[][]>().notNull().default(sql`'[]'::jsonb`),
    numericRows: jsonb("numeric_rows").$type<(number | null)[][]>().notNull().default(sql`'[]'::jsonb`),
    bbox: jsonb("bbox").$type<BBox>(),
    hash: text("hash").notNull().default(""),
  },
  (t) => ({
    runTablesIdx: index("extracted_tables_run_idx").on(t.runId),
  })
);

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    ref: text("ref").notNull(), // FINDING-001
    title: text("title").notNull(),
    category: text("category").notNull(),
    severity: text("severity").$type<Severity>().notNull(),
    description: text("description").notNull(),
    recommendation: text("recommendation").notNull().default(""),
    agent: text("agent").notNull(),
    metricRef: text("metric_ref"),
    weight: integer("weight").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runFindingsIdx: index("findings_run_idx").on(t.runId),
  })
);

export const citations = pgTable(
  "citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id").references(() => findings.id, { onDelete: "cascade" }),
    documentName: text("document_name").notNull(),
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull().default(1),
    rawExcerpt: text("raw_excerpt").notNull(),
    bbox: jsonb("bbox").$type<BBox>(),
    confidence: real("confidence").notNull().default(0.9),
    hash: text("hash").notNull().default(""),
  },
  (t) => ({
    runCitationsIdx: index("citations_run_idx").on(t.runId),
    findingIdx: index("citations_finding_idx").on(t.findingId),
  })
);

export type MetricValue = Record<string, unknown>;

export const forensicMetrics = pgTable(
  "forensic_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    ref: text("ref").notNull(), // METRIC-001
    key: text("key").notNull(), // benford_first_digit | beneish_m_score | ...
    displayName: text("display_name").notNull(),
    verdict: text("verdict").notNull().default("inconclusive"),
    severity: text("severity").$type<Severity>().notNull().default("info"),
    value: jsonb("value").$type<MetricValue>().notNull(),
    detailMd: text("detail_md").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runMetricsIdx: index("metrics_run_idx").on(t.runId),
  })
);

export const entityNodes = pgTable(
  "entity_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(), // company|director|ubo|subsidiary|related_party|registry|person
    attrs: jsonb("attrs").$type<Record<string, string>>().notNull().default({}),
    confidence: real("confidence").notNull().default(0.8),
  },
  (t) => ({
    runNodeIdx: index("entity_nodes_run_idx").on(t.runId),
  })
);

export const entityEdges = pgTable("entity_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  sourceKey: text("source_key").notNull(),
  targetKey: text("target_key").notNull(),
  relation: text("relation").notNull(),
  weight: real("weight").notNull().default(1),
  confidence: real("confidence").notNull().default(0.8),
  findingRef: text("finding_ref"),
});

export type ChatCitation = {
  documentName: string;
  documentId?: string;
  pageNumber: number;
  excerpt: string;
  bbox?: BBox;
};

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user|assistant
    content: text("content").notNull(),
    citations: jsonb("citations").$type<ChatCitation[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runChatIdx: index("chat_run_idx").on(t.runId),
  })
);
