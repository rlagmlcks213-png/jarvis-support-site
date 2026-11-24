import "server-only";
import { RepoError } from "@/lib/repository/errors";
import { turnstileSecret } from "./env";
import { getClientIp } from "./request";

// 자동 등록 방지 — Cloudflare Turnstile. 위젯(components/Captcha.tsx)이 받은 토큰을 서버에서 Cloudflare에 확인한다.
// 토큰은 한 번만 쓸 수 있다(Cloudflare가 재사용을 거부). 적용 위치: QnA 질문 작성, 버그 신고 작성.

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface CaptchaAnswer {
  token: string;
}

interface SiteverifyResponse {
  success?: boolean;
  "error-codes"?: string[];
}

export async function assertCaptcha(c: CaptchaAnswer | null | undefined) {
  const fail = (msg: string) => new RepoError(msg, "VALIDATION", { captcha: msg });
  if (!c?.token) throw fail("자동 등록 방지 확인을 완료해 주세요.");

  // 운영에서 비밀 키가 없거나 테스트 키면 등록을 막는다 (원인은 env.ts가 서버 로그에 남김)
  const secret = turnstileSecret();
  if (!secret) throw fail("지금은 글을 등록할 수 없어요. 잠시 후 다시 시도해 주세요.");

  const form = new URLSearchParams({ secret, response: c.token });
  const ip = await getClientIp();
  if (ip) form.set("remoteip", ip);

  let result: SiteverifyResponse;
  try {
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body: form, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) throw new Error(`siteverify HTTP ${res.status}`);
    result = (await res.json()) as SiteverifyResponse;
  } catch (e) {
    // Cloudflare에 확인하지 못하면 통과시키지 않는다
    console.error("[turnstile] siteverify 호출 실패:", e instanceof Error ? e.message : e);
    throw fail("잠시 후 다시 시도해 주세요.");
  }

  if (result.success === true) return;
  const codes = result["error-codes"] ?? [];
  if (codes.includes("timeout-or-duplicate")) throw fail("자동 등록 방지 확인 시간이 지났어요. 다시 확인해 주세요.");
  // 키 설정 문제는 사용자가 고칠 수 없으므로 서버 로그로 알린다
  if (codes.some((c) => c.includes("secret"))) console.error("[turnstile] 비밀 키 오류:", codes.join(","));
  throw fail("자동 등록 방지 확인에 실패했어요. 다시 시도해 주세요.");
}
