"use client";

import Link from "next/link";
import NavTabs from "./NavTabs";
import LangToggle from "./LangToggle";
import ClearDataButton from "./ClearDataButton";
import { useT } from "./I18nProvider";

export default function Header() {
  const { t } = useT();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-center justify-between pt-4 pb-2">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            {t("appTitle")}
          </Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ClearDataButton />
          </div>
        </div>
        <NavTabs />
      </div>
    </header>
  );
}
