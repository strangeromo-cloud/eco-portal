import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { parseOactBuffer } from "../lib/parseOact";

// 生成一份 "13 Legal Report" 同格式的 mock Concur xlsx。
// ECO Approval Number 取自真实 OACT 的 ECONumber（保证能关联），
// 报销金额围绕 applied(=fee×官员数) 上下浮动以产生正/负/零的 remain，
// 并对部分参与人注入敏感关键字（Title/Company）以演示风险标记。

const OACT_FILE =
  process.argv[2] ||
  path.resolve(process.cwd(), "ECO20251113004210350.ods");
const OUT = path.resolve(process.cwd(), "mock", "mock-concur.xlsx");

const HEADER = [
  "Region", "Employee Group", "Employee", "Approved Amount in USD per Employee",
  "Employee E-mail Address", "Employee Type", "Employee Title", "Worker's Manager",
  "Report ID", "Transaction Date", "Accounting Approved Date", "Sent for Payment Date  UTC+0",
  "Expense Type", "Government Officials(Yes/No)", "ECO Approval Number", "Company (Attendee)",
  "Attendee Type (Group)", "Number of Attendees", "Attendee Name", "Attendee Title",
  "Attendee Approved Amount (Reimbursement Currency)", "Attendee Approved Amount (USD)",
  "Business Purpose", "Entry Comments", "Reimbursement Currency", "Total Report Amount",
  "Total Report Amount (USD)", "City of Purchase", "Activity Date", "Activity Site",
  "Transaction Currency", "Transaction Amount", "Reimbursement Currency",
  "Approved Amount (Reimbursement Currency)", "Approved Amount (USD)", "Payment Type",
];

const SENSITIVE_TITLES = [
  "公安局局长", "税务局科长", "Director of Education Bureau", "检察院检察长", "国税稽查",
];
const SENSITIVE_COMPANIES = [
  "中国银行", "China Construction Bank", "市教育局", "国家电网", "中国石油",
];
const GOV_YES = "Yes-This expense involved or benefitted a Government Official";
const REIM_FACTORS = [0.6, 0.9, 1.0, 1.3, 0.75]; // 产生正/负/零 remain

function fixedDate(eco: string, offset = 0): string {
  // 基于 ECO 号末位生成确定性日期（避免使用 Date.now）
  const tail = parseInt(eco.replace(/\D/g, "").slice(-2) || "1", 10);
  const day = ((tail + offset) % 27) + 1;
  return `2026-05-${String(day).padStart(2, "0")} 00:00:00`;
}

function main() {
  const buf = fs.readFileSync(OACT_FILE);
  const oact = parseOactBuffer(buf);

  // 选取有官员且有 fee 的记录。数量可由命令行第 2 个参数 / MOCK_COUNT 指定（默认 80）。
  // 跨整个文件均匀抽样，保证类型/官员数/金额更有多样性。
  const COUNT = parseInt(process.argv[3] || process.env.MOCK_COUNT || "80", 10);
  const eligible = oact.filter(
    (o) => o.officialCount > 0 && (o.feePerPerson ?? 0) > 0
  );
  const step = Math.max(1, Math.floor(eligible.length / COUNT));
  const picks: typeof eligible = [];
  for (let i = 0; i < eligible.length && picks.length < COUNT; i += step) {
    picks.push(eligible[i]);
  }

  const aoa: any[][] = [];
  aoa.push(["Legal Report"]);
  aoa.push(["Parent Expense Type: 02 Meeting/Gift/Entertainment/Department Events"]);
  aoa.push(["Sent for Payment Date UTC+0 from May 1, 2026 and May 15, 2026"]);
  aoa.push(HEADER);

  picks.forEach((o, pi) => {
    const applied = (o.feePerPerson ?? 0) * o.officialCount;
    const factor = REIM_FACTORS[pi % REIM_FACTORS.length];
    // 第 0 条拆成两笔费用明细，演示"按明细去重求和"
    const entries =
      pi === 0
        ? [
            { reportId: `MOCK-${pi}-A`, usd: round2(applied * 0.6), off: 0 },
            { reportId: `MOCK-${pi}-B`, usd: round2(applied * 0.3), off: 3 },
          ]
        : [{ reportId: `MOCK-${pi}`, usd: round2(applied * factor), off: 0 }];

    const empName = o.requestorName || `Employee ${pi}`;
    const empEmail = o.requestorEmail || `emp${pi}@lenovo.com`;
    const empTitle = o.requestorJobTitle || "Sales Rep";

    for (const entry of entries) {
      // 参与人 = OACT 官员名 + 申请人；至少 3 人
      const attendees: { name: string; title: string; company: string }[] = [];
      o.officials.forEach((off, oi) => {
        attendees.push({
          name: off.name || `Official ${oi + 1}`,
          title: off.title || "Official",
          company: off.entity || "",
        });
      });
      attendees.push({ name: empName, title: empTitle, company: "Lenovo" });
      while (attendees.length < 3) {
        attendees.push({ name: `Guest ${attendees.length}`, title: "Manager", company: "" });
      }

      // 对偶数序号的 ECO 注入敏感关键字
      if (pi % 2 === 0) {
        attendees[0].title = SENSITIVE_TITLES[pi % SENSITIVE_TITLES.length];
        attendees[0].company = SENSITIVE_COMPANIES[pi % SENSITIVE_COMPANIES.length];
      }

      const perAtt = round2(entry.usd / attendees.length);
      const totalReport = round2(entry.usd * 1.4);
      const txDate = fixedDate(o.econumber, entry.off);

      attendees.forEach((att) => {
        const row = new Array(HEADER.length).fill(null);
        row[0] = "AP";
        row[1] = o.requestorDepartment || "Sales";
        row[2] = empName;
        row[3] = round2(totalReport);
        row[4] = empEmail;
        row[5] = "Regular Employee";
        row[6] = empTitle;
        row[7] = "Manager, Line";
        row[8] = entry.reportId;
        row[9] = txDate;
        row[10] = txDate;
        row[11] = txDate;
        row[12] = "Entertainment-Non Employee";
        row[13] = GOV_YES;
        row[14] = o.econumber;
        row[15] = att.company;
        row[16] = "Business Guest ; Employee(System) ;";
        row[17] = attendees.length;
        row[18] = att.name;
        row[19] = att.title;
        row[20] = perAtt;
        row[21] = perAtt;
        row[22] = o.purpose || "Business meeting with client";
        row[23] = "";
        row[24] = "USD";
        row[25] = totalReport;
        row[26] = totalReport;
        row[27] = "City";
        row[28] = txDate;
        row[29] = "Restaurant";
        row[30] = "USD";
        row[31] = entry.usd;
        row[32] = "USD";
        row[33] = entry.usd;
        row[34] = entry.usd; // Approved Amount (USD) —— 费用明细级
        row[35] = "Cash";
        aoa.push(row);
      });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Page1_1");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  XLSX.writeFile(wb, OUT);

  console.log(`Wrote mock Concur: ${OUT}`);
  console.log(`ECOs: ${picks.length}, data rows: ${aoa.length - 4}`);
  console.log(`Matched ECO numbers: ${picks.map((p) => p.econumber).join(", ")}`);
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

main();
