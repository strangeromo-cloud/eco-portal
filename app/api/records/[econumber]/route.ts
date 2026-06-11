import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildAggregate, parseReasons } from "@/lib/aggregate";

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
  if (!oact) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  const concurRows = await prisma.concurRow.findMany({
    where: { ecoApprovalNumber: econumber },
    orderBy: [{ reportId: "asc" }, { id: "asc" }],
  });

  const agg = buildAggregate(oact, concurRows);

  return NextResponse.json({
    oact: {
      ...oact,
      reasons: parseReasons(oact.matchedKeywords),
      officials: oact.officials.map((o) => ({
        ...o,
        reasons: parseReasons(o.matchedKeywords),
      })),
    },
    concurRows: concurRows.map((c) => ({
      ...c,
      reasons: parseReasons(c.matchedKeywords),
    })),
    aggregate: agg,
  });
}
