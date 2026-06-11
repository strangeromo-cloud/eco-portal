import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/db";
import { readWorkbook } from "../lib/readWorkbook";

// 把 Key Words List V7 导入 Keyword 表。
// 列：0 id, 1 keywords, 2 category(Chinese/English/Company), 3 版本信息(之前版本/新增)。

const FILE =
  process.argv[2] ||
  path.resolve(process.cwd(), "Key Words List V7 20240626.ods");

async function main() {
  const wb = readWorkbook(fs.readFileSync(FILE));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  const records: { keyword: string; category: string; version: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const keyword = r[1] == null ? "" : String(r[1]).trim();
    if (!keyword) continue;
    const category = r[2] == null ? "Unknown" : String(r[2]).trim();
    const version = r[3] == null ? "" : String(r[3]).trim();
    records.push({ keyword, category, version });
  }

  await prisma.keyword.deleteMany({});
  await prisma.keyword.createMany({ data: records });

  const total = await prisma.keyword.count();
  console.log(`Seeded ${records.length} keywords from "${path.basename(FILE)}".`);
  console.log(`Keyword table now has ${total} rows.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
