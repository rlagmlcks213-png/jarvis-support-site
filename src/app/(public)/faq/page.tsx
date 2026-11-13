"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getFaqs } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/ui";

// UI-012 FAQ — 관련: SFR-004, UIR-002
// faq 테이블에 카테고리 칼럼이 없으므로 카테고리 필터는 만들지 않는다. 키워드 필터만 제공.

export default function FaqPage() {
  const { data, error, reload } = useRepo(getFaqs, []);
  const [keyword, setKeyword] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!data) return [];
    if (!k) return data;
    return data.filter((f) => f.question.toLowerCase().includes(k) || f.answer.toLowerCase().includes(k));
  }, [data, keyword]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="자주 묻는 질문" description="설치부터 설정까지, 많이 물어보시는 내용을 모았어요." />

      <label htmlFor="faq-filter" className="sr-only">
        FAQ 키워드 필터
      </label>
      <input
        id="faq-filter"
        type="search"
        className="input mb-5"
        placeholder="키워드로 찾기 (예: 단축키, 오프라인)"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState>&lsquo;{keyword}&rsquo;에 맞는 질문이 없어요. 다른 키워드로 찾아보거나 QnA에 질문해 주세요.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((f) => {
            const open = openId === f.faqId;
            return (
              <li key={f.faqId} className="card overflow-hidden">
                <h2>
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-surface-muted/60"
                    aria-expanded={open}
                    aria-controls={`faq-panel-${f.faqId}`}
                    id={`faq-btn-${f.faqId}`}
                    onClick={() => setOpenId(open ? null : f.faqId)}
                  >
                    <span className="flex gap-2">
                      <span className="text-brand" aria-hidden>
                        Q.
                      </span>
                      {f.question}
                    </span>
                    <span className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden>
                      ▾
                    </span>
                  </button>
                </h2>
                {open && (
                  <div id={`faq-panel-${f.faqId}`} role="region" aria-labelledby={`faq-btn-${f.faqId}`} className="border-t border-line bg-surface-muted/40 px-5 py-4 text-sm whitespace-pre-wrap text-slate-700">
                    {f.answer}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="card mt-8 flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="font-medium">원하는 답이 없나요?</p>
        <Link href="/qna" className="btn-primary">
          QnA에 질문하기 →
        </Link>
      </div>
    </div>
  );
}
