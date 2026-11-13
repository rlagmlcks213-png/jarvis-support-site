"use client";

import Link from "next/link";
import { getReleaseNotes } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatDate } from "@/lib/format";
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/ui";

// UI-011 릴리스 노트 — 관련: SFR-005 ②③, PMR-002
// Feat/Fix/Refactor 같은 유형 태그는 만들지 않는다. 변경 사항은 본문 텍스트(줄바꿈 목록)로만 표시.

function NoteBody({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const intro = lines.filter((l) => !l.startsWith("-"));
  const items = lines.filter((l) => l.startsWith("-")).map((l) => l.replace(/^-\s*/, ""));
  return (
    <div className="text-sm text-slate-700">
      {intro.map((l, i) => (
        <p key={i} className="mb-2">
          {l}
        </p>
      ))}
      {items.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {items.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ReleasesPage() {
  const { data, error, reload } = useRepo(getReleaseNotes, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="릴리스 노트"
        description="버전별로 무엇이 바뀌었는지, 어떤 버그가 해결됐는지 확인하세요."
        actions={
          <Link href="/download" className="btn-primary">
            최신 버전 받기
          </Link>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock />
      ) : data.length === 0 ? (
        <EmptyState>아직 배포된 버전이 없어요.</EmptyState>
      ) : (
        <ol className="relative space-y-8 border-l-2 border-indigo-100 pl-6 sm:pl-8">
          {data.map(({ release, resolvedBugs }, i) => (
            <li key={release.releaseId} id={`v${release.version}`} className="relative scroll-mt-24">
              <span
                className={`absolute top-6 -left-[33px] h-4 w-4 rounded-full border-4 border-white sm:-left-[41px] ${i === 0 ? "bg-brand" : "bg-indigo-200"}`}
                aria-hidden
              />
              <article className="card p-6">
                <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-xl font-bold">v{release.version}</h2>
                  {i === 0 && <span className="badge-green">최신</span>}
                  <time dateTime={release.releasedAt} className="text-sm text-muted">
                    {formatDate(release.releasedAt)}
                  </time>
                </header>
                <div className="mt-4">
                  <NoteBody text={release.releaseNote} />
                </div>
                <div className="mt-5 rounded-lg bg-surface-muted p-4">
                  <h3 className="text-sm font-semibold">해결된 버그 {resolvedBugs.length > 0 && <span className="text-muted">({resolvedBugs.length})</span>}</h3>
                  {resolvedBugs.length === 0 ? (
                    <p className="mt-1 text-sm text-muted">이 버전에 연결된 버그 신고가 없어요.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {resolvedBugs.map((b) => (
                        <li key={b.bugId}>
                          <Link href={`/bugs/${b.bugId}`} className="link text-sm">
                            #{b.bugId} {b.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
