"use client";

import { useEffect, useId, useState } from "react";
import { getCaptcha, type CaptchaAnswer, type CaptchaChallenge } from "@/lib/repository";

/**
 * 자동 등록 방지 (간단한 덧셈). 문제는 서버가 내고, 정답 확인도 서버에서 한다.
 * TODO(확정 필요): 스팸이 많아지면 Cloudflare Turnstile / reCAPTCHA로 교체
 */
export default function Captcha({ onChange, error }: { onChange: (value: CaptchaAnswer | null) => void; error?: string }) {
  const id = useId();
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [value, setValue] = useState("");

  const refresh = () => {
    setValue("");
    setLoadError(false);
    onChange(null);
    getCaptcha()
      .then(setChallenge)
      .catch(() => setLoadError(true));
  };

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <label htmlFor={id} className="label">
        자동 등록 방지<span className="ml-0.5 text-danger" aria-hidden>*</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-surface-muted px-3 py-2 font-mono text-sm font-semibold select-none" aria-live="polite">
          {loadError ? "문제를 못 불러왔어요" : challenge ? challenge.question : "…"}
        </span>
        <input
          id={id}
          inputMode="numeric"
          className={`input w-24 ${error ? "input-error" : ""}`}
          value={value}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={!challenge}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 3);
            setValue(v);
            onChange(challenge && v ? { token: challenge.token, answer: v } : null);
          }}
        />
        <button type="button" className="btn-ghost btn-sm" onClick={refresh} aria-label="새 문제 받기">
          ↻ 새 문제
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
