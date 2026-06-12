"use client";

import { useT } from "./I18nProvider";

// 分段式语言开关：中文 | EN，当前语言高亮。
export default function LangToggle() {
  const { lang, setLang } = useT();
  const opts: { value: "zh" | "en"; label: string }[] = [
    { value: "zh", label: "中文" },
    { value: "en", label: "EN" },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs font-medium">
      {opts.map((o, i) => (
        <button
          key={o.value}
          onClick={() => setLang(o.value)}
          className={`px-2.5 py-1 transition-colors ${i > 0 ? "border-l border-slate-300" : ""} ${
            lang === o.value
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
