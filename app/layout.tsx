import type { Metadata } from "next";
import Link from "next/link";
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
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/" className="text-lg font-semibold text-slate-900">
              ECO 合规核查平台
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="text-slate-600 hover:text-slate-900">
                记录列表
              </Link>
              <Link
                href="/upload"
                className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
              >
                上传数据
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
