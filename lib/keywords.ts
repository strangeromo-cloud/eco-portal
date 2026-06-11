import { prisma } from "./db";
import { compileKeywords, CompiledKeywords } from "./keywordMatch";

// 从数据库加载并编译关键字表。默认保留短噪音词（excludeShortNoise=false）。
export async function loadCompiledKeywords(
  excludeShortNoise = false
): Promise<CompiledKeywords> {
  const kws = await prisma.keyword.findMany({
    select: { keyword: true, category: true },
  });
  return compileKeywords(kws, { excludeShortNoise });
}
