// 서버·클라이언트 공용 오류 타입. 브라우저/서버 전용 API를 import 하지 말 것.

export type ErrorCode =
  | "NOT_FOUND"
  | "WRONG_PASSWORD"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "RATE_LIMIT"
  | "LOCKED"
  | "CONFLICT"
  | "SERVER";

export class RepoError extends Error {
  constructor(
    message: string,
    public code: ErrorCode = "VALIDATION",
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "RepoError";
  }
}

/** Server Action이 돌려주는 결과. (운영 빌드에서는 throw한 메시지가 가려지므로 결과 객체로 전달한다) */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ErrorCode; fields?: Record<string, string> };

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
}
