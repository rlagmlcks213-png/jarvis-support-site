"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { search } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatDate } from "@/lib/format";
import { AnswerBadge, BugStatusBadge, EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/ui";

// 통합 검색 결과 — FAQ / 릴리스 노트 / QnA / 버그 신고 그룹별 표시. 숨김 질문·릴리스는 제외(repository).

function snippet(text: string, q: string, len = 80) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, len) + (text.length > len ? "…" : "");
  const start = Math.max(0, i - 25);
  return (start > 0 ? "…" : "") + text.slice(start, start + len) + (start + len < text.length ? "…" : "");
}

function Highlight({ text, q }: { text: string; q: string }) {
  // React 텍스트 노드로만 분리해서 강조 (HTML 주입 없음)
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5 text-inherit">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        {title} <span className="badge-gray">{count}</span>
      </h2>
      {count === 0 ? <p className="text-sm text-muted">결과가 없어요.</p> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}

function Item({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="card block p-4 transition hover:border-indigo-300">
        {children}
      </Link>
    </li>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const { data, error, reload } = useRepo(() => search(q), [q]);
  const total = data ? data.faqs.length + data.releases.length + data.questions.length + data.bugs.length : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="검색 결과" description={q ? <>&lsquo;{q}&rsquo; 검색 결과 {data ? `${total}건` : ""}</> : "헤더의 검색창에 검색어를 입력해 주세요."} />
      {!q ? null : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock />
      ) : total === 0 ? (
        <EmptyState>
          &lsquo;{q}&rsquo;에 대한 결과가 없어요. 다른 단어로 찾아보거나{" "}
          <Link href="/qna" className="link">
            QnA에 질문
          </Link>
          해 주세요.
        </EmptyState>
      ) : (
        <>
          <Group title="FAQ" count={data.faqs.length}>
            {data.faqs.map((f) => (
              <Item key={f.faqId} href="/faq">
                <p className="font-medium"><Highlight text={f.question} q={q} /></p>
                <p className="mt-1 text-sm text-muted"><Highlight text={snippet(f.answer, q)} q={q} /></p>
              </Item>
            ))}
          </Group>
          <Group title="릴리스 노트" count={data.releases.length}>
            {data.releases.map((r) => (
              <Item key={r.releaseId} href={`/releases#v${r.version}`}>
                <p className="font-medium">v{r.version} <span className="text-sm font-normal text-muted">· {formatDate(r.releasedAt)}</span></p>
                <p className="mt-1 text-sm text-muted"><Highlight text={snippet(r.releaseNote.replace(/\n/g, " "), q)} q={q} /></p>
              </Item>
            ))}
          </Group>
          <Group title="QnA" count={data.questions.length}>
            {data.questions.map((x) => (
              <Item key={x.questionId} href={`/qna/${x.questionId}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium"><Highlight text={x.title ?? ""} q={q} /></p>
                  <AnswerBadge answered={x.answered} />
                </div>
                <p className="mt-1 text-sm text-muted"><Highlight text={snippet(x.content, q)} q={q} /></p>
              </Item>
            ))}
          </Group>
          <Group title="버그 신고" count={data.bugs.length}>
            {data.bugs.map((b) => (
              <Item key={b.bugId} href={`/bugs/${b.bugId}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">#{b.bugId} <Highlight text={b.title} q={q} /></p>
                  <BugStatusBadge status={b.status} />
                </div>
                <p className="mt-1 text-sm text-muted"><Highlight text={snippet(b.content, q)} q={q} /></p>
              </Item>
            ))}
          </Group>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
