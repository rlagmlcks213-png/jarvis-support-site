// 서버(API 라우트)·클라이언트 공용 순수 함수
import type { Release } from "./types";
import { compareVersion } from "./format";
import { MOCK_GITHUB_REPO } from "./constants";

export function sortReleasesDesc(releases: Release[]): Release[] {
  return [...releases].sort(
    (a, b) => compareVersion(b.version, a.version) || b.releasedAt.localeCompare(a.releasedAt),
  );
}

/** 예시 URL(OWNER/REPO 포함)이면 실제로 받을 파일이 없다 */
export function isMockDownloadUrl(url: string): boolean {
  return url.includes(MOCK_GITHUB_REPO);
}

export function pickLatestRelease(releases: Release[]): Release | null {
  return sortReleasesDesc(releases.filter((r) => !r.isHidden))[0] ?? null;
}
