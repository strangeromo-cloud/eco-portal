"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtUsd, fmtDate } from "@/lib/format";
import { useT } from "./components/I18nProvider";
import DetailDrawer from "./components/DetailDrawer";

type Reason = { keyword: string; field: string; category: string };
type Item = {
  econumber: string;
  kind: "oact" | "orphan";
  matchStatus: "matched" | "unmatched" | "orphan";
  requestor: string | null;
  requestorDepartment: string | null;
  courtesyType: string | null;
  startDate: string | null;
  endDate: string | null;
  officialCount: number | null;
  concurAttendeeCount: number | null;
  status: string | null;
  appliedAmount: number | null;
  reimbursedAmount: number | null;
  remainValue: number | null;
  reportCount: number;
  sensitive: boolean;
  reasons: Reason[];
};

export default function ListPage() {
  const { t } = useT();
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedEco, setSelectedEco] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [matched, setMatched] = useState("");
  const [sensitive, setSensitive] = useState("");
  const [type, setType] = useState("");
  const [direction, setDirection] = useState("");

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
      if (type) sp.set("type", type);
      if (direction) sp.set("direction", direction);
      const res = await fetch(`/api/records?${sp.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setPage(data.page);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setLoading(false);
    },
    [q, from, to, matched, sensitive, type, direction]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters() {
    load(1);
  }
  function resetFilters() {
    setQ(""); setFrom(""); setTo(""); setMatched(""); setSensitive(""); setType(""); setDirection("");
    setTimeout(() => load(1), 0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-slate-900">{t("list.title")}</h1>
        <span className="text-xs text-slate-400">{t("list.total", { n: total })}</span>
      </div>

      {/* 筛选区 */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Field label={t("f.search")}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="input"
            placeholder={t("f.searchPh")}
          />
        </Field>
        <Field label={t("f.dateFrom")}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </Field>
        <Field label={t("f.dateTo")}>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </Field>
        <Field label={t("f.type")}>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input">
            <option value="">{t("opt.all")}</option>
            <option value="Gift">Gift</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Travel">Travel</option>
          </select>
        </Field>
        <Field label={t("f.direction")}>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className="input">
            <option value="">{t("opt.all")}</option>
            <option value="offering">{t("opt.offering")}</option>
            <option value="receiving">{t("opt.receiving")}</option>
          </select>
        </Field>
        <Field label={t("f.matched")}>
          <select value={matched} onChange={(e) => setMatched(e.target.value)} className="input">
            <option value="">{t("opt.all")}</option>
            <option value="true">{t("opt.matchedYes")}</option>
            <option value="false">{t("opt.matchedNo")}</option>
            <option value="orphan">{t("opt.matchedOrphan")}</option>
          </select>
        </Field>
        <Field label={t("f.sensitive")}>
          <select value={sensitive} onChange={(e) => setSensitive(e.target.value)} className="input">
            <option value="">{t("opt.all")}</option>
            <option value="true">{t("opt.sensYes")}</option>
            <option value="false">{t("opt.sensNo")}</option>
          </select>
        </Field>
        <div className="flex gap-2">
          <button onClick={applyFilters} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t("btn.filter")}
          </button>
          <button onClick={resetFilters} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            {t("btn.reset")}
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2.5">ECONumber</th>
              <th className="px-3 py-2.5">{t("col.requestor")}</th>
              <th className="px-3 py-2.5">{t("col.type")}</th>
              <th className="px-3 py-2.5">{t("col.dates")}</th>
              <th className="whitespace-nowrap px-3 py-2.5 text-center">
                {t("col.officials")}
                <div className="text-[10px] font-normal normal-case">
                  <span className="text-blue-600">OACP</span>
                  <span className="text-slate-400"> / </span>
                  <span className="text-emerald-600">Concur</span>
                </div>
              </th>
              <th className="px-3 py-2.5 text-right">{t("col.applied")}</th>
              <th className="px-3 py-2.5 text-right">{t("col.reimbursed")}</th>
              <th className="px-3 py-2.5 text-right">{t("col.remain")}</th>
              <th className="px-3 py-2.5 text-center">{t("col.matched")}</th>
              <th className="px-3 py-2.5 text-center">{t("col.sensitive")}</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">{t("list.loading")}</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-slate-400">{t("list.empty")}</td></tr>
            )}
            {!loading && items.map((it) => (
              <tr key={it.econumber} className={it.sensitive ? "bg-red-50" : "hover:bg-slate-50"}>
                <td className="px-3 py-2.5 font-mono text-xs">
                  <button onClick={() => setSelectedEco(it.econumber)} className="text-blue-600 hover:underline">
                    {it.econumber}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-slate-800">{it.requestor || "—"}</div>
                  {it.requestorDepartment && <div className="text-xs text-slate-400">{it.requestorDepartment}</div>}
                </td>
                <td className="px-3 py-2.5">{it.courtesyType || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-slate-600">
                  {it.startDate ? (<>{fmtDate(it.startDate)}<br />~ {fmtDate(it.endDate)}</>) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-center">
                  <span className="text-blue-700">{it.officialCount ?? "—"}</span>
                  <span className="text-slate-400"> / </span>
                  <span className="text-emerald-700">{it.concurAttendeeCount ?? "—"}</span>
                </td>
                <td className="px-3 py-2.5 text-right">{fmtUsd(it.appliedAmount)}</td>
                <td className="px-3 py-2.5 text-right">
                  <div>{fmtUsd(it.reimbursedAmount)}</div>
                  {it.reportCount > 0 && (
                    <div
                      className={`mt-0.5 inline-block whitespace-nowrap rounded px-1.5 text-xs ${
                        it.reportCount > 1 ? "bg-blue-100 font-medium text-blue-700" : "text-slate-400"
                      }`}
                    >
                      {t("col.reportsN", { n: it.reportCount })}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {it.remainValue == null ? "—" : (
                    <span className={it.remainValue < 0 ? "font-semibold text-red-600" : "text-slate-700"}>
                      {fmtUsd(it.remainValue)}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-center">
                  {it.matchStatus === "matched" ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{t("badge.matched")}</span>
                  ) : it.matchStatus === "orphan" ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{t("badge.orphan")}</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{t("badge.unmatched")}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-center">
                  {it.sensitive ? (
                    <span
                      className="cursor-help rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                      title={it.reasons.map((r) => `${r.keyword}（${r.field} · ${r.category}）`).join("\n")}
                    >
                      {t("badge.sensitive")}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <button onClick={() => setSelectedEco(it.econumber)} className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                    {t("btn.viewDetail")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{t("page.indicator", { p: page, t: totalPages })}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50">
            {t("btn.prev")}
          </button>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50">
            {t("btn.next")}
          </button>
        </div>
      </div>

      <DetailDrawer econumber={selectedEco} onClose={() => setSelectedEco(null)} />
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
