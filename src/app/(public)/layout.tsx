import Header from "@/components/Header";
import Footer from "@/components/Footer";

// 공개 화면 (로그인 없이 누구나 이용, SFR-004 ①) — 라이트 테마 고정
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        본문으로 건너뛰기
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
