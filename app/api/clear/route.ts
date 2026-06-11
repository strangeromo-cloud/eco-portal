import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 清空业务数据：OACT 记录、官员、Concur 报销行、上传批次。
// 保留 Keyword 表（关键字是 seed 数据，不属于用户上传的数据）。
export async function POST() {
  try {
    const [concur, officials, oact, batches] = await prisma.$transaction([
      prisma.concurRow.deleteMany({}),
      prisma.oactOfficial.deleteMany({}),
      prisma.oactRecord.deleteMany({}),
      prisma.uploadBatch.deleteMany({}),
    ]);
    return NextResponse.json({
      ok: true,
      deleted: {
        concurRows: concur.count,
        oactOfficials: officials.count,
        oactRecords: oact.count,
        uploadBatches: batches.count,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "清空失败" },
      { status: 500 }
    );
  }
}
