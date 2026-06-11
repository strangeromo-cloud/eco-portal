import { computeReimbursed, remainValue } from "./amounts";
import type { KeywordMatch } from "./keywordMatch";

// 把一条 OACT 记录与其关联的 Concur 行聚合成"统一视图"。
// 被列表、详情、Concur 上传结果复用，保证口径一致。

export interface ConcurRowLike {
  ecoApprovalNumber: string | null;
  reportId: string | null;
  transactionDate: Date | null;
  approvedUsd: number | null;
  isSensitive: boolean;
  matchedKeywords: string | null;
}

export interface OactLike {
  econumber: string;
  appliedAmount: number;
  isSensitive: boolean;
  matchedKeywords: string | null;
}

export interface RecordAggregate {
  matched: boolean;
  reportCount: number; // 去重后的费用明细笔数
  appliedAmount: number;
  reimbursedAmount: number;
  remainValue: number;
  oactSensitive: boolean;
  concurSensitive: boolean;
  sensitive: boolean; // 任一侧命中
  reasons: KeywordMatch[]; // 合并去重后的判定原因
}

export function buildAggregate(
  oact: OactLike,
  concurRows: ConcurRowLike[]
): RecordAggregate {
  const matched = concurRows.length > 0;
  const reimbursedAmount = computeReimbursed(concurRows);
  const concurSensitive = concurRows.some((r) => r.isSensitive);

  // 去重的费用明细数（与 computeReimbursed 同口径）
  const entryKeys = new Set(
    concurRows.map(
      (r) =>
        `${r.reportId ?? ""}|${
          r.transactionDate ? r.transactionDate.toISOString() : ""
        }|${r.approvedUsd ?? 0}`
    )
  );

  const reasons = mergeReasons([
    ...parseReasons(oact.matchedKeywords),
    ...concurRows.flatMap((r) => parseReasons(r.matchedKeywords)),
  ]);

  return {
    matched,
    reportCount: matched ? entryKeys.size : 0,
    appliedAmount: oact.appliedAmount,
    reimbursedAmount,
    remainValue: remainValue(oact.appliedAmount, reimbursedAmount),
    oactSensitive: oact.isSensitive,
    concurSensitive,
    sensitive: oact.isSensitive || concurSensitive,
    reasons,
  };
}

export function parseReasons(json: string | null | undefined): KeywordMatch[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function mergeReasons(list: KeywordMatch[]): KeywordMatch[] {
  const seen = new Set<string>();
  const out: KeywordMatch[] = [];
  for (const m of list) {
    const k = `${m.keyword}@@${m.field}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
  }
  return out;
}
