import * as XLSX from "xlsx";
import { readWorkbook } from "./readWorkbook";

// 按"列位置"解析 OACT 列表（.ods / .xlsx）。
// 表头第 1 行，数据从第 2 行。官员区 col 12..56：固定 3 列一组 × 最多 15 人
// (Name, 所在实体名, Official title)。第 6–15 人 title 列表头是乱码，所以必须按位置取。

export const OACT_COL = {
  econumber: 0,
  requestorItcode: 1,
  requestorName: 2,
  requestorEmail: 3,
  requestorJobTitle: 4,
  requestorDepartment: 5,
  courtesyType: 6,
  startDate: 7,
  endDate: 8,
  proposedBy: 9,
  proposerName: 10,
  proposerTitle: 11,
  officialsStart: 12, // 12..56
  lenovoProduct: 57,
  itemizedDesc: 58,
  feePerPerson: 59,
  pendingTenders: 60,
  pendingDesc: 61,
  purpose: 65,
  status: 70,
} as const;

export const MAX_OFFICIALS = 15;

export interface ParsedOfficial {
  seq: number;
  name: string | null;
  entity: string | null;
  title: string | null;
}

export interface ParsedOact {
  econumber: string;
  requestorItcode: string | null;
  requestorName: string | null;
  requestorEmail: string | null;
  requestorJobTitle: string | null;
  requestorDepartment: string | null;
  courtesyType: string | null;
  startDate: Date | null;
  endDate: Date | null;
  proposedBy: string | null;
  proposerName: string | null;
  proposerTitle: string | null;
  feePerPerson: number | null;
  itemizedDesc: string | null;
  purpose: string | null;
  status: string | null;
  officials: ParsedOfficial[];
  officialCount: number;
  rawJson: string;
}

export function parseOactBuffer(buf: Buffer): ParsedOact[] {
  const wb = readWorkbook(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => (h == null ? "" : String(h)));
  const out: ParsedOact[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const econumber = str(r[OACT_COL.econumber]);
    if (!econumber) continue; // 跳过空行

    const officials: ParsedOfficial[] = [];
    for (let k = 0; k < MAX_OFFICIALS; k++) {
      const base = OACT_COL.officialsStart + k * 3;
      const name = str(r[base]);
      const entity = str(r[base + 1]);
      const title = str(r[base + 2]);
      if (!name && !entity && !title) continue; // 三者全空则跳过
      officials.push({ seq: k + 1, name, entity, title });
    }

    // rawJson：完整 header→value 映射，供详情/未来扩展
    const rawObj: Record<string, any> = {};
    for (let c = 0; c < header.length; c++) {
      const v = r[c];
      rawObj[header[c] || `col${c}`] = v instanceof Date ? v.toISOString() : v;
    }

    out.push({
      econumber,
      requestorItcode: str(r[OACT_COL.requestorItcode]),
      requestorName: str(r[OACT_COL.requestorName]),
      requestorEmail: str(r[OACT_COL.requestorEmail]),
      requestorJobTitle: str(r[OACT_COL.requestorJobTitle]),
      requestorDepartment: str(r[OACT_COL.requestorDepartment]),
      courtesyType: str(r[OACT_COL.courtesyType]),
      startDate: toDate(r[OACT_COL.startDate]),
      endDate: toDate(r[OACT_COL.endDate]),
      proposedBy: str(r[OACT_COL.proposedBy]),
      proposerName: str(r[OACT_COL.proposerName]),
      proposerTitle: str(r[OACT_COL.proposerTitle]),
      feePerPerson: toNum(r[OACT_COL.feePerPerson]),
      itemizedDesc: str(r[OACT_COL.itemizedDesc]),
      purpose: str(r[OACT_COL.purpose]),
      status: str(r[OACT_COL.status]),
      officials,
      officialCount: officials.length,
      rawJson: JSON.stringify(rawObj),
    });
  }
  return out;
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
