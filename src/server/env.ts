import "server-only";

/** 쿠키·캡차 서명 키. 32자 이상 무작위 문자열이어야 한다. */
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
