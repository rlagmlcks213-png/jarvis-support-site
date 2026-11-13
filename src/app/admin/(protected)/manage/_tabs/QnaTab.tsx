"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGetQuestions, deleteAnswer, deleteAnyPost, errorMessage, resendNotification, saveAnswer, setQuestionHidden } from "@/lib/repository";
import type { NotifyStatusLabel } from "@/lib/types";
import { useRepo } from "@/hooks/useRepo";
import { formatDateTime } from "@/lib/format";
import { AnswerBadge, ErrorState, LoadingBlock } from "@/components/ui";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

type Filter = "전체" | "대기 중" | "답변 완료" | "숨김";

const NOTIFY_CLASS: Record<NotifyStatusLabel, string> = {
  없음: "badge-gray",
  "알림 대기": "badge-orange",
  "발송 완료": "badge-green",
  "발송 실패": "badge bg-red-400/15 text-red-300",
};
function NotifyBadge({ status }: { status: NotifyStatusLabel }) {
  return <span className={NOTIFY_CLASS[status]}>{status}</span>;
}

export default function QnaTab({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number | null) => void }) {
  const toast = useToast();
  const { data, error, reload } = useRepo(adminGetQuestions, []);
  const [filter, setFilter] = useState<Filter>("대기 중");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "deleteAnswer" | null>(null);

  const list = useMemo(() => {
    if (!data) return [];
    return data.filter((q) =>
      filter === "전체" ? true : filter === "숨김" ? q.isHidden : filter === "대기 중" ? !q.answer && !q.isHidden : !!q.answer && !q.isHidden,
    );
  }, [data, filter]);

  const selected = data?.find((q) => q.questionId === selectedId) ?? null;

  // 바로가기로 들어온 글이 현재 필터에 없으면 '전체'로
  useEffect(() => {
    if (selected && !list.some((q) => q.questionId === selected.questionId)) setFilter("전체");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.questionId]);

  useEffect(() => setDraft(selected?.answer?.content ?? ""), [selected?.questionId, selected?.answer?.content]);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingBlock rows={4} />;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["대기 중", "답변 완료", "숨김", "전체"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm rounded-full ${filter === f ? "bg-brand text-white" : "border border-line text-muted hover:text-fg"}`} aria-pressed={filter === f}>
              {f}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">해당하는 질문이 없어요.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {list.map((q) => (
              <li key={q.questionId}>
                <button
                  onClick={() => onSelect(q.questionId)}
                  aria-current={q.questionId === selectedId ? "true" : undefined}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted ${q.questionId === selectedId ? "bg-brand-soft" : ""}`}
                >
                  <span className="w-8 shrink-0 text-xs text-muted">#{q.questionId}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{q.title}</span>
                    <span className="text-xs text-muted">{q.nickname} · {formatDateTime(q.createdAt)}</span>
                  </span>
                  {q.isSecret && <span aria-label="비밀글">🔒</span>}
                  {q.notify === "발송 실패" && <span className="badge bg-red-400/15 text-red-300">알림 실패</span>}
                  {q.isHidden && <span className="badge-gray">숨김</span>}
                  <AnswerBadge answered={!!q.answer} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5" aria-label="선택한 질문">
        {!selected ? (
          <p className="py-12 text-center text-sm text-muted">왼쪽 목록에서 질문을 선택해 주세요.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted">질문 #{selected.questionId}</p>
                <h2 className="text-lg font-bold">{selected.title}</h2>
                <p className="mt-1 text-xs text-muted">
                  {selected.nickname} · {formatDateTime(selected.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" disabled={busy} onClick={() => act(() => setQuestionHidden(selected.questionId, !selected.isHidden), selected.isHidden ? "질문을 다시 공개했어요." : "질문을 숨겼어요.")}>
                  {selected.isHidden ? "숨김 해제" : "숨김"}
                </button>
                <button className="btn-secondary btn-sm text-danger" onClick={() => setConfirm("delete")}>삭제</button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              {selected.isSecret && <span className="badge-gray">🔒 비밀글</span>}
              <span>답변 알림:</span>
              <NotifyBadge status={selected.notify} />
              {selected.notify === "발송 실패" && selected.notifyEmailExpired && (
                <span className="text-muted">보관 기한이 지나 이메일을 삭제했어요 (재발송 불가)</span>
              )}
              {selected.notify === "발송 실패" && !selected.notifyEmailExpired && (
                <>
                  <span className="text-danger">알림 실패</span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        const r = await resendNotification(selected.questionId);
                        if (r !== "sent") throw new Error("이번에도 발송하지 못했어요. 메일 설정(MAIL_PROVIDER)을 확인한 뒤 다시 시도해 주세요.");
                      }, "알림 메일을 다시 보냈어요.")
                    }
                  >
                    재발송
                  </button>
                </>
              )}
            </div>
            <p className="mt-4 rounded-lg bg-surface-muted p-4 text-sm whitespace-pre-wrap">{selected.content}</p>

            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const res = await saveAnswer(selected.questionId, draft);
                  // 처음 등록할 때만 알림 메일이 나간다 (수정 시 X). 메일 실패해도 답변은 저장돼 있음
                  if (res.notify === "sent") toast("작성자에게 답변 알림 메일을 보냈어요.", "info");
                  if (res.notify === "failed") toast("답변은 저장됐지만 알림 메일 발송에 실패했어요. [재발송]을 눌러 주세요.", "error");
                }, selected.answer ? "답변을 수정했어요." : "답변을 등록했어요.");
              }}
            >
              <label htmlFor="answer" className="label">
                {selected.answer ? "답변 수정" : "답변 작성"}
              </label>
              <textarea id="answer" rows={6} className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="짧고 친근한 존댓말로 답변해 주세요." />
              {selected.answer && (
                <p className="mt-1 text-xs text-muted">
                  마지막 작성: {selected.answer.adminName} · {formatDateTime(selected.answer.createdAt)}
                </p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                {selected.answer && (
                  <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => setConfirm("deleteAnswer")}>
                    답변 삭제
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={busy || !draft.trim()}>
                  {selected.answer ? "답변 수정" : "답변 등록"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      <ConfirmModal
        open={confirm !== null}
        title={confirm === "delete" ? "질문 삭제" : "답변 삭제"}
        confirmLabel="삭제하기"
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!selected) return;
          if (confirm === "delete") {
            await act(() => deleteAnyPost("question", selected.questionId), "질문을 삭제했어요.");
            onSelect(null);
          } else {
            await act(() => deleteAnswer(selected.questionId), "답변을 삭제했어요.");
          }
          setConfirm(null);
        }}
      >
        {confirm === "delete" ? "질문과 답변이 함께 삭제되고 되돌릴 수 없어요. 공개만 내리려면 '숨김'을 사용해 주세요." : "답변을 삭제하면 질문이 다시 '대기 중'으로 표시돼요."}
      </ConfirmModal>
    </div>
  );
}
