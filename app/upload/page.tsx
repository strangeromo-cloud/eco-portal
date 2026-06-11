"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtUsd } from "@/lib/format";

type Reason = { keyword: string; field: string; category: string };

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">上传数据</h1>
        <p className="mt-1 text-sm text-slate-500">
          上传 OACT 申请列表入库；上传 Concur 报销导出后，系统按 ECO Approval
          Number 自动关联已入库的 OACT 记录。文件类型自动识别。
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <UploadCard
          title="OACT 申请列表"
          hint="第一行表头含 ECONumber。重复上传同一 ECONumber 会按主键更新。"
          accept=".ods,.xlsx,.xls"
        />
        <UploadCard
          title="Concur 报销导出"
          hint="“13 Legal Report” 格式。仅导入含 ECO Approval Number 的行。"
          accept=".xlsx,.xls,.ods"
        />
      </div>
    </div>
  );
}

function UploadCard({
  title,
  hint,
  accept,
}: {
  title: string;
  hint: string;
  accept: string;
}) {
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
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-blue-400 hover:bg-blue-50">
        <span className="text-sm font-medium text-slate-700">
          {busy ? "正在处理…" : "点击选择文件"}
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

      {filename && (
        <p className="mt-3 text-xs text-slate-500">文件：{filename}</p>
      )}
      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }: { result: any }) {
  if (result.type === "OACT") {
    return (
      <div className="mt-4 space-y-2 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
        <div className="font-medium">OACT 导入完成</div>
        <ul className="list-inside list-disc text-emerald-700">
          <li>共解析 {result.total} 条</li>
          <li>新增 {result.created} 条，更新 {result.updated} 条</li>
          <li>命中敏感人物 {result.sensitiveCount} 条</li>
        </ul>
        <Link href="/" className="inline-block text-blue-600 hover:underline">
          前往记录列表 →
        </Link>
      </div>
    );
  }

  if (result.type === "CONCUR") {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          <div className="font-medium">Concur 导入完成</div>
          <ul className="list-inside list-disc text-emerald-700">
            <li>导入报销行 {result.rowCount} 行，涉及 {result.ecoCount} 个 ECO 号</li>
            <li>
              已关联 OACT {result.matchedCount} 个，未关联 {result.unmatchedCount} 个
            </li>
          </ul>
        </div>
        <MatchedTable list={result.matchedList} />
      </div>
    );
  }

  return null;
}

function MatchedTable({ list }: { list: any[] }) {
  if (!list?.length) return null;
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">ECO 号</th>
            <th className="px-3 py-2">关联</th>
            <th className="px-3 py-2">申请$</th>
            <th className="px-3 py-2">报销$</th>
            <th className="px-3 py-2">Remain$</th>
            <th className="px-3 py-2">敏感</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((m) => (
            <tr key={m.econumber} className={m.sensitive ? "bg-red-50" : ""}>
              <td className="px-3 py-2 font-mono text-xs">
                {m.matched ? (
                  <Link
                    href={`/records/${m.econumber}`}
                    className="text-blue-600 hover:underline"
                  >
                    {m.econumber}
                  </Link>
                ) : (
                  m.econumber
                )}
              </td>
              <td className="px-3 py-2">
                {m.matched ? (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    已关联
                  </span>
                ) : (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    无 OACT
                  </span>
                )}
              </td>
              <td className="px-3 py-2">{fmtUsd(m.appliedAmount)}</td>
              <td className="px-3 py-2">{fmtUsd(m.reimbursedAmount)}</td>
              <td className="px-3 py-2">
                {m.remainValue == null ? (
                  "—"
                ) : (
                  <span
                    className={
                      m.remainValue < 0
                        ? "font-medium text-red-600"
                        : "text-slate-700"
                    }
                  >
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
                    敏感
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">否</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
