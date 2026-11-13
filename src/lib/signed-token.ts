// HMAC-SHA256 서명 토큰 — 관리자 세션 쿠키, 비밀글 열람 쿠키, 캡차에 사용.
// Web Crypto만 쓰므로 Node 서버와 middleware(Edge) 양쪽에서 동작한다.
// 형식: base64url(JSON payload) + "." + base64url(HMAC)
// ⚠ payload는 암호화가 아니라 서명만 된다(누구나 읽을 수 있음). 비밀 값을 payload에 넣지 말 것.

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** exp(만료 시각, ms)를 payload에 넣어 두면 verify에서 확인한다 */
export async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

export async function verifyToken<T extends object>(token: string | undefined | null, secret: string): Promise<T | null> {
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!safeEqual(fromB64url(sig), await hmac(secret, body))) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as T;
    const exp = (payload as { exp?: unknown }).exp;
    if (typeof exp === "number" && exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** HMAC 결과를 16진수로 (캡차 정답 확인 등) */
export async function hmacHex(secret: string, data: string): Promise<string> {
  return Array.from(await hmac(secret, data), (b) => b.toString(16).padStart(2, "0")).join("");
}
