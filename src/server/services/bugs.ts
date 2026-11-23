import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { cleanText, normalizeVersion } from "@/lib/validation";
import { firstError, validateBug, type BugCreateInput, type BugEditData, type BugEditInput } from "@/lib/post-validation";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES } from "@/lib/constants";
import type { AttachmentMeta, BugOs, BugStatus, PublicBugReport, Release } from "@/lib/types";
import { deleteBugAttachment, saveBugAttachment } from "@/lib/storage";
import { RepoError } from "@/lib/repository/errors";
import { assertCaptcha, type CaptchaAnswer } from "../captcha";
import { assertPasswordAllowed, assertPostCooldown, recordPasswordFail, recordPost } from "../rate-limit";
import { BUG_STATUS_TO_DB, BUG_STATUS_TO_VIEW, toReleaseView, versionFromDb } from "../mappers";
import type { PostAuth } from "./questions";

// ⚠ 공개 select에는 passwordHash · adminMemo를 넣지 않는다
const publicSelect = {
  id: true,
  nickname: true,
  title: true,
  appVersion: true,
  os: true,
  content: true,
  reproSteps: true,
  attachmentUrl: true,
  status: true,
  resolvedReleaseId: true,
  createdAt: true,
  mergedIntoBugId: true,
} satisfies Prisma.BugReportSelect;
type PublicRow = Prisma.BugReportGetPayload<{ select: typeof publicSelect }>;

const toPublic = (b: PublicRow): PublicBugReport => ({
  bugId: b.id,
  nickname: b.nickname,
  title: b.title,
  appVersion: b.appVersion,
  os: b.os,
  content: b.content,
  reproSteps: b.reproSteps,
  attachmentUrl: b.attachmentUrl,
  status: BUG_STATUS_TO_VIEW[b.status],
  resolvedReleaseId: b.resolvedReleaseId,
  createdAt: b.createdAt.toISOString(),
  mergedIntoBugId: b.mergedIntoBugId,
});

function throwFieldErrors(errors: Record<string, string | undefined>) {
  const f = firstError(errors);
  if (f) throw new RepoError(f[1], "VALIDATION", Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Record<string, string>);
}

// ── 첨부 이미지 ────────────────────────────────────
// 파일은 서버 업로드 폴더(lib/storage.ts)에 두고 attachment_url에는 주소(/api/uploads/bugs/…)만 저장한다.

/** Server Action이 FormData에서 꺼낸 파일 */
export type UploadedFile = AttachmentMeta & { bytes: Uint8Array };

function sniffImage(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((v, i) => b[i] === v)) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** 형식·크기·실제 파일 내용(매직 바이트)까지 확인 → 실제 형식을 돌려준다 (SVG 등은 거부) */
function checkAttachment(a: UploadedFile): string {
  const fail = (m: string) => new RepoError(m, "VALIDATION", { attachment: m });
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(a.type)) throw fail("PNG, JPG, GIF, WEBP 이미지만 첨부할 수 있어요.");
  if (a.bytes.length > ATTACHMENT_MAX_BYTES) throw fail(`첨부 파일이 너무 커요. ${Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024)}MB 이하 이미지로 올려 주세요.`);
  if (a.bytes.length === 0 || sniffImage(a.bytes) !== a.type) throw fail("이미지 파일이 올바르지 않아요. 다른 파일로 다시 시도해 주세요.");
  return a.type;
}

// ── 공개 ─────────────────────────────────────────
export interface BugListItem {
  bugId: number;
  nickname: string;
  title: string;
  appVersion: string;
  os: string;
  status: BugStatus;
  createdAt: string;
  mergedIntoBugId: number | null;
  resolvedVersion: string | null;
}

export async function listBugs(p: { status: BugStatus | "전체"; page: number; pageSize: number }) {
  const where: Prisma.BugReportWhereInput = p.status === "전체" ? {} : { status: BUG_STATUS_TO_DB[p.status] };
  const [total, rows] = await db.$transaction([
    db.bugReport.count({ where }),
    db.bugReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, (p.page - 1) * p.pageSize),
      take: p.pageSize,
      select: {
        id: true, nickname: true, title: true, appVersion: true, os: true, status: true, createdAt: true, mergedIntoBugId: true,
        resolvedRelease: { select: { version: true, isHidden: true } },
      },
    }),
  ]);
  const items: BugListItem[] = rows.map((b) => ({
    bugId: b.id,
    nickname: b.nickname,
    title: b.title,
    appVersion: b.appVersion,
    os: b.os,
    status: BUG_STATUS_TO_VIEW[b.status],
    createdAt: b.createdAt.toISOString(),
    mergedIntoBugId: b.mergedIntoBugId,
    resolvedVersion: b.resolvedRelease && !b.resolvedRelease.isHidden ? versionFromDb(b.resolvedRelease.version) : null,
  }));
  return { total, items };
}

export async function getBug(id: number): Promise<{ bug: PublicBugReport; resolvedRelease: Release | null } | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const b = await db.bugReport.findUnique({ where: { id }, select: { ...publicSelect, resolvedRelease: true } });
  if (!b) return null;
  const r = b.resolvedRelease && !b.resolvedRelease.isHidden ? toReleaseView(b.resolvedRelease) : null;
  return { bug: toPublic(b), resolvedRelease: r };
}

export async function createBug(input: BugCreateInput & { attachment: UploadedFile | null }, captcha: CaptchaAnswer, ipHash: string): Promise<number> {
  await assertCaptcha(captcha);
  throwFieldErrors(validateBug(input, { requirePassword: true }));
  const type = input.attachment ? checkAttachment(input.attachment) : null;
  await assertPostCooldown(ipHash, "bug_report");
  const attachmentUrl = input.attachment && type ? await saveBugAttachment(input.attachment.bytes, type) : null;
  const b = await db.bugReport.create({
    data: {
      nickname: cleanText(input.nickname),
      passwordHash: await hashPassword(input.password),
      title: cleanText(input.title),
      appVersion: normalizeVersion(cleanText(input.appVersion)),
      os: input.os,
      content: cleanText(input.content),
      reproSteps: cleanText(input.reproSteps),
      attachmentUrl,
    },
    select: { id: true },
  }).catch(async (e) => {
    await deleteBugAttachment(attachmentUrl); // DB 저장 실패 시 올린 파일 정리
    throw e;
  });
  await recordPost(ipHash, "bug_report");
  return b.id;
}

/** 글 비밀번호 확인. 관리자는 통과. 같은 IP·같은 글에서 10분 안에 5번 틀리면 10분 차단 (QnA와 같은 규칙) */
async function authorizeBug(id: number, auth: PostAuth) {
  const b = await db.bugReport.findUnique({ where: { id }, select: { id: true, passwordHash: true, attachmentUrl: true } });
  if (!b) throw new RepoError("글을 찾을 수 없어요. 이미 삭제되었을 수 있어요.", "NOT_FOUND");
  if (auth.isAdmin) return b;
  await assertPasswordAllowed(auth.ipHash, "bug_report", id);
  if (!auth.password || !(await verifyPassword(auth.password, b.passwordHash))) {
    await recordPasswordFail(auth.ipHash, "bug_report", id);
    throw new RepoError("비밀번호가 일치하지 않아요. 다시 입력해 주세요.", "WRONG_PASSWORD");
  }
  return b;
}

export async function getBugForEdit(id: number, auth: PostAuth): Promise<BugEditData> {
  await authorizeBug(id, auth);
  const b = await db.bugReport.findUniqueOrThrow({ where: { id }, select: publicSelect });
  return {
    nickname: b.nickname,
    title: b.title,
    appVersion: b.appVersion,
    os: b.os as BugOs,
    content: b.content,
    reproSteps: b.reproSteps,
    attachmentUrl: b.attachmentUrl,
  };
}

/** attachment: "keep" = 유지, null = 삭제, 파일 = 교체. 교체·삭제하면 예전 파일도 저장소에서 지운다 */
export async function updateBug(id: number, auth: PostAuth, input: Omit<BugEditInput, "attachment"> & { attachment: UploadedFile | null | "keep" }) {
  const current = await authorizeBug(id, auth);
  throwFieldErrors(validateBug(input, { requirePassword: false }));
  const newFile = input.attachment !== "keep" ? input.attachment : null;
  const type = newFile ? checkAttachment(newFile) : null;
  const newUrl = newFile && type ? await saveBugAttachment(newFile.bytes, type) : null;
  const attachment = input.attachment === "keep" ? {} : { attachmentUrl: newUrl };
  await db.bugReport.update({
    where: { id },
    data: {
      nickname: cleanText(input.nickname),
      title: cleanText(input.title),
      appVersion: normalizeVersion(cleanText(input.appVersion)),
      os: input.os,
      content: cleanText(input.content),
      reproSteps: cleanText(input.reproSteps),
      ...attachment,
    },
  }).catch(async (e) => {
    await deleteBugAttachment(newUrl);
    throw e;
  });
  if (input.attachment !== "keep" && current.attachmentUrl) await deleteBugAttachment(current.attachmentUrl);
}

export async function deleteBug(id: number, auth: PostAuth) {
  const b = await authorizeBug(id, auth);
  await db.bugReport.delete({ where: { id } }); // 이 글로 병합돼 있던 글의 merged_into_bug_id는 SetNull
  await deleteBugAttachment(b.attachmentUrl);
}

// ── 관리자 ───────────────────────────────────────
export interface AdminBug extends PublicBugReport {
  adminMemo: string;
  resolvedVersion: string | null;
}

export async function adminListBugs(): Promise<AdminBug[]> {
  const rows = await db.bugReport.findMany({
    orderBy: { createdAt: "desc" },
    select: { ...publicSelect, adminMemo: true, resolvedRelease: { select: { version: true } } },
  });
  return rows.map((b) => ({
    ...toPublic(b),
    adminMemo: b.adminMemo ?? "",
    resolvedVersion: b.resolvedRelease ? versionFromDb(b.resolvedRelease.version) : null,
  }));
}

export async function updateBugStatus(bugId: number, status: BugStatus, resolvedReleaseId: number | null | undefined) {
  const b = await db.bugReport.findUnique({ where: { id: bugId }, select: { resolvedReleaseId: true } });
  if (!b) throw new RepoError("버그 신고를 찾을 수 없어요.", "NOT_FOUND");
  const releaseId = resolvedReleaseId === undefined ? b.resolvedReleaseId : resolvedReleaseId;
  if (releaseId != null && !(await db.release.findUnique({ where: { id: releaseId }, select: { id: true } })))
    throw new RepoError("선택한 릴리스를 찾을 수 없어요.", "NOT_FOUND");
  if (status === "배포됨" && releaseId == null)
    throw new RepoError("'배포됨'으로 바꾸려면 해결 릴리스를 먼저 선택해 주세요.", "VALIDATION");
  await db.bugReport.update({ where: { id: bugId }, data: { status: BUG_STATUS_TO_DB[status], resolvedReleaseId: releaseId } });
}

export async function updateBugMemo(bugId: number, memo: string) {
  await db.bugReport.update({ where: { id: bugId }, data: { adminMemo: memo.slice(0, 3000) || null } });
}

/** 중복 신고 병합: duplicateId(중복 글)를 targetId(원본)로. null이면 병합 해제 */
export async function mergeBug(duplicateId: number, targetId: number | null) {
  if (targetId === null) {
    await db.bugReport.update({ where: { id: duplicateId }, data: { mergedIntoBugId: null } });
    return;
  }
  if (targetId === duplicateId) throw new RepoError("자기 자신에게는 병합할 수 없어요.");
  const all = await db.bugReport.findMany({ select: { id: true, mergedIntoBugId: true } });
  const byId = new Map(all.map((b) => [b.id, b]));
  if (!byId.has(duplicateId)) throw new RepoError("버그 신고를 찾을 수 없어요.", "NOT_FOUND");
  let target = byId.get(targetId);
  if (!target) throw new RepoError("병합할 원본 글을 찾을 수 없어요.", "NOT_FOUND");
  // 원본이 이미 다른 글로 병합돼 있으면 최종 원본으로 따라간다
  const seen = new Set([duplicateId]);
  while (target.mergedIntoBugId != null) {
    if (seen.has(target.id)) throw new RepoError("병합 관계가 순환돼요. 다른 원본을 선택해 주세요.", "CONFLICT");
    seen.add(target.id);
    const next = byId.get(target.mergedIntoBugId);
    if (!next) break;
    target = next;
  }
  if (target.id === duplicateId) throw new RepoError("병합 관계가 순환돼요. 다른 원본을 선택해 주세요.", "CONFLICT");
  await db.$transaction([
    db.bugReport.update({ where: { id: duplicateId }, data: { mergedIntoBugId: target.id } }),
    // 이 글로 병합돼 있던 글들도 새 원본으로 옮긴다
    db.bugReport.updateMany({ where: { mergedIntoBugId: duplicateId }, data: { mergedIntoBugId: target.id } }),
  ]);
}
