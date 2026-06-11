"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtUsd, fmtDate } from "@/lib/format";

type Reason = { keyword: string; field: string; category: string };

export default function DetailPage({
  params,
}: {
  params: { econumber: string };
}) {
  const { econumber } = params;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/records/${encodeURIComponent(econumber)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setData(d) : setError(d.error || "加载失败")))
      .catch((e) => setError(String(e)));
  }, [econumber]);

  if (error)
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-md bg-red-50 px-4 py-3 text-red-700">{error}</div>
      </div>
    );
  if (!data) return <div className="text-slate-400">加载中…</div>;

  const { oact, concurRows, aggregate } = data;

  return (
    <div className="space-y-5">
      <BackLink />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-lg font-semibold text-slate-900">
          {oact.econumber}
        </h1>
        {aggregate.matched ? (
          <Badge color="emerald">已关联 Concur</Badge>
        ) : (
          <Badge color="slate">未关联</Badge>
        )}
        {aggregate.sensitive && <Badge color="red">敏感人物 ⚠</Badge>}
      </div>

      {/* 金额摘要 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="申请金额 (fee × 官员数)" value={fmtUsd(aggregate.appliedAmount)} />
        <SummaryCard
          label="报销金额 (按明细去重和)"
          value={aggregate.matched ? fmtUsd(aggregate.reimbursedAmount) : "—"}
          sub={aggregate.matched ? `${aggregate.reportCount} 笔费用明细` : "无报销"}
        />
        <SummaryCard
          label="Remain Value (申请 − 报销)"
          value={aggregate.matched ? fmtUsd(aggregate.remainValue) : "—"}
          highlight={aggregate.matched && aggregate.remainValue < 0 ? "red" : "blue"}
        />
      </div>

      {/* 敏感原因汇总 */}
      {aggregate.sensitive && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="font-medium text-red-800">敏感人物判定原因</div>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {(aggregate.reasons as Reason[]).map((r, i) => (
              <li key={i}>
                命中关键字 <b>「{r.keyword}」</b>
                <span className="text-red-500">
                  （字段：{r.field} · 类别：{r.category}）
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 左右对照 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 左：OACT */}
        <Panel title="OACT 申请信息" tone="blue">
          <KV k="ECONumber" v={oact.econumber} mono />
          <KV k="申请人" v={oact.requestorName} />
          <KV k="申请人职位" v={oact.requestorJobTitle} />
          <KV k="部门" v={oact.requestorDepartment} />
          <KV k="邮箱" v={oact.requestorEmail} />
          <KV k="类型" v={oact.courtesyType} />
          <KV k="起始 / 结束" v={`${fmtDate(oact.startDate)} ~ ${fmtDate(oact.endDate)}`} />
          <KV k="提议人 / 职务" v={`${oact.proposerName || "—"} / ${oact.proposerTitle || "—"}`} />
          <KV k="每人费用" v={fmtUsd(oact.feePerPerson)} />
          <KV k="官员人数" v={String(oact.officialCount)} />
          <KV k="申请金额" v={fmtUsd(oact.appliedAmount)} />
          <KV k="Status" v={oact.status} />
          <KV k="用途" v={oact.purpose} />
          <KV k="描述/逐项金额" v={oact.itemizedDesc} />

          <div className="mt-4">
            <div className="mb-1.5 text-xs font-semibold uppercase text-slate-500">
              政府官员（{oact.officials.length}）
            </div>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">姓名</th>
                    <th className="px-2 py-1.5">所在实体</th>
                    <th className="px-2 py-1.5">职务</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {oact.officials.map((o: any) => (
                    <tr key={o.seq} className={o.isSensitive ? "bg-red-50" : ""}>
                      <td className="px-2 py-1.5 text-slate-400">{o.seq}</td>
                      <td className="px-2 py-1.5">{o.name || "—"}</td>
                      <td className="px-2 py-1.5">{o.entity || "—"}</td>
                      <td className="px-2 py-1.5">
                        {o.title || "—"}
                        {o.isSensitive && (
                          <SensTag reasons={o.reasons as Reason[]} />
                        )}
                      </td>
                    </tr>
                  ))}
                  {oact.officials.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-3 text-center text-slate-400">无</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {/* 右：Concur */}
        <Panel title="Concur 报销信息" tone="emerald">
          {!aggregate.matched ? (
            <div className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
              尚无关联的 Concur 报销记录
            </div>
          ) : (
            <ConcurView rows={concurRows} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function ConcurView({ rows }: { rows: any[] }) {
  // 按费用明细(reportId+date+approvedUsd)分组展示
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const k = `${r.reportId ?? ""}|${r.transactionDate ?? ""}|${r.approvedUsd ?? 0}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return (
    <div className="space-y-4">
      {Array.from(groups.values()).map((g, gi) => {
        const head = g[0];
        return (
          <div key={gi} className="rounded-md border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span>报销人：<b>{head.employee || "—"}</b></span>
                <span>Report ID：<span className="font-mono">{head.reportId || "—"}</span></span>
                <span>交易日期：{fmtDate(head.transactionDate)}</span>
                <span>费用类型：{head.expenseType || "—"}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4">
                <span>明细核准金额：<b>{fmtUsd(head.approvedUsd)}</b></span>
                <span>报告总额：{fmtUsd(head.totalReportUsd)}</span>
              </div>
              {head.businessPurpose && (
                <div className="mt-1 text-slate-500">用途：{head.businessPurpose}</div>
              )}
            </div>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">参与人</th>
                  <th className="px-2 py-1.5">职务</th>
                  <th className="px-2 py-1.5">单位</th>
                  <th className="px-2 py-1.5 text-right">人均$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {g.map((r: any) => (
                  <tr key={r.id} className={r.isSensitive ? "bg-red-50" : ""}>
                    <td className="px-2 py-1.5">{r.attendeeName || "—"}</td>
                    <td className="px-2 py-1.5">
                      {r.attendeeTitle || "—"}
                      {r.isSensitive && <SensTag reasons={r.reasons as Reason[]} />}
                    </td>
                    <td className="px-2 py-1.5">{r.companyAttendee || "—"}</td>
                    <td className="px-2 py-1.5 text-right">{fmtUsd(r.attendeeApprovedUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function SensTag({ reasons }: { reasons: Reason[] }) {
  return (
    <span
      className="ml-1.5 cursor-help rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
      title={reasons.map((r) => `${r.keyword}（${r.field} · ${r.category}）`).join("\n")}
    >
      敏感
    </span>
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "blue" | "emerald";
  children: React.ReactNode;
}) {
  const bar = tone === "blue" ? "bg-blue-600" : "bg-emerald-600";
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`${bar} px-4 py-2.5 text-sm font-semibold text-white`}>
        {title}
      </div>
      <div className="space-y-1.5 p-4">{children}</div>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: any; mono?: boolean }) {
  return (
    <div className="flex gap-3 border-b border-slate-50 py-1 text-sm last:border-0">
      <div className="w-32 shrink-0 text-slate-500">{k}</div>
      <div className={`flex-1 break-words text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>
        {v == null || v === "" ? "—" : String(v)}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "red" | "blue";
}) {
  const color =
    highlight === "red"
      ? "text-red-600"
      : highlight === "blue"
      ? "text-blue-700"
      : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Badge({
  color,
  children,
}: {
  color: "emerald" | "slate" | "red";
  children: React.ReactNode;
}) {
  const map = {
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function BackLink() {
  return (
    <Link href="/" className="text-sm text-blue-600 hover:underline">
      ← 返回列表
    </Link>
  );
}
