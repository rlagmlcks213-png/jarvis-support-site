"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteQuestion, errorMessage, getQuestionForEdit, unlockQuestion, updateQuestion } from "@/lib/repository";
import type { QuestionEditData } from "@/lib/post-validation";
import type { QuestionPageView } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { AnswerBadge } from "@/components/ui";
import PasswordModal from "@/components/PasswordModal";
import ConfirmModal from "@/components/ConfirmModal";
import QuestionFormModal from "@/components/QuestionFormModal";
import { useToast } from "@/components/Toast";

function UnlockForm({ questionId, onUnlocked }: { questionId: number; onUnlocked: (v: QuestionPageView) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 rounded-xl border border-line bg-surface-muted/60 p-6 text-center"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!pw) return setError("비밀번호를 입력해 주세요.");
        setBusy(true);
        setError("");
        try {
          const detail = await unlockQuestion(questionId, pw);
          onUnlocked({ locked: false, ...detail });
        } catch (err) {
          setError(errorMessage(err));
          setPw("");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-2xl" aria-hidden>
        🔒
      </p>
      <p className="mt-2 font-semibold">비밀글이에요</p>
      <label htmlFor="unlock-pw" className="mt-1 block text-sm text-muted">
        비밀번호를 입력해 주세요.
      </label>
      <div className="mx-auto mt-4 flex max-w-xs gap-2">
        <input id="unlock-pw" type="password" className={`input ${error ? "input-error" : ""}`} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" aria-invalid={!!error} />
        <button type="submit" className="btn-primary shrink-0" disabled={busy}>
          {busy ? "확인 중…" : "확인"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">한 번 확인하면 30분 동안은 다시 묻지 않아요.</p>
    </form>
  );
}

export default function QnaDetail({ view: initial, isAdmin }: { view: QuestionPageView; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState(initial);
  const [pwMode, setPwMode] = useState<"edit" | "delete" | null>(null);
  const [adminDelete, setAdminDelete] = useState(false);
  const [edit, setEdit] = useState<{ password?: string; data: QuestionEditData } | null>(null);

  useEffect(() => setView(initial), [initial]);

  const id = view.questionId;

  const startEdit = async (password?: string) => {
    const data = await getQuestionForEdit(id, password);
    setPwMode(null);
    setEdit({ password, data });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/qna" className="link text-sm">
        ← QnA 목록
      </Link>

      <article className="card mt-4 p-6 sm:p-8">
        <header className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-muted">
              질문 #{id} {view.isSecret && <span className="badge-gray ml-1">🔒 비밀글</span>}
            </p>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">{view.locked ? "🔒 비밀글입니다" : view.title}</h1>
            <p className="mt-2 text-sm text-muted">
              {view.nickname} · {formatDateTime(view.createdAt)}
            </p>
          </div>
          <div className="self-start">
            <AnswerBadge answered={view.answered} />
          </div>
        </header>

        {view.locked ? (
          <UnlockForm questionId={id} onUnlocked={setView} />
        ) : (
          <>
            <p className="mt-5 text-[15px] leading-relaxed whitespace-pre-wrap">{view.content}</p>
            <div className="mt-6 flex items-center justify-end gap-2">
              {isAdmin && <span className="mr-auto text-xs text-muted">관리자로 보는 중 — 비밀번호 없이 수정·삭제할 수 있어요.</span>}
              <button
                className="btn-secondary btn-sm"
                onClick={() => (isAdmin ? startEdit().catch((e) => toast(errorMessage(e), "error")) : setPwMode("edit"))}
              >
                수정
              </button>
              <button className="btn-secondary btn-sm text-danger" onClick={() => (isAdmin ? setAdminDelete(true) : setPwMode("delete"))}>
                삭제
              </button>
            </div>
          </>
        )}
      </article>

      {!view.locked && (
        <section className="mt-6" aria-label="답변">
          {view.answer ? (
            <div className="card border-indigo-200 bg-indigo-50/60 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge bg-brand text-white">관리자</span>
                <span className="text-sm font-semibold">{view.answer.adminName}</span>
                <span className="text-xs text-muted">{formatDateTime(view.answer.createdAt)}</span>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-wrap">{view.answer.content}</p>
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-muted">
              아직 답변을 준비하고 있어요. 조금만 기다려 주세요.
              {isAdmin && (
                <Link href={`/admin/manage?tab=qna&id=${id}`} className="link mt-2 block">
                  관리자 화면에서 답변하기 →
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      <PasswordModal
        open={pwMode !== null}
        title={pwMode === "delete" ? "질문 삭제" : "질문 수정"}
        confirmLabel={pwMode === "delete" ? "삭제하기" : "확인"}
        description={pwMode === "delete" ? "삭제하면 답변도 함께 지워지고 되돌릴 수 없어요. 글 비밀번호를 입력해 주세요." : undefined}
        danger={pwMode === "delete"}
        onClose={() => setPwMode(null)}
        onSubmit={async (pw) => {
          if (pwMode === "delete") {
            await deleteQuestion(id, pw);
            setPwMode(null);
            toast("질문을 삭제했어요.");
            router.push("/qna");
          } else {
            await startEdit(pw);
          }
        }}
      />

      <ConfirmModal
        open={adminDelete}
        title="질문 삭제 (관리자)"
        confirmLabel="삭제하기"
        onClose={() => setAdminDelete(false)}
        onConfirm={async () => {
          try {
            await deleteQuestion(id);
            toast("질문을 삭제했어요.");
            router.push("/qna");
          } catch (e) {
            toast(errorMessage(e), "error");
          }
          setAdminDelete(false);
        }}
      >
        질문과 답변이 함께 삭제되고 되돌릴 수 없어요.
      </ConfirmModal>

      <QuestionFormModal
        open={edit !== null}
        mode="edit"
        editData={edit?.data ?? null}
        onClose={() => setEdit(null)}
        onSubmit={async (values) => {
          await updateQuestion(id, edit?.password, values);
          setEdit(null);
          toast("질문을 수정했어요.");
          router.refresh();
        }}
      />
    </div>
  );
}
