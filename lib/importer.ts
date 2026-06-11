import { prisma } from "./db";
import { parseOactBuffer } from "./parseOact";
import { parseConcurBuffer } from "./parseConcur";
import { loadCompiledKeywords } from "./keywords";
import { scanFields, KeywordMatch } from "./keywordMatch";
import { computeApplied } from "./amounts";
import { buildAggregate, mergeReasons } from "./aggregate";

// ===== OACT 导入：按 econumber(requestID) upsert，重传则 update =====
export async function importOact(buf: Buffer, filename: string) {
  const records = parseOactBuffer(buf);
  const compiled = await loadCompiledKeywords();

  const batch = await prisma.uploadBatch.create({
    data: { type: "OACT", filename, rowCount: records.length },
  });

  let created = 0;
  let updated = 0;
  let sensitiveCount = 0;

  for (const r of records) {
    // 逐官员匹配
    const officialMatches: KeywordMatch[][] = r.officials.map((o) =>
      scanFields(
        [
          { field: "官员实体(所在实体名)", value: o.entity },
          { field: "官员职务(Official title)", value: o.title },
        ],
        compiled
      )
    );
    // 提议人职务（记录级）
    const proposerMatches = scanFields(
      [{ field: "提议人职务", value: r.proposerTitle }],
      compiled
    );
    const recordReasons = mergeReasons([
      ...officialMatches.flat(),
      ...proposerMatches,
    ]);
    const isSensitive = recordReasons.length > 0;
    if (isSensitive) sensitiveCount++;

    const appliedAmount = computeApplied(r.feePerPerson, r.officialCount);

    const data = {
      requestorItcode: r.requestorItcode,
      requestorName: r.requestorName,
      requestorEmail: r.requestorEmail,
      requestorJobTitle: r.requestorJobTitle,
      requestorDepartment: r.requestorDepartment,
      courtesyType: r.courtesyType,
      startDate: r.startDate,
      endDate: r.endDate,
      proposedBy: r.proposedBy,
      proposerName: r.proposerName,
      proposerTitle: r.proposerTitle,
      feePerPerson: r.feePerPerson,
      officialCount: r.officialCount,
      appliedAmount,
      itemizedDesc: r.itemizedDesc,
      purpose: r.purpose,
      status: r.status,
      isSensitive,
      matchedKeywords: JSON.stringify(recordReasons),
      uploadBatchId: batch.id,
      rawJson: r.rawJson,
    };

    const existing = await prisma.oactRecord.findUnique({
      where: { econumber: r.econumber },
      select: { id: true },
    });

    const rec = await prisma.oactRecord.upsert({
      where: { econumber: r.econumber },
      create: { econumber: r.econumber, ...data },
      update: data,
    });
    if (existing) updated++;
    else created++;

    // 重建官员明细（满足重传 update 语义）
    await prisma.oactOfficial.deleteMany({ where: { oactRecordId: rec.id } });
    if (r.officials.length) {
      await prisma.oactOfficial.createMany({
        data: r.officials.map((o, i) => ({
          oactRecordId: rec.id,
          seq: o.seq,
          name: o.name,
          entity: o.entity,
          title: o.title,
          isSensitive: officialMatches[i].length > 0,
          matchedKeywords: JSON.stringify(officialMatches[i]),
        })),
      });
    }
  }

  return {
    type: "OACT" as const,
    filename,
    total: records.length,
    created,
    updated,
    sensitiveCount,
  };
}

// ===== Concur 导入：入库 + 按 ecoApprovalNumber 关联 OACT =====
export async function importConcur(buf: Buffer, filename: string) {
  const rows = parseConcurBuffer(buf, { onlyWithEco: true });
  const compiled = await loadCompiledKeywords();

  const batch = await prisma.uploadBatch.create({
    data: { type: "CONCUR", filename, rowCount: rows.length },
  });

  for (const row of rows) {
    const matches = scanFields(
      [
        { field: "参与人职务(Attendee Title)", value: row.attendeeTitle },
        { field: "参与人单位(Company)", value: row.companyAttendee },
      ],
      compiled
    );
    await prisma.concurRow.create({
      data: {
        ecoApprovalNumber: row.ecoApprovalNumber,
        reportId: row.reportId,
        employee: row.employee,
        employeeEmail: row.employeeEmail,
        employeeTitle: row.employeeTitle,
        expenseType: row.expenseType,
        govOfficial: row.govOfficial,
        attendeeName: row.attendeeName,
        attendeeTitle: row.attendeeTitle,
        companyAttendee: row.companyAttendee,
        attendeeApprovedUsd: row.attendeeApprovedUsd,
        approvedUsd: row.approvedUsd,
        totalReportUsd: row.totalReportUsd,
        reimbursementCurrency: row.reimbursementCurrency,
        transactionDate: row.transactionDate,
        businessPurpose: row.businessPurpose,
        isSensitive: matches.length > 0,
        matchedKeywords: JSON.stringify(matches),
        uploadBatchId: batch.id,
      },
    });
  }

  // 关联结果：按本次上传出现的 ECO 号聚合
  const ecoSet = Array.from(
    new Set(rows.map((r) => r.ecoApprovalNumber).filter(Boolean) as string[])
  );

  const matchedList = [];
  for (const eco of ecoSet) {
    const oact = await prisma.oactRecord.findUnique({
      where: { econumber: eco },
    });
    const concurRows = await prisma.concurRow.findMany({
      where: { ecoApprovalNumber: eco },
      select: {
        ecoApprovalNumber: true,
        reportId: true,
        transactionDate: true,
        approvedUsd: true,
        isSensitive: true,
        matchedKeywords: true,
      },
    });
    if (oact) {
      const agg = buildAggregate(oact, concurRows);
      matchedList.push({
        econumber: eco,
        matched: true,
        requestorName: oact.requestorName,
        courtesyType: oact.courtesyType,
        appliedAmount: agg.appliedAmount,
        reimbursedAmount: agg.reimbursedAmount,
        remainValue: agg.remainValue,
        sensitive: agg.sensitive,
        reasons: agg.reasons,
      });
    } else {
      matchedList.push({
        econumber: eco,
        matched: false,
        requestorName: null,
        courtesyType: null,
        appliedAmount: null,
        reimbursedAmount: null,
        remainValue: null,
        sensitive: concurRows.some((r) => r.isSensitive),
        reasons: [],
      });
    }
  }

  matchedList.sort((a, b) => Number(b.sensitive) - Number(a.sensitive));

  return {
    type: "CONCUR" as const,
    filename,
    rowCount: rows.length,
    ecoCount: ecoSet.length,
    matchedCount: matchedList.filter((m) => m.matched).length,
    unmatchedCount: matchedList.filter((m) => !m.matched).length,
    matchedList,
  };
}
