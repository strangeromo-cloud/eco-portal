"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtUsd } from "@/lib/format";
import { useT } from "../components/I18nProvider";

type Reason = { keyword: string; field: string; category: string };

export default function UploadPage() {
  const { t } = useT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("up.title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("up.subtitle")}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <UploadCard titleKey="up.oactTitle" hintKey="up.oactHint" accept=".ods,.xlsx,.xls" />
        <UploadCard titleKey="up.concurTitle" hintKey="up.concurHint" accept=".xlsx,.xls,.ods" />
      </div>
    </div>
  );
}

function UploadCard({
  titleKey,
  hintKey,
  accept,
}: {
  titleKey: string;
  hintKey: string;
  accept: string;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    setFilename(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{t(titleKey)}</h2>
      <p className="mt-1 text-xs text-slate-500">{t(hintKey)}</p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-blue-400 hover:bg-blue-50">
        <span className="text-sm font-medium text-slate-700">
          {busy ? t("up.processing") : t("up.choose")}
        </span>
        <span className="mt-1 text-xs text-slate-400">{accept}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>

      {filename && <p className="mt-3 text-xs text-slate-500">{t("up.file", { name: filename })}</p>}
      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }: { result: any }) {
  const { t } = useT();
  if (result.type === "OACT") {
    return (
      <div className="mt-4 space-y-2 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
        <div className="font-medium">{t("up.oactDone")}</div>
        <ul className="list-inside list-disc text-emerald-700">
          <li>{t("up.parsed", { n: result.total })}</li>
          <li>{t("up.createdUpdated", { c: result.created, u: result.updated })}</li>
          <li>{t("up.sensCount", { n: result.sensitiveCount })}</li>
        </ul>
        <Link href="/" className="inline-block text-blue-600 hover:underline">
          {t("up.goList")}
        </Link>
      </div>
    );
  }

  if (result.type === "CONCUR") {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          <div className="font-medium">{t("up.concurDone")}</div>
          <ul className="list-inside list-disc text-emerald-700">
            <li>{t("up.concurSummary", { rows: result.rowCount, ecos: result.ecoCount })}</li>
            <li>{t("up.matchSummary", { m: result.matchedCount, u: result.unmatchedCount })}</li>
          </ul>
        </div>
        <MatchedTable list={result.matchedList} />
      </div>
    );
  }

  return null;
}

function MatchedTable({ list }: { list: any[] }) {
  const { t } = useT();
  if (!list?.length) return null;
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">{t("mt.eco")}</th>
            <th className="px-3 py-2">{t("mt.matched")}</th>
            <th className="px-3 py-2">{t("mt.applied")}</th>
            <th className="px-3 py-2">{t("mt.reimbursed")}</th>
            <th className="px-3 py-2">{t("mt.remain")}</th>
            <th className="px-3 py-2">{t("mt.sensitive")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((m) => (
            <tr key={m.econumber} className={m.sensitive ? "bg-red-50" : ""}>
              <td className="px-3 py-2 font-mono text-xs">
                {m.matched ? (
                  <Link href={`/records/${m.econumber}`} className="text-blue-600 hover:underline">
                    {m.econumber}
                  </Link>
                ) : (
                  m.econumber
                )}
              </td>
              <td className="px-3 py-2">
                {m.matched ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    {t("mt.linked")}
                  </span>
                ) : (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {t("mt.noOact")}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">{fmtUsd(m.appliedAmount)}</td>
              <td className="px-3 py-2">{fmtUsd(m.reimbursedAmount)}</td>
              <td className="px-3 py-2">
                {m.remainValue == null ? (
                  "—"
                ) : (
                  <span className={m.remainValue < 0 ? "font-medium text-red-600" : "text-slate-700"}>
                    {fmtUsd(m.remainValue)}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {m.sensitive ? (
                  <span
                    className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                    title={(m.reasons as Reason[])
                      .map((r) => `${r.keyword}（${r.field}）`)
                      .join("；")}
                  >
                    {t("mt.sensitive")}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">{t("mt.sensNo")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
