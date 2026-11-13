"use client";

import Link from "next/link";
import { useState } from "react";
import { getReleases } from "@/lib/repository";
import { useRepo } from "@/hooks/useRepo";
import { formatBytes, formatDate } from "@/lib/format";
import type { Release } from "@/lib/types";
import { isMockDownloadUrl } from "@/lib/release-utils";
import { CopyButton, EmptyState, ErrorState, LoadingBlock, PageHeader } from "@/components/ui";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

// UI-010 다운로드 — 관련: SFR-005 ①, PSR-001, COR-002, SER-002 ⑤

/**
 * [다운로드] — GitHub Release 파일 URL(release.downloadUrl)로 바로 연결한다.
 * GitHub 파일 URL(/releases/download/...)은 브라우저에서 바로 다운로드되므로 GitHub 페이지를 거치지 않는다.
 * 예시 URL(OWNER/REPO 포함)이면 받을 파일이 없으므로 "목업 환경" 안내만 띄운다.
 */
/** 다운로드 주소의 파일명 (예: HeyJarvis-Setup-1.0.2.exe) */
const fileName = (url: string) => decodeURIComponent(url.split("/").pop() || "설치파일.exe");

function DownloadButton({ release, className, children }: { release: Release; className: string; children: React.ReactNode }) {
  const toast = useToast();
  if (isMockDownloadUrl(release.downloadUrl)) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => toast("목업 환경입니다. .env.local에 GITHUB_REPO를 설정하면 GitHub 파일로 연결돼요.", "info")}
      >
        {children}
      </button>
    );
  }
  return (
    <a href={release.downloadUrl} className={className} rel="noopener noreferrer">
      {children}
    </a>
  );
}

function ShaRow({ hash }: { hash: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-surface-muted px-2 py-1 font-mono text-xs" title={hash}>
        {hash}
      </code>
      <CopyButton text={hash} />
    </div>
  );
}

function SmartScreenModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const steps = [
    { n: "①", img: "/images/smartscreen-step1.png", alt: "Windows의 PC 보호 창에서 추가 정보 글자를 누르는 화면", title: "'추가 정보' 클릭", desc: "'Windows의 PC 보호' 창이 뜨면 본문의 [추가 정보] 글자를 눌러 주세요." },
    { n: "②", img: "/images/smartscreen-step2.png", alt: "추가 정보를 누른 뒤 나타나는 실행 버튼을 누르는 화면", title: "'실행' 클릭", desc: "아래쪽에 나타나는 [실행] 버튼을 누르면 설치가 시작돼요." },
  ];
  return (
    <Modal open={open} onClose={onClose} title="SmartScreen 경고가 떴을 때 실행하는 방법" size="lg" footer={<button className="btn-primary" onClick={onClose}>확인했어요</button>}>
      <ol className="grid gap-4 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.n} className="rounded-xl border border-line p-4">
            {/* placeholder 이미지 — 실제 SmartScreen 캡처로 같은 파일명에 덮어쓰면 됨 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.img} alt={s.alt} className="aspect-video w-full rounded-lg border border-line bg-slate-50 object-cover" />
            <p className="mt-3 font-semibold">
              {s.n} {s.title}
            </p>
            <p className="mt-1 text-sm text-muted">{s.desc}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted">
        경고는 유료 코드서명 인증서를 적용하지 않아서 나타나요. 아래의 SHA-256 값으로 파일이 변조되지 않았는지 확인할 수 있어요.
      </p>
    </Modal>
  );
}

export default function DownloadPage() {
  const { data, error, reload } = useRepo(getReleases, []);
  const [guideOpen, setGuideOpen] = useState(false);

  const latest = data?.[0];
  const previous = data?.slice(1) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader title="다운로드" description="비서 자비스 Windows 설치 파일을 받아 보세요." />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock rows={2} />
      ) : !latest ? (
        <EmptyState>아직 배포된 버전이 없어요. 조금만 기다려 주세요.</EmptyState>
      ) : (
        <>
          {/* 최신 버전 카드 — Windows(.exe) 1종만 */}
          <section className="card overflow-hidden" aria-labelledby="latest-title">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="badge-green">최신 버전</p>
                <h2 id="latest-title" className="mt-2 text-2xl font-bold">
                  Windows용 v{latest.version}
                </h2>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <div>
                    <dt className="inline">배포일 </dt>
                    <dd className="inline font-medium text-fg">{formatDate(latest.releasedAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline">파일 크기 </dt>
                    <dd className="inline font-medium text-fg">{formatBytes(latest.fileSize)}</dd>
                  </div>
                  <div>
                    <dt className="inline">형식 </dt>
                    <dd className="inline font-medium text-fg">.exe</dd>
                  </div>
                </dl>
              </div>
              <DownloadButton release={latest} className="btn-primary px-6 py-3 text-base">
                ⬇ 다운로드
              </DownloadButton>
            </div>
            <div className="space-y-3 border-t border-line bg-surface-muted/50 px-6 py-4 sm:px-8">
              <div>
                <p className="mb-1 text-xs font-semibold text-muted">SHA-256</p>
                <ShaRow hash={latest.sha256} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted">추가 런타임 설치 없이 바로 실행되는 단일 실행 파일이에요 (electron-builder 빌드).</p>
                <Link href={`/releases#v${latest.version}`} className="link">
                  릴리스 노트 보기 →
                </Link>
              </div>
            </div>
          </section>

          <p className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted">
            현재 Windows만 지원해요. macOS는 추후 지원 예정이에요.
          </p>

          {/* SmartScreen 안내 */}
          <section className="card mt-6 flex flex-col gap-4 border-amber-200 bg-amber-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-amber-900">⚠ 첫 실행 시 SmartScreen 경고가 뜰 수 있어요</h2>
              <p className="mt-1 text-sm text-amber-800">유료 코드서명 미적용으로 Windows 첫 실행 시 SmartScreen 경고가 뜰 수 있습니다.</p>
            </div>
            <button className="btn-secondary shrink-0 border-amber-300 bg-white" onClick={() => setGuideOpen(true)}>
              실행 방법 보기
            </button>
          </section>

          {/* SHA-256 확인 방법 */}
          <details className="card group mt-6 p-0">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-6 py-4 font-semibold">
              SHA-256 해시값은 어떻게 확인하나요?
              <span className="text-muted transition group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="space-y-3 px-6 pb-6 text-sm text-muted">
              <p>1. 설치 파일을 받은 폴더에서 PowerShell을 열어 주세요. (폴더 빈 곳에서 Shift + 우클릭 → &lsquo;PowerShell 창 열기&rsquo;)</p>
              <p>2. 아래 명령을 입력해요.</p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs whitespace-nowrap text-slate-100">
                  Get-FileHash {fileName(latest.downloadUrl)} -Algorithm SHA256
                </code>
                <CopyButton text={`Get-FileHash ${fileName(latest.downloadUrl)} -Algorithm SHA256`} />
              </div>
              <p>3. 출력된 Hash 값이 위의 SHA-256 값과 같으면 정상 파일이에요. (대소문자는 구분하지 않아요)</p>
            </div>
          </details>

          {/* 이전 버전 */}
          <section className="mt-10" aria-labelledby="prev-title">
            <h2 id="prev-title" className="mb-3 text-lg font-bold">
              이전 버전
            </h2>
            {previous.length === 0 ? (
              <EmptyState>이전 버전이 없어요.</EmptyState>
            ) : (
              <>
                <div className="card hidden overflow-hidden md:block">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-surface-muted text-left text-xs text-muted">
                      <tr>
                        <th className="w-24 px-4 py-3">버전</th>
                        <th className="w-28 px-4 py-3">배포일</th>
                        <th className="px-4 py-3">SHA-256</th>
                        <th className="w-28 px-4 py-3 text-right">다운로드</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previous.map((r) => (
                        <tr key={r.releaseId} className="border-t border-line">
                          <td className="px-4 py-3 font-semibold">v{r.version}</td>
                          <td className="px-4 py-3 text-muted">{formatDate(r.releasedAt)}</td>
                          <td className="px-4 py-3">
                            <ShaRow hash={r.sha256} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DownloadButton release={r} className="btn-secondary btn-sm">
                              다운로드
                            </DownloadButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-3 md:hidden">
                  {previous.map((r) => (
                    <li key={r.releaseId} className="card p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">v{r.version}</p>
                        <p className="text-xs text-muted">{formatDate(r.releasedAt)}</p>
                      </div>
                      <div className="mt-2">
                        <ShaRow hash={r.sha256} />
                      </div>
                      <DownloadButton release={r} className="btn-secondary btn-sm mt-3 w-full">
                        다운로드
                      </DownloadButton>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      <SmartScreenModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
