"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createQuestion, getQuestions } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatDate } from "@/lib/format";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import { AnswerBadge, EmptyState, ErrorState, LoadingBlock, PageHeader, Pagination } from "@/components/ui";
import QuestionFormModal from "@/components/QuestionFormModal";
import { useToast } from "@/components/Toast";

// UI-013 QnA 목록·작성 — 관련: SFR-004 ②④⑥, SER-002 ③④

/** 비밀글은 서버가 제목을 보내지 않는다(title=null). 관리자에게는 제목 + 🔒 */
function QuestionTitle({ title, isSecret }: { title: string | null; isSecret: boolean }) {
  if (title === null) return <span className="text-muted">🔒 비밀글입니다</span>;
  return (
    <>
      {isSecret && <span aria-label="비밀글">🔒 </span>}
      {title}
    </>
  );
}

export default function QnaPage() {
  const router = useRouter();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [writeOpen, setWriteOpen] = useState(false);
  const { data, error, reload } = useRepo(() => getQuestions({ page }), [page]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="QnA"
        description="FAQ에 없는 궁금한 점을 남겨 주세요. 개발팀이 답변해 드려요."
        actions={
          <button className="btn-primary" onClick={() => setWriteOpen(true)}>
            ✏️ 질문하기
          </button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock rows={5} />
      ) : data.total === 0 ? (
        <EmptyState>아직 등록된 질문이 없어요. 첫 질문을 남겨 보세요!</EmptyState>
      ) : (
        <>
          {/* PC: 표 */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs text-muted">
                <tr>
                  <th className="w-16 px-4 py-3">번호</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="w-32 px-4 py-3">작성자</th>
                  <th className="w-28 px-4 py-3">작성일</th>
                  <th className="w-24 px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((q) => (
                  <tr key={q.questionId} className="border-t border-line hover:bg-surface-muted/50">
                    <td className="px-4 py-3 text-muted">{q.questionId}</td>
                    <td className="px-4 py-3">
                      <Link href={`/qna/${q.questionId}`} className="font-medium hover:text-brand hover:underline">
                        <QuestionTitle title={q.title} isSecret={q.isSecret} />
                      </Link>
                    </td>
                    <td className="truncate px-4 py-3 text-muted">{q.nickname}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(q.createdAt)}</td>
                    <td className="px-4 py-3">
                      <AnswerBadge answered={q.answered} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 모바일: 카드 */}
          <ul className="space-y-3 md:hidden">
            {data.items.map((q) => (
              <li key={q.questionId}>
                <Link href={`/qna/${q.questionId}`} className="card block p-4 hover:border-indigo-300">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium"><QuestionTitle title={q.title} isSecret={q.isSecret} /></p>
                    <AnswerBadge answered={q.answered} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    #{q.questionId} · {q.nickname} · {formatDate(q.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} total={data.total} pageSize={LIST_PAGE_SIZE} onChange={setPage} />
        </>
      )}

      <QuestionFormModal
        open={writeOpen}
        mode="create"
        onClose={() => setWriteOpen(false)}
        onSubmit={async (values, captcha) => {
          const id = await createQuestion(values, captcha);
          setWriteOpen(false);
          toast("질문이 등록됐어요. 답변이 달리면 여기서 확인할 수 있어요.");
          router.push(`/qna/${id}`);
        }}
      />
    </div>
  );
}
