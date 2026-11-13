"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { BugStatus } from "@/lib/types";
import { BUG_STATUSES } from "@/lib/types";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  extra,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={htmlFor} className="label">
          {label}
          {optional ? <span className="ml-1 text-xs font-normal text-muted">(선택)</span> : <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
        {extra}
      </div>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const STATUS_CLASS: Record<BugStatus, string> = {
  접수: "badge-gray",
  "확인 중": "badge-yellow",
  "수정 완료": "badge-blue",
  배포됨: "badge-green",
};

export function BugStatusBadge({ status }: { status: BugStatus }) {
  return <span className={STATUS_CLASS[status]}>{status}</span>;
}

export function AnswerBadge({ answered }: { answered: boolean }) {
  return answered ? <span className="badge-green">답변 완료</span> : <span className="badge-orange">대기 중</span>;
}

export function StatusPipeline({ status }: { status: BugStatus }) {
  const current = BUG_STATUSES.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-label="처리 상태">
      {BUG_STATUSES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-1.5 sm:gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={`rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                active
                  ? "bg-brand text-white ring-4 ring-brand/20"
                  : done
                    ? "bg-brand-soft text-brand-text"
                    : "bg-surface-muted text-muted"
              }`}
            >
              {done && "✓ "}
              {s}
            </span>
            {i < BUG_STATUSES.length - 1 && (
              <span aria-hidden className={done ? "text-brand-text" : "text-muted"}>
                ➔
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="불러오는 중">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="card px-6 py-12 text-center text-sm text-muted">{children}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card border-danger/40 px-6 py-8 text-center text-sm">
      <p className="text-danger">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-3" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // 비보안 컨텍스트 대체 경로
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        setCopied(true);
      }}
      aria-label={`${label}: ${text}`}
    >
      {copied ? "복사됨 ✓" : label}
    </button>
  );
}

export function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="페이지 이동">
      <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="이전 페이지">
        ‹ 이전
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={`btn-sm btn min-w-8 ${p === page ? "bg-brand text-white" : "text-muted hover:bg-surface-muted"}`}
        >
          {p}
        </button>
      ))}
      <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="다음 페이지">
        다음 ›
      </button>
    </nav>
  );
}
