import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { sessionSecret } from "./env";

/**
 * 요청 IP의 해시 (post_attempt.ip_hash). IP 원문은 저장하지 않는다.
 * 리버스 프록시 뒤에서는 x-forwarded-for의 첫 값이 실제 접속 IP다.
 * ⚠ 프록시 없이 직접 노출된 서버라면 이 헤더는 조작 가능하므로, 배포 환경의 신뢰할 수 있는 헤더로 바꿀 것.
 */
export async function getIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${sessionSecret()}:${ip}`).digest("hex");
}
