"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fmtUsd, fmtDate } from "@/lib/format";

type Reason = { keyword: string; field: string; category: string };
type Item = {
  econumber: string;
  requestorName: string | null;
  requestorDepartment: string | null;
  courtesyType: string | null;
  startDate: string | null;
  endDate: string | null;
  officialCount: number;
  status: string | null;
  appliedAmount: number;
  reimbursedAmount: number | null;
  remainValue: number | null;
  matched: boolean;
  sensitive: boolean;
  reasons: Reason[];
};

export default function ListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [matched, setMatched] = useState("");
  const [sensitive, setSensitive] = useState("");

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const sp = new URLSearchParams();
      sp.set("page", String(p));
      if (q) sp.set("q", q);
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      if (matched) sp.set("matched", matched);
      if (sensitive) sp.set("sensitive", sensitive);
      const res = await fetch(`/api/records?${sp.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setPage(data.page);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setLoading(false);
    },
    [q, from, to, matched, sensitive]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    load(1);
  }
  function resetFilters() {
    setQ(""); setFrom(""); setTo(""); setMatched(""); setSensitive("");
    setTimeout(() => load(1), 0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">记录列表</h1>
        <span className="text-sm text-slate-500">共 {total} 条</span>
      </div>

      {/* 筛选区 */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Field label="搜索(ECO/姓名/部门)">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="input"
            placeholder="关键词"
          />
        </Field>
        <Field label="起始日期 ≥">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </Field>
        <Field label="起始日期 ≤">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </Field>
        <Field label="是否关联">
          <select value={matched} onChange={(e) => setMatched(e.target.value)} className="input">
            <option value="">全部</option>
            <option value="true">已关联</option>
            <option value="false">未关联</option>
          </select>
        </Field>
        <Field label="是否敏感">
          <select value={sensitive} onChange={(e) => setSensitive(e.target.value)} className="input">
            <option value="">全部</option>
            <option value="true">敏感</option>
            <option value="false">非敏感</option>
          </select>
        </Field>
        <div className="flex gap-2">
          <button onClick={applyFilters} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            筛选
          </button>
          <button onClick={resetFilters} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            重置
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2.5">ECONumber</th>
              <th className="px-3 py-2.5">申请人</th>
              <th className="px-3 py-2.5">类型</th>
              <th className="px-3 py-2.5">起止日期</th>
              <th className="px-3 py-2.5 text-center">官员数</th>
              <th className="px-3 py-2.5 text-right">申请$</th>
              <th className="px-3 py-2.5 text-right">报销$</th>
              <th className="px-3 py-2.5 text-right">Remain$</th>
              <th className="px-3 py-2.5 text-center">关联</th>
              <th className="px-3 py-2.5 text-center">敏感</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">加载中…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">暂无数据，请先在「上传数据」导入 OACT 列表。</td></tr>
            )}
            {!loading && items.map((it) => (
              <tr key={it.econumber} className={it.sensitive ? "bg-red-50" : "hover:bg-slate-50"}>
                <td className="px-3 py-2.5 font-mono text-xs">
                  <Link href={`/records/${it.econumber}`} className="text-blue-600 hover:underline">
                    {it.econumber}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium text-slate-800">{it.requestorName || "—"}</div>
                  <div className="text-xs text-slate-400">{it.requestorDepartment || ""}</div>
                </td>
                <td className="px-3 py-2.5">{it.courtesyType || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {fmtDate(it.startDate)}<br />~ {fmtDate(it.endDate)}
                </td>
                <td className="px-3 py-2.5 text-center">{it.officialCount}</td>
                <td className="px-3 py-2.5 text-right">{fmtUsd(it.appliedAmount)}</td>
                <td className="px-3 py-2.5 text-right">{fmtUsd(it.reimbursedAmount)}</td>
                <td className="px-3 py-2.5 text-right">
                  {it.remainValue == null ? "—" : (
                    <span className={it.remainValue < 0 ? "font-semibold text-red-600" : "text-slate-700"}>
                      {fmtUsd(it.remainValue)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {it.matched ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">已关联</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">未关联</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {it.sensitive ? (
                    <span
                      className="cursor-help rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                      title={it.reasons.map((r) => `${r.keyword}（${r.field} · ${r.category}）`).join("\n")}
                    >
                      敏感 ⚠
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={`/records/${it.econumber}`} className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">第 {page} / {totalPages} 页</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50">
            上一页
          </button>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50">
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}
