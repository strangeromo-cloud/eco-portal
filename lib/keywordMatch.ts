// 关键字匹配引擎 —— 被 OACT/Concur 导入流程复用。
// 业务口径（已与用户确认）：在"人员/单位相关字段"上做不区分大小写的子串匹配，
// 命中即标记为风险（敏感人物），并记录"命中关键字 + 所在字段 + 类别"作为判定原因。

export interface KeywordEntry {
  keyword: string;
  category: string; // Chinese | English | Company
}

export interface KeywordMatch {
  keyword: string; // 命中的关键字（原始写法）
  field: string; // 命中所在字段（中文标签）
  category: string;
}

interface CompiledEntry {
  raw: string;
  norm: string; // trim + lowercase
  category: string;
}

export interface CompiledKeywords {
  entries: CompiledEntry[];
}

const cjkRe = /[一-鿿]/;

/**
 * 预编译关键字表。去掉空词、按 norm 去重（关键字表里有大量重复）。
 * excludeShortNoise=true 时丢弃过短/过泛的噪音词（中文单字、≤5 长度的纯英文词，
 * 如 所/局/政/核/bank/state）。默认 false —— 全部保留（按用户选择）。
 */
export function compileKeywords(
  list: KeywordEntry[],
  opts?: { excludeShortNoise?: boolean }
): CompiledKeywords {
  const exclude = opts?.excludeShortNoise ?? false;
  const seen = new Set<string>();
  const entries: CompiledEntry[] = [];
  for (const k of list) {
    const raw = (k.keyword ?? "").trim();
    const norm = raw.toLowerCase();
    if (!norm) continue;
    if (seen.has(norm)) continue;
    if (exclude && isNoise(norm)) continue;
    seen.add(norm);
    entries.push({ raw, norm, category: k.category });
  }
  return { entries };
}

function isNoise(norm: string): boolean {
  const hasCjk = cjkRe.test(norm);
  if (hasCjk) return norm.length <= 1; // 中文单字
  return /^[a-z ]+$/.test(norm) && norm.replace(/\s/g, "").length <= 5; // 过泛英文词
}

/**
 * 在给定字段集合上扫描关键字。fields 为 [{field: 字段标签, value: 文本}]。
 * 返回去重后的命中列表（同一 关键字+字段 只记一次）。
 */
export function scanFields(
  fields: { field: string; value?: string | null }[],
  compiled: CompiledKeywords
): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const seen = new Set<string>();
  for (const f of fields) {
    const v = (f.value ?? "").toString().trim();
    if (!v) continue;
    const hay = v.toLowerCase();
    for (const e of compiled.entries) {
      if (hay.includes(e.norm)) {
        const dedupKey = `${e.norm}@@${f.field}`;
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);
        matches.push({ keyword: e.raw, field: f.field, category: e.category });
      }
    }
  }
  return matches;
}
