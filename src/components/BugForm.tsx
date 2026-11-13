"use client";

import { useState } from "react";
import Captcha from "./Captcha";
import Modal from "./Modal";
import { Field } from "./ui";
import { RepoError, errorMessage, type CaptchaAnswer } from "@/lib/repository";
import { validateBug, type BugCreateInput } from "@/lib/post-validation";
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES } from "@/lib/constants";
import { LIMITS, detectSecrets, type FieldErrors } from "@/lib/validation";
import { formatBytes } from "@/lib/format";
import { BUG_OS_OPTIONS, type AttachmentUpload } from "@/lib/types";

type Mode = "create" | "edit";
/** attachment: "keep" = (수정 시) 기존 첨부 유지, null = 없음/삭제, 객체 = 새 이미지 */
export type BugFormValues = Omit<BugCreateInput, "attachment"> & { attachment: AttachmentUpload | null | "keep" };
export const EMPTY_BUG: BugFormValues = {
  nickname: "",
  password: "",
  title: "",
  appVersion: "",
  os: "Windows 11",
  content: "",
  reproSteps: "",
  attachment: null,
};

function AutoBadge() {
  return <span className="badge-indigo">앱에서 자동 입력됨</span>;
}

export default function BugForm({
  mode,
  initial,
  existingAttachmentUrl = null,
  autoFilled = {},
  onSubmit,
  onCancel,
}: {
  mode: Mode;
  initial?: Partial<BugFormValues>;
  /** 수정 시 이미 올라가 있는 이미지 주소 */
  existingAttachmentUrl?: string | null;
  autoFilled?: { appVersion?: boolean; os?: boolean };
  onSubmit: (values: BugFormValues, captcha: CaptchaAnswer | null) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<BugFormValues>({ ...EMPTY_BUG, ...(existingAttachmentUrl ? { attachment: "keep" as const } : {}), ...initial });
  const [auto, setAuto] = useState(autoFilled);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [secretWarning, setSecretWarning] = useState<string[] | null>(null);

  const set = (k: keyof BugFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setV((prev) => ({ ...prev, [k]: e.target.value }));
    // 사용자가 직접 고치면 자동 입력 뱃지를 내린다
    if (k === "appVersion" || k === "os") setAuto((a) => ({ ...a, [k]: false }));
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!(ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
      setErrors((p) => ({ ...p, attachment: "PNG, JPG, GIF, WEBP 이미지만 첨부할 수 있어요." }));
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      setErrors((p) => ({ ...p, attachment: `파일이 너무 커요(${formatBytes(file.size)}). ${formatBytes(ATTACHMENT_MAX_BYTES)} 이하로 줄여서 올려 주세요.` }));
      return;
    }
    // 원본 파일을 그대로 보관했다가 FormData로 보낸다. 미리보기는 브라우저 임시 주소(blob:)로.
    const att: AttachmentUpload = { name: file.name, size: file.size, type: file.type, file, previewUrl: URL.createObjectURL(file) };
    setV((p) => {
      if (p.attachment && p.attachment !== "keep") URL.revokeObjectURL(p.attachment.previewUrl);
      return { ...p, attachment: att };
    });
    setErrors((p) => ({ ...p, attachment: undefined }));
  };

  const doSubmit = async () => {
    setBusy(true);
    setFormError("");
    try {
      await onSubmit(v, captcha);
    } catch (err) {
      if (err instanceof RepoError && Object.keys(err.fields).length) setErrors(err.fields);
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateBug(v, { requirePassword: mode === "create" });
    if (mode === "create" && !captcha) errs.captcha = "자동 등록 방지 문제를 풀어 주세요.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) {
      setFormError("입력 내용을 확인해 주세요.");
      return;
    }
    const secrets = detectSecrets(v.title, v.content, v.reproSteps);
    if (secrets.length) {
      setSecretWarning(secrets);
      return;
    }
    void doSubmit();
  };

  const inputCls = (k: string) => `input ${errors[k] ? "input-error" : ""}`;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="닉네임" htmlFor="b-nickname" error={errors.nickname}>
          <input id="b-nickname" className={inputCls("nickname")} value={v.nickname} onChange={set("nickname")} maxLength={LIMITS.nickname.max} />
        </Field>
        {mode === "create" && (
          <Field label="글 비밀번호" htmlFor="b-password" error={errors.password} hint="수정·삭제할 때 필요해요.">
            <input id="b-password" type="password" className={inputCls("password")} value={v.password} onChange={set("password")} maxLength={LIMITS.password.max} autoComplete="new-password" />
          </Field>
        )}
      </div>

      <Field label="제목" htmlFor="b-title" error={errors.title}>
        <input id="b-title" className={inputCls("title")} value={v.title} onChange={set("title")} maxLength={LIMITS.title.max} placeholder="예: 알림 말풍선이 두 번 떠요" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="앱 버전" htmlFor="b-version" error={errors.appVersion} hint="앱의 설정 > 정보에서 확인할 수 있어요." extra={auto.appVersion ? <AutoBadge /> : null}>
          <input id="b-version" className={inputCls("appVersion")} value={v.appVersion} onChange={set("appVersion")} maxLength={LIMITS.appVersion.max} placeholder="v1.0.1" />
        </Field>
        <Field label="OS" htmlFor="b-os" error={errors.os} extra={auto.os ? <AutoBadge /> : null}>
          <select id="b-os" className={inputCls("os")} value={v.os} onChange={set("os")}>
            {BUG_OS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="발생 상황" htmlFor="b-content" error={errors.content} hint="어떤 상황에서 무엇이 잘못됐는지 적어 주세요.">
        <textarea id="b-content" rows={5} className={inputCls("content")} value={v.content} onChange={set("content")} maxLength={LIMITS.content.max} />
      </Field>
      <Field label="재현 방법" htmlFor="b-repro" error={errors.reproSteps} hint="1. 2. 3. 순서대로 적어 주시면 빨리 고칠 수 있어요.">
        <textarea id="b-repro" rows={4} className={inputCls("reproSteps")} value={v.reproSteps} onChange={set("reproSteps")} maxLength={LIMITS.content.max} placeholder={"1. \n2. \n3. "} />
      </Field>

      <Field label="스크린샷 첨부" htmlFor="b-file" optional error={errors.attachment}>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          🔒 스크린샷·내용에 <b>API Key, 구글 로그인 정보, 일정 내용</b> 등 개인정보가 보이지 않게 가려 주세요.
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <input id="b-file" type="file" accept={ATTACHMENT_TYPES.join(",")} onChange={onFile} className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-text hover:file:opacity-90 sm:w-auto" />
          <span className="text-xs text-muted">이미지 · 최대 {formatBytes(ATTACHMENT_MAX_BYTES)}</span>
        </div>
        {v.attachment && (v.attachment !== "keep" || existingAttachmentUrl) && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-line p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.attachment === "keep" ? existingAttachmentUrl! : v.attachment.previewUrl} alt="첨부 미리보기" className="h-14 w-14 rounded object-cover" />
            <div className="min-w-0 flex-1 text-sm">
              {v.attachment === "keep" ? (
                <p className="font-medium">기존 첨부 이미지</p>
              ) : (
                <>
                  <p className="truncate font-medium">{v.attachment.name}</p>
                  <p className="text-xs text-muted">{formatBytes(v.attachment.size)}</p>
                </>
              )}
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setV((p) => ({ ...p, attachment: null }))}>
              삭제
            </button>
          </div>
        )}
      </Field>

      {mode === "create" && <Captcha onChange={setCaptcha} error={errors.captcha} />}

      {formError && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "저장 중…" : mode === "create" ? "신고하기" : "수정하기"}
        </button>
      </div>

      <Modal
        open={secretWarning !== null}
        onClose={() => setSecretWarning(null)}
        title="개인정보가 포함된 것 같아요"
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSecretWarning(null);
                void doSubmit();
              }}
            >
              그래도 제출
            </button>
            <button type="button" className="btn-primary" onClick={() => setSecretWarning(null)}>
              수정하기
            </button>
          </>
        }
      >
        <p className="text-sm">입력한 내용에서 아래와 같은 값이 감지됐어요. 공개 게시판이라 누구나 볼 수 있으니 지우거나 가려 주세요.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-medium text-danger">
          {secretWarning?.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </Modal>
    </form>
  );
}
