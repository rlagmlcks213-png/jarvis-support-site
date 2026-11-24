// 서버(middleware·API)·클라이언트 공용 상수. 브라우저/서버 전용 API를 import 하지 말 것.

export const ADMIN_SESSION_COOKIE = "jarvis_admin_session";

/** 관리자 세션 유지 시간 */
export const ADMIN_SESSION_HOURS = 8;

/** 관리자 로그인: 계정 기준 5회 실패 시 5분 제한 (admin.failed_count / locked_until) */
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_LOCK_MINUTES = 5;

/** 같은 IP 반복 등록 제한 (post_attempt, action = "question" | "bug_report") */
export const POST_COOLDOWN_SECONDS = 30;

/**
 * 글 비밀번호 틀림 제한: 같은 IP·같은 글에서 10분 안에 5번 틀리면 10분 동안 막음 (action = "password_fail")
 * QnA 비밀글 열람·수정·삭제, 버그 신고 수정·삭제에 모두 적용
 */
export const UNLOCK_MAX_FAILS = 5;
export const UNLOCK_WINDOW_MINUTES = 10;
export const UNLOCK_BLOCK_MINUTES = 10;

/** 비밀글 열람 쿠키 유지 시간 */
export const UNLOCK_COOKIE_MINUTES = 30;
export const unlockCookieName = (questionId: number) => `qna_unlock_${questionId}`;

/**
 * 개인정보 보관 기한 (개인정보처리방침 /privacy 에 같은 값으로 표시)
 * TODO(확정 필요): 발송 실패(FAILED) 이메일 보관 기한 — 지나면 자동 삭제
 */
export const FAILED_EMAIL_RETENTION_DAYS = 7;
/** TODO(확정 필요): IP 해시(post_attempt) 보관 기한 — 판단에는 최대 10분만 필요 */
export const POST_ATTEMPT_RETENTION_DAYS = 1;

/** 개인정보처리방침 문의처. TODO(확정 필요): 팀 연락 이메일 (비워 두면 "준비 중"으로 표시) */
export const PRIVACY_CONTACT_EMAIL = "";

/**
 * Cloudflare Turnstile 공식 테스트 키 (항상 통과). 공개된 값이라 코드에 둬도 된다.
 * 개발 환경에서 NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY가 없을 때만 쓴다. 운영에서는 거부한다(server/env.ts).
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
export const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
/** 위젯에 쓸 사이트 키 (NEXT_PUBLIC_ 값은 빌드 때 클라이언트 코드에 박힌다). 운영에서 비어 있으면 위젯이 설정 오류를 안내한다. */
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV === "production" ? "" : TURNSTILE_TEST_SITE_KEY);

/**
 * 스크린샷 첨부 상한: 4MB — 파일은 서버 업로드 폴더(lib/storage.ts)에 두고 DB에는 주소만 저장.
 * 파일은 FormData로 원본 그대로 전송 (next.config.ts의 Server Action 요청 상한 5mb 안)
 */
export const ATTACHMENT_MAX_BYTES = 4 * 1024 * 1024;
/** 허용 이미지 형식 (SVG는 스크립트를 담을 수 있어 제외) */
export const ATTACHMENT_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

/** QnA·버그 목록 페이지당 글 수 */
export const LIST_PAGE_SIZE = 5;

// (설치 파일 용량 상한은 두지 않는다 — 사이트 업로드 기능 없음. 파일은 GitHub Releases에만 둔다)

/**
 * GitHub 저장소 "OWNER/REPO". .env의 GITHUB_REPO 값을 next.config.ts에서 클라이언트에도 주입한다.
 * 값이 없으면 예시값 "OWNER/REPO" → 다운로드 버튼이 "목업 환경" 안내를 띄운다.
 */
export const MOCK_GITHUB_REPO = "OWNER/REPO";
export const GITHUB_REPO = process.env.GITHUB_REPO || MOCK_GITHUB_REPO;
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
