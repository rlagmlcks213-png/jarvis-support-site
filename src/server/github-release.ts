import "server-only";
import { GITHUB_REPO, MOCK_GITHUB_REPO } from "@/lib/constants";
import type { ReleasePayload } from "@/lib/release-validation";
import type { Release } from "@/lib/types";
import { RepoError } from "@/lib/repository/errors";
import { githubToken } from "./env";
import { existingReleaseVersions, hideGithubReleaseByVersion, syncFromGithub, updateReleaseNoteByVersion } from "./services/releases";

// GitHub REST API의 release 객체 → 사이트 릴리스 등록.
// webhook(api/releases/github-webhook)과 관리자 "GitHub에서 가져오기" 버튼이 같이 쓴다.
// 검증·저장은 기존 POST /api/releases/sync와 같은 경로(syncFromGithub → validate "sync" → insertRelease)를 탄다.

const NOTE_MAX = 3000;
const NOTE_FALLBACK = "변경 사항은 GitHub 릴리스 페이지를 참고해 주세요.";

export type GithubRegisterResult =
  | { status: "created"; release: Release; version: string }
  | { status: "duplicate"; version: string; reason: string }
  | { status: "skipped"; version: string; reason: string }
  /** .exe 자산이 아직 업로드되지 않음 (Actions가 릴리스를 먼저 만들고 파일을 나중에 올리는 경우) */
  | { status: "no_asset"; version: string; reason: string }
  | { status: "invalid"; version: string; reason: string; errors: Record<string, string> };

interface GithubAsset {
  name: string;
  state: string;
  size: number;
  browser_download_url: string;
  digest: string | null;
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** GitHub 릴리스 본문 → 릴리스 노트 (2자 미만이면 안내 문구, 3000자 초과면 잘라서 …) */
export function noteFromGithubBody(body: unknown): string {
  const note = text(body).trim();
  if (note.length < 2) return NOTE_FALLBACK;
  return note.length > NOTE_MAX ? `${note.slice(0, NOTE_MAX - 1)}…` : note;
}

/** ISO 시각 → Asia/Seoul 기준 YYYY-MM-DD */
function seoulYmd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** 업로드가 끝난 .exe 중 이름에 setup이 들어간 것 우선, 그다음 가장 큰 파일 */
function pickExeAsset(assets: unknown): GithubAsset | null {
  const list = (Array.isArray(assets) ? assets : [])
    .map(rec)
    .map((a) => ({
      name: text(a.name),
      state: text(a.state),
      size: typeof a.size === "number" ? a.size : 0,
      browser_download_url: text(a.browser_download_url),
      digest: typeof a.digest === "string" ? a.digest : null,
    }))
    .filter((a) => /\.exe$/i.test(a.name) && a.state === "uploaded");
  if (!list.length) return null;
  const setup = list.filter((a) => /setup/i.test(a.name));
  const pool = setup.length ? setup : list;
  return pool.reduce((best, a) => (a.size > best.size ? a : best));
}

/** "sha256:<64 hex>" → 64 hex. 형식이 다르면 null */
function sha256FromDigest(digest: string | null): string | null {
  const m = digest?.match(/^sha256:([0-9a-f]{64})$/i);
  return m ? m[1].toLowerCase() : null;
}

export async function registerFromGithubRelease(release: unknown): Promise<GithubRegisterResult> {
  const r = rec(release);
  const version = text(r.tag_name).trim();
  if (r.draft === true || r.prerelease === true) {
    return { status: "skipped", version, reason: "초안(draft) 또는 사전 배포(prerelease) 릴리스라 등록하지 않았어요." };
  }

  const asset = pickExeAsset(r.assets);
  if (!asset) return { status: "no_asset", version, reason: "설치 파일(.exe)이 아직 없어요." };

  const sha256 = sha256FromDigest(asset.digest);
  if (!sha256) {
    const msg = "SHA-256을 가져오지 못했어요. 관리자 화면에서 수동 등록해 주세요.";
    return { status: "invalid", version, reason: msg, errors: { sha256: msg } };
  }

  const payload: ReleasePayload = {
    version,
    releasedAt: seoulYmd(text(r.published_at)),
    releaseNote: noteFromGithubBody(r.body),
    downloadUrl: asset.browser_download_url,
    sha256,
    fileSize: asset.size,
    githubReleaseUrl: text(r.html_url),
  };
  const result = await syncFromGithub(payload);
  if (result.ok) return { status: "created", release: result.release, version };
  if (result.duplicate) return { status: "duplicate", version, reason: "이미 등록된 버전이에요." };
  return { status: "invalid", version, reason: Object.values(result.errors)[0] ?? "입력값 형식이 올바르지 않아요.", errors: result.errors };
}

// ── GitHub API ─────────────────────────────────────
function assertRepoConfigured() {
  if (GITHUB_REPO === MOCK_GITHUB_REPO) throw new RepoError("GITHUB_REPO 환경변수(앱 저장소 OWNER/REPO)를 먼저 설정해 주세요.", "SERVER");
}

async function githubGet(path: string): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "jarvis-support-site",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = githubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new RepoError(`GitHub API 응답 오류 (HTTP ${res.status})`, "SERVER");
  return res.json();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * webhook용: .exe가 아직 없으면 GitHub API로 최대 3번(2초 간격) 다시 조회해 본다.
 * (GitHub webhook은 10초 안에 응답해야 하므로 횟수를 늘리지 말 것)
 */
export async function registerWithAssetRetry(release: unknown): Promise<GithubRegisterResult> {
  let result = await registerFromGithubRelease(release);
  const releaseId = rec(release).id;
  if (typeof releaseId !== "number") return result;
  for (let i = 0; i < 3 && result.status === "no_asset"; i++) {
    await sleep(2000);
    try {
      result = await registerFromGithubRelease(await githubGet(`/releases/${releaseId}`));
    } catch (e) {
      console.error("[github-webhook] 릴리스 다시 조회 실패:", e instanceof Error ? e.message : e);
    }
  }
  return result;
}

/** release.deleted — GitHub 자동 등록 릴리스면 삭제하지 않고 숨긴다 */
export async function hideDeletedGithubRelease(release: unknown): Promise<boolean> {
  return hideGithubReleaseByVersion(text(rec(release).tag_name));
}

/** release.edited — 같은 버전이 있으면 릴리스 노트만 갱신 */
export async function updateNoteFromGithubRelease(release: unknown): Promise<boolean> {
  const r = rec(release);
  return updateReleaseNoteByVersion(text(r.tag_name), noteFromGithubBody(r.body));
}

export interface GithubImportSummary {
  created: string[];
  existing: number;
  failed: { version: string; reason: string }[];
}

/** 관리자 "GitHub에서 최신 릴리스 가져오기" — 최근 10개 중 DB에 없는 정식 릴리스를 모두 등록 */
export async function importRecentGithubReleases(): Promise<GithubImportSummary> {
  assertRepoConfigured();
  const list = await githubGet("/releases?per_page=10");
  if (!Array.isArray(list)) throw new RepoError("GitHub API 응답 형식이 예상과 달라요.", "SERVER");

  const existing = new Set(await existingReleaseVersions());
  const summary: GithubImportSummary = { created: [], existing: 0, failed: [] };
  for (const item of list) {
    const r = rec(item);
    if (r.draft === true || r.prerelease === true) continue;
    const version = text(r.tag_name).trim();
    if (existing.has(version.replace(/^v/i, ""))) {
      summary.existing++;
      continue;
    }
    const res = await registerFromGithubRelease(r);
    if (res.status === "created") summary.created.push(res.release.version);
    else if (res.status === "duplicate") summary.existing++;
    else if (res.status !== "skipped") summary.failed.push({ version: version || "(태그 없음)", reason: res.reason });
  }
  return summary;
}
