"use client";

import Link from "next/link";
import { useState } from "react";
import { getBugReports } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatDate } from "@/lib/format";
import { BUG_STATUSES, type BugStatus } from "@/lib/types";
import { BugStatusBadge, EmptyState, ErrorState, LoadingBlock, PageHeader, Pagination } from "@/components/ui";
import { LIST_PAGE_SIZE } from "@/lib/constants";

// UI-014 버그 신고 목록 — 관련: SFR-004 ②③④⑤

const FILTERS: (BugStatus | "전체")[] = ["전체", ...BUG_STATUSES];

export default function BugsPage() {
  const [status, setStatus] = useState<BugStatus | "전체">("전체");
  const [page, setPage] = useState(1);
  const { data, error, reload } = useRepo(() => getBugReports({ status, page }), [status, page]);

  // 병합된 글은 원본으로 연결
  const hrefOf = (b: { bugId: number; mergedIntoBugId: number | null }) => `/bugs/${b.mergedIntoBugId ?? b.bugId}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="버그 신고"
        description="문제를 알려 주시면 처리 상태를 여기서 바로 확인할 수 있어요."
        actions={
          <Link href="/bugs/new" className="btn-primary">
            🐞 버그 신고하기
          </Link>
        }
      />

      <div role="tablist" aria-label="처리 상태 필터" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={status === f}
            onClick={() => {
              setStatus(f);
              setPage(1);
            }}
            className={`btn-sm btn shrink-0 rounded-full ${status === f ? "bg-brand text-white" : "border border-line bg-white text-muted hover:text-fg"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock rows={5} />
      ) : data.total === 0 ? (
        <EmptyState>{status === "전체" ? "아직 신고된 버그가 없어요." : `'${status}' 상태인 신고가 없어요.`}</EmptyState>
      ) : (
        <>
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs text-muted">
                <tr>
                  <th className="w-14 px-4 py-3">번호</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="w-20 px-4 py-3">앱 버전</th>
                  <th className="w-28 px-4 py-3">OS</th>
                  <th className="w-28 px-4 py-3">작성자</th>
                  <th className="w-24 px-4 py-3">작성일</th>
                  <th className="w-24 px-4 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.bugId} className={`border-t border-line hover:bg-surface-muted/50 ${b.mergedIntoBugId ? "opacity-70" : ""}`}>
                    <td className="px-4 py-3 text-muted">{b.bugId}</td>
                    <td className="px-4 py-3">
                      <Link href={hrefOf(b)} className="font-medium hover:text-brand hover:underline">
                        {b.title}
                      </Link>
                      {b.mergedIntoBugId && <p className="mt-0.5 text-xs text-muted">중복: #{b.mergedIntoBugId}로 병합됨</p>}
                      {b.status === "배포됨" && b.resolvedVersion && <p className="mt-0.5 text-xs text-green-700">v{b.resolvedVersion}에서 해결됨</p>}
                    </td>
                    <td className="px-4 py-3 text-muted">{b.appVersion}</td>
                    <td className="px-4 py-3 text-muted">{b.os}</td>
                    <td className="truncate px-4 py-3 text-muted">{b.nickname}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(b.createdAt)}</td>
                    <td className="px-4 py-3">
                      <BugStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {data.items.map((b) => (
              <li key={b.bugId}>
                <Link href={hrefOf(b)} className={`card block p-4 hover:border-indigo-300 ${b.mergedIntoBugId ? "opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{b.title}</p>
                    <BugStatusBadge status={b.status} />
                  </div>
                  {b.mergedIntoBugId && <p className="mt-1 text-xs text-muted">중복: #{b.mergedIntoBugId}로 병합됨</p>}
                  <p className="mt-2 text-xs text-muted">
                    #{b.bugId} · {b.appVersion} · {b.os} · {b.nickname} · {formatDate(b.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={page} total={data.total} pageSize={LIST_PAGE_SIZE} onChange={setPage} />
        </>
      )}
    </div>
  );
}
