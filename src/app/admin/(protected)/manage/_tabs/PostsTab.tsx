"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { adminGetBugs, adminGetQuestions, deleteAnyPost, errorMessage, forceUpdatePost, type PostKind } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatDateTime } from "@/lib/format";
import { ErrorState, LoadingBlock } from "@/components/ui";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

// [게시물] QnA·버그 전체 글에서 스팸·부적절한 글 삭제, 강제 수정·삭제(비밀번호 없이)

interface Row {
  kind: PostKind;
  id: number;
  title: string;
  content: string;
  nickname: string;
  createdAt: string;
  hidden: boolean;
}

export default function PostsTab() {
  const toast = useToast();
  const qs = useRepo(adminGetQuestions, []);
  const bs = useRepo(adminGetBugs, []);
  const [kind, setKind] = useState<"all" | PostKind>("all");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = [
      ...(qs.data ?? []).map((q) => ({ kind: "question" as const, id: q.questionId, title: q.title, content: q.content, nickname: q.nickname, createdAt: q.createdAt, hidden: q.isHidden })),
      ...(bs.data ?? []).map((b) => ({ kind: "bug" as const, id: b.bugId, title: b.title, content: b.content, nickname: b.nickname, createdAt: b.createdAt, hidden: false })),
    ];
    const k = keyword.trim().toLowerCase();
    return all
      .filter((r) => kind === "all" || r.kind === kind)
      .filter((r) => !k || r.title.toLowerCase().includes(k) || r.content.toLowerCase().includes(k) || r.nickname.toLowerCase().includes(k))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [qs.data, bs.data, kind, keyword]);

  if (qs.error || bs.error) return <ErrorState message={(qs.error || bs.error)!} onRetry={() => { qs.reload(); bs.reload(); }} />;
  if (!qs.data || !bs.data) return <LoadingBlock rows={4} />;

  const label = (r: Row) => (r.kind === "question" ? "QnA" : "버그");
  const publicHref = (r: Row) => (r.kind === "question" ? `/qna/${r.id}` : `/bugs/${r.id}`);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="post-kind" className="sr-only">글 종류</label>
        <select id="post-kind" className="input sm:w-40" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="all">전체</option>
          <option value="question">QnA</option>
          <option value="bug">버그 신고</option>
        </select>
        <label htmlFor="post-search" className="sr-only">글 검색</label>
        <input id="post-search" type="search" className="input" placeholder="제목·내용·닉네임 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>

      <ul className="card divide-y divide-line overflow-hidden">
        {rows.map((r) => (
          <li key={`${r.kind}-${r.id}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className={r.kind === "question" ? "badge-indigo" : "badge-yellow"}>{label(r)}</span>
                <span className="text-xs text-muted">#{r.id}</span>
                {r.hidden && <span className="badge-gray">숨김</span>}
                <Link href={publicHref(r)} target="_blank" className="truncate text-sm font-medium hover:underline">{r.title}</Link>
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {r.nickname} · {formatDateTime(r.createdAt)} · {r.content}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  setEditing(r);
                  setTitle(r.title);
                  setContent(r.content);
                  setFormError("");
                }}
              >
                강제 수정
              </button>
              <button className="btn-danger btn-sm" onClick={() => setDeleting(r)}>강제 삭제</button>
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-muted">해당하는 글이 없어요.</li>}
      </ul>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`${editing ? label(editing) : ""} #${editing?.id ?? ""} 강제 수정`} size="lg">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editing) return;
            try {
              await forceUpdatePost(editing.kind, editing.id, { title, content });
              toast("글을 수정했어요.");
              setEditing(null);
            } catch (err) {
              setFormError(errorMessage(err));
            }
          }}
        >
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">관리자 권한으로 작성자 비밀번호 없이 수정해요.</p>
          <div>
            <label htmlFor="post-title" className="label">제목</label>
            <input id="post-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="post-content" className="label">{editing?.kind === "bug" ? "발생 상황" : "내용"}</label>
            <textarea id="post-content" rows={6} className="input" value={content} onChange={(e) => setContent(e.target.value)} />
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
        title="글 강제 삭제"
        confirmLabel="삭제하기"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteAnyPost(deleting.kind, deleting.id);
            toast("글을 삭제했어요.");
          } catch (err) {
            toast(errorMessage(err), "error");
          }
          setDeleting(null);
        }}
      >
        {deleting && `${label(deleting)} #${deleting.id} '${deleting.title}'을(를) 삭제할까요? 되돌릴 수 없어요.`}
      </ConfirmModal>
    </div>
  );
}
