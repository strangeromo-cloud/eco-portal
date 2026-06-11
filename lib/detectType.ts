import * as XLSX from "xlsx";
import { readWorkbook } from "./readWorkbook";

export type UploadType = "OACT" | "CONCUR" | "UNKNOWN";

// 根据列特征自动识别上传文件类型。
// OACT：第 1 行表头含 "ECONumber"。
// Concur：前若干行存在同时含 "Report ID" 与 "ECO Approval Number" 的表头行。
export function detectType(buf: Buffer): UploadType {
  const wb = readWorkbook(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map((c) => (c == null ? "" : String(c).trim()));
    if (cells.includes("ECONumber")) return "OACT";
    if (cells.includes("Report ID") && cells.includes("ECO Approval Number")) {
      return "CONCUR";
    }
  }
  return "UNKNOWN";
}
