import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildAggregate } from "@/lib/aggregate";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(5, parseInt(sp.get("pageSize") || "20", 10)));
  const from = sp.get("from");
  const to = sp.get("to");
  const matched = sp.get("matched"); // "true" | "false" | null
  const sensitive = sp.get("sensitive"); // "true" | "false" | null
  const type = sp.get("type")?.trim(); // Gift | Entertainment | Travel（按子串匹配组合类型）
  const q = sp.get("q")?.trim();

  // 关联/敏感是基于 econumber↔ecoApprovalNumber 的派生集合，先取出小集合
  const matchedRows = await prisma.concurRow.groupBy({
    by: ["ecoApprovalNumber"],
    where: { ecoApprovalNumber: { not: null } },
  });
  const matchedEcos = matchedRows
    .map((r) => r.ecoApprovalNumber)
    .filter(Boolean) as string[];

  const concurSensRows = await prisma.concurRow.groupBy({
    by: ["ecoApprovalNumber"],
    where: { ecoApprovalNumber: { not: null }, isSensitive: true },
  });
  const concurSensEcos = concurSensRows
    .map((r) => r.ecoApprovalNumber)
    .filter(Boolean) as string[];

  const and: any[] = [];
  if (from) and.push({ startDate: { gte: new Date(from) } });
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    and.push({ startDate: { lte: end } });
  }
  if (q) {
    and.push({
      OR: [
        { econumber: { contains: q } },
        { requestorName: { contains: q } },
        { requestorDepartment: { contains: q } },
      ],
    });
  }
  if (type) and.push({ courtesyType: { contains: type } });
  if (matched === "true") and.push({ econumber: { in: matchedEcos } });
  if (matched === "false") and.push({ econumber: { notIn: matchedEcos } });
  if (sensitive === "true") {
    and.push({
      OR: [{ isSensitive: true }, { econumber: { in: concurSensEcos } }],
    });
  }
  if (sensitive === "false") {
    and.push({ isSensitive: false });
    and.push({ econumber: { notIn: concurSensEcos } });
  }
  const where = and.length ? { AND: and } : {};

  const total = await prisma.oactRecord.count({ where });
  const records = await prisma.oactRecord.findMany({
    where,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // 取本页 econumber 对应的 Concur 行，聚合金额/敏感
  const ecos = records.map((r) => r.econumber);
  const concur = await prisma.concurRow.findMany({
    where: { ecoApprovalNumber: { in: ecos } },
    select: {
      ecoApprovalNumber: true,
      reportId: true,
      transactionDate: true,
      approvedUsd: true,
      isSensitive: true,
      matchedKeywords: true,
    },
  });
  const byEco = new Map<string, typeof concur>();
  for (const c of concur) {
    const k = c.ecoApprovalNumber as string;
    if (!byEco.has(k)) byEco.set(k, []);
    byEco.get(k)!.push(c);
  }

  const items = records.map((r) => {
    const agg = buildAggregate(r, byEco.get(r.econumber) ?? []);
    return {
      econumber: r.econumber,
      requestorName: r.requestorName,
      requestorDepartment: r.requestorDepartment,
      courtesyType: r.courtesyType,
      startDate: r.startDate,
      endDate: r.endDate,
      officialCount: r.officialCount,
      status: r.status,
      appliedAmount: agg.appliedAmount,
      reimbursedAmount: agg.matched ? agg.reimbursedAmount : null,
      remainValue: agg.matched ? agg.remainValue : null,
      matched: agg.matched,
      sensitive: agg.sensitive,
      reasons: agg.reasons,
    };
  });

  return NextResponse.json({
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    items,
  });
}
