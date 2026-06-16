"use client";

import { useState } from "react";
import { fmtUsd, fmtDate } from "@/lib/format";
import { useT } from "./I18nProvider";

type Reason = { keyword: string; field: string; category: string };

// OACP 申请 与 Concur 报销逐项横向对比。
// 多对一时：OACP 一列 + 每张报销单各一列；OACP 列与项目列均冻结，横向滚动始终可见。
export default function DetailComparison({ data }: { data: any }) {
  const { t } = useT();
  const [showMore, setShowMore] = useState(false);
  const oact = data.oact; // 可能为 null（孤立 Concur）
  const concurRows = data.concurRows || [];
  const aggregate = data.aggregate;
  const hasOact = !!oact;
  const hasConcur = concurRows.length > 0;
  const isOrphan = !hasOact;
  const dash = "—";
  const econumber = oact?.econumber ?? data.econumber;

  // 方向：Lenovo Representative=offering；Third Party/Other=receiving
  const direction: "offering" | "receiving" | null = oact?.proposedBy
    ? /lenovo/i.test(oact.proposedBy) ? "offering" : "receiving"
    : null;

  // 每一条 Concur 记录 = 一列（不合并）；列头显示其 Report ID
  const reports = concurRows.map((r: any) => ({
    reportId: r.reportId,
    employee: r.employee,
    employeeEmail: r.employeeEmail,
    employeeTitle: r.employeeTitle,
    expenseType: r.expenseType,
    txDates: fmtDate(r.transactionDate),
    comments: r.entryComments,
    amount: r.approvedUsd ?? 0,
    attendees: [{ name: r.attendeeName, title: r.attendeeTitle, sub: r.companyAttendee, isSensitive: r.isSensitive, reasons: r.reasons || [] }],
  }));
  const concurCols = reports.length > 0 ? reports : [null];

  const officials = hasOact
    ? (oact.officials || []).map((o: any) => ({ name: o.name, title: o.title, sub: o.entity, isSensitive: o.isSensitive, reasons: o.reasons || [] }))
    : [];

  // 其他已填列（默认折叠）
  let extras: { key?: string; label: string; value: string }[] = [];
  try {
    extras = oact?.extrasJson ? JSON.parse(oact.extrasJson) : [];
  } catch {
    extras = [];
  }

  const fieldRows: { label: string; oact: React.ReactNode; report: (r: any) => React.ReactNode; mono?: boolean }[] = [
    { label: t("cmp.id"), oact: oact?.econumber, report: () => econumber, mono: true },
    { label: t("cmp.person"), oact: <PersonCell name={oact?.requestorName} email={oact?.requestorEmail} />, report: (r) => <PersonCell name={r.employee} email={r.employeeEmail} /> },
    { label: t("cmp.title"), oact: oact?.requestorJobTitle, report: (r) => r.employeeTitle },
    { label: t("cmp.dept"), oact: oact?.requestorDepartment, report: () => null },
    { label: t("cmp.type"), oact: oact?.courtesyType, report: (r) => r.expenseType },
    { label: t("cmp.date"), oact: `${fmtDate(oact?.startDate)} ~ ${fmtDate(oact?.endDate)}`, report: (r) => r.txDates },
    { label: t("cmp.amount"), oact: <span className="font-semibold">{fmtUsd(aggregate.appliedAmount)}</span>, report: (r) => <span className="font-semibold">{fmtUsd(r.amount)}</span> },
    { label: t("cmp.comments"), oact: oact?.purpose, report: (r) => r.comments },
  ];

  // 冻结列样式（项目列 + OACP 列）；bg 须不透明以遮住横向滚动内容
  const fieldTh = "sticky left-0 z-20 w-24 min-w-[6rem] max-w-[6rem] bg-slate-100 px-3 py-2";
  const fieldTd = "sticky left-0 z-10 w-24 min-w-[6rem] max-w-[6rem] bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500";
  const oactTh = "sticky left-24 z-20 min-w-[180px] bg-blue-100/80 px-3 py-2 font-semibold text-blue-700";
  const oactTd = "sticky left-24 z-10 min-w-[180px] break-words bg-blue-50 px-3 py-2 text-slate-800";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        {/* 状态 / 方向胶囊 —— 标题上方 */}
        {hasOact && (oact.status || direction) && (
          <div className="flex flex-wrap items-center gap-2">
            {oact.status && <Badge c="green">{oact.status}</Badge>}
            {direction && (
              <Badge c={direction === "offering" ? "indigo" : "purple"}>
                {t(direction === "offering" ? "opt.offering" : "opt.receiving")}
              </Badge>
            )}
          </div>
        )}
        {/* 标题（放大） + 紧挨右侧小胶囊 */}
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-mono text-2xl font-bold text-slate-900">{econumber}</h2>
          <div className="flex flex-wrap items-center gap-1">
            {isOrphan ? (
              <Badge c="amber" sm>{t("badge.orphan")}</Badge>
            ) : hasConcur ? (
              <Badge c="emerald" sm>{t("d.matchedConcur")}</Badge>
            ) : (
              <Badge c="slate" sm>{t("d.unmatched")}</Badge>
            )}
            {reports.length > 1 && <Badge c="blue" sm>{t("col.reportsN", { n: reports.length })}</Badge>}
            {aggregate.sensitive && <Badge c="red" sm>{t("d.sensPerson")}</Badge>}
          </div>
        </div>
      </div>

      {/* 金额摘要（总额） */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("cmp.applied")} value={hasOact ? fmtUsd(aggregate.appliedAmount) : dash} />
        <Stat label={t("cmp.reimbursed")} value={hasConcur ? fmtUsd(aggregate.reimbursedAmount) : dash} />
        <Stat label="Remain" value={hasOact && hasConcur ? fmtUsd(aggregate.remainValue) : dash} color={hasOact && hasConcur && aggregate.remainValue < 0 ? "text-red-600" : "text-blue-700"} />
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

      {/* 横向对比表：项目列 + OACP 列冻结，报销单各一列 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs">
            <tr className="divide-x divide-slate-300">
              <th className={`${fieldTh} font-medium text-slate-500`}>{t("cmp.field")}</th>
              <th className={oactTh}>{t("cmp.colOact")}</th>
              {concurCols.map((rep: any, i: number) => (
                <th key={i} className="min-w-[180px] bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">
                  <div>{reports.length > 1 ? t("cmp.reportCol", { n: i + 1 }) : t("cmp.colConcur")}</div>
                  {rep && <div className="font-mono text-[11px] font-normal text-slate-500">{rep.reportId}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {fieldRows.map((fr, i) => (
              <tr key={i} className="divide-x divide-slate-200 align-top">
                <td className={fieldTd}>{fr.label}</td>
                <td className={`${oactTd} ${fr.mono ? "font-mono text-xs" : ""}`}>{hasOact ? val(fr.oact) : dash}</td>
                {concurCols.map((rep: any, j: number) => (
                  <td key={j} className={`break-words px-3 py-2 text-slate-800 ${fr.mono ? "font-mono text-xs" : ""}`}>
                    {rep ? val(fr.report(rep)) : dash}
                  </td>
                ))}
              </tr>
            ))}
            {/* 参与人员对比 */}
            <tr className="divide-x divide-slate-200 align-top">
              <td className={fieldTd}>{t("cmp.participants")}</td>
              <td className={oactTd}>{hasOact ? <PeopleList people={officials} empty={t("d.none")} /> : dash}</td>
              {concurCols.map((rep: any, j: number) => (
                <td key={j} className="px-3 py-2">{rep ? <PeopleList people={rep.attendees} empty={t("d.none")} /> : dash}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 更多申请信息（其他已填列，默认折叠） */}
      {extras.length > 0 && (
        <div>
          <button
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-slate-100"
          >
            <span>{showMore ? t("cmp.showLess") : t("cmp.showMore", { n: extras.length })}</span>
            <span className={`transition-transform ${showMore ? "rotate-180" : ""}`}>▾</span>
          </button>
          {showMore && (
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                {t("cmp.moreTitle")}
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {extras.map((e, i) => {
                    const tr = e.key ? t(e.key) : "";
                    const label = tr && tr !== e.key ? tr : e.label; // 有翻译用翻译，否则回退原表头
                    return (
                      <tr key={i} className="align-top">
                        <td className="w-1/3 min-w-[160px] bg-slate-50/60 px-3 py-2 text-xs text-slate-500">{label}</td>
                        <td className="break-words px-3 py-2 text-slate-800">{e.value}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PersonCell({ name, email }: { name?: string | null; email?: string | null }) {
  if (!name && !email) return <>—</>;
  return (
    <div>
      <div className="text-slate-800">{name || "—"}</div>
      {email && <div className="break-all text-xs text-slate-400">{email}</div>}
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
                <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700" title={(p.reasons as Reason[]).map((r) => `${r.keyword}（${r.field} · ${r.category}）`).join("\n")}>
                  {t("tag.sensitive")}
                </span>
              )}
            </div>
            {(p.title || p.sub) && <div className="text-xs text-slate-500">{hl([p.title, p.sub].filter(Boolean).join(" · "), kws)}</div>}
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
    parts.push(on ? <span key={start} className="rounded bg-red-100 px-0.5 font-semibold text-red-700">{seg}</span> : <span key={start}>{seg}</span>);
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

function Badge({ c, sm, children }: { c: "emerald" | "green" | "slate" | "red" | "amber" | "blue" | "indigo" | "purple"; sm?: boolean; children: React.ReactNode }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    green: "bg-green-100 text-green-700",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    indigo: "bg-indigo-100 text-indigo-700",
    purple: "bg-purple-100 text-purple-700",
  };
  const size = sm ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-xs";
  return <span className={`rounded-full font-medium ${size} ${map[c]}`}>{children}</span>;
}
