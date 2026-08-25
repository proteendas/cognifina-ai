/**
 * E2E fixture generator — deterministic test documents:
 *  1. journal.csv          → 400 journal entries (natural Benford-ish amounts,
 *                            some round-sum + weekend postings for Isolation Forest)
 *  2. financials.xlsx      → Balance Sheet & P&L with FY2023/FY2024 columns
 *                            (deliberately manipulated so M-Score flags)
 *  3. invoices.csv         → invoice register with sequence gaps
 *  4. note.pdf             → hand-written minimal PDF: directors, ownership %, CIN,
 *                            and an aligned numeric table (tests unpdf + table inference)
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";

// ---------- 1. journal.csv ----------
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry(20240817);
const accounts = ["Sales - Domestic", "Sales - Export", "Rent Expense", "Payroll", "Utilities", "Professional Fees", "Travel", "Marketing", "Repairs", "Office Supplies"];
const rows = [["Date", "Account", "Description", "Debit", "Credit"]];
let day = new Date("2024-01-02T00:00:00Z");
for (let i = 0; i < 400; i++) {
  // Benford-natural amount via log-uniform
  const amount = Math.round(Math.pow(10, 2 + rand() * 4.3) * 100) / 100;
  const roundSum = rand() < 0.06 ? Math.round(amount / 1000) * 1000 : amount;
  // advance date randomly; ~9% land on weekends
  day = new Date(day.getTime() + Math.floor(rand() * 3) * 86400000);
  const d = day.toISOString().slice(0, 10);
  rows.push([d, accounts[Math.floor(rand() * accounts.length)], `Entry ${1000 + i}`, "", roundSum.toFixed(2)]);
}
writeFileSync("/tmp/cognifina-e2e/journal.csv", rows.map((r) => r.join(",")).join("\n"));

// ---------- 2. financials.xlsx ----------
const bs = [
  ["Balance Sheet", "", ""],
  ["Particulars", "FY2023", "FY2024"],
  ["Sundry Debtors", 2100000, 4600000],
  ["Cash & Bank", 800000, 650000],
  ["Inventory", 1500000, 1900000],
  ["Total Current Assets", 4400000, 7150000],
  ["Net Fixed Assets", 5200000, 5350000],
  ["Non Current Investments", 300000, 500000],
  ["Deferred Tax Asset", 100000, 150000],
  ["Total Assets", 10000000, 13150000],
  ["Total Current Liabilities", 2200000, 4300000],
  ["Secured Loans", 2600000, 3100000],
  ["Reserves & Surplus", 1800000, 1600000],
  ["Shareholders Funds", 5200000, 5750000],
  ["Total Equity & Liabilities", 10000000, 13150000],
];
const pl = [
  ["Profit & Loss Statement", "", ""],
  ["Particulars", "FY2023", "FY2024"],
  ["Revenue from operations", 24000000, 27600000],
  ["Cost of materials consumed", 14400000, 18000000],
  ["Gross Profit", 9600000, 9600000],
  ["Employee benefit expenses", 4200000, 5000000],
  ["Administrative expenses", 1200000, 1500000],
  ["Depreciation & amortisation", 700000, 550000],
  ["Operating Profit", 3500000, 2550000],
  ["Finance Costs", 260000, 340000],
  ["Profit Before Tax", 3240000, 2210000],
];
const cf = [
  ["Cash Flow Statement", "", ""],
  ["Particulars", "FY2023", "FY2024"],
  ["Net cash from operating activities", 1900000, 1750000],
  ["Investing activities", -1200000, -800000],
  ["Financing activities", -300000, 200000],
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(bs), "Balance Sheet");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pl), "Profit Loss");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cf), "Cash Flow");
XLSX.writeFile(wb, "/tmp/cognifina-e2e/financials.xlsx");

// ---------- 3. invoices.csv ----------
const invRows = [["Invoice No", "Vendor", "Amount"]];
let n = 1001;
const gapsAt = new Set([1013, 1027, 1028]);
for (let i = 0; i < 60; i++) {
  if (gapsAt.has(n)) { n++; continue; }
  invRows.push([`INV-${n}`, `Vendor ${String.fromCharCode(65 + (i % 6))} Services Pvt Ltd`, (5000 + Math.floor(rand() * 90000)).toFixed(2)]);
  n++;
}
writeFileSync("/tmp/cognifina-e2e/invoices.csv", invRows.map((r) => r.join(",")).join("\n"));

// ---------- 4. note.pdf (raw PDF with text lines + aligned numbers) ----------
function makePdf(lines) {
  let content = "BT /F1 11 Tf 14 TL 48 780 Td\n";
  for (const l of lines) {
    content += `(${l.replace(/([()\\])/g, "\\$1")}) Tj T*\n`;
  }
  content += "ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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

const pad = (s, w) => String(s).padEnd(w).slice(0, w);
const num = (v) => v.toLocaleString("en-US");
const noteLines = [
  "ACME HOLDINGS PRIVATE LIMITED - CIN U74999MH2018PTC311234",
  "PAN AACCA1234F   GSTIN 27AACCA1234F1ZV",
  "",
  "Board of Directors : Jane Smith , John Doe",
  "John Doe DIN 08123456",
  "",
  "Ultimate Beneficial Owner : Robert Vale holds 72.4% of Acme Holdings Private Limited",
  "Acme Holdings Private Limited is a wholly-owned subsidiary of Vale Group Limited",
  "Related party transaction: Consulting fees paid to Robert Vale of $420,000 during FY2024",
  "",
  pad("Summary Extract", 34) + pad(num(2023), 14) + num(2024),
  pad("Directors remuneration", 34) + pad(num(380000), 14) + num(800000),
  pad("Consulting fees related party", 34) + pad(num(120000), 14) + num(420000),
  pad("Statutory dues payable", 34) + pad(num(90000), 14) + num(310000),
  // deliberately inconsistent with financials.xlsx (13,150,000) → reconciliation finding
  // (same normalized label "total assets" so the cross-document comparator pairs them)
  pad("Total assets", 34) + pad(num(10000000), 14) + num(12850000),
];
writeFileSync("/tmp/cognifina-e2e/note.pdf", makePdf(noteLines));

console.log("fixtures written to /tmp/cognifina-e2e/");
