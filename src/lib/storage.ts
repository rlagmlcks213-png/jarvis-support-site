import "server-only";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

// 버그 신고 스크린샷 저장소 (상위설계 UI-014 "파일 저장소(스크린샷)")
// DB bug_report.attachment_url 에는 파일 "주소"만 저장한다.
//
// STORAGE_PROVIDER
//   blob  : Vercel Blob (BLOB_READ_WRITE_TOKEN 필요) — 배포용
//   local : public/uploads/bugs/ 에 저장 — 개발용 (next dev에서만 바로 보임. 운영에서는 쓰지 않음)
// 형식·크기·매직 바이트 검사는 저장 전에 services/bugs.ts에서 끝낸다.

type Provider = "blob" | "local";

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const LOCAL_DIR = path.join(process.cwd(), "public", "uploads", "bugs");
const LOCAL_PREFIX = "/uploads/bugs/";
const LOCAL_NAME_RE = /^[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;

function provider(): Provider {
  const p = (process.env.STORAGE_PROVIDER ?? "local").trim().toLowerCase();
  if (p === "blob") return "blob";
  if (p !== "local") throw new Error(`STORAGE_PROVIDER 값이 올바르지 않아요: ${p} (blob | local)`);
  if (process.env.NODE_ENV === "production")
    throw new Error("운영 환경에서는 STORAGE_PROVIDER=blob 으로 설정해 주세요. (.env)");
  return "local";
}

function blobToken() {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new Error("BLOB_READ_WRITE_TOKEN 환경변수가 없어요. (.env)");
  return t;
}

/** 검사를 마친 이미지를 저장하고, DB에 넣을 주소를 돌려준다 */
export async function saveBugAttachment(bytes: Uint8Array, type: string): Promise<string> {
  const ext = EXT[type];
  if (!ext) throw new Error(`허용하지 않는 형식: ${type}`);
  const name = `${randomUUID()}.${ext}`;
  if (provider() === "blob") {
    const r = await put(`bugs/${name}`, Buffer.from(bytes), { access: "public", contentType: type, addRandomSuffix: false, token: blobToken() });
    return r.url;
  }
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, name), bytes);
  return LOCAL_PREFIX + name;
}

/** 저장소 파일 삭제. 실패해도 글 삭제·수정은 계속 진행되도록 오류를 던지지 않고 로그만 남긴다. */
export async function deleteBugAttachment(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith(LOCAL_PREFIX)) {
      const name = url.slice(LOCAL_PREFIX.length);
      if (LOCAL_NAME_RE.test(name)) await fs.rm(path.join(LOCAL_DIR, name), { force: true });
      return;
    }
    if (/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(url)) {
      await del(url, { token: blobToken() });
    }
    // 그 밖의 값(예전 data URL 등)은 저장소 파일이 없으므로 할 일 없음
  } catch (e) {
    console.error("[storage] 첨부 파일 삭제 실패:", url, e instanceof Error ? e.message : e);
  }
}
