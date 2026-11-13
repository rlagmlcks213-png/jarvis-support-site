"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import QnaTab from "./_tabs/QnaTab";
import BugsTab from "./_tabs/BugsTab";
import FaqTab from "./_tabs/FaqTab";
import PostsTab from "./_tabs/PostsTab";

// UI-018 답변·상태 관리 — 관련: SFR-006 ②, PMR-002

const TABS = [
  { key: "qna", label: "QnA" },
  { key: "bugs", label: "버그" },
  { key: "faq", label: "FAQ" },
  { key: "posts", label: "게시물" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function ManageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "qna";
  const id = params.get("id") ? Number(params.get("id")) : null;

  const go = (key: TabKey) => router.replace(`${pathname}?tab=${key}`, { scroll: false });
  const select = (newId: number | null) =>
    router.replace(`${pathname}?tab=${tab}${newId != null ? `&id=${newId}` : ""}`, { scroll: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">답변·상태 관리</h1>
      <div role="tablist" aria-label="관리 항목" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => go(t.key)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "qna" && <QnaTab selectedId={id} onSelect={select} />}
        {tab === "bugs" && <BugsTab selectedId={id} onSelect={select} />}
        {tab === "faq" && <FaqTab />}
        {tab === "posts" && <PostsTab />}
      </div>
    </div>
  );
}

export default function ManagePage() {
  return (
    <Suspense>
      <ManageInner />
    </Suspense>
  );
}
