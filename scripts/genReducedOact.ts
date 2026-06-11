import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { readWorkbook } from "../lib/readWorkbook";

// 从完整 OACT 列表里截取前 N 条，生成一份"精简版"OACT（保留全部 71 列与表头）。
// 用法：tsx scripts/genReducedOact.ts [源文件] [条数]   默认 250 条。
const SRC =
  process.argv[2] || path.resolve(process.cwd(), "ECO20251113004210350.ods");
const COUNT = parseInt(process.argv[3] || "250", 10);
const OUT = path.resolve(process.cwd(), "mock", "oact-sample.xlsx");

function main() {
  const wb = readWorkbook(fs.readFileSync(SRC));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  const header = rows[0];
  const dataRows: any[][] = [];
  for (let i = 1; i < rows.length && dataRows.length < COUNT; i++) {
    const econ = rows[i][0];
    if (econ == null || String(econ).trim() === "") continue; // 跳过空行
    dataRows.push(rows[i]);
  }

  const aoa = [header, ...dataRows];
  const outWs = XLSX.utils.aoa_to_sheet(aoa);
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, outWs, "Table");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  XLSX.writeFile(outWb, OUT);

  console.log(`Wrote reduced OACT: ${OUT}`);
  console.log(`Records: ${dataRows.length}`);
  console.log(`First/last ECONumber: ${dataRows[0][0]} ... ${dataRows[dataRows.length - 1][0]}`);
}

main();
