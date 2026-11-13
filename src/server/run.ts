import "server-only";
import { Prisma } from "@prisma/client";
import { RepoError, type ActionResult } from "@/lib/repository/errors";

/** 서비스 호출을 ActionResult로 감싼다. 예상 못 한 오류는 서버 로그에만 남기고 일반 문구로 돌려준다. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof RepoError) return { ok: false, error: e.message, code: e.code, fields: e.fields };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return { ok: false, error: "대상을 찾을 수 없어요. 이미 삭제되었을 수 있어요.", code: "NOT_FOUND" };
    console.error("[action]", e);
    return { ok: false, error: "서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.", code: "SERVER" };
  }
}

// ── 입력 정리 (Server Action은 누구나 호출할 수 있으므로 타입을 믿지 않는다) ──
export const str = (v: unknown, max = 5000): string => (typeof v === "string" ? v.slice(0, max) : "");
export const bool = (v: unknown): boolean => v === true;
export function id(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) throw new RepoError("잘못된 요청이에요.", "VALIDATION");
  return n;
}
export const page = (v: unknown): number => (typeof v === "number" && Number.isInteger(v) && v > 0 ? Math.min(v, 10_000) : 1);
export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
