"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "./I18nProvider";

const tabs = [
  { href: "/", key: "nav.records" },
  { href: "/upload", key: "nav.upload" },
];

export default function NavTabs() {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <nav className="flex items-center gap-1">
      {tabs.map((tab) => {
        const active =
          tab.href === "/"
            ? pathname === "/" || pathname.startsWith("/records")
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
