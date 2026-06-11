"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtUsd, fmtDate } from "@/lib/format";
import { useT } from "../../components/I18nProvider";

type Reason = { keyword: string; field: string; category: string };

export default function DetailPage({
  params,
}: {
  params: { econumber: string };
}) {
  const { econumber } = params;
  const { t } = useT();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/records/${encodeURIComponent(econumber)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => (ok ? setData(d) : setError(d.error || t("d.notFound"))))
      .catch((e) => setError(String(e)));
  }, [econumber, t]);

  if (error)
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-md bg-red-50 px-4 py-3 text-red-700">{error}</div>
      </div>
    );
  if (!data) return <div className="text-slate-400">{t("d.loading")}</div>;

  const { oact, concurRows, aggregate } = data;

  return (
    <div className="space-y-5">
      <BackLink />

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-lg font-semibold text-slate-900">
          {oact.econumber}
        </h1>
        {aggregate.matched ? (
          <Badge color="emerald">{t("d.matchedConcur")}</Badge>
        ) : (
          <Badge color="slate">{t("d.unmatched")}</Badge>
        )}
        {aggregate.sensitive && <Badge color="red">{t("d.sensPerson")}</Badge>}
      </div>

      {/* 金额摘要 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label={t("d.cardApplied")} value={fmtUsd(aggregate.appliedAmount)} />
        <SummaryCard
          label={t("d.cardReimbursed")}
          value={aggregate.matched ? fmtUsd(aggregate.reimbursedAmount) : "—"}
          sub={aggregate.matched ? t("d.entries", { n: aggregate.reportCount }) : undefined}
        />
        <SummaryCard
          label={t("d.cardRemain")}
          value={aggregate.matched ? fmtUsd(aggregate.remainValue) : "—"}
          highlight={aggregate.matched && aggregate.remainValue < 0 ? "red" : "blue"}
        />
      </div>

      {/* 敏感原因汇总 */}
      {aggregate.sensitive && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="font-medium text-red-800">{t("d.reasonTitle")}</div>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {(aggregate.reasons as Reason[]).map((r, i) => (
              <li key={i}>
                {t("d.reasonFmt", { kw: r.keyword, field: r.field, cat: r.category })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 左右对照 */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 左：OACT */}
        <Panel title={t("d.oactPanel")} tone="blue">
          <KV k={t("kv.econumber")} v={oact.econumber} mono />
          <KV k={t("kv.requestor")} v={oact.requestorName} />
          <KV k={t("kv.requestorTitle")} v={oact.requestorJobTitle} />
          <KV k={t("kv.dept")} v={oact.requestorDepartment} />
          <KV k={t("kv.email")} v={oact.requestorEmail} />
          <KV k={t("kv.type")} v={oact.courtesyType} />
          <KV k={t("kv.dates")} v={`${fmtDate(oact.startDate)} ~ ${fmtDate(oact.endDate)}`} />
          <KV k={t("kv.proposer")} v={`${oact.proposerName || "—"} / ${oact.proposerTitle || "—"}`} />
          <KV k={t("kv.fee")} v={fmtUsd(oact.feePerPerson)} />
          <KV k={t("kv.officialCount")} v={String(oact.officialCount)} />
          <KV k={t("kv.applied")} v={fmtUsd(oact.appliedAmount)} />
          <KV k={t("kv.status")} v={oact.status} />
          <KV k={t("kv.purpose")} v={oact.purpose} />
          <KV k={t("kv.itemized")} v={oact.itemizedDesc} />

          <div className="mt-4">
            <div className="mb-1.5 text-xs font-semibold uppercase text-slate-500">
              {t("d.officials")}（{oact.officials.length}）
            </div>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">{t("ot.name")}</th>
                    <th className="px-2 py-1.5">{t("ot.entity")}</th>
                    <th className="px-2 py-1.5">{t("ot.title")}</th>
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
                        {o.isSensitive && <SensTag reasons={o.reasons as Reason[]} />}
                      </td>
                    </tr>
                  ))}
                  {oact.officials.length === 0 && (
                    <tr><td colSpan={4} className="px-2 py-3 text-center text-slate-400">{t("d.none")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {/* 右：Concur */}
        <Panel title={t("d.concurPanel")} tone="emerald">
          {!aggregate.matched ? (
            <div className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
              {t("d.noConcur")}
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
  const { t } = useT();
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
                <span>{t("ct.reporter")}：<b>{head.employee || "—"}</b></span>
                <span>Report ID：<span className="font-mono">{head.reportId || "—"}</span></span>
                <span>{t("ct.txDate")}：{fmtDate(head.transactionDate)}</span>
                <span>{t("ct.expType")}：{head.expenseType || "—"}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4">
                <span>{t("ct.entryAmt")}：<b>{fmtUsd(head.approvedUsd)}</b></span>
                <span>{t("ct.reportTotal")}：{fmtUsd(head.totalReportUsd)}</span>
              </div>
              {head.businessPurpose && (
                <div className="mt-1 text-slate-500">{t("ct.purpose")}：{head.businessPurpose}</div>
              )}
            </div>
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">{t("ct.attendee")}</th>
                  <th className="px-2 py-1.5">{t("ct.attTitle")}</th>
                  <th className="px-2 py-1.5">{t("ct.attCompany")}</th>
                  <th className="px-2 py-1.5 text-right">{t("ct.perPerson")}</th>
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
  const { t } = useT();
  return (
    <span
      className="ml-1.5 cursor-help rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700"
      title={reasons.map((r) => `${r.keyword}（${r.field} · ${r.category}）`).join("\n")}
    >
      {t("tag.sensitive")}
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
  const { t } = useT();
  return (
    <Link href="/" className="text-sm text-blue-600 hover:underline">
      {t("d.back")}
    </Link>
  );
}
