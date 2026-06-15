import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { parseOactBuffer } from "../lib/parseOact";

// 生成 "13 Legal Report" 同格式的 mock Concur xlsx。
// - 多对一：部分 ECO 拆成 2~3 张独立报销单（不同 Report ID / 提交人）
// - 孤立单：部分报销单填了 ECO Approval Number 但 OACT 里查无此申请（演示"有单号无 OACT"）
// - 报销提交人(requestor) 可与 OACT 申请人不同

const OACT_FILE =
  process.argv[2] || path.resolve(process.cwd(), "ECO20251113004210350.ods");
const COUNT = parseInt(process.argv[3] || "50", 10);
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

const SENSITIVE_TITLES = ["公安局局长", "税务局科长", "Director of Education Bureau", "检察院检察长", "国税稽查"];
const SENSITIVE_COMPANIES = ["中国银行", "China Construction Bank", "市教育局", "国家电网", "中国石油"];
const SUBMITTERS = [
  { name: "Wei Zhang", email: "wzhang@lenovo.com", title: "Account Manager" },
  { name: "Maria Garcia", email: "mgarcia@lenovo.com", title: "Sales Director" },
  { name: "John Smith", email: "jsmith@lenovo.com", title: "Solution Architect" },
  { name: "Yuki Tanaka", email: "ytanaka@lenovo.com", title: "Channel Sales Exec" },
  { name: "Ahmed Hassan", email: "ahassan@lenovo.com", title: "Pre-sales Engineer" },
  { name: "Li Na", email: "lina@lenovo.com", title: "Client Exec" },
];
const GOV_YES = "Yes-This expense involved or benefitted a Government Official";
const REIM_FACTORS = [0.6, 0.9, 1.0, 1.3, 0.75];

function fixedDate(seed: number, offset = 0): string {
  const day = ((seed + offset) % 27) + 1;
  return `2026-05-${String(day).padStart(2, "0")} 00:00:00`;
}
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const aoa: any[][] = [];

function emitReport(opts: {
  eco: string;
  reportId: string;
  submitter: { name: string; email: string; title: string };
  dept: string;
  usd: number;
  txDate: string;
  purpose: string;
  attendees: { name: string; title: string; company: string }[];
}) {
  const { eco, reportId, submitter, dept, usd, txDate, purpose, attendees } = opts;
  const perAtt = round2(usd / attendees.length);
  const totalReport = round2(usd * 1.4);
  for (const att of attendees) {
    const row = new Array(HEADER.length).fill(null);
    row[0] = "AP";
    row[1] = dept || "Sales";
    row[2] = submitter.name;
    row[3] = totalReport;
    row[4] = submitter.email;
    row[5] = "Regular Employee";
    row[6] = submitter.title;
    row[7] = "Manager, Line";
    row[8] = reportId;
    row[9] = txDate;
    row[10] = txDate;
    row[11] = txDate;
    row[12] = "Entertainment-Non Employee";
    row[13] = GOV_YES;
    row[14] = eco;
    row[15] = att.company;
    row[16] = "Business Guest ; Employee(System) ;";
    row[17] = attendees.length;
    row[18] = att.name;
    row[19] = att.title;
    row[20] = perAtt;
    row[21] = perAtt;
    row[22] = purpose;
    row[23] = `原因/备注：${purpose}`; // Entry Comments (X 列)
    row[24] = "USD";
    row[25] = totalReport;
    row[26] = totalReport;
    row[27] = "City";
    row[28] = txDate;
    row[29] = "Restaurant";
    row[30] = "USD";
    row[31] = usd;
    row[32] = "USD";
    row[33] = usd;
    row[34] = usd; // Approved Amount (USD) —— 费用明细级
    row[35] = "Cash";
    aoa.push(row);
  }
}

function main() {
  const buf = fs.readFileSync(OACT_FILE);
  const oact = parseOactBuffer(buf);
  const allEcoSet = new Set(oact.map((o) => o.econumber));

  const eligible = oact.filter((o) => o.officialCount > 0 && (o.feePerPerson ?? 0) > 0);
  const step = Math.max(1, Math.floor(eligible.length / COUNT));
  const picks: typeof eligible = [];
  for (let i = 0; i < eligible.length && picks.length < COUNT; i += step) picks.push(eligible[i]);

  aoa.push(["Legal Report"]);
  aoa.push(["Parent Expense Type: 02 Meeting/Gift/Entertainment/Department Events"]);
  aoa.push(["Sent for Payment Date UTC+0 from May 1, 2026 and May 15, 2026"]);
  aoa.push(HEADER);

  let multiCount = 0;
  picks.forEach((o, pi) => {
    const applied = (o.feePerPerson ?? 0) * o.officialCount;
    const totalReimb = round2(applied * REIM_FACTORS[pi % REIM_FACTORS.length]);
    // 多对一：约 1/3 的 ECO 拆成 2~3 张报销单
    const nReports = pi % 3 === 0 ? (pi % 6 === 0 ? 3 : 2) : 1;
    if (nReports > 1) multiCount++;
    const per = round2(totalReimb / nReports);

    const seed = parseInt(o.econumber.replace(/\D/g, "").slice(-2) || "1", 10);

    // 参与人 = OACT 官员 + 1 名联想员工
    const baseAttendees = o.officials.map((off, oi) => ({
      name: off.name || `Official ${oi + 1}`,
      title: off.title || "Official",
      company: off.entity || "",
    }));
    if (pi % 2 === 0 && baseAttendees.length) {
      baseAttendees[0] = {
        name: baseAttendees[0].name,
        title: SENSITIVE_TITLES[pi % SENSITIVE_TITLES.length],
        company: SENSITIVE_COMPANIES[pi % SENSITIVE_COMPANIES.length],
      };
    }
    while (baseAttendees.length < 3) baseAttendees.push({ name: `Guest ${baseAttendees.length}`, title: "Manager", company: "" });

    for (let ri = 0; ri < nReports; ri++) {
      const usd = ri === nReports - 1 ? round2(totalReimb - per * (nReports - 1)) : per;
      // 第一张报销单由 OACT 申请人提交，其余由不同员工提交（演示 requestor 不同）
      const submitter =
        ri === 0
          ? { name: o.requestorName || `Employee ${pi}`, email: o.requestorEmail || `emp${pi}@lenovo.com`, title: o.requestorJobTitle || "Sales Rep" }
          : SUBMITTERS[(pi + ri) % SUBMITTERS.length];
      emitReport({
        eco: o.econumber,
        reportId: `MOCK-${pi}-${ri}`,
        submitter,
        dept: o.requestorDepartment || "Sales",
        usd,
        txDate: fixedDate(seed, ri),
        purpose: o.purpose || "Business meeting with client",
        attendees: baseAttendees,
      });
    }
  });

  // 孤立 Concur：填了 ECO 号但 OACT 查无此申请
  let orphan = 0;
  for (let k = 1; orphan < 6 && k < 1000; k++) {
    const eco = `ECO2099${String(k).padStart(8, "0")}`.slice(0, 15);
    if (allEcoSet.has(eco)) continue;
    orphan++;
    const submitter = SUBMITTERS[orphan % SUBMITTERS.length];
    const attendees = [
      { name: `Guest A${orphan}`, title: orphan % 2 === 0 ? "公安局民警" : "Manager", company: orphan % 2 === 0 ? "市公安局" : "Acme Corp" },
      { name: `Guest B${orphan}`, title: "Engineer", company: "Acme Corp" },
      { name: submitter.name, title: submitter.title, company: "Lenovo" },
    ];
    emitReport({
      eco,
      reportId: `ORPHAN-${orphan}`,
      submitter,
      dept: "Sales",
      usd: round2(100 + orphan * 37.5),
      txDate: fixedDate(orphan, 0),
      purpose: "Reimbursement with a Request ID that has no matching OACT request",
      attendees,
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Page1_1");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  XLSX.writeFile(wb, OUT);

  console.log(`Wrote mock Concur: ${OUT}`);
  console.log(`Matched ECOs: ${picks.length} (其中 ${multiCount} 个为多对一/多报销单)`);
  console.log(`Orphan reports (有单号无 OACT): ${orphan}`);
  console.log(`Total data rows: ${aoa.length - 4}`);
}

main();
