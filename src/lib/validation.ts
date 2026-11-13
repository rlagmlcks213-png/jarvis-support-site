// 입력값 검증. 출력은 항상 React 기본 이스케이프로 하고, HTML/마크다운 렌더링은 하지 않는다.
// (dangerouslySetInnerHTML 사용 금지)

// 각 필드 길이 제한 (글 비밀번호 4~20자는 QnA 비밀글 요구사항 기준)
// TODO(확정 필요): 닉네임·제목·내용 길이
export const LIMITS = {
  nickname: { min: 2, max: 20 },
  password: { min: 4, max: 20 },
  title: { min: 2, max: 100 },
  content: { min: 5, max: 3000 },
  email: { max: 100 },
  appVersion: { max: 20 },
} as const;

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export function checkLength(label: string, value: string, min: number, max: number): string | undefined {
  const v = value.trim();
  if (!v) return `${label}을(를) 입력해 주세요.`;
  if (v.length < min) return `${label}은(는) ${min}자 이상 입력해 주세요.`;
  if (v.length > max) return `${label}은(는) ${max}자 이하로 줄여 주세요.`;
  return undefined;
}

export function checkEmail(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined; // 선택 항목
  if (v.length > LIMITS.email.max) return `이메일은 ${LIMITS.email.max}자 이하로 입력해 주세요.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "이메일 형식이 올바르지 않아요. 예: name@example.com";
  return undefined;
}

export function checkVersion(value: string): string | undefined {
  const v = value.trim();
  if (!v) return "앱 버전을 입력해 주세요. 앱의 설정 > 정보에서 확인할 수 있어요.";
  if (!VERSION_RE.test(v)) return "버전은 v1.0.0 형식으로 입력해 주세요.";
  return undefined;
}

/** 앱 버전: "1.0.2" 또는 "v1.0.2" 허용 (PMR-002 ② vX.Y.Z) */
export const VERSION_RE = /^v?\d+\.\d+\.\d+$/i;

/** "1.0.2" · "v1.0.2" → "v1.0.2" (저장·표시 형식 통일). 형식이 틀리면 원문 그대로 */
export function normalizeVersion(value: string): string {
  const v = value.trim();
  return VERSION_RE.test(v) ? `v${v.replace(/^v/i, "")}` : v;
}

/** HTML 태그 문자 이스케이프 — 저장 전 문자열 정리용(출력은 React가 다시 이스케이프). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 저장용 정리: 앞뒤 공백 제거 + 제어문자 제거.
 * TODO(확정 필요): 저장 시점에 escapeHtml을 적용할지 여부.
 *   React가 출력 시 이스케이프하므로 현재는 원문을 저장한다(이중 이스케이프 방지).
 *   실서버에서 다른 클라이언트(앱 등)가 이 데이터를 HTML로 그린다면 서버 측 이스케이프가 필요하다.
 */
export function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

/** API Key·토큰처럼 보이는 문자열 감지 (버그 신고 개인정보 경고용) */
export function detectSecrets(...texts: string[]): string[] {
  const found = new Set<string>();
  const joined = texts.join("\n");
  if (/AIza[0-9A-Za-z_\-]{10,}/.test(joined)) found.add("Gemini/Google API Key (AIza…)");
  if (/ya29\.[0-9A-Za-z_\-]{10,}/.test(joined)) found.add("구글 액세스 토큰 (ya29.…)");
  if (/1\/\/0[0-9A-Za-z_\-]{20,}/.test(joined)) found.add("구글 리프레시 토큰 (1//0…)");
  return [...found];
}
