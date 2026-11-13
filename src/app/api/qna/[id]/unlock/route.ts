import { NextResponse } from "next/server";
import { unlockQuestion } from "@/server/services/questions";
import { createUnlockCookie } from "@/server/unlock";
import { getIpHash } from "@/server/request";
import { RepoError } from "@/lib/repository/errors";

// POST /api/qna/[id]/unlock { password } — 비밀글 열람
// 맞으면: 이 글 전용 열람 쿠키(30분) 발급 + 본문·답변 반환
// 틀리면: post_attempt에 password_fail(target_type=question) 기록. 같은 IP·같은 글에서 10분 안에 5번 틀리면 10분 차단(429)
export const dynamic = "force-dynamic";

const STATUS: Partial<Record<RepoError["code"], number>> = { WRONG_PASSWORD: 401, RATE_LIMIT: 429, NOT_FOUND: 404, VALIDATION: 400 };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const questionId = Number((await params).id);
  if (!Number.isInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "잘못된 요청이에요.", code: "VALIDATION" }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password.slice(0, 100) : "";
  if (!password) {
    return NextResponse.json({ error: "비밀번호를 입력해 주세요.", code: "VALIDATION" }, { status: 400 });
  }

  try {
    const question = await unlockQuestion(questionId, password, await getIpHash());
    const cookie = await createUnlockCookie(questionId);
    const res = NextResponse.json({ question }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch (e) {
    if (e instanceof RepoError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: STATUS[e.code] ?? 400 });
    }
    console.error("[unlock]", e);
    return NextResponse.json({ error: "서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.", code: "SERVER" }, { status: 500 });
  }
}
