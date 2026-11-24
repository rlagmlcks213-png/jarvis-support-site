"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import Captcha, { type CaptchaHandle } from "./Captcha";
import { Field } from "./ui";
import { RepoError, errorMessage, type CaptchaAnswer } from "@/lib/repository";
import {
  EMAIL_CONSENT_TEXT,
  validateQuestionCreate,
  validateQuestionEdit,
  type QuestionCreateInput,
  type QuestionEditData,
  type QuestionEditInput,
} from "@/lib/post-validation";
import { LIMITS, type FieldErrors } from "@/lib/validation";

interface FormState {
  nickname: string;
  password: string;
  email: string; // 작성: 이메일 / 수정: 새 이메일
  emailConsent: boolean;
  title: string;
  content: string;
  isSecret: boolean;
}
const EMPTY: FormState = { nickname: "", password: "", email: "", emailConsent: false, title: "", content: "", isSecret: false };

type Props =
  | {
      open: boolean;
      mode: "create";
      onClose: () => void;
      onSubmit: (values: QuestionCreateInput, captcha: CaptchaAnswer | null) => Promise<void>;
    }
  | {
      open: boolean;
      mode: "edit";
      editData: QuestionEditData | null;
      onClose: () => void;
      onSubmit: (values: QuestionEditInput) => Promise<void>;
    };

export default function QuestionFormModal(props: Props) {
  const { open, mode, onClose } = props;
  const editData = mode === "edit" ? props.editData : null;
  const [v, setV] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaAnswer | null>(null);
  const captchaRef = useRef<CaptchaHandle>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setV(editData ? { ...EMPTY, nickname: editData.nickname, title: editData.title, content: editData.content, isSecret: editData.isSecret } : EMPTY);
    setErrors({});
    setFormError("");
    setCaptcha(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((prev) => ({ ...prev, [k]: e.target.value }));

  const showEmail = mode === "create" || !!editData?.canSetEmail;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let errs: FieldErrors;
    if (mode === "create") {
      errs = validateQuestionCreate(v);
      if (!captcha) errs.captcha = "자동 등록 방지 확인을 완료해 주세요.";
    } else {
      const ev = validateQuestionEdit({ ...v, newEmail: v.email });
      errs = { ...ev, email: ev.newEmail };
    }
    setErrors(errs);
    setFormError("");
    if (Object.values(errs).some(Boolean)) return;
    setBusy(true);
    try {
      if (props.mode === "create") {
        await props.onSubmit({ ...v }, captcha);
      } else {
        await props.onSubmit({
          nickname: v.nickname,
          title: v.title,
          content: v.content,
          isSecret: v.isSecret,
          newEmail: v.email,
          emailConsent: v.emailConsent,
        });
      }
    } catch (err) {
      if (err instanceof RepoError && Object.keys(err.fields).length) {
        const f = { ...err.fields };
        if (f.newEmail) f.email = f.newEmail;
        setErrors(f);
      }
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
      // Turnstile 토큰은 한 번만 쓸 수 있다 — 서버로 보냈으면 결과와 상관없이 새로 받는다
      captchaRef.current?.reset();
    }
  };

  const inputCls = (k: string) => `input ${errors[k] ? "input-error" : ""}`;

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "질문 작성" : "질문 수정"} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="닉네임" htmlFor="q-nickname" error={errors.nickname}>
            <input id="q-nickname" className={inputCls("nickname")} value={v.nickname} onChange={set("nickname")} maxLength={LIMITS.nickname.max} autoComplete="nickname" />
          </Field>
          {mode === "create" && (
            <Field label="글 비밀번호" htmlFor="q-password" error={errors.password} hint={`${LIMITS.password.min}~${LIMITS.password.max}자 · 글을 다시 볼 때와 수정·삭제할 때 필요해요.`}>
              <input id="q-password" type="password" className={inputCls("password")} value={v.password} onChange={set("password")} maxLength={LIMITS.password.max} autoComplete="new-password" />
            </Field>
          )}
        </div>

        {showEmail ? (
          <Field
            label={mode === "create" ? "이메일" : "새 이메일"}
            htmlFor="q-email"
            optional
            error={errors.email}
            hint={
              mode === "edit" && editData?.notifyPending
                ? "이미 답변 알림이 예약돼 있어요. 새로 입력하면 그 주소로 바뀌어요. (기존 주소는 보여주지 않아요)"
                : "답변 알림 용도로만 사용하며 공개되지 않습니다."
            }
          >
            <input id="q-email" type="email" className={inputCls("email")} value={v.email} onChange={set("email")} maxLength={LIMITS.email.max} placeholder="name@example.com" autoComplete="email" />
          </Field>
        ) : (
          mode === "edit" && <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">답변 알림을 이미 처리한 글이라 이메일은 바꿀 수 없어요.</p>
        )}
        {showEmail && v.email.trim() && (
          <div>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 accent-indigo-600"
                checked={v.emailConsent}
                onChange={(e) => setV((p) => ({ ...p, emailConsent: e.target.checked }))}
                aria-invalid={!!errors.emailConsent}
              />
              <span>
                {EMAIL_CONSENT_TEXT} <span className="text-danger">(필수)</span>{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="link whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  [자세히 보기]
                </a>
              </span>
            </label>
            {errors.emailConsent && (
              <p role="alert" className="mt-1 text-xs font-medium text-danger">
                {errors.emailConsent}
              </p>
            )}
          </div>
        )}

        <Field label="제목" htmlFor="q-title" error={errors.title}>
          <input id="q-title" className={inputCls("title")} value={v.title} onChange={set("title")} maxLength={LIMITS.title.max} />
        </Field>
        <Field label="내용" htmlFor="q-content" error={errors.content} hint={`${v.content.length} / ${LIMITS.content.max}자`}>
          <textarea id="q-content" rows={6} className={inputCls("content")} value={v.content} onChange={set("content")} maxLength={LIMITS.content.max} />
        </Field>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 accent-indigo-600" checked={v.isSecret} onChange={(e) => setV((p) => ({ ...p, isSecret: e.target.checked }))} />
          <span>
            🔒 비밀글로 등록
            <span className="block text-xs text-muted">글 비밀번호를 아는 사람과 관리자만 내용을 볼 수 있어요.</span>
          </span>
        </label>

        {mode === "create" && <Captcha ref={captchaRef} onChange={setCaptcha} error={errors.captcha} />}
        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "저장 중…" : mode === "create" ? "등록하기" : "수정하기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
