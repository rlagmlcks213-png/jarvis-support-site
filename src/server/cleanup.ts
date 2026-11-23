import "server-only";
import { after } from "next/server";
import { db } from "@/lib/db";
import { FAILED_EMAIL_RETENTION_DAYS, POST_ATTEMPT_RETENTION_DAYS } from "@/lib/constants";

// 개인정보 자동 파기 (SER-002 주석 "답변 완료 후 파기", 개인정보처리방침 보관 기간)
// - post_attempt(IP 해시): POST_ATTEMPT_RETENTION_DAYS(1일)가 지난 기록 삭제
// - 발송 실패(FAILED) 이메일: 첫 답변 후 FAILED_EMAIL_RETENTION_DAYS(7일)가 지나면 이메일만 삭제 (상태는 FAILED 유지)
//   ※ 발송·재발송에 성공하면 notify.ts에서 즉시 삭제한다
//
// 실행 시점: 글 등록·비밀번호 실패 기록·관리자 대시보드 조회 때 next/server의 after()로
// 응답을 보낸 뒤에 돌린다 → 사용자 응답이 느려지지 않음. 같은 서버 인스턴스에서는 10분에 한 번만.

const MIN_INTERVAL_MS = 10 * 60_000;
let lastRun = 0;

const DAY = 24 * 3600_000;

export async function runCleanup(now = Date.now()) {
  const attempts = await db.postAttempt.deleteMany({ where: { createdAt: { lt: new Date(now - POST_ATTEMPT_RETENTION_DAYS * DAY) } } });
  const emails = await db.question.updateMany({
    where: { notifyStatus: "FAILED", email: { not: null }, answer: { is: { createdAt: { lt: new Date(now - FAILED_EMAIL_RETENTION_DAYS * DAY) } } } },
    data: { email: null },
  });
  return { attempts: attempts.count, emails: emails.count };
}

export function scheduleCleanup() {
  if (Date.now() - lastRun < MIN_INTERVAL_MS) return;
  lastRun = Date.now();
  after(async () => {
    try {
      await runCleanup();
    } catch (e) {
      console.error("[cleanup]", e instanceof Error ? e.message : e);
    }
  });
}
