import * as XLSX from "xlsx";
import { readWorkbook } from "./readWorkbook";

// 解析 Concur 导出（"13 Legal Report" 格式）。
// 前若干行是标题/元信息，真正的表头行包含 "Report ID" 与 "ECO Approval Number"。
// 数据粒度 = 每条费用明细的每个参与人一行。默认只保留 ECO Approval Number 非空的行
// （仅这些行能与 OACT 关联，也正是涉及政府官员的合规相关行）。

export interface ParsedConcur {
  ecoApprovalNumber: string | null;
  reportId: string | null;
  employee: string | null;
  employeeEmail: string | null;
  employeeTitle: string | null;
  expenseType: string | null;
  govOfficial: boolean;
  attendeeName: string | null;
  attendeeTitle: string | null;
  companyAttendee: string | null;
  attendeeApprovedUsd: number | null;
  approvedUsd: number | null;
  totalReportUsd: number | null;
  reimbursementCurrency: string | null;
  transactionDate: Date | null;
  businessPurpose: string | null;
  rawJson: string;
}

const WANT = {
  ecoApprovalNumber: "ECO Approval Number",
  reportId: "Report ID",
  employee: "Employee",
  employeeEmail: "Employee E-mail Address",
  employeeTitle: "Employee Title",
  expenseType: "Expense Type",
  govOfficial: "Government Officials(Yes/No)",
  attendeeName: "Attendee Name",
  attendeeTitle: "Attendee Title",
  companyAttendee: "Company (Attendee)",
  attendeeApprovedUsd: "Attendee Approved Amount (USD)",
  approvedUsd: "Approved Amount (USD)",
  totalReportUsd: "Total Report Amount (USD)",
  reimbursementCurrency: "Reimbursement Currency",
  transactionDate: "Transaction Date",
  businessPurpose: "Business Purpose",
} as const;

export function parseConcurBuffer(
  buf: Buffer,
  opts?: { onlyWithEco?: boolean }
): ParsedConcur[] {
  const onlyWithEco = opts?.onlyWithEco ?? true;
  const wb = readWorkbook(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const headerRowIdx = findHeaderRow(rows);
  if (headerRowIdx < 0) return [];
  const header = rows[headerRowIdx].map((h) => (h == null ? "" : String(h).trim()));
  const idx = buildIndex(header);

  const out: ParsedConcur[] = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const eco = pick(r, idx.ecoApprovalNumber, str);
    if (onlyWithEco && !eco) continue;
    // 跳过完全空行
    if (!eco && !pick(r, idx.reportId, str) && !pick(r, idx.attendeeName, str)) continue;

    const rawObj: Record<string, any> = {};
    for (let c = 0; c < header.length; c++) {
      const v = r[c];
      rawObj[header[c] || `col${c}`] = v instanceof Date ? v.toISOString() : v;
    }

    out.push({
      ecoApprovalNumber: eco,
      reportId: pick(r, idx.reportId, str),
      employee: pick(r, idx.employee, str),
      employeeEmail: pick(r, idx.employeeEmail, str),
      employeeTitle: pick(r, idx.employeeTitle, str),
      expenseType: pick(r, idx.expenseType, str),
      govOfficial: /^yes/i.test(pick(r, idx.govOfficial, str) ?? ""),
      attendeeName: pick(r, idx.attendeeName, str),
      attendeeTitle: pick(r, idx.attendeeTitle, str),
      companyAttendee: pick(r, idx.companyAttendee, str),
      attendeeApprovedUsd: pick(r, idx.attendeeApprovedUsd, toNum),
      approvedUsd: pick(r, idx.approvedUsd, toNum),
      totalReportUsd: pick(r, idx.totalReportUsd, toNum),
      reimbursementCurrency: pick(r, idx.reimbursementCurrency, str),
      transactionDate: pick(r, idx.transactionDate, toDate),
      businessPurpose: pick(r, idx.businessPurpose, str),
      rawJson: JSON.stringify(rawObj),
    });
  }
  return out;
}

function findHeaderRow(rows: any[][]): number {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map((c) => (c == null ? "" : String(c).trim()));
    if (cells.includes("Report ID") && cells.includes("ECO Approval Number")) {
      return i;
    }
  }
  return -1;
}

type IndexMap = Record<keyof typeof WANT, number>;

function buildIndex(header: string[]): IndexMap {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const map = new Map<string, number>();
  header.forEach((h, i) => {
    if (h && !map.has(norm(h))) map.set(norm(h), i);
  });
  const out = {} as IndexMap;
  (Object.keys(WANT) as (keyof typeof WANT)[]).forEach((k) => {
    out[k] = map.get(norm(WANT[k])) ?? -1;
  });
  return out;
}

function pick<T>(row: any[], i: number, conv: (v: any) => T): T {
  return conv(i >= 0 ? row[i] : null);
}

function str(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function toNum(v: any): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function toDate(v: any): Date | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}
