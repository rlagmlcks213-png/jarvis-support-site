// QnA·버그 신고 입력 검증 — 화면(미리 검사)과 서버(최종 검사)가 함께 쓴다. 순수 함수만.
import { LIMITS, checkEmail, checkLength, checkVersion, type FieldErrors } from "./validation";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES } from "./constants";
import { BUG_OS_OPTIONS, type AttachmentMeta, type BugOs } from "./types";

// ── QnA ──────────────────────────────────────────
export interface QuestionCreateInput {
  nickname: string;
  password: string;
  email: string;
  /** 이메일을 입력한 경우에만 필수. 동의 여부 자체는 저장하지 않는다(이메일이 있으면 동의한 것). */
  emailConsent: boolean;
  title: string;
  content: string;
  isSecret: boolean;
}

export interface QuestionEditInput {
  nickname: string;
  title: string;
  content: string;
  isSecret: boolean;
  /** 새 이메일(선택). 기존 이메일은 보여주지 않는다. notifyStatus가 NONE/PENDING이고 답변 전일 때만 허용 */
  newEmail: string;
  emailConsent: boolean;
}

/** 수정 화면에 내려주는 값 (이메일 원문 없음) */
export interface QuestionEditData {
  nickname: string;
  title: string;
  content: string;
  isSecret: boolean;
  canSetEmail: boolean;
  notifyPending: boolean;
}

export const EMAIL_CONSENT_TEXT =
  "개인정보(이메일) 수집·이용에 동의합니다. 목적: 답변 등록 알림 / 보관: 알림 발송 후 즉시 삭제";

function consentError(email: string, consent: boolean) {
  return email.trim() && !consent ? "이메일을 남기려면 개인정보 수집·이용에 동의해 주세요." : undefined;
}

export function validateQuestionCreate(v: Partial<QuestionCreateInput>): FieldErrors {
  return {
    nickname: checkLength("닉네임", v.nickname ?? "", LIMITS.nickname.min, LIMITS.nickname.max),
    password: checkLength("글 비밀번호", v.password ?? "", LIMITS.password.min, LIMITS.password.max),
    email: checkEmail(v.email ?? ""),
    emailConsent: consentError(v.email ?? "", !!v.emailConsent),
    title: checkLength("제목", v.title ?? "", LIMITS.title.min, LIMITS.title.max),
    content: checkLength("내용", v.content ?? "", LIMITS.content.min, LIMITS.content.max),
  };
}

export function validateQuestionEdit(v: Partial<QuestionEditInput>): FieldErrors {
  return {
    nickname: checkLength("닉네임", v.nickname ?? "", LIMITS.nickname.min, LIMITS.nickname.max),
    newEmail: checkEmail(v.newEmail ?? ""),
    emailConsent: consentError(v.newEmail ?? "", !!v.emailConsent),
    title: checkLength("제목", v.title ?? "", LIMITS.title.min, LIMITS.title.max),
    content: checkLength("내용", v.content ?? "", LIMITS.content.min, LIMITS.content.max),
  };
}

// ── 버그 신고 ─────────────────────────────────────
export interface BugCreateInput {
  nickname: string;
  password: string;
  title: string;
  appVersion: string;
  os: BugOs;
  content: string;
  reproSteps: string;
  attachment: AttachmentMeta | null;
}

/** attachment: "keep" = 기존 유지, null = 삭제, 객체 = 교체 */
export type BugEditInput = Omit<BugCreateInput, "password" | "attachment"> & {
  attachment: AttachmentMeta | null | "keep";
};

export interface BugEditData extends Omit<BugCreateInput, "password" | "attachment"> {
  attachmentUrl: string | null;
}

function checkAttachment(a: AttachmentMeta | null | "keep" | undefined): string | undefined {
  if (!a || a === "keep") return undefined;
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(a.type)) return "PNG, JPG, GIF, WEBP 이미지만 첨부할 수 있어요.";
  if (a.size > ATTACHMENT_MAX_BYTES)
    return `첨부 파일이 너무 커요. ${Math.round(ATTACHMENT_MAX_BYTES / 1024 / 1024)}MB 이하 이미지로 올려 주세요.`;
  return undefined;
}

export function validateBug(v: Partial<BugCreateInput> | Partial<BugEditInput>, opts: { requirePassword: boolean }): FieldErrors {
  const pw = (v as Partial<BugCreateInput>).password ?? "";
  return {
    nickname: checkLength("닉네임", v.nickname ?? "", LIMITS.nickname.min, LIMITS.nickname.max),
    password: opts.requirePassword ? checkLength("글 비밀번호", pw, LIMITS.password.min, LIMITS.password.max) : undefined,
    title: checkLength("제목", v.title ?? "", LIMITS.title.min, LIMITS.title.max),
    appVersion: checkVersion(v.appVersion ?? ""),
    os: BUG_OS_OPTIONS.includes(v.os as BugOs) ? undefined : "OS를 선택해 주세요.",
    content: checkLength("발생 상황", v.content ?? "", LIMITS.content.min, LIMITS.content.max),
    reproSteps: checkLength("재현 방법", v.reproSteps ?? "", LIMITS.content.min, LIMITS.content.max),
    attachment: checkAttachment(v.attachment),
  };
}

export function firstError(errors: FieldErrors): [string, string] | null {
  const e = Object.entries(errors).find(([, msg]) => !!msg);
  return e ? [e[0], e[1] as string] : null;
}
