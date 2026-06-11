import type { Metadata } from "next";
import Link from "next/link";
import NavTabs from "./components/NavTabs";
import ClearDataButton from "./components/ClearDataButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECO 合规核查平台",
  description: "礼品/招待/差旅合规核查 — OACT × Concur 关联",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex items-center justify-between pt-4 pb-2">
              <Link
                href="/"
                className="text-lg font-semibold text-slate-900"
              >
                ECO 合规核查平台
              </Link>
              <ClearDataButton />
            </div>
            <NavTabs />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
