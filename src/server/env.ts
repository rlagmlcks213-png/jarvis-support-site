import "server-only";
import { TURNSTILE_TEST_SECRET_KEY } from "@/lib/constants";

/** 쿠키 서명 키(관리자 세션·비밀글 열람). 32자 이상 무작위 문자열이어야 한다. */
export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET 환경변수를 32자 이상 무작위 문자열로 설정해 주세요. (.env)");
  }
  if (process.env.NODE_ENV === "production" && s.startsWith("change-me")) {
    throw new Error("운영 환경에서는 SESSION_SECRET 예시값(change-me…)을 쓸 수 없어요.");
  }
  return s;
}

/** 메일 속 링크에 쓰는 사이트 주소 */
export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export const isProduction = () => process.env.NODE_ENV === "production";

/**
 * Cloudflare Turnstile 비밀 키. 등록을 막아야 하는 상황이면 null (호출부에서 등록 거부 — fail closed).
 * - 개발: 값이 없으면 Cloudflare 공식 테스트 키(항상 통과)로 대체
 * - 운영: 값이 없거나 테스트 키(1x/2x/3x…AA)면 null + 서버 로그
 */
export function turnstileSecret(): string | null {
  const s = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  if (!isProduction()) return s || TURNSTILE_TEST_SECRET_KEY;
  if (!s) {
    console.error("[turnstile] 운영 환경에 TURNSTILE_SECRET_KEY가 없어 글 등록을 거부했어요. Netlify 환경변수를 확인해 주세요.");
    return null;
  }
  if (/^[123]x0+AA$/.test(s)) {
    console.error("[turnstile] 운영 환경에서 Turnstile 테스트 비밀 키를 쓰고 있어 글 등록을 거부했어요. 실제 키로 바꿔 주세요.");
    return null;
  }
  return s;
}

/** GitHub webhook 서명 키 (앱 저장소 Settings → Webhooks의 Secret과 같은 값). 없으면 null */
export function githubWebhookSecret(): string | null {
  return process.env.GITHUB_WEBHOOK_SECRET?.trim() || null;
}

/** GitHub API 토큰 (선택). 공개 저장소면 없어도 되고, 있으면 호출 한도가 늘어난다 */
export function githubToken(): string | null {
  return process.env.GITHUB_TOKEN?.trim() || null;
}
