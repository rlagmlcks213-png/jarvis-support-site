import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { GITHUB_REPO } from "@/lib/constants";
import { LIMITS, checkLength, cleanText } from "@/lib/validation";
import { releasesPrefix, validateReleasePayload, type ReleasePayload, type ValidRelease } from "@/lib/release-validation";
import { pickLatestRelease, sortReleasesDesc } from "@/lib/release-utils";
import { todayYmd } from "@/lib/format";
import type { BugStatus, Release } from "@/lib/types";
import { RepoError } from "@/lib/repository/errors";
import { BUG_STATUS_TO_VIEW, SOURCE_TO_DB, toReleaseView, versionFromDb, versionToDb, ymdToDate } from "../mappers";

// 설치 파일은 GitHub Releases에만 있다. DB에는 릴리스 정보(버전·URL·해시 등)만 저장한다.

async function allReleases(): Promise<Release[]> {
  return (await db.release.findMany()).map(toReleaseView);
}

// ── 공개 ─────────────────────────────────────────
export async function listVisibleReleases(): Promise<Release[]> {
  return sortReleasesDesc((await allReleases()).filter((r) => !r.isHidden));
}

export async function getLatestRelease(): Promise<Release | null> {
  return pickLatestRelease(await allReleases());
}

export interface ReleaseWithBugs {
  release: Release;
  resolvedBugs: { bugId: number; title: string }[];
}

export async function getReleaseNotes(): Promise<ReleaseWithBugs[]> {
  const rows = await db.release.findMany({
    where: { isHidden: false },
    include: { resolvedBugs: { select: { id: true, title: true }, orderBy: { id: "asc" } } },
  });
  const views = rows.map((r) => ({ release: toReleaseView(r), resolvedBugs: r.resolvedBugs.map((b) => ({ bugId: b.id, title: b.title })) }));
  const order = sortReleasesDesc(views.map((v) => v.release)).map((r) => r.releaseId);
  return order.map((id) => views.find((v) => v.release.releaseId === id)!);
}

// ── 등록 (GitHub 자동 / 수동) ─────────────────────
async function insertRelease(v: ValidRelease, uploadedBy: number | null): Promise<Release> {
  try {
    const r = await db.release.create({
      data: {
        version: versionToDb(v.version),
        releasedAt: ymdToDate(v.releasedAt),
        releaseNote: cleanText(v.releaseNote),
        downloadUrl: v.downloadUrl,
        sha256: v.sha256,
        fileSize: v.fileSize,
        githubReleaseUrl: v.githubReleaseUrl || null,
        source: SOURCE_TO_DB[v.source],
        uploadedBy,
      },
    });
    return toReleaseView(r);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new RepoError(`v${v.version}은(는) 이미 등록된 버전이에요.`, "CONFLICT", { version: "이미 등록된 버전이에요." });
    throw e;
  }
}

async function validate(payload: unknown, mode: "sync" | "manual") {
  const existingVersions = (await db.release.findMany({ select: { version: true } })).map((r) => versionFromDb(r.version));
  return validateReleasePayload(payload, { repo: GITHUB_REPO, existingVersions, mode });
}

/** POST /api/releases/sync — GitHub Actions 자동 등록 (source=GITHUB, uploadedBy=null) */
export async function syncFromGithub(payload: unknown): Promise<{ ok: true; release: Release } | { ok: false; errors: Record<string, string>; duplicate: boolean }> {
  const result = await validate(payload, "sync");
  if (!result.ok) return result;
  try {
    return { ok: true, release: await insertRelease(result.value, null) };
  } catch (e) {
    if (e instanceof RepoError && e.code === "CONFLICT") return { ok: false, errors: e.fields, duplicate: true };
    throw e;
  }
}

function throwValidation(r: { errors: Record<string, string>; duplicate: boolean }): never {
  throw new RepoError(Object.values(r.errors)[0], r.duplicate ? "CONFLICT" : "VALIDATION", r.errors);
}

/** UI-017 [동기화(시뮬레이션)]에 쓸 요청 본문 — 다음 패치 버전 + 예시 SHA-256 */
export async function buildSimulatedSyncPayload(): Promise<ReleasePayload> {
  const latest = sortReleasesDesc(await allReleases())[0];
  const [maj, min, patch] = (latest?.version ?? "0.9.9").split(".").map(Number);
  const version = `${maj}.${min}.${patch + 1}`;
  const prefix = releasesPrefix(GITHUB_REPO);
  return {
    version: `v${version}`,
    releasedAt: todayYmd(),
    releaseNote: `v${version} 자동 배포 (GitHub Actions 시뮬레이션)\n- 변경 사항은 GitHub 릴리스 본문에서 가져와요.`,
    downloadUrl: `${prefix}download/v${version}/HeyJarvis-Setup-${version}.exe`,
    sha256: randomBytes(32).toString("hex"),
    fileSize: 87_000_000 + randomInt(0, 2_000_000),
    githubReleaseUrl: `${prefix}tag/v${version}`,
  };
}

/** 시뮬레이션 — 실제 sync 라우트와 같은 검증·저장 경로를 탄다 */
export async function simulateGithubSync(payload: ReleasePayload): Promise<Release> {
  const r = await syncFromGithub(payload);
  if (!r.ok) throwValidation(r);
  return r.release;
}

export async function createManualRelease(payload: ReleasePayload, adminId: number): Promise<Release> {
  const result = await validate(payload, "manual");
  if (!result.ok) throwValidation(result);
  return insertRelease(result.value, adminId);
}

// ── 관리 ─────────────────────────────────────────
export interface AdminRelease extends Release {
  uploadedByName: string | null;
  linkedBugs: { bugId: number; title: string; status: BugStatus }[];
}

export async function adminListReleases(): Promise<AdminRelease[]> {
  const rows = await db.release.findMany({
    include: { uploader: { select: { name: true } }, resolvedBugs: { select: { id: true, title: true, status: true }, orderBy: { id: "asc" } } },
  });
  const views = rows.map((r) => ({
    ...toReleaseView(r),
    uploadedByName: r.uploader?.name ?? null,
    linkedBugs: r.resolvedBugs.map((b) => ({ bugId: b.id, title: b.title, status: BUG_STATUS_TO_VIEW[b.status] })),
  }));
  return sortReleasesDesc(views) as AdminRelease[];
}

export async function updateReleaseNote(releaseId: number, releaseNote: string) {
  const err = checkLength("릴리스 노트", releaseNote, 2, LIMITS.content.max);
  if (err) throw new RepoError(err);
  await db.release.update({ where: { id: releaseId }, data: { releaseNote: cleanText(releaseNote) } });
}

export async function setReleaseHidden(releaseId: number, hidden: boolean) {
  await db.release.update({ where: { id: releaseId }, data: { isHidden: hidden } });
}

/**
 * 해결된 버그 연결 — 대상은 '수정 완료' 버그만.
 * 공개 릴리스: 해결 릴리스ID 설정 + '배포됨'으로 변경 (화면에서 확인 모달을 먼저 띄움)
 * 숨김 릴리스: 해결 릴리스ID만 설정
 */
export async function linkBugsToRelease(releaseId: number, bugIds: number[]): Promise<{ linked: number; deployed: number }> {
  const r = await db.release.findUnique({ where: { id: releaseId }, select: { isHidden: true } });
  if (!r) throw new RepoError("릴리스를 찾을 수 없어요.", "NOT_FOUND");
  const res = await db.bugReport.updateMany({
    where: { id: { in: bugIds }, status: "FIXED" },
    data: r.isHidden ? { resolvedReleaseId: releaseId } : { resolvedReleaseId: releaseId, status: "DEPLOYED" },
  });
  return { linked: res.count, deployed: r.isHidden ? 0 : res.count };
}

/** 사이트 등록만 삭제 (GitHub 파일은 그대로). '배포됨'이던 연결 버그는 '수정 완료'로 되돌린다. */
export async function deleteRelease(releaseId: number) {
  await db.$transaction([
    db.bugReport.updateMany({ where: { resolvedReleaseId: releaseId, status: "DEPLOYED" }, data: { status: "FIXED" } }),
    db.release.delete({ where: { id: releaseId } }), // resolved_release_id는 onDelete: SetNull
  ]);
}

export async function listFixedBugs() {
  const rows = await db.bugReport.findMany({
    where: { status: "FIXED", mergedIntoBugId: null },
    select: { id: true, title: true, resolvedReleaseId: true },
    orderBy: { id: "asc" },
  });
  return rows.map((b) => ({ bugId: b.id, title: b.title, resolvedReleaseId: b.resolvedReleaseId }));
}
