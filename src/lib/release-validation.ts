// 릴리스 등록 검증 — 서버(/api/releases/sync)와 클라이언트(UI-017 동기화 시뮬레이션·수동 등록)가 함께 쓴다.
// 브라우저 전용 API를 import 하지 말 것.
import { compareVersion } from "./format";
import type { ReleaseSource } from "./types";

/** 요청 본문 / 폼 입력 (외부 입력이므로 unknown으로 받아 검사) */
export interface ReleasePayload {
  version: string;
  releasedAt: string;
  releaseNote: string;
  downloadUrl: string;
  sha256: string;
  fileSize: number | string;
  githubReleaseUrl?: string;
}

/** 검증·정규화를 통과한 값 (version은 v 접두사 제거) */
export interface ValidRelease {
  version: string;
  releasedAt: string;
  releaseNote: string;
  downloadUrl: string;
  sha256: string;
  fileSize: number;
  githubReleaseUrl: string;
  source: ReleaseSource;
}

export type ReleaseValidation =
  | { ok: true; value: ValidRelease }
  | { ok: false; errors: Record<string, string>; duplicate: boolean };

const NOTE_MAX = 3000;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function releasesPrefix(repo: string) {
  return `https://github.com/${repo}/releases/`;
}

/**
 * @param mode 'sync'   = GitHub Actions 자동 등록 (githubReleaseUrl 필수)
 *             'manual' = 관리자 수동 등록 (githubReleaseUrl을 비우면 태그 주소로 생성)
 */
export function validateReleasePayload(
  input: unknown,
  opts: { repo: string; existingVersions: string[]; mode: "sync" | "manual" },
): ReleaseValidation {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  let duplicate = false;
  const prefix = releasesPrefix(opts.repo);

  // version: vX.Y.Z (v 생략도 허용 → 저장은 X.Y.Z)
  const rawVersion = str(body.version);
  const version = rawVersion.replace(/^v/i, "");
  if (!/^v?\d+\.\d+\.\d+$/i.test(rawVersion)) {
    errors.version = "버전은 v1.0.2 형식으로 입력해 주세요.";
  } else if (opts.existingVersions.some((v) => compareVersion(v, version) === 0)) {
    errors.version = `v${version}은(는) 이미 등록된 버전이에요. 버전을 확인해 주세요.`;
    duplicate = true;
  }

  const releasedAt = str(body.releasedAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releasedAt) || Number.isNaN(new Date(`${releasedAt}T00:00:00Z`).getTime())) {
    errors.releasedAt = "배포일은 YYYY-MM-DD 형식으로 입력해 주세요.";
  }

  const releaseNote = str(body.releaseNote);
  if (releaseNote.length < 2) errors.releaseNote = "릴리스 노트를 입력해 주세요.";
  else if (releaseNote.length > NOTE_MAX) errors.releaseNote = `릴리스 노트는 ${NOTE_MAX}자 이하로 줄여 주세요.`;

  // downloadUrl: 우리 저장소의 GitHub Release 파일 + .exe (현재 Windows만 배포)
  const downloadUrl = str(body.downloadUrl);
  if (!downloadUrl.startsWith(prefix)) {
    errors.downloadUrl = `다운로드 URL은 ${prefix} 로 시작해야 해요.`;
  } else if (!/\.exe$/i.test(downloadUrl)) {
    errors.downloadUrl = "다운로드 URL은 .exe 파일이어야 해요. (현재 Windows만 배포)";
  }

  const sha256 = str(body.sha256).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sha256)) errors.sha256 = "SHA-256은 64자리 16진수여야 해요.";

  // fileSize: DB의 file_size(Int, 필수) — 2GB 미만의 양의 정수(byte)
  let fileSize = 0;
  const size = typeof body.fileSize === "string" && body.fileSize.trim() !== "" ? Number(body.fileSize) : body.fileSize;
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > 2_147_483_647) {
    errors.fileSize = "파일 크기는 2GB 미만의 양의 정수(byte)로 입력해 주세요.";
  } else fileSize = size;

  // githubReleaseUrl: sync는 필수, 수동 등록은 비워 두면 태그 주소로 만든다
  let githubReleaseUrl = str(body.githubReleaseUrl);
  if (!githubReleaseUrl && opts.mode === "manual") githubReleaseUrl = `${prefix}tag/v${version}`;
  if (!githubReleaseUrl.startsWith(prefix)) errors.githubReleaseUrl = `GitHub 릴리스 URL은 ${prefix} 로 시작해야 해요.`;

  if (Object.keys(errors).length) return { ok: false, errors, duplicate };
  return {
    ok: true,
    value: { version, releasedAt, releaseNote, downloadUrl, sha256, fileSize, githubReleaseUrl, source: opts.mode === "sync" ? "github" : "manual" },
  };
}
