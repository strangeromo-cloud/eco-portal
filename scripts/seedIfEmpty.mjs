// 运行时启动钩子：若 Keyword 表为空，则从关键字 ODS 灌入。
// 只依赖生产依赖（@prisma/client / xlsx / fflate），不需要 tsx。
// 幂等：表里已有数据则跳过；文件缺失或出错都不阻断启动。
import { PrismaClient } from "@prisma/client";
import XLSX from "xlsx";
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import fs from "fs";

const FILE = process.env.KEYWORDS_FILE || "Key Words List V7 20240626.ods";
const prisma = new PrismaClient();

// 与 lib/readWorkbook.ts 相同：把 ODS 里 value-type="error" 的单元格降级，避免 SheetJS 崩溃
function readWb(buf) {
  let input = buf;
  if (buf.length > 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    try {
      const files = unzipSync(new Uint8Array(buf));
      if (files["content.xml"]) {
        let xml = strFromU8(files["content.xml"]);
        if (xml.includes('value-type="error"')) {
          xml = xml
            .replace(/office:value-type="error"/g, 'office:value-type="string"')
            .replace(/calcext:value-type="error"/g, 'calcext:value-type="string"');
          files["content.xml"] = strToU8(xml);
          input = Buffer.from(zipSync(files));
        }
      }
    } catch {
      input = buf;
    }
  }
  return XLSX.read(input, { type: "buffer" });
}

async function main() {
  const count = await prisma.keyword.count();
  if (count > 0) {
    console.log(`[seed] 关键字已存在 (${count} 条)，跳过`);
    return;
  }
  if (!fs.existsSync(FILE)) {
    console.warn(`[seed] 未找到关键字文件: ${FILE}，跳过（可稍后手动 seed）`);
    return;
  }
  const wb = readWb(fs.readFileSync(FILE));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const k = rows[i][1] == null ? "" : String(rows[i][1]).trim();
    if (!k) continue;
    data.push({
      keyword: k,
      category: rows[i][2] == null ? "Unknown" : String(rows[i][2]).trim(),
      version: rows[i][3] == null ? "" : String(rows[i][3]).trim(),
    });
  }
  await prisma.keyword.createMany({ data });
  console.log(`[seed] 已导入 ${data.length} 条关键字`);
}

main()
  .catch((e) => console.error("[seed] 出错（不阻断启动）:", e?.message || e))
  .finally(() => prisma.$disconnect());
