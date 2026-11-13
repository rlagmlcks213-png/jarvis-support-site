import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runCleanup } from "@/server/cleanup";

// GET /api/cron/cleanup — Vercel Cron이 하루 1번 호출하는 개인정보 정리 라우트 (스케줄: vercel.json)
// 방문자가 없어도 보관 기한(실패 이메일 FAILED_EMAIL_RETENTION_DAYS · post_attempt POST_ATTEMPT_RETENTION_DAYS)을 지키기 위함.
// 요청 후 실행(after) 방식은 그대로 두고, 이 라우트는 보완용이다.
// 인증: Authorization: Bearer <CRON_SECRET> (Vercel에 CRON_SECRET 환경변수를 넣으면 Cron 호출에 자동으로 붙음)
export const dynamic = "force-dynamic";

function authorized(header: string | null, secret: string): boolean {
  const m = header?.match(/^Bearer (.+)$/);
  if (!m) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "서버에 CRON_SECRET이 설정되지 않았어요." }, { status: 500 });
  }
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "인증 토큰이 없거나 올바르지 않아요." }, { status: 401 });
  }
  try {
    const removed = await runCleanup();
    console.log("[cron/cleanup]", removed);
    return NextResponse.json({ ok: true, removed }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[cron/cleanup]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "정리 중 문제가 생겼어요." }, { status: 500 });
  }
}
