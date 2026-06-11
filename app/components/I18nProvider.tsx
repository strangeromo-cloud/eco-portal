"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Lang, translate } from "@/lib/i18n";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = "eco-lang";

export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 初始统一为 zh（与服务端渲染一致，避免 hydration 不匹配），挂载后再读本地偏好
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "zh") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
  }

  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(lang, key, vars);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useT must be used within I18nProvider");
  return c;
}
