import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { hmacHex, signToken, verifyToken } from "@/lib/signed-token";
import { CAPTCHA_TTL_MINUTES } from "@/lib/constants";
import { RepoError } from "@/lib/repository/errors";
import { sessionSecret } from "./env";

// 서버 검증 캡차 (간단한 덧셈). 정답은 토큰에 평문으로 넣지 않고 HMAC으로만 담는다.
// TODO(확정 필요): 실서비스에서 스팸이 많으면 Cloudflare Turnstile / reCAPTCHA로 교체

export interface CaptchaChallenge {
  question: string;
  token: string;
}
export interface CaptchaAnswer {
  token: string;
  answer: string;
}

export async function issueCaptcha(): Promise<CaptchaChallenge> {
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  const n = randomBytes(8).toString("hex");
  const h = await hmacHex(sessionSecret(), `captcha:${n}:${a + b}`);
  const token = await signToken({ n, h, exp: Date.now() + CAPTCHA_TTL_MINUTES * 60_000 }, sessionSecret());
  return { question: `${a} + ${b} = ?`, token };
}

export async function assertCaptcha(c: CaptchaAnswer | null | undefined) {
  const fail = (msg: string) => new RepoError(msg, "VALIDATION", { captcha: msg });
  if (!c?.token || !c.answer) throw fail("자동 등록 방지 문제를 풀어 주세요.");
  const p = await verifyToken<{ n: string; h: string; exp: number }>(c.token, sessionSecret());
  if (!p) throw fail("자동 등록 방지 문제의 시간이 지났어요. 새 문제를 받아 다시 풀어 주세요.");
  const expected = await hmacHex(sessionSecret(), `captcha:${p.n}:${Number(c.answer)}`);
  if (expected !== p.h) throw fail("계산 결과가 맞지 않아요. 다시 입력해 주세요.");
}
