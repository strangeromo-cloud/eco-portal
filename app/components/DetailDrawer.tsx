"use client";

import { useEffect, useRef, useState } from "react";
import DetailComparison from "./DetailComparison";
import { useT } from "./I18nProvider";

// 右侧滑出的详情面板，左边缘可拖动调整宽度。econumber 为 null 时不渲染。
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
  const [width, setWidth] = useState(768); // 占位，挂载后按 2/3 屏宽设置
  const draggingRef = useRef(false);
  const userResized = useRef(false); // 用户手动拖过宽度后，不再自动重置为 2/3

  function handleClose() {
    setShow(false);
    setTimeout(onClose, 300);
  }

  // 拖动调整宽度
  function onDragStart(e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    userResized.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const w = window.innerWidth - e.clientX; // 面板贴右，宽度=视口宽-鼠标X
      setWidth(Math.min(Math.max(w, 380), window.innerWidth - 60));
    }
    function onUp() {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!econumber) return;
    if (!userResized.current) {
      // 默认打开宽度 = 2/3 屏宽（夹在 [380, 视口-60]）
      setWidth(Math.min(Math.max(Math.round(window.innerWidth * (2 / 3)), 380), window.innerWidth - 60));
    }
    setShow(false);
    setData(null);
    setLoading(true);
    const raf = requestAnimationFrame(() => setShow(true));
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
        style={{ width }}
        className={`absolute right-0 top-0 flex h-full max-w-full flex-col bg-white shadow-2xl transition-transform duration-300 ${
          show ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 左边缘拖动手柄 */}
        <div
          onMouseDown={onDragStart}
          title={t("cmp.resize")}
          className="group absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize border-l border-slate-200 hover:bg-blue-400/40"
        >
          <div className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-300 group-hover:bg-blue-500" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 pl-6">
          <h2 className="font-mono text-sm font-semibold text-slate-700">{econumber}</h2>
          <button
            onClick={handleClose}
            className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕ {t("cmp.close")}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pl-6">
          {loading && <div className="text-slate-400">{t("d.loading")}</div>}
          {data && data.error && <div className="rounded-md bg-red-50 px-3 py-2 text-red-700">{data.error}</div>}
          {data && !data.error && <DetailComparison data={data} />}
        </div>
      </div>
    </div>
  );
}
