"use client";

import { useState } from "react";
import { adminGetFaqs, createFaq, deleteFaq, errorMessage, moveFaq, updateFaq } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import type { Faq } from "@/lib/types";
import { ErrorState, LoadingBlock } from "@/components/ui";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

export default function FaqTab() {
  const toast = useToast();
  const { data, error, reload } = useRepo(adminGetFaqs, []);
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<Faq | null>(null);

  const open = (f: Faq | "new") => {
    setEditing(f);
    setQ(f === "new" ? "" : f.question);
    setA(f === "new" ? "" : f.answer);
    setFormError("");
  };

  const run = async (fn: () => Promise<unknown>, msg?: string) => {
    try {
      await fn();
      if (msg) toast(msg);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingBlock rows={4} />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">위·아래 버튼으로 공개 화면 표시 순서를 바꿀 수 있어요.</p>
        <button className="btn-primary" onClick={() => open("new")}>+ FAQ 추가</button>
      </div>
      <ol className="card divide-y divide-line overflow-hidden">
        {data.map((f, i) => (
          <li key={f.faqId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <div className="flex shrink-0 items-center gap-1 sm:flex-col">
              <button className="btn-ghost btn-sm" disabled={i === 0} onClick={() => run(() => moveFaq(f.faqId, "up"))} aria-label={`${f.question} 위로 이동`}>▲</button>
              <span className="w-6 text-center text-xs text-muted">{i + 1}</span>
              <button className="btn-ghost btn-sm" disabled={i === data.length - 1} onClick={() => run(() => moveFaq(f.faqId, "down"))} aria-label={`${f.question} 아래로 이동`}>▼</button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.question}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{f.answer}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="btn-secondary btn-sm" onClick={() => open(f)}>수정</button>
              <button className="btn-secondary btn-sm text-danger" onClick={() => setDeleting(f)}>삭제</button>
            </div>
          </li>
        ))}
        {data.length === 0 && <li className="p-6 text-center text-sm text-muted">등록된 FAQ가 없어요.</li>}
      </ol>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "FAQ 추가" : "FAQ 수정"} size="lg">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (editing === "new") await createFaq(q, a);
              else if (editing) await updateFaq(editing.faqId, q, a);
              toast(editing === "new" ? "FAQ를 추가했어요." : "FAQ를 수정했어요.");
              setEditing(null);
            } catch (err) {
              setFormError(errorMessage(err));
            }
          }}
        >
          <div>
            <label htmlFor="faq-q" className="label">질문</label>
            <input id="faq-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} />
          </div>
          <div>
            <label htmlFor="faq-a" className="label">답변</label>
            <textarea id="faq-a" rows={6} className="input" value={a} onChange={(e) => setA(e.target.value)} />
          </div>
          {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>취소</button>
            <button type="submit" className="btn-primary">저장</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        title="FAQ 삭제"
        confirmLabel="삭제하기"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await run(() => deleteFaq(deleting.faqId), "FAQ를 삭제했어요.");
          setDeleting(null);
        }}
      >
        &lsquo;{deleting?.question}&rsquo;을(를) 삭제할까요? 되돌릴 수 없어요.
      </ConfirmModal>
    </div>
  );
}
