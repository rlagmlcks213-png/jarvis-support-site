import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// 버그 신고 스크린샷 저장소 (상위설계 UI-014 "파일 저장소(스크린샷)")
// - DB bug_report.attachment_url 에는 "주소"(/api/uploads/bugs/{파일명})만 저장한다.
// - 화면에는 GET /api/uploads/bugs/{파일명} 라우트로 보여준다.
// - 저장 위치는 UPLOAD_STORAGE 값으로 고른다 (next.config.ts에서 빌드 시점에 정해짐).
//     "netlify" : Netlify Blobs (Netlify에서 빌드하면 자동 선택). 서버리스라 디스크에 저장하면 사라지기 때문.
//     "fs"      : 서버 디스크의 업로드 폴더 (로컬 개발 기본값). 폴더 = UPLOAD_DIR (기본값: 프로젝트 폴더의 uploads/)
// - 두 방식 모두 파일 이름·주소 형식이 같아서 DB와 다른 코드는 바꿀 필요가 없다.
// 형식·크기·매직 바이트 검사는 저장 전에 services/bugs.ts에서 끝낸다.

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const TYPE_OF: Record<string, string> = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
const URL_PREFIX = "/api/uploads/bugs/";
const NAME_RE = /^[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;

const useNetlifyBlobs = () => process.env.UPLOAD_STORAGE === "netlify";

// ── Netlify Blobs ──
const BLOB_STORE = "bug-screenshots";
async function blobStore() {
  const { getStore } = await import("@netlify/blobs");
  // strong: 저장 직후 상세 화면에서 바로 읽어도 보이도록
  return getStore({ name: BLOB_STORE, consistency: "strong" });
}

// ── 서버 디스크 ──
const bugDir = () => path.join(path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")), "bugs");

/** 검사를 마친 이미지를 저장하고, DB에 넣을 주소를 돌려준다 */
export async function saveBugAttachment(bytes: Uint8Array, type: string): Promise<string> {
  const ext = EXT[type];
  if (!ext) throw new Error(`허용하지 않는 형식: ${type}`);
  const name = `${randomUUID()}.${ext}`;
  if (useNetlifyBlobs()) {
    const store = await blobStore();
    // 새 ArrayBuffer로 복사 (Uint8Array가 더 큰 버퍼의 일부일 수 있음)
    await store.set(name, bytes.slice().buffer as ArrayBuffer);
  } else {
    await fs.mkdir(bugDir(), { recursive: true });
    await fs.writeFile(path.join(bugDir(), name), bytes);
  }
  return URL_PREFIX + name;
}

/** 저장된 파일 읽기 (서빙 라우트용). 파일명 형식이 틀리거나 없으면 null */
export async function readBugAttachment(name: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (!NAME_RE.test(name)) return null;
  const type = TYPE_OF[name.split(".").pop()!];
  try {
    if (useNetlifyBlobs()) {
      const store = await blobStore();
      const data = await store.get(name, { type: "arrayBuffer" });
      return data ? { bytes: Buffer.from(data), type } : null;
    }
    const bytes = await fs.readFile(path.join(bugDir(), name));
    return { bytes, type };
  } catch (e) {
    if (useNetlifyBlobs()) console.error("[storage] 첨부 파일 읽기 실패:", name, e instanceof Error ? e.message : e);
    return null;
  }
}

/** 저장소 파일 삭제. 실패해도 글 삭제·수정은 계속 진행되도록 오류를 던지지 않고 로그만 남긴다. */
export async function deleteBugAttachment(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith(URL_PREFIX)) return; // 그 밖의 값(예전 형식 등)은 저장 파일이 없음
  const name = url.slice(URL_PREFIX.length);
  if (!NAME_RE.test(name)) return;
  try {
    if (useNetlifyBlobs()) {
      await (await blobStore()).delete(name);
    } else {
      await fs.rm(path.join(bugDir(), name), { force: true });
    }
  } catch (e) {
    console.error("[storage] 첨부 파일 삭제 실패:", url, e instanceof Error ? e.message : e);
  }
}
