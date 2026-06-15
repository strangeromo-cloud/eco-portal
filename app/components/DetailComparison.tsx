"use client";

import { fmtUsd, fmtDate } from "@/lib/format";
import { computeReimbursed } from "@/lib/amounts";
import { useT } from "./I18nProvider";

type Reason = { keyword: string; field: string; category: string };

// OACT 申请 与 Concur 报销 放在同一张表的两列里逐项对比。
// 支持三种情形：正常关联 / OACT 无报销 / 孤立 Concur（无 OACT，oact 为 null）。
export default function DetailComparison({ data }: { data: any }) {
  const { t } = useT();
  const oact = data.oact; // 可能为 null（孤立 Concur）
  const concurRows = data.concurRows || [];
  const aggregate = data.aggregate;
  const hasOact = !!oact;
  const hasConcur = concurRows.length > 0;
  const isOrphan = !hasOact;
  const dash = "—";
  const econumber = oact?.econumber ?? data.econumber;

  const c0 = concurRows[0] || {};
  const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));
  const expenseType = uniq(concurRows.map((r: any) => r.expenseType)).join(", ");
  const txDates = uniq(concurRows.map((r: any) => fmtDate(r.transactionDate))).join(", ");
  const purposes = uniq(concurRows.map((r: any) => r.businessPurpose)).join("; ");

  // 去重参与人（同名同职位合并），保留敏感标记与原因
  const attMap = new Map<string, any>();
  for (const r of concurRows) {
    const name = r.attendeeName || "—";
    const key = `${name}|${r.attendeeTitle || ""}`;
    const ex = attMap.get(key);
    if (!ex)
      attMap.set(key, { name, title: r.attendeeTitle, sub: r.companyAttendee, isSensitive: r.isSensitive, reasons: r.reasons || [] });
    else if (r.isSensitive) {
      ex.isSensitive = true;
      ex.reasons = [...ex.reasons, ...(r.reasons || [])];
    }
  }
  const attendees = Array.from(attMap.values());

  // 报销单明细（多对一时 = 多张报销单）
  const reportMap = new Map<string, any[]>();
  for (const r of concurRows) {
    const k = r.reportId || "—";
    if (!reportMap.has(k)) reportMap.set(k, []);
    reportMap.get(k)!.push(r);
  }
  const reports = Array.from(reportMap.entries()).map(([reportId, rs]) => ({
    reportId,
    employee: rs[0].employee,
    date: rs[0].transactionDate,
    amount: computeReimbursed(rs),
  }));

  const officials = hasOact
    ? (oact.officials || []).map((o: any) => ({ name: o.name, title: o.title, sub: o.entity, isSensitive: o.isSensitive, reasons: o.reasons || [] }))
    : [];

  const oc = (v: React.ReactNode) => (hasOact ? v : dash); // OACT 列值
  const cc = (v: React.ReactNode) => (hasConcur ? v : dash); // Concur 列值

  const rows: { label: string; oact: React.ReactNode; concur: React.ReactNode; mono?: boolean }[] = [
    { label: t("cmp.id"), oact: oc(oact?.econumber), concur: cc(c0.ecoApprovalNumber || econumber), mono: true },
    { label: t("cmp.person"), oact: oc(oact?.requestorName), concur: cc(c0.employee) },
    { label: t("cmp.title"), oact: oc(oact?.requestorJobTitle), concur: cc(c0.employeeTitle) },
    { label: t("cmp.dept"), oact: oc(oact?.requestorDepartment), concur: dash },
    { label: t("cmp.type"), oact: oc(oact?.courtesyType), concur: cc(expenseType) },
    { label: t("cmp.date"), oact: oc(`${fmtDate(oact?.startDate)} ~ ${fmtDate(oact?.endDate)}`), concur: cc(txDates) },
    {
      label: t("cmp.applied") + " / " + t("cmp.reimbursed"),
      oact: oc(<span className="font-semibold">{fmtUsd(aggregate.appliedAmount)}</span>),
      concur: cc(<span className="font-semibold">{fmtUsd(aggregate.reimbursedAmount)}</span>),
    },
    { label: t("cmp.purpose"), oact: oc(oact?.purpose), concur: cc(purposes) },
  ];

  return (
    <div className="space-y-4">
      {/* 标题 + 状态 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-slate-900">{econumber}</span>
        {isOrphan ? (
          <Badge c="amber">{t("badge.orphan")}</Badge>
        ) : hasConcur ? (
          <Badge c="emerald">{t("d.matchedConcur")}</Badge>
        ) : (
          <Badge c="slate">{t("d.unmatched")}</Badge>
        )}
        {aggregate.sensitive && <Badge c="red">{t("d.sensPerson")}</Badge>}
      </div>

      {/* 金额摘要 */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("cmp.applied")} value={hasOact ? fmtUsd(aggregate.appliedAmount) : dash} />
        <Stat label={t("cmp.reimbursed")} value={hasConcur ? fmtUsd(aggregate.reimbursedAmount) : dash} />
        <Stat
          label="Remain"
          value={hasOact && hasConcur ? fmtUsd(aggregate.remainValue) : dash}
          color={hasOact && hasConcur && aggregate.remainValue < 0 ? "text-red-600" : "text-blue-700"}
        />
      </div>

      {/* 敏感原因 */}
      {aggregate.sensitive && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
          <div className="font-medium text-red-800">{t("d.reasonTitle")}</div>
          <ul className="mt-1 space-y-0.5 text-red-700">
            {(aggregate.reasons as Reason[]).map((r, i) => (
              <li key={i}>{t("d.reasonFmt", { kw: r.keyword, field: r.field, cat: r.category })}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 对比表 */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-left text-xs">
            <tr className="divide-x divide-slate-300">
              <th className="w-20 px-3 py-2 font-medium text-slate-500">{t("cmp.field")}</th>
              <th className="bg-blue-50/60 px-3 py-2 font-semibold text-blue-700">{t("cmp.colOact")}</th>
              <th className="bg-emerald-50/60 px-3 py-2 font-semibold text-emerald-700">{t("cmp.colConcur")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r, i) => (
              <tr key={i} className="divide-x divide-slate-200 align-top">
                <td className="bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-500">{r.label}</td>
                <td className={`break-words px-3 py-2 text-slate-800 ${r.mono ? "font-mono text-xs" : ""}`}>{val(r.oact)}</td>
                <td className={`break-words px-3 py-2 text-slate-800 ${r.mono ? "font-mono text-xs" : ""}`}>{val(r.concur)}</td>
              </tr>
            ))}
            {/* 参与人员对比 */}
            <tr className="divide-x divide-slate-200 align-top">
              <td className="bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-500">{t("cmp.participants")}</td>
              <td className="px-3 py-2">{hasOact ? <PeopleList people={officials} empty={t("d.none")} /> : dash}</td>
              <td className="px-3 py-2">{hasConcur ? <PeopleList people={attendees} empty={t("d.none")} /> : dash}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 报销单明细（多对一：一个 OACT 申请对应多张 Concur 报销单） */}
      {hasConcur && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase text-slate-500">
            {t("cmp.reports")}（{reports.length}）
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t("cmp.reportId")}</th>
                  <th className="px-3 py-2">{t("cmp.submitter")}</th>
                  <th className="px-3 py-2">{t("cmp.date")}</th>
                  <th className="px-3 py-2 text-right">{t("cmp.amount")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-xs">{r.reportId}</td>
                    <td className="px-3 py-2">{r.employee || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.date)}</td>
                    <td className="px-3 py-2 text-right">{fmtUsd(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function val(v: React.ReactNode) {
  return v === null || v === undefined || v === "" ? "—" : v;
}

function PeopleList({ people, empty }: { people: any[]; empty: string }) {
  const { t } = useT();
  if (!people.length) return <span className="text-slate-400">{empty}</span>;
  return (
    <ul className="space-y-1">
      {people.map((p, i) => {
        const kws = ((p.reasons as Reason[]) || []).map((r) => r.keyword);
        return (
          <li key={i} className={`rounded px-1.5 py-1 ${p.isSensitive ? "bg-red-50" : ""}`}>
            <div className="text-sm text-slate-800">
              {hl(p.name || "—", kws)}
              {p.isSensitive && (
                <span
                  className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
                  title={(p.reasons as Reason[]).map((r) => `${r.keyword}（${r.field} · ${r.category}）`).join("\n")}
                >
                  {t("tag.sensitive")}
                </span>
              )}
            </div>
            {(p.title || p.sub) && (
              <div className="text-xs text-slate-500">{hl([p.title, p.sub].filter(Boolean).join(" · "), kws)}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// 把文本中命中的关键字子串标红（不区分大小写，处理重叠命中）。
function hl(text: string | null | undefined, keywords: string[]): React.ReactNode {
  if (!text) return text;
  const lower = text.toLowerCase();
  const mark = new Array(text.length).fill(false);
  for (const raw of keywords) {
    const kw = (raw || "").trim().toLowerCase();
    if (!kw) continue;
    let idx = lower.indexOf(kw);
    while (idx !== -1) {
      for (let i = idx; i < idx + kw.length; i++) mark[i] = true;
      idx = lower.indexOf(kw, idx + 1);
    }
  }
  if (!mark.some(Boolean)) return text;
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i;
    const on = mark[i];
    while (i < text.length && mark[i] === on) i++;
    const seg = text.slice(start, i);
    parts.push(
      on ? (
        <span key={start} className="rounded bg-red-100 px-0.5 font-semibold text-red-700">{seg}</span>
      ) : (
        <span key={start}>{seg}</span>
      )
    );
  }
  return <>{parts}</>;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${color || "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function Badge({ c, children }: { c: "emerald" | "slate" | "red" | "amber"; children: React.ReactNode }) {
  const map = {
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[c]}`}>{children}</span>;
}
