import type { Metadata } from "next";
import I18nProvider from "./components/I18nProvider";
import Header from "./components/Header";
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
        <I18nProvider>
          <Header />
          <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
