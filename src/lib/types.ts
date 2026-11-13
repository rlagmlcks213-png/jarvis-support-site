// 화면(클라이언트)과 서버가 주고받는 "뷰 모델" 타입.
// DB 스키마(prisma/schema.prisma)를 그대로 노출하지 않고, 공개해도 되는 필드만 담는다.
// ⚠ passwordHash · email · notifyStatus · adminMemo 는 공개 화면용 타입에 절대 넣지 않는다.

export type ISODate = string; // ISO 8601 문자열

export const BUG_STATUSES = ["접수", "확인 중", "수정 완료", "배포됨"] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_OS_OPTIONS = ["Windows 10", "Windows 11", "기타"] as const;
export type BugOs = (typeof BUG_OS_OPTIONS)[number];

// ── QnA ──────────────────────────────────────────
export interface AnswerView {
  content: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  adminName: string;
}

/** 목록 항목 — 비밀글이면 title이 null (응답에 실제 제목을 넣지 않음) */
export interface QuestionListItem {
  questionId: number;
  nickname: string;
  title: string | null;
  isSecret: boolean;
  createdAt: ISODate;
  answered: boolean;
}

export interface QuestionDetail {
  questionId: number;
  nickname: string;
  title: string;
  content: string;
  createdAt: ISODate;
  isSecret: boolean;
  answered: boolean;
  answer: AnswerView | null;
}

/** 상세 화면 — 비밀글을 아직 열지 않았으면 본문 없이 잠금 정보만 */
export type QuestionPageView =
  | ({ locked: false } & QuestionDetail)
  | { locked: true; questionId: number; nickname: string; createdAt: ISODate; isSecret: true; answered: boolean };

export type NotifyStatusLabel = "없음" | "알림 대기" | "발송 완료" | "발송 실패";

// ── 버그 신고 ─────────────────────────────────────
/** 업로드할 때만 쓰는 첨부 형태 (스크린샷 이미지) */
/** 첨부 파일 정보 (화면·서버 공용 검증용) */
export interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
}
/** 화면에서 고른 스크린샷 — 원본 파일을 FormData로 서버에 보낸다 (base64 변환 없음) */
export interface AttachmentUpload extends AttachmentMeta {
  file: File;
  previewUrl: string;
}

export interface PublicBugReport {
  bugId: number;
  nickname: string;
  title: string;
  appVersion: string;
  os: string;
  content: string; // 발생 상황
  reproSteps: string; // 재현 방법
  attachmentUrl: string | null; // 저장소 이미지 주소 (Vercel Blob URL 또는 개발용 /uploads/bugs/…)
  status: BugStatus;
  resolvedReleaseId: number | null;
  createdAt: ISODate;
  mergedIntoBugId: number | null;
}

// ── 릴리스 ───────────────────────────────────────
export type ReleaseSource = "github" | "manual";

export interface Release {
  releaseId: number;
  version: string; // 화면용 "1.0.1" (DB에는 "v1.0.1"로 저장)
  releasedAt: string; // YYYY-MM-DD
  releaseNote: string;
  downloadUrl: string; // GitHub Release 파일 URL (.exe)
  sha256: string;
  fileSize: number; // bytes
  githubReleaseUrl: string | null;
  source: ReleaseSource;
  uploadedBy: number | null; // 수동 등록 시 관리자ID, GitHub 자동 등록이면 null
  isHidden: boolean;
}

// ── FAQ ──────────────────────────────────────────
export interface Faq {
  faqId: number;
  question: string;
  answer: string;
  sortOrder: number;
}
