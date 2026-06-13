"use client";

import { useEffect, useState } from "react";
import DetailComparison from "./DetailComparison";
import { useT } from "./I18nProvider";

// 右侧滑出的详情面板。econumber 为 null 时不渲染。
export default function DetailDrawer({
  econumber,
  onClose,
}: {
  econumber: string | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  function handleClose() {
    setShow(false);
    setTimeout(onClose, 300); // 等滑出动画结束再卸载
  }

  useEffect(() => {
    if (!econumber) return;
    setShow(false);
    setData(null);
    setLoading(true);
    const raf = requestAnimationFrame(() => setShow(true)); // 触发滑入
    fetch(`/api/records/${encodeURIComponent(econumber)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => setData({ error: String(e) }))
      .finally(() => setLoading(false));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [econumber]);

  if (!econumber) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
          show ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-mono text-sm font-semibold text-slate-700">{econumber}</h2>
          <button
            onClick={handleClose}
            className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕ {t("cmp.close")}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="text-slate-400">{t("d.loading")}</div>}
          {data && data.error && <div className="rounded-md bg-red-50 px-3 py-2 text-red-700">{data.error}</div>}
          {data && !data.error && <DetailComparison data={data} />}
        </div>
      </div>
    </div>
  );
}
