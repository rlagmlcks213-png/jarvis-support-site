"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { RepoError, adminLogin, errorMessage } from "@/lib/repository";
import { LogoMark } from "@/components/Logo";

// UI-015 관리자 로그인 — 관련: SFR-006 ①, SER-002 ①
// 회원가입·비밀번호 찾기 없음 (미리 등록된 개발팀 계정만)
// 비밀번호 확인·잠금(계정 기준 5회 실패 → 5분)은 서버에서 한다.

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [lockMs, setLockMs] = useState(0);

  useEffect(() => {
    const tick = () => setLockMs(Math.max(0, lockedUntil - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const locked = lockMs > 0;
  const mm = Math.floor(lockMs / 60000);
  const ss = String(Math.floor((lockMs % 60000) / 1000)).padStart(2, "0");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    if (!loginId.trim() || !password) {
      setError("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminLogin(loginId, password);
      const next = params.get("next");
      router.replace(next && next.startsWith("/admin/") ? next : "/admin/dashboard");
      router.refresh();
    } catch (err) {
      setPassword("");
      if (err instanceof RepoError && err.code === "LOCKED" && err.fields.lockedUntil) {
        setError("");
        setLockedUntil(new Date(err.fields.lockedUntil).getTime());
      } else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <LogoMark className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-bold">비서 자비스 관리자</h1>
            <p className="mt-1 text-sm text-muted">개발팀 계정으로 로그인해 주세요.</p>
          </div>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
          <div>
            <label htmlFor="admin-id" className="label">아이디</label>
            <input id="admin-id" className="input" value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" disabled={locked} />
          </div>
          <div>
            <label htmlFor="admin-pw" className="label">비밀번호</label>
            <input id="admin-pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" disabled={locked} />
          </div>
          {locked ? (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              로그인 실패가 반복되어 잠시 제한됐어요. {mm}분 {ss}초 후에 다시 시도해 주세요.
            </p>
          ) : (
            error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )
          )}
          <button type="submit" className="btn-primary w-full py-2.5" disabled={busy || locked}>
            {busy ? "확인 중…" : "로그인"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">계정 문의는 개발팀 내부 채널로 해 주세요.</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
