import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// 버그 신고 스크린샷 저장소 (상위설계 UI-014 "파일 저장소(스크린샷)")
// - 파일은 서버 디스크의 업로드 폴더에 저장하고, DB bug_report.attachment_url 에는 "주소"만 저장한다.
// - 업로드 폴더: UPLOAD_DIR 환경변수 (기본값: 프로젝트 폴더의 uploads/). public/ 밖이라 git·빌드에 섞이지 않는다.
// - 화면에는 GET /api/uploads/bugs/{파일명} 라우트로 보여준다 (next start 운영 환경에서도 동작).
// 형식·크기·매직 바이트 검사는 저장 전에 services/bugs.ts에서 끝낸다.

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const TYPE_OF: Record<string, string> = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
const URL_PREFIX = "/api/uploads/bugs/";
const NAME_RE = /^[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;

const bugDir = () => path.join(path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")), "bugs");

/** 검사를 마친 이미지를 저장하고, DB에 넣을 주소를 돌려준다 */
export async function saveBugAttachment(bytes: Uint8Array, type: string): Promise<string> {
  const ext = EXT[type];
  if (!ext) throw new Error(`허용하지 않는 형식: ${type}`);
  const name = `${randomUUID()}.${ext}`;
  await fs.mkdir(bugDir(), { recursive: true });
  await fs.writeFile(path.join(bugDir(), name), bytes);
  return URL_PREFIX + name;
}

/** 저장된 파일 읽기 (서빙 라우트용). 파일명 형식이 틀리거나 없으면 null */
export async function readBugAttachment(name: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (!NAME_RE.test(name)) return null;
  try {
    const bytes = await fs.readFile(path.join(bugDir(), name));
    return { bytes, type: TYPE_OF[name.split(".").pop()!] };
  } catch {
    return null;
  }
}

/** 저장소 파일 삭제. 실패해도 글 삭제·수정은 계속 진행되도록 오류를 던지지 않고 로그만 남긴다. */
export async function deleteBugAttachment(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith(URL_PREFIX)) return; // 그 밖의 값(예전 형식 등)은 저장 파일이 없음
  const name = url.slice(URL_PREFIX.length);
  if (!NAME_RE.test(name)) return;
  try {
    await fs.rm(path.join(bugDir(), name), { force: true });
  } catch (e) {
    console.error("[storage] 첨부 파일 삭제 실패:", url, e instanceof Error ? e.message : e);
  }
}
