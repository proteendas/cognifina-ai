/**
 * Cognifina test-document library generator.
 *
 *   node scripts/generate-test-docs.mjs [outputDir=test-docs]
 *
 * Produces scenario sets that exercise every workflow family AND the edge
 * cases (empty files, single-period data, sub-threshold populations,
 * duplicates, sequence gaps, scanned pages, malformed uploads…).
 * Expected outcomes per set are documented in test-docs/TESTING-GUIDE.md.
 */
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] ?? "test-docs";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const dir = (name) => {
  mkdirSync(join(OUT, name), { recursive: true });
  return (f) => join(OUT, name, f);
};

// ---------- deterministic RNG ----------
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- minimal multi-page PDF writer (text layer, no deps) ----------
function makePdf(pages) {
  // pages: string[][]
  const contents = pages.map((lines) => {
    let content = "BT /F1 11 Tf 14 TL 48 780 Td\n";
    for (const l of lines) content += `(${l.replace(/([()\\])/g, "\\$1")}) Tj T*\n`;
    content += "ET";
    return content;
  });
  const objects = [];
  const pageObjNums = [];
  const fontNum = 3 + contents.length * 2; // font object number (shared)
  objects.push("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  objects.push("PLACEHOLDER_PAGES"); // 2 — patched below
  contents.forEach((content, i) => {
    const pageNum = 3 + i * 2;
    pageObjNums.push(pageNum);
    objects[pageNum - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${pageNum + 1} 0 R /Resources << /Font << /F1 ${fontNum} 0 R >> >> >>`;
    objects[pageNum] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  objects[fontNum - 1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[1] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${contents.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

const pad = (s, w) => String(s).padEnd(w).slice(0, w);
const num = (v) => v.toLocaleString("en-US");
const csv = (rows) => rows.map((r) => r.map((c) => (String(c).includes(",") ? `"${c}"` : c)).join(",")).join("\n");

function writeXlsx(path, sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  XLSX.writeFile(wb, path);
}

// ---------- journal generator ----------
function journal(path, { count, seed, benford = "natural", roundPct = 0.03, weekendPct = 0.09, start = "2024-01-02", accounts: accs } = {}) {
  const rand = mulberry(seed);
  const accounts = accs ?? ["Sales - Domestic", "Sales - Export", "Rent Expense", "Payroll", "Utilities", "Professional Fees", "Travel", "Marketing", "Repairs", "Office Supplies"];
  const rows = [["Date", "Account", "Description", "Debit", "Credit"]];
  let day = new Date(start + "T00:00:00Z");
  for (let i = 0; i < count; i++) {
    let amount;
    if (benford === "natural") amount = Math.pow(10, 2 + rand() * 4.3); // log-uniform → Benford
    else if (benford === "violating") amount = Math.pow(10, 4.7 + rand() * 0.28); // leading 8–9 only
    else if (benford === "round") amount = Math.round(Math.pow(10, 3 + rand() * 2)) * 100; // everything ×100
    amount = Math.round(amount * 100) / 100;
    if (rand() < roundPct) amount = Math.round(amount / 1000) * 1000;
    day = new Date(day.getTime() + Math.floor(rand() * 3) * 86400000);
    if (rand() < weekendPct) {
      while ([0, 6].includes(day.getUTCDay())) day = new Date(day.getTime() + 86400000);
      day = new Date(day.getTime() - 86400000); // land ON the weekend
    }
    rows.push([day.toISOString().slice(0, 10), accounts[Math.floor(rand() * accounts.length)], `Entry ${1000 + i}`, "", amount.toFixed(2)]);
  }
  writeFileSync(path, csv(rows));
}

// ---------- balance sheet / P&L builder ----------
function financials(path, { fyA, fyB, clean }) {
  const c = clean
    ? { debtors: [2100000, 2300000], cash: [800000, 850000], inv: [1500000, 1600000], cl: [2200000, 2300000], loans: [2600000, 2500000], reserves: [1800000, 2050000], rev: [24000000, 25200000], cogs: [14400000, 15120000], dep: [700000, 700000], cfo: [3240000, 3300000], pbt: [3240000, 3300000] }
    : { debtors: [2100000, 4600000], cash: [800000, 650000], inv: [1500000, 1900000], cl: [2200000, 4300000], loans: [2600000, 3100000], reserves: [1800000, 1600000], rev: [24000000, 31200000], cogs: [14400000, 19800000], dep: [700000, 550000], cfo: [1900000, 620000], pbt: [3240000, 2210000] };
  const tca = (i) => c.debtors[i] + c.cash[i] + c.inv[i];
  const ta = (i) => tca(i) + 5200000 + (i === 0 ? 400000 : 650000);
  const eq = (i) => ta(i) - c.cl[i] - c.loans[i];
  const bs = [
    ["Balance Sheet", "", ""],
    ["Particulars", fyA, fyB],
    ["Sundry Debtors", ...c.debtors],
    ["Cash & Bank", ...c.cash],
    ["Inventory", ...c.inv],
    ["Total Current Assets", tca(0), tca(1)],
    ["Net Fixed Assets", 5200000, 5200000],
    ["Non Current Investments", 400000, 650000],
    ["Total Assets", ta(0), ta(1)],
    ["Total Current Liabilities", ...c.cl],
    ["Secured Loans", ...c.loans],
    ["Reserves & Surplus", ...c.reserves],
    ["Shareholders Funds", eq(0), eq(1)],
    ["Total Equity & Liabilities", ta(0), ta(1)],
  ];
  const pl = [
    ["Profit & Loss Statement", "", ""],
    ["Particulars", fyA, fyB],
    ["Revenue from operations", ...c.rev],
    ["Cost of materials consumed", ...c.cogs],
    ["Gross Profit", c.rev[0] - c.cogs[0], c.rev[1] - c.cogs[1]],
    ["Employee benefit expenses", 4200000, c.clean ? 4400000 : 5000000],
    ["Administrative expenses", 1200000, 1500000],
    ["Depreciation & amortisation", ...c.dep],
    ["Operating Profit", 3500000, c.clean ? 3690000 : 2550000],
    ["Finance Costs", 260000, 340000],
    ["Profit Before Tax", ...c.pbt],
  ];
  const cf = [
    ["Cash Flow Statement", "", ""],
    ["Particulars", fyA, fyB],
    ["Net cash from operating activities", ...c.cfo],
    ["Investing activities", -1200000, -800000],
    ["Financing activities", -300000, 200000],
  ];
  writeXlsx(path, [
    ["Balance Sheet", bs],
    ["Profit Loss", pl],
    ["Cash Flow", cf],
  ]);
}

/* ================================================================
   SET 1 — clean-set: baseline "good books"
   ================================================================ */
{
  const f = dir("1-clean-set");
  journal(f("journal.csv"), { count: 600, seed: 101, benford: "natural", roundPct: 0.01, weekendPct: 0.02 });
  financials(f("financials.xlsx"), { fyA: "FY2024", fyB: "FY2025", clean: true });
  writeFileSync(
    f("auditor-note.txt"),
    [
      "NORTHSTAR ANALYTICS PRIVATE LIMITED — CIN U62099KA2019PTC298765",
      "PAN AABCU9876K   GSTIN 29AABCU9876K1ZQ",
      "Board of Directors: Priya Nair, Arjun Mehta",
      "Arjun Mehta DIN 06543219",
      "No related-party transactions during the period under review.",
      "All statutory dues (GST, TDS, PF, ESI) deposited within prescribed timelines.",
    ].join("\n")
  );
}

/* ================================================================
   SET 2 — fraud-set: manipulation signals everywhere
   ================================================================ */
{
  const f = dir("2-fraud-set");
  journal(f("journal.csv"), { count: 800, seed: 202, benford: "violating", roundPct: 0.22, weekendPct: 0.3 });
  journal(f("journal-register.csv"), { count: 500, seed: 203, benford: "round", roundPct: 0.5 });
  financials(f("financials.xlsx"), { fyA: "FY2024", fyB: "FY2025", clean: false });
  writeFileSync(
    f("related-party-note.txt"),
    [
      "QUORVALE TEXTILES PRIVATE LIMITED — CIN U17120TN2016PTC112233",
      "PAN AADCQ5678L   GSTIN 33AADCQ5678L1ZR",
      "",
      "Board of Directors: Meera Iyer, Rajan Kapoor",
      "Rajan Kapoor DIN 07098765",
      "",
      "Ultimate Beneficial Owner : Vikram Rao holds 68.9% of Quorvale Textiles Private Limited",
      "Quorvale Textiles Private Limited is a 51%-owned subsidiary of Rao Holdings Pte Ltd (Singapore)",
      "Related party transaction: Consultancy fees paid to Rao Advisory LLP (Rajan Kapoor is a partner) of INR 3,10,00,000 during FY2025",
      "Sales incentive credited back from Delta Distributors Pvt Ltd: INR 1,48,00,000 (Q3)",
    ].join("\n")
  );
}

/* ================================================================
   SET 3 — mismatch-set: cross-document contradictions
   ================================================================ */
{
  const f = dir("3-mismatch-set");
  financials(f("management-accounts.xlsx"), { fyA: "FY2024", fyB: "FY2025", clean: false });
  // audited version disagrees materially on the same normalized labels
  const auditedBs = [
    ["Balance Sheet (Audited)", "", ""],
    ["Particulars", "FY2024", "FY2025"],
    ["Sundry Debtors", 2100000, 3900000],
    ["Cash & Bank", 800000, 700000],
    ["Inventory", 1500000, 1700000],
    ["Total Current Assets", 4400000, 6300000],
    ["Net Fixed Assets", 5200000, 5000000],
    ["Non Current Investments", 400000, 600000],
    ["Total Assets", 10000000, 11900000],
    ["Total Current Liabilities", 2200000, 4100000],
    ["Secured Loans", 2600000, 3000000],
    ["Reserves & Surplus", 1800000, 1400000],
    ["Shareholders Funds", 5200000, 4800000],
    ["Total Equity & Liabilities", 10000000, 11900000],
  ];
  const auditedPl = [
    ["Profit & Loss (Audited)", "", ""],
    ["Particulars", "FY2024", "FY2025"],
    ["Revenue from operations", 24000000, 28900000],
    ["Cost of materials consumed", 14400000, 18100000],
    ["Gross Profit", 9600000, 10800000],
    ["Employee benefit expenses", 4200000, 4800000],
    ["Administrative expenses", 1200000, 1600000],
    ["Depreciation & amortisation", 700000, 700000],
    ["Operating Profit", 3500000, 3700000],
    ["Finance Costs", 260000, 380000],
    ["Profit Before Tax", 3240000, 3320000],
  ];
  writeXlsx(f("audited-financials.xlsx"), [["Balance Sheet", auditedBs], ["Profit Loss", auditedPl]]);
  // balance sheet that does NOT tie internally
  writeXlsx(f("broken-tie-out.xlsx"), [
    [
      "Balance Sheet Draft",
      [
        ["Particulars", "FY2025"],
        ["Total Current Assets", 7150000],
        ["Net Fixed Assets", 5350000],
        ["Total Assets", 13150000],
        ["Total Current Liabilities", 4300000],
        ["Secured Loans", 3100000],
        ["Shareholders Funds", 5750000],
        ["Total Equity & Liabilities", 12650000],
      ],
    ],
  ]);
  journal(f("journal.csv"), { count: 400, seed: 304 });
}

/* ================================================================
   SET 4 — gap-set: missing evidence & sequence breaks
   ================================================================ */
{
  const f = dir("4-gap-set");
  writeFileSync(
    f("only-note.txt"),
    "SILLINESS TRADERS LLP — a bare engagement note with no financial statements attached. " +
      "No balance sheet, no P&L, no cash flow, no tax filings, no bank statements, no journal register provided."
  );
  // invoice register with heavy sequence gaps + duplicates
  const rand = mulberry(404);
  const invRows = [["Invoice No", "Vendor", "Date", "Amount"]];
  let n = 5001;
  const gaps = new Set([5007, 5008, 5019, 5020, 5021, 5044]);
  let emitted = 0;
  while (emitted < 40) {
    if (gaps.has(n)) { n++; continue; }
    const dup = emitted === 10; // exact duplicate row
    invRows.push([`INV-${n}`, "Shenoy Logistics LLP", "2025-06-1" + (emitted % 9), (4000 + Math.floor(rand() * 80000)).toFixed(2)]);
    if (dup) { invRows.push([`INV-${n}`, "Shenoy Logistics LLP", "2025-06-1" + (emitted % 9), (4000 + Math.floor(rand() * 80000)).toFixed(2)]); emitted++; }
    n++; emitted++;
  }
  writeFileSync(f("invoices.csv"), csv(invRows));
}

/* ================================================================
   SET 5 — entity-set: ownership graph & registry identifiers
   ================================================================ */
{
  const f = dir("5-entity-set");
  writeFileSync(
    f("ownership-memo.pdf"),
    makePdf([
      [
        "VALE GROUP LIMITED — Corporate Structure Memorandum",
        "",
        "Subject entity: ACME HOLDINGS PRIVATE LIMITED",
        "CIN U74999MH2018PTC311234   PAN AACCA1234F   GSTIN 27AACCA1234F1ZV",
        "",
        "Board of Directors : Jane Smith , John Doe , Ravi Menon",
        "John Doe DIN 08123456",
        "Ravi Menon DIN 08123457",
        "",
        "Shareholding of Acme Holdings Private Limited :",
        "  Vale Group Limited holds 72.4% (parent)",
        "  Robert Vale holds 18.0% (individual, Ultimate Beneficial Owner)",
        "  Esme Trust holds 9.6% (family trust, Robert Vale is settlor)",
        "",
        "Subsidiaries of Acme Holdings Private Limited :",
        "  Acme Exports LLP — 100%",
        "  Acme Retail Private Limited — 85% (CIN U52100DL2021PTC387654)",
        "",
        "Related parties:",
        "  Consulting fees paid to Robert Vale of $420,000 during FY2024",
        "  Rent paid to Vale Group Limited of $96,000 (shared premises)",
        "",
        "Litigation: Acme Retail Private Limited is a respondent in Arbitration Case No. 4417 of 2023, Delhi High Court",
      ],
      [
        "Annexure A — Key figures as reported (FY2024)",
        "",
        pad("Metric", 34) + pad("FY2023", 14) + "FY2024",
        pad("Directors remuneration", 34) + pad(num(380000), 14) + num(800000),
        pad("Consulting fees related party", 34) + pad(num(120000), 14) + num(420000),
        pad("Statutory dues payable", 34) + pad(num(90000), 14) + num(310000),
        pad("Total assets", 34) + pad(num(10000000), 14) + num(12850000),
        pad("Related party rent expense", 34) + pad(num(84000), 14) + num(96000),
      ],
    ])
  );
  financials(f("financials.xlsx"), { fyA: "FY2023", fyB: "FY2024", clean: false });
}

/* ================================================================
   SET 6 — edge-cases
   ================================================================ */
{
  const f = dir("6-edge-cases");
  writeFileSync(f("empty.txt"), ""); // zero-byte upload
  writeFileSync(
    f("prose-only.txt"),
    "This engagement memorandum contains narrative only. The company is believed to be doing well and the " +
      "management team is confident about the future. There are no numbers in this document at all — the " +
      "deterministic engines should report insufficient numeric evidence rather than crashing or fabricating."
  );
  financials(f("single-period.xlsx"), { fyA: "FY2025", fyB: "FY2025", clean: true }); // identical columns → no prior period
  journal(f("tiny-journal.csv"), { count: 42, seed: 606 }); // < 100 rows → Benford inconclusive
  // negatives & zeros — must be excluded from Benford populations
  writeFileSync(
    f("negatives.csv"),
    csv([
      ["Date", "Account", "Description", "Debit", "Credit"],
      ...Array.from({ length: 150 }, (_, i) => {
        const rand = mulberry(700 + i)();
        const amt = i % 3 === 0 ? -Math.round(rand * 50000) : i % 7 === 0 ? 0 : Math.round(Math.pow(10, 2 + rand * 4) * 100) / 100;
        return [`2025-03-${String((i % 28) + 1).padStart(2, "0")}`, "Mixed Account", `Row ${i}`, "", amt.toFixed(2)];
      }),
    ])
  );
  // duplicate-heavy register
  const dupRows = [["Invoice No", "Vendor", "Amount"]];
  for (let i = 0; i < 30; i++) {
    dupRows.push([`DUP-${1000 + (i % 10)}`, "Repeat Vendors Pvt Ltd", "125000.00"]);
  }
  writeFileSync(f("duplicates.csv"), csv(dupRows));
  // quoted CSV fields with commas inside numbers — parser stress
  writeFileSync(
    f("quoted-numbers.csv"),
    csv([
      ["Date", "Account", "Description", "Debit", "Credit"],
      ...Array.from({ length: 120 }, (_, i) => {
        const rand = mulberry(800 + i)();
        const amt = Math.pow(10, 2 + rand * 4);
        return [`2025-04-${String((i % 28) + 1).padStart(2, "0")}`, "Fmt Account", `Row, with comma ${i}`, "", amt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })];
      }),
    ])
  );
  // 12-page PDF — pagination + page-level citations
  const pages = Array.from({ length: 12 }, (_, p) => [
    `ACME HOLDINGS PRIVATE LIMITED — Ledger Appendix, Page ${p + 1} of 12`,
    "",
    ...Array.from({ length: 28 }, (_, r) => {
      const rand = mulberry(900 + p * 40 + r)();
      return pad(`Entry ${p * 28 + r + 1}`, 30) + Math.round(Math.pow(10, 2 + rand * 4.2) * 100) / 100;
    }),
  ]);
  writeFileSync(f("ledger-appendix.pdf"), makePdf(pages));
  // scanned-page simulation: PDF page with an EMPTY content stream (no text layer)
  writeFileSync(f("scanned.pdf"), makePdfScanned());
  // malformed upload — garbage bytes with an .xlsx extension (ingestion must fail gracefully)
  writeFileSync(f("corrupt.xlsx"), Buffer.from("this is definitely not a real xlsx file", "utf8"));
}

function makePdfScanned() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>",
    "<< /Length 9 >>\nstream\n1 1 1 rg\nendstream", // paints nothing — no text operators
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

console.log(`test-document library written to ./${OUT}/`);
