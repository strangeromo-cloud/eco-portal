"use client";

import { fmtUsd, fmtDate } from "@/lib/format";
import { useT } from "./I18nProvider";

type Reason = { keyword: string; field: string; category: string };

// OACT 申请 与 Concur 报销 放在同一张表的两列里逐项对比。
export default function DetailComparison({ data }: { data: any }) {
  const { t } = useT();
  const { oact, concurRows, aggregate } = data;
  const matched: boolean = aggregate.matched;
  const dash = "—";

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
      attMap.set(key, {
        name,
        title: r.attendeeTitle,
        sub: r.companyAttendee,
        isSensitive: r.isSensitive,
        reasons: r.reasons || [],
      });
    else if (r.isSensitive) {
      ex.isSensitive = true;
      ex.reasons = [...ex.reasons, ...(r.reasons || [])];
    }
  }
  const attendees = Array.from(attMap.values());
  const officials = (oact.officials || []).map((o: any) => ({
    name: o.name,
    title: o.title,
    sub: o.entity,
    isSensitive: o.isSensitive,
    reasons: o.reasons || [],
  }));

  const rows: {
    label: string;
    oact: React.ReactNode;
    concur: React.ReactNode;
    mono?: boolean;
    strong?: boolean;
  }[] = [
    { label: t("cmp.id"), oact: oact.econumber, concur: matched ? c0.ecoApprovalNumber || oact.econumber : dash, mono: true },
    { label: t("cmp.person"), oact: oact.requestorName, concur: matched ? c0.employee : dash },
    { label: t("cmp.title"), oact: oact.requestorJobTitle, concur: matched ? c0.employeeTitle : dash },
    { label: t("cmp.dept"), oact: oact.requestorDepartment, concur: dash },
    { label: t("cmp.type"), oact: oact.courtesyType, concur: matched ? expenseType : dash },
    { label: t("cmp.date"), oact: `${fmtDate(oact.startDate)} ~ ${fmtDate(oact.endDate)}`, concur: matched ? txDates : dash },
    {
      label: t("cmp.applied") + " / " + t("cmp.reimbursed"),
      oact: <span className="font-semibold">{fmtUsd(aggregate.appliedAmount)}</span>,
      concur: matched ? <span className="font-semibold">{fmtUsd(aggregate.reimbursedAmount)}</span> : dash,
      strong: true,
    },
    { label: t("cmp.purpose"), oact: oact.purpose, concur: matched ? purposes : dash },
  ];

  return (
    <div className="space-y-4">
      {/* 标题 + 状态 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-slate-900">{oact.econumber}</span>
        {matched ? <Badge c="emerald">{t("d.matchedConcur")}</Badge> : <Badge c="slate">{t("d.unmatched")}</Badge>}
        {aggregate.sensitive && <Badge c="red">{t("d.sensPerson")}</Badge>}
      </div>

      {/* 金额摘要 */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("cmp.applied")} value={fmtUsd(aggregate.appliedAmount)} />
        <Stat label={t("cmp.reimbursed")} value={matched ? fmtUsd(aggregate.reimbursedAmount) : dash} />
        <Stat
          label="Remain"
          value={matched ? fmtUsd(aggregate.remainValue) : dash}
          color={matched && aggregate.remainValue < 0 ? "text-red-600" : "text-blue-700"}
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
              <td className="px-3 py-2">
                <PeopleList people={officials} empty={t("d.none")} />
              </td>
              <td className="px-3 py-2">
                {matched ? <PeopleList people={attendees} empty={t("d.none")} /> : dash}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
      {people.map((p, i) => (
        <li key={i} className={`rounded px-1.5 py-1 ${p.isSensitive ? "bg-red-50" : ""}`}>
          <div className="text-sm text-slate-800">
            {p.name || "—"}
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
            <div className="text-xs text-slate-500">{[p.title, p.sub].filter(Boolean).join(" · ")}</div>
          )}
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${color || "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function Badge({ c, children }: { c: "emerald" | "slate" | "red"; children: React.ReactNode }) {
  const map = {
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[c]}`}>{children}</span>;
}
