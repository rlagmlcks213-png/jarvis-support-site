"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LogoMark } from "./Logo";

// ⚠ 공개 화면에는 관리자 로그인 버튼/링크를 두지 않는다 (UIR-002 ③). 관리자는 /admin 직접 입력.
const NAV = [
  { href: "/", label: "소개" },
  { href: "/download", label: "다운로드" },
  { href: "/releases", label: "릴리스 노트" },
  { href: "/faq", label: "FAQ" },
  { href: "/qna", label: "QnA" },
  { href: "/bugs", label: "버그 신고" },
];

function SearchBox({ onDone, id }: { onDone?: () => void; id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState("");

  useEffect(() => {
    if (pathname === "/search") setQ(params.get("q") ?? "");
  }, [pathname, params]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        router.push(`/search?q=${encodeURIComponent(query)}`);
        onDone?.();
      }}
      className="relative w-full"
    >
      <label htmlFor={id} className="sr-only">
        통합 검색
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="FAQ·릴리스·QnA·버그 검색"
        className="input pr-9"
        maxLength={50}
      />
      <button type="submit" className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-fg" aria-label="검색">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg font-bold text-brand">
          <LogoMark />
          <span className="text-lg">비서 자비스</span>
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex" aria-label="주 메뉴">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(n.href) ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-surface-muted hover:text-fg"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden w-64 lg:block">
          <Suspense>
            <SearchBox id="search-desktop" />
          </Suspense>
        </div>

        <button
          type="button"
          className="btn-ghost ml-auto px-2 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /> : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-white px-4 pt-3 pb-4 lg:hidden">
          <Suspense>
            <SearchBox id="search-mobile" onDone={() => setOpen(false)} />
          </Suspense>
          <nav className="mt-3 grid gap-1" aria-label="모바일 메뉴">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(n.href) ? "bg-brand-soft text-brand" : "text-slate-700 hover:bg-surface-muted"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
