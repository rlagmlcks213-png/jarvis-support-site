"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminGetBugs, adminGetReleases, errorMessage, mergeBug, updateBugMemo, updateBugStatus } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatDateTime } from "@/lib/format";
import { BUG_STATUSES, type BugStatus } from "@/lib/types";
import { BugStatusBadge, ErrorState, LoadingBlock, StatusPipeline } from "@/components/ui";
import { useToast } from "@/components/Toast";

type Filter = BugStatus | "전체" | "미처리";

export default function BugsTab({ selectedId, onSelect }: { selectedId: number | null; onSelect: (id: number | null) => void }) {
  const toast = useToast();
  const bugs = useRepo(adminGetBugs, []);
  const releases = useRepo(adminGetReleases, []);
  const [filter, setFilter] = useState<Filter>("미처리");

  const [status, setStatus] = useState<BugStatus>("접수");
  const [releaseId, setReleaseId] = useState<string>("");
  const [memo, setMemo] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    if (!bugs.data) return [];
    return bugs.data.filter((b) => (filter === "전체" ? true : filter === "미처리" ? b.status !== "배포됨" : b.status === filter));
  }, [bugs.data, filter]);

  const selected = bugs.data?.find((b) => b.bugId === selectedId) ?? null;

  useEffect(() => {
    if (selected && !list.some((b) => b.bugId === selected.bugId)) setFilter("전체");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.bugId]);

  useEffect(() => {
    if (!selected) return;
    setStatus(selected.status);
    setReleaseId(selected.resolvedReleaseId != null ? String(selected.resolvedReleaseId) : "");
    setMemo(selected.adminMemo);
    setMergeTarget(selected.mergedIntoBugId != null ? String(selected.mergedIntoBugId) : "");
  }, [selected]);

  if (bugs.error) return <ErrorState message={bugs.error} onRetry={bugs.reload} />;
  if (!bugs.data) return <LoadingBlock rows={4} />;

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      return true;
    } catch (e) {
      toast(errorMessage(e), "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const needsRelease = status === "배포됨" && !releaseId;
  const statusChanged = selected && (status !== selected.status || releaseId !== (selected.resolvedReleaseId != null ? String(selected.resolvedReleaseId) : ""));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["미처리", ...BUG_STATUSES, "전체"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`btn btn-sm rounded-full ${filter === f ? "bg-brand text-white" : "border border-line text-muted hover:text-fg"}`}>
              {f}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">해당하는 버그 신고가 없어요.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {list.map((b) => (
              <li key={b.bugId}>
                <button
                  onClick={() => onSelect(b.bugId)}
                  aria-current={b.bugId === selectedId ? "true" : undefined}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted ${b.bugId === selectedId ? "bg-brand-soft" : ""}`}
                >
                  <span className="w-8 shrink-0 text-xs text-muted">#{b.bugId}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{b.title}</span>
                    <span className="text-xs text-muted">
                      {b.appVersion} · {b.os}
                      {b.mergedIntoBugId && ` · #${b.mergedIntoBugId}로 병합됨`}
                    </span>
                  </span>
                  <BugStatusBadge status={b.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5" aria-label="선택한 버그 신고">
        {!selected ? (
          <p className="py-12 text-center text-sm text-muted">왼쪽 목록에서 버그 신고를 선택해 주세요.</p>
        ) : (
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted">버그 #{selected.bugId}</p>
                  <h2 className="text-lg font-bold">{selected.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {selected.nickname} · {selected.appVersion} · {selected.os} · {formatDateTime(selected.createdAt)}
                  </p>
                </div>
                <Link href={`/bugs/${selected.bugId}`} target="_blank" className="btn-ghost btn-sm shrink-0">
                  공개 화면 ↗
                </Link>
              </div>
              <div className="mt-3"><StatusPipeline status={selected.status} /></div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted">발생 상황</p>
                <p className="mt-1 whitespace-pre-wrap">{selected.content}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">재현 방법</p>
                <p className="mt-1 rounded-lg bg-surface-muted p-3 whitespace-pre-wrap">{selected.reproSteps}</p>
              </div>
              {selected.attachmentUrl && (
                <div>
                  <p className="text-xs font-semibold text-muted">첨부</p>
                  <a href={selected.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selected.attachmentUrl} alt="첨부 이미지" className="mt-1 max-h-48 max-w-full rounded border border-line" />
                  </a>
                </div>
              )}
            </div>

            {/* 처리 상태 변경 */}
            <form
              className="rounded-lg border border-line p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (needsRelease) return;
                act(
                  () => updateBugStatus(selected.bugId, status, releaseId ? Number(releaseId) : null),
                  status === "배포됨" ? "'배포됨'으로 바꿨어요. 공개 상세와 릴리스 노트에 바로 반영돼요." : `상태를 '${status}'(으)로 바꿨어요.`,
                );
              }}
            >
              <h3 className="mb-3 text-sm font-semibold">처리 상태</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="bug-status" className="label text-xs">상태</label>
                  <select id="bug-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as BugStatus)}>
                    {BUG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="bug-release" className="label text-xs">
                    해결 릴리스 {status === "배포됨" && <span className="text-danger">*</span>}
                  </label>
                  <select id="bug-release" className={`input ${needsRelease ? "input-error" : ""}`} value={releaseId} onChange={(e) => setReleaseId(e.target.value)}>
                    <option value="">연결 안 함</option>
                    {releases.data?.map((r) => (
                      <option key={r.releaseId} value={r.releaseId}>
                        v{r.version}{r.isHidden ? " (숨김)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {needsRelease && <p role="alert" className="mt-2 text-xs text-danger">&lsquo;배포됨&rsquo;으로 바꾸려면 해결 릴리스를 선택해 주세요.</p>}
              <div className="mt-3 flex justify-end">
                <button type="submit" className="btn-primary btn-sm" disabled={busy || needsRelease || !statusChanged}>상태 저장</button>
              </div>
            </form>

            {/* 관리자 메모 */}
            <form
              className="rounded-lg border border-line p-4"
              onSubmit={(e) => {
                e.preventDefault();
                act(() => updateBugMemo(selected.bugId, memo), "메모를 저장했어요.");
              }}
            >
              <label htmlFor="bug-memo" className="mb-2 block text-sm font-semibold">
                관리자 메모 <span className="text-xs font-normal text-muted">(비공개 · 공개 화면에 표시되지 않아요)</span>
              </label>
              <textarea id="bug-memo" rows={3} className="input" value={memo} onChange={(e) => setMemo(e.target.value)} />
              <div className="mt-3 flex justify-end">
                <button type="submit" className="btn-secondary btn-sm" disabled={busy || memo === selected.adminMemo}>메모 저장</button>
              </div>
            </form>

            {/* 중복 병합 */}
            <form
              className="rounded-lg border border-line p-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!mergeTarget) return;
                act(() => mergeBug(selected.bugId, Number(mergeTarget)), `#${selected.bugId}을(를) #${mergeTarget}로 병합했어요.`);
              }}
            >
              <h3 className="mb-1 text-sm font-semibold">중복 신고 병합</h3>
              <p className="mb-3 text-xs text-muted">이 글이 다른 글과 같은 문제라면 원본을 선택해 주세요. 이 글에 &lsquo;중복: #원본번호로 병합됨&rsquo;이 표시되고, 목록에서 원본으로 연결돼요.</p>
              {selected.mergedIntoBugId ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-surface-muted px-3 py-2 text-sm">
                  <span>현재 <b>#{selected.mergedIntoBugId}</b>로 병합됨</span>
                  <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => act(() => mergeBug(selected.bugId, null), "병합을 해제했어요.")}>병합 해제</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label htmlFor="merge-target" className="sr-only">원본 글</label>
                  <select id="merge-target" className="input" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                    <option value="">원본 글 선택</option>
                    {bugs.data
                      .filter((b) => b.bugId !== selected.bugId && b.mergedIntoBugId == null)
                      .map((b) => (
                        <option key={b.bugId} value={b.bugId}>#{b.bugId} {b.title}</option>
                      ))}
                  </select>
                  <button type="submit" className="btn-secondary shrink-0" disabled={busy || !mergeTarget}>병합</button>
                </div>
              )}
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
