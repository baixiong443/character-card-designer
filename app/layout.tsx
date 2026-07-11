import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "角色卡设计器 - Psyche Character Card Designer",
  description: "基于 Psyche 标准的角色卡片设计工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
