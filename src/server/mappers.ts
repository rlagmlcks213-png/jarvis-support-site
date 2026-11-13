import "server-only";
import type {
  BugStatus as DbBugStatus,
  NotifyStatus,
  Release as DbRelease,
  ReleaseSource as DbReleaseSource,
} from "@prisma/client";
import type { BugStatus, NotifyStatusLabel, Release, ReleaseSource } from "@/lib/types";

// DB ↔ 화면 값 변환 (enum은 DB에 영문, 화면에는 한글)

export const BUG_STATUS_TO_VIEW: Record<DbBugStatus, BugStatus> = {
  RECEIVED: "접수",
  CHECKING: "확인 중",
  FIXED: "수정 완료",
  DEPLOYED: "배포됨",
};
export const BUG_STATUS_TO_DB: Record<BugStatus, DbBugStatus> = {
  접수: "RECEIVED",
  "확인 중": "CHECKING",
  "수정 완료": "FIXED",
  배포됨: "DEPLOYED",
};

export const NOTIFY_LABEL: Record<NotifyStatus, NotifyStatusLabel> = {
  NONE: "없음",
  PENDING: "알림 대기",
  SENT: "발송 완료",
  FAILED: "발송 실패",
};

const SOURCE_TO_VIEW: Record<DbReleaseSource, ReleaseSource> = { GITHUB: "github", MANUAL: "manual" };
export const SOURCE_TO_DB: Record<ReleaseSource, DbReleaseSource> = { github: "GITHUB", manual: "MANUAL" };

/** DB에는 "v1.0.1"(스키마 주석 vX.Y.Z), 화면에는 "1.0.1" */
export const versionToDb = (v: string) => `v${v.replace(/^v/i, "")}`;
export const versionFromDb = (v: string) => v.replace(/^v/i, "");

/** 배포일: DB DateTime(UTC 자정) ↔ "YYYY-MM-DD" */
export const ymdToDate = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
export const dateToYmd = (d: Date) => d.toISOString().slice(0, 10);

export function toReleaseView(r: DbRelease): Release {
  return {
    releaseId: r.id,
    version: versionFromDb(r.version),
    releasedAt: dateToYmd(r.releasedAt),
    releaseNote: r.releaseNote,
    downloadUrl: r.downloadUrl,
    sha256: r.sha256,
    fileSize: r.fileSize,
    githubReleaseUrl: r.githubReleaseUrl,
    source: SOURCE_TO_VIEW[r.source],
    uploadedBy: r.uploadedBy,
    isHidden: r.isHidden,
  };
}

