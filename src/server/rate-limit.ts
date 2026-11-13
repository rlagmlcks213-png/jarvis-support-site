import "server-only";
import { db } from "@/lib/db";
import {
  POST_COOLDOWN_SECONDS,
  UNLOCK_BLOCK_MINUTES,
  UNLOCK_MAX_FAILS,
  UNLOCK_WINDOW_MINUTES,
} from "@/lib/constants";
import { RepoError } from "@/lib/repository/errors";
import { scheduleCleanup } from "./cleanup";

// post_attempt 테이블 기반 제한 (SER-002 ③④)
// - "question" / "bug_report": 같은 IP가 30초 안에 다시 등록하면 거부
// - "password_fail": 같은 IP가 같은 글에서 10분 안에 5번 틀리면 10분 동안 시도 차단
//   대상: QnA 비밀글 열람·수정·삭제, 버그 신고 수정·삭제 (target_type으로 구분)

type PostAction = "question" | "bug_report";
export type PasswordTarget = "question" | "bug_report";

export async function assertPostCooldown(ipHash: string, action: PostAction) {
  const since = new Date(Date.now() - POST_COOLDOWN_SECONDS * 1000);
  const last = await db.postAttempt.findFirst({
    where: { ipHash, action, createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last) {
    const remain = Math.ceil((last.createdAt.getTime() + POST_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000);
    throw new RepoError(`너무 빠르게 연속 등록하고 있어요. ${Math.max(remain, 1)}초 후에 다시 시도해 주세요.`, "RATE_LIMIT");
  }
}

export async function recordPost(ipHash: string, action: PostAction) {
  await db.postAttempt.create({ data: { ipHash, action } });
  scheduleCleanup();
}

/** 차단 중이면 RATE_LIMIT 오류. 최근 5번의 실패가 10분 안에 몰려 있고, 마지막 실패 후 10분이 안 지났으면 차단. */
export async function assertPasswordAllowed(ipHash: string, targetType: PasswordTarget, targetId: number) {
  const recent = await db.postAttempt.findMany({
    where: { ipHash, action: "password_fail", targetType, targetId },
    orderBy: { createdAt: "desc" },
    take: UNLOCK_MAX_FAILS,
    select: { createdAt: true },
  });
  if (recent.length < UNLOCK_MAX_FAILS) return;
  const latest = recent[0].createdAt.getTime();
  const oldest = recent[recent.length - 1].createdAt.getTime();
  const burst = latest - oldest <= UNLOCK_WINDOW_MINUTES * 60_000;
  const blockedUntil = latest + UNLOCK_BLOCK_MINUTES * 60_000;
  if (burst && blockedUntil > Date.now()) {
    const min = Math.ceil((blockedUntil - Date.now()) / 60_000);
    throw new RepoError(`비밀번호를 여러 번 틀렸어요. 약 ${min}분 후에 다시 시도해 주세요.`, "RATE_LIMIT");
  }
}

export async function recordPasswordFail(ipHash: string, targetType: PasswordTarget, targetId: number) {
  await db.postAttempt.create({ data: { ipHash, action: "password_fail", targetType, targetId } });
  scheduleCleanup();
}
