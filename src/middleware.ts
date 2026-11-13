import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";
import { verifyToken } from "@/lib/signed-token";

/**
 * 서버 측 권한 확인 1차 (SFR-006 ③).
 * /admin/* (로그인 화면 /admin 제외)는 SESSION_SECRET 서명이 맞는 세션 쿠키가 없으면 /admin으로 돌려보낸다.
 * 2차: 관리자 레이아웃(서버 컴포넌트), 3차: 각 Server Action의 requireAdmin().
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const valid = !!(await verifyToken(token, process.env.SESSION_SECRET ?? ""));

  if (pathname === "/admin") {
    if (valid) return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    return NextResponse.next();
  }

  if (!valid) {
    const url = new URL("/admin", req.url);
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(ADMIN_SESSION_COOKIE); // 만료·위조 쿠키 정리
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path+"],
};
