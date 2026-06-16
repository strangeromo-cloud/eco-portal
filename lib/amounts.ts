// 金额口径 —— 单点封装，业务若调整定义只改这里。
// 已确认口径：
//   申请金额 appliedAmount = feePerPerson(OACT col59) × 政府官员人数(officialCount)
//   报销金额 reimbursedAmount(每个 ECO) = 按"费用明细"去重后的 Approved Amount(USD)(col34) 之和
//     （去掉参与人扇出造成的重复；明细键 = reportId + transactionDate + approvedUsd）
//   remain value = appliedAmount − reimbursedAmount

export function computeApplied(
  feePerPerson: number | null | undefined,
  officialCount: number
): number {
  const fee = feePerPerson ?? 0;
  return round2(fee * (officialCount || 0));
}

export interface ConcurAmountRow {
  reportId?: string | null;
  transactionDate?: Date | string | null;
  approvedUsd?: number | null;
}

// 每行 = 一笔独立费用：所有行的 USD 金额直接相加，不去重。
export function computeReimbursed(rows: ConcurAmountRow[]): number {
  let total = 0;
  for (const r of rows) total += r.approvedUsd ?? 0;
  return round2(total);
}

export function remainValue(applied: number, reimbursed: number): number {
  return round2(applied - reimbursed);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
