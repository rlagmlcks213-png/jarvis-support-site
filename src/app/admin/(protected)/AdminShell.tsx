"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminLogout } from "@/lib/repository";
import { LogoMark } from "@/components/Logo";

const NAV = [
  { href: "/admin/dashboard", label: "대시보드" },
  { href: "/admin/releases", label: "릴리스 관리" },
  { href: "/admin/manage", label: "답변·상태 관리" },
];

// 관리자 화면 틀(메뉴·로그아웃). 권한 확인은 서버(layout.tsx · middleware · Server Action)에서 한다.
export default function AdminShell({ session, children }: { session: { name: string }; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await adminLogout().catch(() => {});
    router.replace("/admin");
    router.refresh();
  };

  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold">
            <LogoMark className="h-7 w-7" />
            <span>자비스 관리자</span>
          </Link>
          <nav className="ml-4 hidden gap-1 md:flex" aria-label="관리자 메뉴">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${pathname.startsWith(n.href) ? "bg-brand-soft text-brand-text" : "text-muted hover:bg-surface-muted hover:text-fg"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-3 md:flex">
            <span className="text-sm text-muted">{session.name}</span>
            <Link href="/" className="btn-ghost btn-sm" target="_blank">
              사이트 보기 ↗
            </Link>
            <button
              className="btn-secondary btn-sm"
              onClick={logout}
            >
              로그아웃
            </button>
          </div>
          <button className="btn-ghost ml-auto px-2 md:hidden" aria-expanded={menuOpen} aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} onClick={() => setMenuOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-line px-4 py-3 md:hidden">
            <nav className="grid gap-1">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 text-sm ${pathname.startsWith(n.href) ? "bg-brand-soft text-brand-text" : "text-muted"}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-sm text-muted">{session.name}</span>
              <button
                className="btn-secondary btn-sm"
                onClick={logout}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
