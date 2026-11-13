"use client";

import Link from "next/link";
import { getDashboard } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatDate } from "@/lib/format";
import { AnswerBadge, BugStatusBadge, ErrorState, LoadingBlock } from "@/components/ui";

// UI-016 관리자 대시보드 — 관련: SFR-006, UIR-002 ②

export default function DashboardPage() {
  const { data, error, reload } = useRepo(getDashboard, []);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingBlock rows={4} />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="flex gap-2">
          <Link href="/admin/releases" className="btn-primary">릴리스 관리</Link>
          <Link href="/admin/manage" className="btn-secondary">답변·상태 관리</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/manage?tab=qna" className="card p-5 transition hover:border-accent">
          <p className="text-sm text-muted">새 질문 (답변 대기)</p>
          <p className="mt-2 text-4xl font-bold text-orange-300">{data.newQuestionCount}</p>
        </Link>
        <Link href="/admin/manage?tab=bugs" className="card p-5 transition hover:border-accent">
          <p className="text-sm text-muted">미처리 버그 (배포 전)</p>
          <p className="mt-2 text-4xl font-bold text-yellow-300">{data.unresolvedBugCount}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(data.unresolvedByStatus).map(([s, n]) => (
              <span key={s} className="text-xs text-muted">
                {s} <b className="text-fg">{n}</b>
              </span>
            ))}
          </div>
        </Link>
        <Link href="/admin/releases" className="card p-5 transition hover:border-accent">
          <p className="text-sm text-muted">최신 릴리스</p>
          {data.latestRelease ? (
            <>
              <p className="mt-2 text-4xl font-bold text-green-300">v{data.latestRelease.version}</p>
              <p className="mt-3 text-xs text-muted">{formatDate(data.latestRelease.releasedAt)} 배포</p>
              {data.latestReleaseBugCount === 0 ? (
                <p className="mt-2 text-xs font-medium text-orange-300">⚠ 해결된 버그가 아직 연결되지 않음 — 릴리스 관리에서 연결해 주세요.</p>
              ) : (
                <p className="mt-2 text-xs text-muted">해결된 버그 {data.latestReleaseBugCount}건 연결됨</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">공개된 릴리스가 없어요.</p>
          )}
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">최근 질문</h2>
          <ul className="divide-y divide-line">
            {data.recentQuestions.map((q) => (
              <li key={q.questionId}>
                <Link href={`/admin/manage?tab=qna&id=${q.questionId}`} className="flex items-center gap-3 rounded-md px-1 py-2.5 hover:bg-surface-muted">
                  <span className="w-8 shrink-0 text-xs text-muted">#{q.questionId}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{q.title}</span>
                  {q.isHidden && <span className="badge-gray">숨김</span>}
                  <AnswerBadge answered={q.answered} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">최근 버그</h2>
          <ul className="divide-y divide-line">
            {data.recentBugs.map((b) => (
              <li key={b.bugId}>
                <Link href={`/admin/manage?tab=bugs&id=${b.bugId}`} className="flex items-center gap-3 rounded-md px-1 py-2.5 hover:bg-surface-muted">
                  <span className="w-8 shrink-0 text-xs text-muted">#{b.bugId}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{b.title}</span>
                  <BugStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
