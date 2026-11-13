"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { createBugReport } from "@/lib/repository";
import BugForm from "@/components/BugForm";
import { PageHeader } from "@/components/ui";
import { useToast } from "@/components/Toast";
import type { BugOs } from "@/lib/types";

import { VERSION_RE, normalizeVersion } from "@/lib/validation";

// UI-014 버그 신고 작성 — SFR-004 ⑤ 앱 버전·OS 자동 입력
// 데스크톱 앱 연동 규약 (고정 형식): 트레이 메뉴 [문의/버그 신고] →
//   /bugs/new?appVersion=1.0.2&os=windows11&from=tray
//   appVersion: "1.0.2" 또는 "v1.0.2" → "v1.0.2"로 정규화
//   os: windows10 | windows11 | other → Windows 10 / Windows 11 / 기타
//   형식에 맞지 않는 값은 무시하고 빈칸(기본값)으로 둔다

const OS_PARAM: Record<string, BugOs> = { windows10: "Windows 10", windows11: "Windows 11", other: "기타" };

function mapOs(raw: string | null): BugOs | null {
  return raw ? (OS_PARAM[raw.trim().toLowerCase()] ?? null) : null;
}

function NewBugInner() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();

  const prefill = useMemo(() => {
    const rawVersion = params.get("appVersion");
    const appVersion = rawVersion && VERSION_RE.test(rawVersion.trim()) ? normalizeVersion(rawVersion) : null;
    const os = mapOs(params.get("os"));
    return { appVersion, os, fromTray: params.get("from") === "tray" };
  }, [params]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/bugs" className="link text-sm">
        ← 버그 신고 목록
      </Link>
      <div className="mt-4">
        <PageHeader title="버그 신고하기" description="문제가 생긴 상황을 자세히 알려 주시면 빠르게 확인할게요." />
      </div>
      {prefill.fromTray && (
        <p className="mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-900">앱 트레이 메뉴에서 열었어요. 앱 버전과 OS를 자동으로 채웠어요.</p>
      )}
      <div className="card p-6 sm:p-8">
        <BugForm
          mode="create"
          initial={{ ...(prefill.appVersion ? { appVersion: prefill.appVersion } : {}), ...(prefill.os ? { os: prefill.os } : {}) }}
          autoFilled={{ appVersion: !!prefill.appVersion, os: !!prefill.os }}
          onCancel={() => router.push("/bugs")}
          onSubmit={async (values, captcha) => {
            const id = await createBugReport({ ...values, attachment: values.attachment === "keep" ? null : values.attachment }, captcha);
            toast("버그 신고가 접수됐어요. 처리 상태를 여기서 확인할 수 있어요.");
            router.push(`/bugs/${id}`);
          }}
        />
      </div>
    </div>
  );
}

export default function NewBugPage() {
  return (
    <Suspense>
      <NewBugInner />
    </Suspense>
  );
}
