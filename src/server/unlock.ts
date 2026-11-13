import "server-only";
import { cookies } from "next/headers";
import { signToken, verifyToken } from "@/lib/signed-token";
import { UNLOCK_COOKIE_MINUTES, unlockCookieName } from "@/lib/constants";
import { isProduction, sessionSecret } from "./env";

// 비밀글 열람 쿠키 — qna_unlock_{id} = 서명 토큰 { questionId, exp(30분) }
// HttpOnly · Secure(운영) · SameSite=Lax · Path=/qna/{id} · Max-Age=1800

export async function createUnlockCookie(questionId: number) {
  const token = await signToken({ questionId, exp: Date.now() + UNLOCK_COOKIE_MINUTES * 60_000 }, sessionSecret());
  return {
    name: unlockCookieName(questionId),
    value: token,
    options: {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax" as const,
      path: `/qna/${questionId}`,
      maxAge: UNLOCK_COOKIE_MINUTES * 60,
    },
  };
}

/** /qna/[id] 페이지 요청에 이 글의 유효한 열람 쿠키가 있는지 */
export async function hasUnlockCookie(questionId: number): Promise<boolean> {
  const token = (await cookies()).get(unlockCookieName(questionId))?.value;
  const p = await verifyToken<{ questionId: number; exp: number }>(token, sessionSecret());
  return p?.questionId === questionId;
}
