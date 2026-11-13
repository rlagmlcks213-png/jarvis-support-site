import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: { default: "비서 자비스 — 데스크톱 AI 일정 비서", template: "%s | 비서 자비스" },
  description: "브라우저를 열지 않아도, 단축키 한 번과 한 줄 문장으로 구글 캘린더 일정을 관리하세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
