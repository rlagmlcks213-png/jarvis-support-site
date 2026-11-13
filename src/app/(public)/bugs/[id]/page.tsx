"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { deleteBugReport, errorMessage, getBugForEdit, getBugReport, updateBugReport } from "@/lib/repository";
import type { BugEditData } from "@/lib/post-validation";
import { useRepo, useViewer } from "@/hooks/useRepo";
import { formatDateTime } from "@/lib/format";
import { BugStatusBadge, ErrorState, LoadingBlock, StatusPipeline } from "@/components/ui";
import PasswordModal from "@/components/PasswordModal";
import ConfirmModal from "@/components/ConfirmModal";
import Modal from "@/components/Modal";
import BugForm from "@/components/BugForm";
import { useToast } from "@/components/Toast";

// UI-014 버그 신고 상세 — 관리자 메모는 서버가 보내지 않는다.
// 작성자는 글 비밀번호로, 로그인한 관리자는 비밀번호 없이 수정·삭제할 수 있다.

export default function BugDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const toast = useToast();
  const viewer = useViewer();
  const isAdmin = !!viewer?.isAdmin;
  const { data, error, loading, reload } = useRepo(() => getBugReport(id), [id]);

  const [pwMode, setPwMode] = useState<"edit" | "delete" | null>(null);
  const [adminDelete, setAdminDelete] = useState(false);
  const [edit, setEdit] = useState<{ password?: string; data: BugEditData } | null>(null);

  const startEdit = async (password?: string) => {
    const d = await getBugForEdit(id, password);
    setPwMode(null);
    setEdit({ password, data: d });
  };

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorState message={error} onRetry={reload} /></div>;
  if (loading && data === undefined) return <div className="mx-auto max-w-3xl px-4 py-10"><LoadingBlock rows={3} /></div>;
  if (!data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">버그 신고를 찾을 수 없어요.</p>
        <p className="mt-1 text-sm text-muted">삭제된 글일 수 있어요.</p>
        <Link href="/bugs" className="btn-primary mt-6">
          목록으로
        </Link>
      </div>
    );

  const { bug: b, resolvedRelease } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/bugs" className="link text-sm">
        ← 버그 신고 목록
      </Link>

      {b.mergedIntoBugId && (
        <div className="mt-4 rounded-lg border border-line bg-surface-muted px-4 py-3 text-sm">
          중복: <Link href={`/bugs/${b.mergedIntoBugId}`} className="link">#{b.mergedIntoBugId}로 병합됨</Link> — 처리 상황은 원본 글에서 확인해 주세요.
        </div>
      )}

      <article className="card mt-4 p-6 sm:p-8">
        <header className="border-b border-line pb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted">버그 #{b.bugId}</p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">{b.title}</h1>
            </div>
            <BugStatusBadge status={b.status} />
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <div><dt className="inline">작성자 </dt><dd className="inline text-fg">{b.nickname}</dd></div>
            <div><dt className="inline">앱 버전 </dt><dd className="inline text-fg">{b.appVersion}</dd></div>
            <div><dt className="inline">OS </dt><dd className="inline text-fg">{b.os}</dd></div>
            <div><dt className="inline">작성일 </dt><dd className="inline text-fg">{formatDateTime(b.createdAt)}</dd></div>
          </dl>
        </header>

        <section className="mt-5" aria-label="처리 상태">
          <h2 className="mb-3 text-sm font-semibold text-muted">처리 상태</h2>
          <StatusPipeline status={b.status} />
          {b.status === "배포됨" && resolvedRelease && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold">✅ v{resolvedRelease.version}에서 해결됨</p>
              <p className="flex gap-3">
                <Link href={`/releases#v${resolvedRelease.version}`} className="font-medium underline-offset-2 hover:underline">릴리스 노트 보기</Link>
                <Link href="/download" className="font-medium underline-offset-2 hover:underline">다운로드</Link>
              </p>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted">발생 상황</h2>
          <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap">{b.content}</p>
        </section>
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted">재현 방법</h2>
          <p className="mt-2 rounded-lg bg-surface-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">{b.reproSteps}</p>
        </section>
        {b.attachmentUrl && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-muted">첨부 이미지</h2>
            <a href={b.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.attachmentUrl} alt={`버그 #${b.bugId} 첨부 이미지`} className="max-h-80 max-w-full rounded-lg border border-line" />
            </a>
          </section>
        )}

        <div className="mt-8 flex items-center justify-end gap-2">
          {isAdmin && <span className="mr-auto text-xs text-muted">관리자로 보는 중 — 비밀번호 없이 수정·삭제할 수 있어요.</span>}
          <button className="btn-secondary btn-sm" onClick={() => (isAdmin ? startEdit().catch((e) => toast(errorMessage(e), "error")) : setPwMode("edit"))}>
            수정
          </button>
          <button className="btn-secondary btn-sm text-danger" onClick={() => (isAdmin ? setAdminDelete(true) : setPwMode("delete"))}>
            삭제
          </button>
        </div>
      </article>

      <PasswordModal
        open={pwMode !== null}
        title={pwMode === "delete" ? "버그 신고 삭제" : "버그 신고 수정"}
        confirmLabel={pwMode === "delete" ? "삭제하기" : "확인"}
        description={pwMode === "delete" ? "삭제하면 되돌릴 수 없어요. 글 비밀번호를 입력해 주세요." : undefined}
        danger={pwMode === "delete"}
        onClose={() => setPwMode(null)}
        onSubmit={async (pw) => {
          if (pwMode === "delete") {
            await deleteBugReport(id, pw);
            setPwMode(null);
            toast("버그 신고를 삭제했어요.");
            router.push("/bugs");
          } else {
            await startEdit(pw);
          }
        }}
      />

      <ConfirmModal
        open={adminDelete}
        title="버그 신고 삭제 (관리자)"
        confirmLabel="삭제하기"
        onClose={() => setAdminDelete(false)}
        onConfirm={async () => {
          try {
            await deleteBugReport(id);
            toast("버그 신고를 삭제했어요.");
            router.push("/bugs");
          } catch (e) {
            toast(errorMessage(e), "error");
          }
          setAdminDelete(false);
        }}
      >
        이 글을 삭제할까요? 되돌릴 수 없어요.
      </ConfirmModal>

      <Modal open={edit !== null} onClose={() => setEdit(null)} title="버그 신고 수정" size="lg">
        {edit && (
          <BugForm
            mode="edit"
            initial={{ ...edit.data, attachment: edit.data.attachmentUrl ? "keep" : null }}
            existingAttachmentUrl={edit.data.attachmentUrl}
            onCancel={() => setEdit(null)}
            onSubmit={async (values) => {
              await updateBugReport(id, edit.password, values);
              setEdit(null);
              toast("버그 신고를 수정했어요.");
            }}
          />
        )}
      </Modal>
    </div>
  );
}
