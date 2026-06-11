# ECO 合规核查平台

礼品/招待/差旅合规核查平台：打通 **OACT**（申请）与 **Concur**（报销）两套系统的数据，
按 `ECONumber` ↔ `ECO Approval Number` 关联，计算剩余金额，并按业务关键字标记敏感人物（风险）。

## 功能

1. **上传入库**：上传 OACT 列表（.ods/.xlsx）→ 按 `ECONumber`（requestID 主键）upsert，重复上传按主键更新；上传 Concur 导出（"13 Legal Report" 格式）→ 入库并按 ECO 号自动关联。
2. **剩余金额**：`remain value = 申请金额 − 报销金额`
   - 申请金额 = `每人费用(fee per person) × 政府官员人数`
   - 报销金额 = 按"费用明细"去重后的 `Approved Amount (USD)` 之和（去掉参与人扇出重复）
3. **清晰展现**：把混乱的 OACT 原始表（尤其是参与人员/职位）结构化展示。
4. **敏感人物核查**：按 `Key Words List V7` 在人员/单位字段做子串匹配，命中即标风险，并展示"命中关键字 + 所在字段 + 类别"判定原因。

## 技术栈

Next.js 14 (App Router, TS) · Prisma · SQLite · SheetJS(xlsx) · Tailwind CSS

## 快速开始

```bash
npm install
npx prisma migrate dev            # 建库
npm run seed:keywords             # 导入 Key Words List V7（默认读取项目根目录的 .ods）
npm run gen:mock                  # 生成 mock Concur（ECO 号对齐真实 OACT，含敏感样本）
npm run dev                       # 启动，访问 http://localhost:3000
```

在 `/upload` 先上传 `ECO20251113004210350.ods`，再上传 `mock/mock-concur.xlsx`，
然后在 `/` 查看关联列表，点「查看详情」进入左右对照页。

## 关键代码

| 路径 | 说明 |
| --- | --- |
| `lib/readWorkbook.ts` | 统一读取入口；修复部分 ODS 含 `value-type="error"` 导致 SheetJS 解析失败 |
| `lib/parseOact.ts` | 按**列位置**解析 OACT（官员区 col 12..56，3 列一组×15） |
| `lib/parseConcur.ts` | 解析 "13 Legal Report"（动态定位表头，默认只取含 ECO 号的行） |
| `lib/keywordMatch.ts` | 关键字匹配引擎；`excludeShortNoise` 开关预留短噪音词降噪 |
| `lib/amounts.ts` | 金额口径单点封装（applied / reimbursed / remain） |
| `lib/importer.ts` | OACT upsert-by-econumber、Concur 导入+关联 |
| `app/api/*` | 上传、列表（筛选/分页）、详情接口 |

## 可调项

- 金额口径：改 `lib/amounts.ts` 一处即可。
- 关键字降噪：`lib/keywords.ts` 调用 `loadCompiledKeywords(true)` 可过滤过短/过泛词。
- 大文件（真实 Concur 5w+ 行）：默认只导入含 `ECO Approval Number` 的行，见 `parseConcurBuffer({ onlyWithEco })`。
