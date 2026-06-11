"use client";

import { useState } from "react";
import { useT } from "./I18nProvider";

export default function ClearDataButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function doClear() {
    setBusy(true);
    try {
      const res = await fetch("/api/clear", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "清空失败");
      setOpen(false);
      window.location.href = "/"; // 回到列表并刷新
    } catch (e: any) {
      alert(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        {t("clear.button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              {t("clear.title")}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{t("clear.body")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                {t("clear.cancel")}
              </button>
              <button
                onClick={doClear}
                disabled={busy}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? t("clear.busy") : t("clear.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
