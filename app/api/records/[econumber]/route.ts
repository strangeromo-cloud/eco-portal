import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildAggregate, parseReasons, mergeReasons } from "@/lib/aggregate";
import { computeReimbursed } from "@/lib/amounts";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { econumber: string } }
) {
  const econumber = decodeURIComponent(params.econumber);

  const oact = await prisma.oactRecord.findUnique({
    where: { econumber },
    include: { officials: { orderBy: { seq: "asc" } } },
  });
  const concurRows = await prisma.concurRow.findMany({
    where: { ecoApprovalNumber: econumber },
    orderBy: [{ reportId: "asc" }, { id: "asc" }],
  });

  if (!oact && concurRows.length === 0) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  const concurOut = concurRows.map((c) => ({ ...c, reasons: parseReasons(c.matchedKeywords) }));

  // 孤立 Concur：有单号但 OACT 查无此申请
  if (!oact) {
    const reimbursed = computeReimbursed(concurRows);
    const entryKeys = new Set(
      concurRows.map((c) => `${c.reportId ?? ""}|${c.transactionDate ? c.transactionDate.toISOString() : ""}|${c.approvedUsd ?? 0}`)
    );
    const concurSensitive = concurRows.some((c) => c.isSensitive);
    return NextResponse.json({
      oact: null,
      econumber,
      concurRows: concurOut,
      aggregate: {
        matched: false,
        orphan: true,
        reportCount: entryKeys.size,
        appliedAmount: null,
        reimbursedAmount: reimbursed,
        remainValue: null,
        oactSensitive: false,
        concurSensitive,
        sensitive: concurSensitive,
        reasons: mergeReasons(concurRows.flatMap((c) => parseReasons(c.matchedKeywords))),
      },
    });
  }

  const agg = buildAggregate(oact, concurRows);

  return NextResponse.json({
    oact: {
      ...oact,
      reasons: parseReasons(oact.matchedKeywords),
      officials: oact.officials.map((o) => ({ ...o, reasons: parseReasons(o.matchedKeywords) })),
    },
    concurRows: concurOut,
    aggregate: { ...agg, orphan: false },
  });
}
