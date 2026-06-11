"use client";

import { useT } from "./I18nProvider";

export default function LangToggle() {
  const { lang, setLang, t } = useT();
  return (
    <button
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      title={lang === "zh" ? "Switch to English" : "切换为中文"}
    >
      {t("lang.toggle")}
    </button>
  );
}
