import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeReimbursed, remainValue } from "@/lib/amounts";
import { parseReasons, mergeReasons } from "@/lib/aggregate";

export const runtime = "nodejs";

// 列表 = OACT 记录 ∪ 孤立 Concur（有 ECO 号但 OACT 查无此申请）。
// 数据量为内部工具规模，过滤/排序/分页在内存完成，逻辑更清晰。
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(5, parseInt(sp.get("pageSize") || "20", 10)));
  const from = sp.get("from");
  const to = sp.get("to");
  const matched = sp.get("matched"); // true | false | orphan
  const sensitive = sp.get("sensitive"); // true | false
  const type = sp.get("type")?.trim();
  const q = sp.get("q")?.trim()?.toLowerCase();

  const oactRecords = await prisma.oactRecord.findMany({
    select: {
      econumber: true, requestorName: true, requestorDepartment: true,
      courtesyType: true, startDate: true, endDate: true, officialCount: true,
      status: true, appliedAmount: true, isSensitive: true, matchedKeywords: true,
    },
  });
  const oactEcoSet = new Set(oactRecords.map((r) => r.econumber));

  const concur = await prisma.concurRow.findMany({
    where: { ecoApprovalNumber: { not: null } },
    select: {
      ecoApprovalNumber: true, reportId: true, transactionDate: true, approvedUsd: true,
      isSensitive: true, matchedKeywords: true, employee: true, expenseType: true,
      attendeeName: true,
    },
  });
  const byEco = new Map<string, typeof concur>();
  for (const c of concur) {
    const k = c.ecoApprovalNumber as string;
    if (!byEco.has(k)) byEco.set(k, []);
    byEco.get(k)!.push(c);
  }

  type Item = {
    econumber: string; kind: "oact" | "orphan"; matchStatus: "matched" | "unmatched" | "orphan";
    requestor: string | null; requestorDepartment: string | null; courtesyType: string | null;
    startDate: Date | null; endDate: Date | null; officialCount: number | null; status: string | null;
    appliedAmount: number | null; reimbursedAmount: number | null; remainValue: number | null;
    reportCount: number; concurAttendeeCount: number | null; sensitive: boolean; reasons: any[];
  };

  const countReports = (rows: typeof concur) =>
    new Set(rows.map((x) => x.reportId).filter(Boolean)).size;
  const countAttendees = (rows: typeof concur) =>
    new Set(rows.map((x) => x.attendeeName).filter(Boolean)).size;

  const items: Item[] = [];

  // OACT 行
  for (const r of oactRecords) {
    const rows = byEco.get(r.econumber) ?? [];
    const matchedHas = rows.length > 0;
    const reimbursed = computeReimbursed(rows);
    const concurSensitive = rows.some((x) => x.isSensitive);
    const reasons = mergeReasons([
      ...parseReasons(r.matchedKeywords),
      ...rows.flatMap((x) => parseReasons(x.matchedKeywords)),
    ]);
    items.push({
      econumber: r.econumber, kind: "oact",
      matchStatus: matchedHas ? "matched" : "unmatched",
      requestor: r.requestorName, requestorDepartment: r.requestorDepartment,
      courtesyType: r.courtesyType, startDate: r.startDate, endDate: r.endDate,
      officialCount: r.officialCount, status: r.status,
      appliedAmount: r.appliedAmount,
      reimbursedAmount: matchedHas ? reimbursed : null,
      remainValue: matchedHas ? remainValue(r.appliedAmount, reimbursed) : null,
      reportCount: countReports(rows),
      concurAttendeeCount: matchedHas ? countAttendees(rows) : null,
      sensitive: r.isSensitive || concurSensitive,
      reasons,
    });
  }

  // 孤立 Concur 行（ECO 号不在 OACT 中）
  for (const [eco, rows] of byEco.entries()) {
    if (oactEcoSet.has(eco)) continue;
    const reimbursed = computeReimbursed(rows);
    const reasons = mergeReasons(rows.flatMap((x) => parseReasons(x.matchedKeywords)));
    items.push({
      econumber: eco, kind: "orphan", matchStatus: "orphan",
      requestor: rows[0]?.employee ?? null, requestorDepartment: null,
      courtesyType: rows[0]?.expenseType ?? null, startDate: null, endDate: null,
      officialCount: null, status: null,
      appliedAmount: null, reimbursedAmount: reimbursed, remainValue: null,
      reportCount: countReports(rows),
      concurAttendeeCount: countAttendees(rows),
      sensitive: rows.some((x) => x.isSensitive), reasons,
    });
  }

  // 过滤
  let filtered = items;
  if (q)
    filtered = filtered.filter(
      (i) =>
        i.econumber.toLowerCase().includes(q) ||
        (i.requestor ?? "").toLowerCase().includes(q) ||
        (i.requestorDepartment ?? "").toLowerCase().includes(q)
    );
  if (from) {
    const f = new Date(from).getTime();
    filtered = filtered.filter((i) => i.startDate && i.startDate.getTime() >= f);
  }
  if (to) {
    const tEnd = new Date(to); tEnd.setHours(23, 59, 59, 999);
    filtered = filtered.filter((i) => i.startDate && i.startDate.getTime() <= tEnd.getTime());
  }
  if (type)
    filtered = filtered.filter((i) => (i.courtesyType ?? "").toLowerCase().includes(type.toLowerCase()));
  if (matched === "true") filtered = filtered.filter((i) => i.matchStatus === "matched");
  else if (matched === "false") filtered = filtered.filter((i) => i.matchStatus === "unmatched");
  else if (matched === "orphan") filtered = filtered.filter((i) => i.matchStatus === "orphan");
  if (sensitive === "true") filtered = filtered.filter((i) => i.sensitive);
  else if (sensitive === "false") filtered = filtered.filter((i) => !i.sensitive);

  // 排序：起始日期倒序（孤立单无日期，排最后）
  filtered.sort((a, b) => {
    const ad = a.startDate ? a.startDate.getTime() : -Infinity;
    const bd = b.startDate ? b.startDate.getTime() : -Infinity;
    if (ad !== bd) return bd - ad;
    return a.econumber < b.econumber ? 1 : -1;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    page, pageSize, total,
    totalPages: Math.ceil(total / pageSize),
    items: pageItems,
  });
}
