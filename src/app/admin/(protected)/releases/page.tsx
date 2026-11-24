"use client";

import { useEffect, useState } from "react";
import {
  RepoError,
  adminGetReleases,
  buildSimulatedSyncPayload,
  createManualRelease,
  deleteRelease,
  errorMessage,
  getFixedBugs,
  importGithubReleases,
  linkBugsToRelease,
  setReleaseHidden,
  simulateGithubSync,
  updateReleaseNote,
  type AdminRelease,
} from "@/lib/repository";
import type { ReleasePayload } from "@/lib/release-validation";
import { useRepo } from "@/hooks/useRepo";
import { formatBytes, formatDate, todayYmd } from "@/lib/format";
import { GITHUB_REPO } from "@/lib/constants";
import { BugStatusBadge, ErrorState, Field, LoadingBlock } from "@/components/ui";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";

// UI-017 릴리스 관리 — 관련: SFR-005, SFR-006 ②, SER-002 ⑤
// 설치 파일 업로드 화면이 아니다. 파일은 GitHub Releases에 있고, 여기서는 등록된 릴리스를 관리한다.

// ── GitHub 동기화 시뮬레이션 ─────────────────────
function SyncModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [payload, setPayload] = useState<ReleasePayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setPayload(null);
    buildSimulatedSyncPayload().then(setPayload).catch((e) => setError(errorMessage(e)));
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="GitHub 릴리스 동기화 (시뮬레이션)"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>취소</button>
          <button
            className="btn-primary"
            disabled={!payload || busy}
            onClick={async () => {
              if (!payload) return;
              setBusy(true);
              try {
                await simulateGithubSync(payload);
                toast(`${payload.version} 릴리스가 자동 등록됐어요. 다운로드·릴리스 노트에 바로 공개돼요.`);
                onClose();
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "등록 중…" : "동기화 실행"}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">
        실제로는 버전 태그를 push하면 GitHub Actions가 .exe를 빌드하고 GitHub Release를 만든 뒤, 아래 본문으로{" "}
        <code className="rounded bg-surface-muted px-1">POST /api/releases/sync</code>를 호출해요. 여기서는 같은 검증 함수를 거쳐 브라우저 목업 저장소에 기록해요.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-200">
        {payload ? JSON.stringify(payload, null, 2) : "요청 본문 만드는 중…"}
      </pre>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
    </Modal>
  );
}

// ── 수동 등록 ────────────────────────────────────
const EMPTY_MANUAL = { version: "", releasedAt: "", releaseNote: "", downloadUrl: "", sha256: "", fileSize: "", githubReleaseUrl: "" };

function ManualModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState(EMPTY_MANUAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const prefix = `https://github.com/${GITHUB_REPO}/releases/`;

  useEffect(() => {
    if (open) {
      setV({ ...EMPTY_MANUAL, releasedAt: todayYmd() });
      setErrors({});
      setFormError("");
    }
  }, [open]);

  const set = (k: keyof typeof EMPTY_MANUAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));
  const cls = (k: string) => `input ${errors[k] ? "input-error" : ""}`;

  return (
    <Modal open={open} onClose={onClose} title="릴리스 수동 등록" size="lg">
      <form
        noValidate
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setFormError("");
          try {
            await createManualRelease(v);
            toast(`v${v.version.replace(/^v/i, "")} 릴리스를 수동 등록했어요.`);
            onClose();
          } catch (err) {
            setErrors(err instanceof RepoError ? err.fields : {});
            setFormError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
          자동 등록(webhook·가져오기 버튼)이 실패했을 때만 사용해요. 파일은 먼저 GitHub Release에 올라가 있어야 해요.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="버전" htmlFor="m-version" error={errors.version} hint="예: v1.0.2">
            <input id="m-version" className={cls("version")} value={v.version} onChange={set("version")} placeholder="v1.0.2" maxLength={20} />
          </Field>
          <Field label="배포일" htmlFor="m-date" error={errors.releasedAt}>
            <input id="m-date" type="date" className={cls("releasedAt")} value={v.releasedAt} onChange={set("releasedAt")} />
          </Field>
        </div>
        <Field label="GitHub Release 다운로드 URL" htmlFor="m-url" error={errors.downloadUrl} hint={`${prefix} 로 시작하고 .exe로 끝나야 해요.`}>
          <input id="m-url" className={cls("downloadUrl")} value={v.downloadUrl} onChange={set("downloadUrl")} placeholder={`${prefix}download/v1.0.2/HeyJarvis-Setup-1.0.2.exe`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="파일 크기 (byte)" htmlFor="m-size" error={errors.fileSize} hint="GitHub 릴리스 파일 목록에 표시된 크기">
            <input id="m-size" inputMode="numeric" className={cls("fileSize")} value={v.fileSize} onChange={(e) => setV((p) => ({ ...p, fileSize: e.target.value.replace(/D/g, "") }))} placeholder="87812096" maxLength={10} />
          </Field>
          <Field label="GitHub 릴리스 페이지 URL" htmlFor="m-gh" optional error={errors.githubReleaseUrl} hint="비워 두면 태그 주소(…/releases/tag/v버전)로 만들어요.">
            <input id="m-gh" className={cls("githubReleaseUrl")} value={v.githubReleaseUrl} onChange={set("githubReleaseUrl")} placeholder={`${prefix}tag/v1.0.2`} />
          </Field>
        </div>
        <Field label="SHA-256" htmlFor="m-sha" error={errors.sha256} hint="GitHub Actions 로그 또는 릴리스 본문의 64자리 16진수 값">
          <input id="m-sha" className={`${cls("sha256")} font-mono text-xs`} value={v.sha256} onChange={set("sha256")} maxLength={64} spellCheck={false} />
        </Field>
        <Field label="릴리스 노트" htmlFor="m-note" error={errors.releaseNote} hint="첫 줄은 요약, 변경 사항은 '- '로 시작하는 줄로 적으면 목록으로 보여요.">
          <textarea id="m-note" rows={5} className={cls("releaseNote")} value={v.releaseNote} onChange={set("releaseNote")} />
        </Field>
        {formError && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "저장 중…" : "등록"}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── 릴리스 편집 (노트 수정 + 해결된 버그 연결) ───────────
function EditModal({ release, onClose }: { release: AdminRelease | null; onClose: () => void }) {
  const toast = useToast();
  const fixed = useRepo(getFixedBugs, [release?.releaseId]);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (release) {
      setNote(release.releaseNote);
      setNoteError("");
      setSelected([]);
    }
  }, [release?.releaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!release) return null;
  const candidates = (fixed.data ?? []).filter((b) => b.resolvedReleaseId !== release.releaseId);

  const doLink = async () => {
    setBusy(true);
    try {
      const res = await linkBugsToRelease(release.releaseId, selected);
      toast(
        res.deployed > 0
          ? `버그 ${res.linked}건을 연결하고 '배포됨'으로 바꿨어요.`
          : `버그 ${res.linked}건을 연결했어요. (숨김 릴리스라 상태는 그대로예요)`,
      );
      setSelected([]);
      setConfirmOpen(false);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`v${release.version} 편집`} size="lg">
      <div className="space-y-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateReleaseNote(release.releaseId, note);
              setNoteError("");
              toast("릴리스 노트를 저장했어요.");
            } catch (err) {
              setNoteError(errorMessage(err));
            }
          }}
        >
          <label htmlFor="e-note" className="label">릴리스 노트</label>
          <textarea id="e-note" rows={6} className={`input ${noteError ? "input-error" : ""}`} value={note} onChange={(e) => setNote(e.target.value)} />
          {noteError && <p role="alert" className="mt-1 text-xs text-danger">{noteError}</p>}
          <div className="mt-2 flex justify-end">
            <button type="submit" className="btn-secondary btn-sm" disabled={note === release.releaseNote}>노트 저장</button>
          </div>
        </form>

        <section>
          <h3 className="label">연결된 버그 ({release.linkedBugs.length})</h3>
          {release.linkedBugs.length === 0 ? (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">아직 연결된 버그가 없어요.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {release.linkedBugs.map((b) => (
                <li key={b.bugId} className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-surface-muted">
                  <span className="min-w-0 truncate">#{b.bugId} {b.title}</span>
                  <BugStatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="label">
            해결된 버그 연결 <span className="text-xs font-normal text-muted">(상태가 &lsquo;수정 완료&rsquo;인 버그)</span>
          </h3>
          <p className="mb-2 text-xs text-muted">
            {release.isHidden
              ? "숨김 릴리스예요. 연결해도 버그 상태는 바뀌지 않아요."
              : "공개 릴리스예요. 연결하면 선택한 버그가 '배포됨'으로 바뀌어요."}
          </p>
          {!fixed.data ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : candidates.length === 0 ? (
            <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-muted">연결할 &lsquo;수정 완료&rsquo; 버그가 없어요.</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
              {candidates.map((b) => (
                <li key={b.bugId}>
                  <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-muted">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-indigo-500"
                      checked={selected.includes(b.bugId)}
                      onChange={(e) => setSelected((p) => (e.target.checked ? [...p, b.bugId] : p.filter((x) => x !== b.bugId)))}
                    />
                    <span>
                      #{b.bugId} {b.title}
                      {b.resolvedReleaseId != null && <span className="ml-1 text-xs text-muted">(다른 릴리스에 연결돼 있음 → 이 릴리스로 변경)</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex justify-end">
            <button
              className="btn-primary btn-sm"
              disabled={selected.length === 0 || busy}
              onClick={() => (release.isHidden ? doLink() : setConfirmOpen(true))}
            >
              선택한 버그 연결 ({selected.length})
            </button>
          </div>
        </section>
      </div>

      <ConfirmModal open={confirmOpen} title="버그 상태 변경" confirmLabel="연결하고 변경" danger={false} onClose={() => setConfirmOpen(false)} onConfirm={doLink}>
        선택한 버그 {selected.length}건을 &lsquo;배포됨&rsquo;으로 변경합니다. 공개 버그 상세와 릴리스 노트에 바로 반영돼요.
      </ConfirmModal>
    </Modal>
  );
}

// ── 삭제 확인 ────────────────────────────────────
function DeleteModal({ release, onClose }: { release: AdminRelease | null; onClose: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!release) return null;

  const run = async (fn: () => Promise<void>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast(msg);
      onClose();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`v${release.version} 삭제`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>취소</button>
          {!release.isHidden && (
            <button className="btn-primary" disabled={busy} onClick={() => run(() => setReleaseHidden(release.releaseId, true), `v${release.version}을(를) 숨겼어요.`)}>
              숨김으로 처리
            </button>
          )}
          <button className="btn-danger" disabled={busy} onClick={() => run(() => deleteRelease(release.releaseId), `v${release.version}을(를) 삭제했어요.`)}>
            삭제
          </button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="rounded-lg bg-brand-soft px-3 py-2 font-medium text-brand-text">
          💡 삭제 대신 숨김을 권장합니다. 숨기면 사이트에서만 내려가고 버그 연결은 그대로 남아요.
        </p>
        <p className="text-muted">사이트 등록만 삭제되고 GitHub 파일은 그대로 남습니다. 삭제는 되돌릴 수 없어요.</p>
        <div>
          <p className="font-semibold">영향받는 버그 ({release.linkedBugs.length})</p>
          {release.linkedBugs.length === 0 ? (
            <p className="mt-1 text-muted">연결된 버그가 없어요.</p>
          ) : (
            <>
              <ul className="mt-1 space-y-1">
                {release.linkedBugs.map((b) => (
                  <li key={b.bugId} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">#{b.bugId} {b.title}</span>
                    <BugStatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-danger">삭제하면 이 버그들의 해결 릴리스가 비워지고, &lsquo;배포됨&rsquo;이던 버그는 &lsquo;수정 완료&rsquo;로 돌아가요.</p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── 페이지 ──────────────────────────────────────
export default function AdminReleasesPage() {
  const toast = useToast();
  const { data, error, reload } = useRepo(adminGetReleases, []);
  const [syncOpen, setSyncOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 데이터가 갱신되면 모달도 최신 행을 보도록 id로 찾는다
  const editing = data?.find((r) => r.releaseId === editingId) ?? null;
  const deleting = data?.find((r) => r.releaseId === deletingId) ?? null;

  // webhook을 놓쳤을 때 — GitHub의 최근 릴리스를 직접 조회해 빠진 버전을 등록
  const importFromGithub = async () => {
    setImporting(true);
    try {
      const s = await importGithubReleases();
      const failed = s.failed.length ? ` / 실패 ${s.failed.length}개(${s.failed.map((f) => `${f.version}: ${f.reason}`).join(", ")})` : "";
      toast(`새로 등록 ${s.created.length}개 / 이미 있음 ${s.existing}개${failed}`, s.failed.length ? "error" : undefined);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">릴리스 관리</h1>
          <p className="mt-1 text-sm text-muted">
            설치 파일은 GitHub Releases에 있어요. 앱 저장소에서 릴리스를 Publish하면 webhook으로 자동 등록돼요. 자동 등록된 릴리스에 해결된 버그를 연결해 주세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={importFromGithub} disabled={importing} title="webhook을 놓쳤을 때 GitHub의 최근 릴리스 10개 중 빠진 버전을 등록해요">
            {importing ? "가져오는 중…" : "↓ GitHub에서 최신 릴리스 가져오기"}
          </button>
          <button className="btn-secondary" onClick={() => setSyncOpen(true)}>⟳ GitHub 릴리스 동기화(시뮬레이션)</button>
          <button className="btn-secondary" onClick={() => setManualOpen(true)}>수동 등록</button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock rows={3} />
      ) : data.length === 0 ? (
        <p className="card p-8 text-center text-sm text-muted">등록된 릴리스가 없어요.</p>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data.map((r) => (
            <li key={r.releaseId} className="flex flex-col gap-3 p-5 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">v{r.version}</span>
                  {r.isHidden ? <span className="badge-gray">숨김</span> : <span className="badge-green">공개</span>}
                  {r.source === "github" ? <span className="badge-indigo">GitHub 자동</span> : <span className="badge-yellow">관리자 수동</span>}
                  {r.linkedBugs.length === 0 && <span className="badge-orange">버그 미연결</span>}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(r.releasedAt)} · {formatBytes(r.fileSize)} · 연결된 버그 {r.linkedBugs.length}건
                  {r.uploadedByName && ` · 등록 ${r.uploadedByName}`}
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-muted" title={r.sha256}>SHA-256 {r.sha256}</p>
                {r.githubReleaseUrl && (<a href={r.githubReleaseUrl} target="_blank" rel="noopener noreferrer" className="link mt-1 inline-block text-xs">
                  GitHub 릴리스 ↗
                </a>)}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button className="btn-secondary btn-sm" onClick={() => setEditingId(r.releaseId)}>편집</button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      await setReleaseHidden(r.releaseId, !r.isHidden);
                      toast(r.isHidden ? `v${r.version}을(를) 다시 공개했어요.` : `v${r.version}을(를) 숨겼어요.`);
                    } catch (e) {
                      toast(errorMessage(e), "error");
                    }
                  }}
                >
                  {r.isHidden ? "숨김 해제" : "숨김"}
                </button>
                <button className="btn-secondary btn-sm text-danger" onClick={() => setDeletingId(r.releaseId)}>삭제</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
      <ManualModal open={manualOpen} onClose={() => setManualOpen(false)} />
      <EditModal release={editing} onClose={() => setEditingId(null)} />
      <DeleteModal release={deleting} onClose={() => setDeletingId(null)} />
    </div>
  );
}
