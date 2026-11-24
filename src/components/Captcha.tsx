"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { CaptchaAnswer } from "@/lib/repository";
import { TURNSTILE_SITE_KEY } from "@/lib/constants";

/**
 * 자동 등록 방지 — Cloudflare Turnstile 위젯 (외부 패키지 없이 공식 스크립트를 직접 로드).
 * 토큰은 서버(server/captcha.ts)가 Cloudflare에 확인하고, 한 번만 쓸 수 있다.
 * → 부모는 제출할 때마다(성공·실패 모두) ref.reset()으로 새 토큰을 받게 해야 한다.
 */

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// 스크립트는 페이지당 한 번만 로드하고, 이미 있으면 재사용한다
let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      scriptPromise = null; // 다음 마운트에서 다시 시도
      script.remove();
      reject(new Error("turnstile script load failed"));
    });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export interface CaptchaHandle {
  /** 위젯을 초기화해 새 토큰을 받게 한다 (onChange(null)도 함께 호출) */
  reset(): void;
}

interface Props {
  onChange: (value: CaptchaAnswer | null) => void;
  error?: string;
}

const Captcha = forwardRef<CaptchaHandle, Props>(function Captcha({ onChange, error }, ref) {
  const id = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    if (!TURNSTILE_SITE_KEY) {
      setLoadError("자동 등록 방지 설정이 아직 안 돼 있어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    loadTurnstile()
      .then(() => {
        if (cancelled || !boxRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(boxRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "ko",
          callback: (token: string) => onChangeRef.current({ token }),
          "expired-callback": () => onChangeRef.current(null),
          "error-callback": () => onChangeRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("자동 등록 방지 위젯을 불러오지 못했어요. 새로고침해 주세요.");
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        onChangeRef.current(null);
        if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
      },
    }),
    [],
  );

  const message = error || loadError;
  return (
    <div>
      <p id={`${id}-label`} className="label">
        자동 등록 방지<span className="ml-0.5 text-danger" aria-hidden>*</span>
      </p>
      <div ref={boxRef} role="group" aria-labelledby={`${id}-label`} aria-describedby={message ? `${id}-error` : undefined} className="min-h-[65px]" />
      {message && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">
          {message}
        </p>
      )}
    </div>
  );
});

export default Captcha;
