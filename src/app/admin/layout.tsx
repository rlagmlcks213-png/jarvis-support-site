import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

// 관리자 화면: 다크 테마 토큰으로 전환해 공개 화면과 시각적으로 구분
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-theme min-h-screen overflow-x-clip bg-bg text-fg">{children}</div>;
}
