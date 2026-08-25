export type CheckKey =
  | "benford"
  | "beneish"
  | "altman"
  | "isolation_forest"
  | "ratios"
  | "reconciliation"
  | "gaps";

export type ChecklistItem = {
  label: string;
  expectAny: string[]; // keywords searched across extracted corpus
};

export type WorkflowDef = {
  id: string;
  name: string;
  category:
    | "Due Diligence"
    | "Audit & Assurance"
    | "Tax & Regulatory"
    | "Compliance & AML";
  description: string;
  recommendedDocs: string[];
  checks: CheckKey[];
  checklist: ChecklistItem[];
};

const COMMON_CHECKS: CheckKey[] = ["benford", "isolation_forest"];

function w(def: WorkflowDef): WorkflowDef {
  return { ...def, checks: [...new Set([...COMMON_CHECKS, ...def.checks])] };
}

export const WORKFLOWS: WorkflowDef[] = [
  // ---------------- Due Diligence ----------------
  {
    id: "startup-diligence",
    name: "Startup Diligence",
    category: "Due Diligence",
    description:
      "Full financial hygiene sweep for early-stage targets: revenue authenticity, burn reconciliation, related-party leakage and cap-table-adjacent red flags.",
    recommendedDocs: ["Management accounts (12–24 months)", "Bank statements", "Cap table / SHA summary", "Board decks"],
    checks: ["benford", "beneish", "altman", "isolation_forest", "ratios", "reconciliation", "gaps"],
    checklist: [
      { label: "Revenue schedule present", expectAny: ["revenue", "sales register"] },
      { label: "Bank reconciliation included", expectAny: ["bank reconciliation", "brs"] },
      { label: "Burn / cash runway stated", expectAny: ["burn", "runway", "cash position"] },
      { label: "Related-party disclosures", expectAny: ["related party"] },
      { label: "Statutory dues status", expectAny: ["gst", "pf", "esi", "tds", "statutory dues"] },
    ],
  },
  {
    id: "ma-buy-side",
    name: "M&A Buy-side Diligence",
    category: "Due Diligence",
    description:
      "Buy-side quality-of-earnings screen: earnings manipulation indices, working-capital normalization inputs and cross-statement consistency.",
    recommendedDocs: ["Audited financials (2–3 years)", "Trial balance", "Debt schedule", "Related-party annexures"],
    checks: ["benford", "beneish", "altman", "ratios", "reconciliation", "gaps"],
    checklist: [
      { label: "Two or more audited periods", expectAny: ["audited"] },
      { label: "EBITDA bridge provided", expectAny: ["ebitda"] },
      { label: "Debt & contingent liabilities schedule", expectAny: ["contingent liability", "debt"] },
      { label: "Working capital detail", expectAny: ["working capital", "receivables", "inventory"] },
    ],
  },
  {
    id: "asset-quality-review",
    name: "Asset Quality Review",
    category: "Due Diligence",
    description:
      "Lender-style AQR: loan-book integrity, rounding-pattern fabrication tests, evergreening indicators and collateral documentation completeness.",
    recommendedDocs: ["Loan book export", "Sanction letters", "Collateral register", "NPA classification report"],
    checks: ["benford", "isolation_forest", "reconciliation", "gaps"],
    checklist: [
      { label: "Loan book with account-level detail", expectAny: ["loan book", "account no", "borrower"] },
      { label: "NPA classification policy evidence", expectAny: ["npa", "non-performing"] },
      { label: "Collateral valuation reports", expectAny: ["valuation", "collateral"] },
    ],
  },
  {
    id: "vendor-diligence",
    name: "Vendor Diligence",
    category: "Due Diligence",
    description:
      "Third-party risk screen on critical vendors: shell-company indicators, invoice-number continuity, price variance anomalies and KYC gaps.",
    recommendedDocs: ["Vendor master list", "Sample invoices", "Purchase orders", "Vendor KYC pack"],
    checks: ["benford", "isolation_forest", "gaps"],
    checklist: [
      { label: "Vendor master data complete", expectAny: ["vendor", "supplier", "gstin"] },
      { label: "Invoice samples attached", expectAny: ["invoice"] },
      { label: "PO-to-invoice linkage", expectAny: ["purchase order", "po "] },
    ],
  },
  {
    id: "red-flag-forensic",
    name: "Red Flag Forensic Sweep",
    category: "Due Diligence",
    description:
      "Broad-spectrum fraud scan: Benford fabrication signals, round-sum clustering, weekend postings and unexplained journal entries.",
    recommendedDocs: ["General ledger dump", "Journal entries", "Bank statements"],
    checks: ["benford", "isolation_forest", "reconciliation", "gaps"],
    checklist: [
      { label: "Transaction-level ledger provided", expectAny: ["journal", "ledger", "voucher"] },
      { label: "Posting timestamps available", expectAny: ["date", "timestamp"] },
      { label: "Manual journal markers", expectAny: ["manual", "adjustment entry"] },
    ],
  },

  // ---------------- Audit & Assurance ----------------
  {
    id: "statutory-audit-prep",
    name: "Statutory Audit Prep",
    category: "Audit & Assurance",
    description:
      "Pre-audit readiness review: schedule completeness, statement cross-ties and disclosure checklist coverage before your auditor opens the file.",
    recommendedDocs: ["Draft financial statements", "Trial balance", "Fixed asset register", "Loan statements"],
    checks: ["ratios", "reconciliation", "gaps"],
    checklist: [
      { label: "Balance sheet ties to trial balance", expectAny: ["trial balance"] },
      { label: "Depreciation schedule present", expectAny: ["depreciation"] },
      { label: "Related-party disclosure drafted", expectAny: ["related party"] },
      { label: "Events after reporting date", expectAny: ["subsequent event", "events after"] },
    ],
  },
  {
    id: "revenue-recognition-606",
    name: "Revenue Recognition (ASC 606)",
    category: "Audit & Assurance",
    description:
      "Five-step model readiness: contract identification evidence, performance-obligation mapping, timing-of-transfer analysis and cut-off testing inputs.",
    recommendedDocs: ["Revenue register", "Contract samples", "Deferred revenue schedule"],
    checks: ["benford", "reconciliation", "gaps"],
    checklist: [
      { label: "Contracts / agreements sampled", expectAny: ["contract", "agreement", "sow"] },
      { label: "Deferred revenue roll-forward", expectAny: ["deferred revenue", "unearned"] },
      { label: "Cut-off procedures documented", expectAny: ["cut-off"] },
    ],
  },
  {
    id: "related-party-disclosures",
    name: "Related Party Disclosures",
    category: "Audit & Assurance",
    description:
      "Detects undisclosed related parties via name/suffix clustering, directorship overlap flags and transaction-pattern correlation across documents.",
    recommendedDocs: ["Financial statements", "Director KYC list", "Group structure chart"],
    checks: ["isolation_forest", "gaps"],
    checklist: [
      { label: "Director roster provided", expectAny: ["director"] },
      { label: "Group entity list", expectAny: ["group", "holding", "subsidiary"] },
      { label: "RPT transaction log", expectAny: ["related party transaction", "rpt"] },
    ],
  },
  {
    id: "going-concern-assessment",
    name: "Going Concern Assessment",
    category: "Audit & Assurance",
    description:
      "Quantitative going-concern support: Altman Z-zone trajectory, liquidity ratio volatility, covenant headroom and forecast sensitivity notes.",
    recommendedDocs: ["Latest financials", "Cash flow projections", "Covenant compliance certificates"],
    checks: ["altman", "ratios", "gaps"],
    checklist: [
      { label: "12-month cash forecast present", expectAny: ["forecast", "projection"] },
      { label: "Covenant certificates", expectAny: ["covenant"] },
      { label: "Board's going-concern note", expectAny: ["going concern"] },
    ],
  },
  {
    id: "inventory-integrity",
    name: "Inventory Integrity Review",
    category: "Audit & Assurance",
    description:
      "Valuation and existence checks: NRV adjustments, count-sheet vs ledger variances and obsolescence provisioning patterns.",
    recommendedDocs: ["Inventory ledger", "Physical count sheets", "Valuation working"],
    checks: ["benford", "isolation_forest", "reconciliation", "gaps"],
    checklist: [
      { label: "Physical count sheets", expectAny: ["count sheet", "physical verification"] },
      { label: "NRV / obsolescence policy", expectAny: ["nrv", "obsolescence", "provision"] },
    ],
  },
  {
    id: "fixed-asset-register-audit",
    name: "Fixed Asset Register Audit",
    category: "Audit & Assurance",
    description:
      "FAR hygiene: capitalization-threshold consistency, depreciation-method drift and ghost-asset screening against insurance schedules.",
    recommendedDocs: ["Fixed asset register", "Depreciation computation", "Insurance schedule"],
    checks: ["ratios", "reconciliation", "gaps"],
    checklist: [
      { label: "Depreciation method disclosed", expectAny: ["depreciation", "wdv", "slm"] },
      { label: "Insurance cover mapping", expectAny: ["insurance"] },
      { label: "Capitalization policy stated", expectAny: ["capitaliz", "capitalis"] },
    ],
  },

  // ---------------- Tax & Regulatory ----------------
  {
    id: "transfer-pricing-crosscheck",
    name: "Transfer Pricing Cross-Check",
    category: "Tax & Regulatory",
    description:
      "Intercompany pricing sanity: margin-band outliers vs comparables narrative, TP documentation completeness and flow-chart of IC flows.",
    recommendedDocs: ["TP study/report", "Intercompany agreements", "IC transaction summary"],
    checks: ["isolation_forest", "ratios", "gaps"],
    checklist: [
      { label: "TP documentation exists", expectAny: ["transfer pricing", "master file", "local file"] },
      { label: "Benchmarking study included", expectAny: ["benchmark", "comparable"] },
      { label: "Intercompany agreements signed", expectAny: ["intercompany agreement", "intra-group"] },
    ],
  },
  {
    id: "gst-vat-reconciliation",
    name: "GST/VAT Reconciliation",
    category: "Tax & Regulatory",
    description:
      "Turnover-to-returns reconciliation: GSTR/book mismatch quantification, ITC leakage patterns and HSN-level anomaly flags.",
    recommendedDocs: ["GSTR filings", "Sales/purchase registers", "ITC ledger"],
    checks: ["reconciliation", "gaps"],
    checklist: [
      { label: "Filed returns attached", expectAny: ["gstr", "vat return"] },
      { label: "Input tax credit ledger", expectAny: ["itc", "input credit", "input tax"] },
      { label: "HSN-wise summary", expectAny: ["hsn"] },
    ],
  },
  {
    id: "fdi-fema-audit",
    name: "FDI / FEMA Compliance Audit",
    category: "Tax & Regulatory",
    description:
      "Cross-border inflow compliance: pricing guidelines, share-capital trail, sectoral-cap confirmation and FC-GPR/FC-TRS filing completeness.",
    recommendedDocs: ["FC-GPR / FC-TRS copies", "FIRC / inward remittance advice", "Valuation certificate"],
    checks: ["gaps", "reconciliation"],
    checklist: [
      { label: "Inward remittance evidence", expectAny: ["firc", "remittance", "swift"] },
      { label: "Valuation certificate", expectAny: ["valuation", "certified CA"] },
      { label: "Reporting forms filed", expectAny: ["fc-gpr", "fc-trs"] },
    ],
  },
  {
    id: "tds-payroll-compliance",
    name: "TDS & Payroll Compliance",
    category: "Tax & Regulatory",
    description:
      "Withholding integrity: challan-vs-return mapping, salary-statutory deduction continuity and late-deposit interest exposure estimation.",
    recommendedDocs: ["TDS returns", "Challans", "Payroll register", "PF/ESI statements"],
    checks: ["reconciliation", "gaps"],
    checklist: [
      { label: "Quarterly TDS returns filed", expectAny: ["24q", "26q", "tds return"] },
      { label: "Challan evidences", expectAny: ["challan"] },
      { label: "PF/ESI remittance proof", expectAny: ["pf", "esi", "epfo"] },
    ],
  },
  {
    id: "customs-import-compliance",
    name: "Customs & Import Compliance",
    category: "Tax & Regulatory",
    description:
      "Import-pricing discipline: unit-price dispersion within HS codes, declared-value outlier detection and bill-of-entry document gaps.",
    recommendedDocs: ["Bill of entry set", "Import invoices", "Customs duty challans"],
    checks: ["benford", "isolation_forest", "gaps"],
    checklist: [
      { label: "Bill of entry records", expectAny: ["bill of entry", "boe"] },
      { label: "HS code classifications", expectAny: ["hsn", "hs code"] },
    ],
  },

  // ---------------- Compliance & AML ----------------
  {
    id: "pep-sanctions-deep-tier",
    name: "PEP & Sanctions Deep-Tier",
    category: "Compliance & AML",
    description:
      "Politically-exposed-person and sanctions exposure: entity-name variant clustering, jurisdiction risk scoring and adverse-media signal extraction from documents.",
    recommendedDocs: ["KYC files", "Ownership declarations", "Board minutes naming counterparties"],
    checks: ["gaps"],
    checklist: [
      { label: "Counterparty KYC complete", expectAny: ["kyc", "know your customer"] },
      { label: "Ownership declarations", expectAny: ["beneficial owner", "ubo"] },
      { label: "Jurisdiction details captured", expectAny: ["country", "jurisdiction", "incorporated in"] },
    ],
  },
  {
    id: "ubo-unmasking",
    name: "UBO Unmasking",
    category: "Compliance & AML",
    description:
      "Ultimate-beneficial-owner tracing through layered structures: percentage-threshold aggregation, nominee-pattern detection and circular ownership loops.",
    recommendedDocs: ["Shareholding pattern", "Registry extracts", "Trust deeds"],
    checks: ["gaps"],
    checklist: [
      { label: "Shareholding pattern filed", expectAny: ["shareholding", "shareholding pattern"] },
      { label: "Registry extract attached", expectAny: ["mca", "registry", "extract"] },
      { label: "Nominee disclosures", expectAny: ["nominee", "trustee"] },
    ],
  },
  {
    id: "fcpa-anti-bribery",
    name: "Anti-Bribery / FCPA Audit",
    category: "Compliance & AML",
    description:
      "Improper-payment screening: agent/distributor commission outliers, gift-hospitality ledger patterns and government-touchpoint concentration.",
    recommendedDocs: ["Commission agreements", "Expense ledgers", "Agent/distributor list"],
    checks: ["benford", "isolation_forest", "gaps"],
    checklist: [
      { label: "Intermediary list provided", expectAny: ["agent", "distributor", "intermediary"] },
      { label: "Gift & hospitality register", expectAny: ["gift", "hospitality", "entertainment"] },
      { label: "Government interactions flagged", expectAny: ["government", "public official"] },
    ],
  },
  {
    id: "aml-transaction-monitoring",
    name: "AML Transaction Monitoring Tuning",
    category: "Compliance & AML",
    description:
      "Scenario-quality review: structuring (smurfing) pattern detection, velocity anomalies below alert thresholds and threshold-calibration evidence.",
    recommendedDocs: ["Transaction dumps", "Alert disposition logs", "Scenario configuration"],
    checks: ["benford", "isolation_forest", "gaps"],
    checklist: [
      { label: "Alert dispositions logged", expectAny: ["alert", "disposition", "case"] },
      { label: "Scenario thresholds documented", expectAny: ["threshold", "scenario"] },
    ],
  },
  {
    id: "sanctions-evasion-patterns",
    name: "Sanctions Evasion Patterns",
    category: "Compliance & AML",
    description:
      "Evasion-technique screens: transshipment routings, dual-goods descriptions and sudden counterparty-jurisdiction shifts in trade documents.",
    recommendedDocs: ["Shipping documents", "LC files", "Customer correspondence summaries"],
    checks: ["isolation_forest", "gaps"],
    checklist: [
      { label: "Trade documents available", expectAny: ["bill of lading", "shipping", "lc"] },
      { label: "End-use statements", expectAny: ["end user", "end use"] },
    ],
  },
  {
    id: "crypto-fiat-bridge-review",
    name: "Crypto-Fiat Bridge Review",
    category: "Compliance & AML",
    description:
      "VASP interaction audit: exchange-counterparty exposure, wallet-address attestations and travel-rule compliance evidence in banking records.",
    recommendedDocs: ["Bank statements referencing exchanges", "Wallet attestation letters", "Policy docs"],
    checks: ["isolation_forest", "gaps"],
    checklist: [
      { label: "Exchange counterparties identified", expectAny: ["exchange", "vasp", "wallet"] },
      { label: "Travel-rule evidence", expectAny: ["travel rule"] },
    ],
  },
  {
    id: "ngo-grant-utilization",
    name: "NGO / Grant Utilization Audit",
    category: "Compliance & AML",
    description:
      "Grant-spending integrity: utilization-certificate reconciliation, program-vs-admin spend split and beneficiary-count plausibility checks.",
    recommendedDocs: ["Utilization certificates", "Program expense ledgers", "Donor reports"],
    checks: ["benford", "reconciliation", "gaps"],
    checklist: [
      { label: "Utilization certificates present", expectAny: ["utilization certificate", "uc"] },
      { label: "Donor stipulated reporting", expectAny: ["donor", "grant report"] },
    ],
  },
  {
    id: "esg-substantiation",
    name: "ESG Claim Substantiation",
    category: "Compliance & AML",
    description:
      "Greenwashing defense file: emission-figure provenance, offset-purchase trails and supplier-certification validity windows.",
    recommendedDocs: ["ESG report", "Offset purchase receipts", "Supplier certifications"],
    checks: ["gaps", "reconciliation"],
    checklist: [
      { label: "Emissions data provenance", expectAny: ["emission", "scope 1", "scope 2"] },
      { label: "Offset retirements evidenced", expectAny: ["offset", "credit retirement"] },
      { label: "Certifications current", expectAny: ["certificate", "iso", "fairtrade"] },
    ],
  },
];

export const WORKFLOW_CATEGORIES = ["Due Diligence", "Audit & Assurance", "Tax & Regulatory", "Compliance & AML"] as const;

export function getWorkflow(id: string): WorkflowDef | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}
