import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { parseOactBuffer } from "../lib/parseOact";

// 生成 "13 Legal Report" 同格式的 mock Concur xlsx。
// 口径（已与用户确认）：每一行 = 一笔独立费用，金额各自相加(不去重)。
// - 每个 ECO 造 1~3 笔（行），部分 ECO 的多笔共用同一个 Report ID（演示"同单号多笔仍分别显示并相加"）
// - 含 6 笔孤立单（有 ECO 号但 OACP 查无）；提交人多样；部分注入敏感关键字

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

function fixedDate(seed: number, offset = 0): string {
  const day = ((seed + offset) % 27) + 1;
  return `2026-05-${String(day).padStart(2, "0")} 00:00:00`;
}
function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const aoa: any[][] = [];

// 发一行 = 一笔独立费用（单个参与人）
function emitRow(o: {
  eco: string; reportId: string;
  submitter: { name: string; email: string; title: string }; dept: string;
  usd: number; txDate: string; purpose: string; comments: string;
  attendee: { name: string; title: string; company: string };
}) {
  const row = new Array(HEADER.length).fill(null);
  row[0] = "AP"; row[1] = o.dept; row[2] = o.submitter.name; row[3] = o.usd;
  row[4] = o.submitter.email; row[5] = "Regular Employee"; row[6] = o.submitter.title; row[7] = "Manager, Line";
  row[8] = o.reportId; row[9] = o.txDate; row[10] = o.txDate; row[11] = o.txDate;
  row[12] = "Entertainment-Non Employee"; row[13] = GOV_YES; row[14] = o.eco;
  row[15] = o.attendee.company; row[16] = "Business Guest ; Employee(System) ;"; row[17] = 1;
  row[18] = o.attendee.name; row[19] = o.attendee.title; row[20] = o.usd; row[21] = o.usd;
  row[22] = o.purpose; row[23] = o.comments; row[24] = "USD"; row[25] = o.usd; row[26] = o.usd;
  row[27] = "City"; row[28] = o.txDate; row[29] = "Restaurant"; row[30] = "USD"; row[31] = o.usd;
  row[32] = "USD"; row[33] = o.usd; row[34] = o.usd; row[35] = "Cash";
  aoa.push(row);
}

function main() {
  const oact = parseOactBuffer(fs.readFileSync(OACT_FILE));
  const allEcoSet = new Set(oact.map((o) => o.econumber));

  const eligible = oact.filter((o) => o.officialCount > 0 && (o.feePerPerson ?? 0) > 0);
  const step = Math.max(1, Math.floor(eligible.length / COUNT));
  const picks: typeof eligible = [];
  for (let i = 0; i < eligible.length && picks.length < COUNT; i += step) picks.push(eligible[i]);

  aoa.push(["Legal Report"]);
  aoa.push(["Parent Expense Type: 02 Meeting/Gift/Entertainment/Department Events"]);
  aoa.push(["Sent for Payment Date UTC+0 from May 1, 2026 and May 15, 2026"]);
  aoa.push(HEADER);

  let multi = 0;
  let totalRows = 0;
  picks.forEach((o, pi) => {
    const applied = (o.feePerPerson ?? 0) * o.officialCount;
    const nRows = pi % 3 === 0 ? (pi % 6 === 0 ? 3 : 2) : 1; // 1~3 笔
    if (nRows > 1) multi++;
    const sharedReport = pi % 4 === 0; // 部分 ECO 的多笔共用一个 Report ID
    const seed = parseInt(o.econumber.replace(/\D/g, "").slice(-2) || "1", 10);

    for (let j = 0; j < nRows; j++) {
      totalRows++;
      const reportId = sharedReport ? `MOCK-${pi}` : `MOCK-${pi}-${j}`;
      const usd = round2(applied * (0.35 + 0.2 * j)); // 每笔金额不同
      const submitter =
        j === 0
          ? { name: o.requestorName || `Employee ${pi}`, email: o.requestorEmail || `emp${pi}@lenovo.com`, title: o.requestorJobTitle || "Sales Rep" }
          : SUBMITTERS[(pi + j) % SUBMITTERS.length];
      const off = o.officials[j % Math.max(o.officials.length, 1)] || { name: "Official", title: "Official", entity: "" };
      let attendee = { name: off.name || `Official ${j + 1}`, title: off.title || "Official", company: off.entity || "" };
      if (pi % 2 === 0 && j === 0) {
        attendee = { name: attendee.name, title: SENSITIVE_TITLES[pi % SENSITIVE_TITLES.length], company: SENSITIVE_COMPANIES[pi % SENSITIVE_COMPANIES.length] };
      }
      emitRow({
        eco: o.econumber, reportId, submitter, dept: o.requestorDepartment || "Sales",
        usd, txDate: fixedDate(seed, j), purpose: o.purpose || "Business meeting with client",
        comments: `原因/备注：${o.purpose || "Business meeting with client"}`, attendee,
      });
    }
  });

  // 孤立单（有 ECO 号但 OACP 查无）
  let orphan = 0;
  for (let k = 1; orphan < 6 && k < 1000; k++) {
    const eco = `ECO2099${String(k).padStart(8, "0")}`.slice(0, 15);
    if (allEcoSet.has(eco)) continue;
    orphan++;
    totalRows++;
    const submitter = SUBMITTERS[orphan % SUBMITTERS.length];
    const sens = orphan % 2 === 0;
    emitRow({
      eco, reportId: `ORPHAN-${orphan}`, submitter, dept: "Sales",
      usd: round2(100 + orphan * 37.5), txDate: fixedDate(orphan, 0),
      purpose: "Reimbursement with a Request ID that has no matching OACP request",
      comments: "无匹配 OACP 的报销单",
      attendee: { name: `Guest ${orphan}`, title: sens ? "公安局民警" : "Manager", company: sens ? "市公安局" : "Acme Corp" },
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Page1_1");
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  XLSX.writeFile(wb, OUT);

  console.log(`Wrote mock Concur: ${OUT}`);
  console.log(`Matched ECOs: ${picks.length}（其中 ${multi} 个多笔）`);
  console.log(`Orphan rows: ${orphan}`);
  console.log(`Total data rows (每行=一笔): ${totalRows}`);
}

main();
