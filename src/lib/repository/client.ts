// 클라이언트 공용: Server Action 결과 풀기 + 데이터 변경 알림
import { RepoError, type ActionResult } from "./errors";

export const DATA_CHANGE_EVENT = "jarvis-data-change";

export async function unwrap<T>(p: Promise<ActionResult<T>>): Promise<T> {
  const r = await p;
  if (r.ok) return r.data;
  throw new RepoError(r.error, r.code, r.fields ?? {});
}

/** 변경 후 열려 있는 목록들이 다시 불러오도록 알린다 */
export async function mutate<T>(p: Promise<ActionResult<T>>): Promise<T> {
  const data = await unwrap(p);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DATA_CHANGE_EVENT));
  return data;
}

export function subscribeData(cb: () => void): () => void {
  window.addEventListener(DATA_CHANGE_EVENT, cb);
  return () => window.removeEventListener(DATA_CHANGE_EVENT, cb);
}
