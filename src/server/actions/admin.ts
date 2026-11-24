"use server";

// 관리자용 Server Actions — 모든 함수가 requireAdmin()으로 서명 쿠키 세션을 다시 확인한다 (SFR-006 ③)
import { BUG_STATUSES, type BugStatus } from "@/lib/types";
import type { ReleasePayload } from "@/lib/release-validation";
import { clearAdminSession, loginAdmin, requireAdmin } from "../auth";
import { id, obj, run, str } from "../run";
import { scheduleCleanup } from "../cleanup";
import { importRecentGithubReleases } from "../github-release";
import * as qna from "../services/questions";
import * as bugs from "../services/bugs";
import * as releases from "../services/releases";
import * as misc from "../services/misc";
import { RepoError } from "@/lib/repository/errors";

const admin = <T>(fn: (adminId: number) => Promise<T>) =>
  run(async () => {
    const s = await requireAdmin();
    return fn(s.adminId);
  });

// ── 인증 ─────────────────────────────────────────
export async function loginAction(loginId: unknown, password: unknown) {
  return run(async () => loginAdmin(str(loginId, 100), str(password, 200)));
}

export async function logoutAction() {
  return run(async () => clearAdminSession());
}

// ── 대시보드 ─────────────────────────────────────
export async function dashboardAction() {
  return admin(async () => {
    scheduleCleanup(); // 개인정보 보관 기한 정리 (응답 후 실행)
    return misc.getDashboard();
  });
}

// ── QnA ──────────────────────────────────────────
export async function adminQuestionsAction() {
  return admin(() => qna.adminListQuestions());
}
export async function saveAnswerAction(questionId: unknown, content: unknown) {
  return admin((adminId) => qna.saveAnswer(id(questionId), str(content), adminId));
}
export async function resendNotificationAction(questionId: unknown) {
  return admin(() => qna.resendNotification(id(questionId)));
}
export async function deleteAnswerAction(questionId: unknown) {
  return admin(() => qna.deleteAnswer(id(questionId)));
}
export async function setQuestionHiddenAction(questionId: unknown, hidden: unknown) {
  return admin(() => qna.setQuestionHidden(id(questionId), hidden === true));
}

// ── 버그 ─────────────────────────────────────────
export async function adminBugsAction() {
  return admin(() => bugs.adminListBugs());
}
export async function updateBugStatusAction(bugId: unknown, status: unknown, releaseId: unknown) {
  return admin(() => {
    if (!BUG_STATUSES.includes(status as BugStatus)) throw new RepoError("잘못된 상태 값이에요.");
    return bugs.updateBugStatus(id(bugId), status as BugStatus, releaseId === null ? null : releaseId === undefined ? undefined : id(releaseId));
  });
}
export async function updateBugMemoAction(bugId: unknown, memo: unknown) {
  return admin(() => bugs.updateBugMemo(id(bugId), str(memo, 3000)));
}
export async function mergeBugAction(bugId: unknown, targetId: unknown) {
  return admin(() => bugs.mergeBug(id(bugId), targetId === null ? null : id(targetId)));
}

// ── 릴리스 ───────────────────────────────────────
const payloadOf = (v: unknown): ReleasePayload => {
  const o = obj(v);
  return {
    version: str(o.version, 30),
    releasedAt: str(o.releasedAt, 20),
    releaseNote: str(o.releaseNote),
    downloadUrl: str(o.downloadUrl, 500),
    sha256: str(o.sha256, 100),
    fileSize: typeof o.fileSize === "number" ? o.fileSize : str(o.fileSize, 20),
    githubReleaseUrl: str(o.githubReleaseUrl, 500),
  };
};

export async function adminReleasesAction() {
  return admin(() => releases.adminListReleases());
}
export async function buildSyncPayloadAction() {
  return admin(() => releases.buildSimulatedSyncPayload());
}
export async function simulateSyncAction(payload: unknown) {
  return admin(() => releases.simulateGithubSync(payloadOf(payload)));
}
/** webhook을 놓쳤을 때 — GitHub의 최근 릴리스 10개 중 DB에 없는 정식 릴리스를 등록 */
export async function importGithubReleasesAction() {
  return admin(() => importRecentGithubReleases());
}
export async function createManualReleaseAction(payload: unknown) {
  return admin((adminId) => releases.createManualRelease(payloadOf(payload), adminId));
}
export async function updateReleaseNoteAction(releaseId: unknown, note: unknown) {
  return admin(() => releases.updateReleaseNote(id(releaseId), str(note)));
}
export async function setReleaseHiddenAction(releaseId: unknown, hidden: unknown) {
  return admin(() => releases.setReleaseHidden(id(releaseId), hidden === true));
}
export async function linkBugsAction(releaseId: unknown, bugIds: unknown) {
  return admin(() => releases.linkBugsToRelease(id(releaseId), Array.isArray(bugIds) ? bugIds.map(id) : []));
}
export async function deleteReleaseAction(releaseId: unknown) {
  return admin(() => releases.deleteRelease(id(releaseId)));
}
export async function fixedBugsAction() {
  return admin(() => releases.listFixedBugs());
}

// ── FAQ ──────────────────────────────────────────
export async function adminFaqsAction() {
  return admin(() => misc.listFaqs());
}
export async function createFaqAction(question: unknown, answer: unknown) {
  return admin(() => misc.createFaq(str(question, 300), str(answer)));
}
export async function updateFaqAction(faqId: unknown, question: unknown, answer: unknown) {
  return admin(() => misc.updateFaq(id(faqId), str(question, 300), str(answer)));
}
export async function deleteFaqAction(faqId: unknown) {
  return admin(() => misc.deleteFaq(id(faqId)));
}
export async function moveFaqAction(faqId: unknown, direction: unknown) {
  return admin(() => misc.moveFaq(id(faqId), direction === "up" ? "up" : "down"));
}

// ── 게시물 ───────────────────────────────────────
export async function forceUpdatePostAction(kind: unknown, postId: unknown, data: unknown) {
  return admin(() => {
    const o = obj(data);
    return misc.forceUpdatePost(kind === "bug" ? "bug" : "question", id(postId), { title: str(o.title, 300), content: str(o.content) });
  });
}
export async function deleteAnyPostAction(kind: unknown, postId: unknown) {
  return admin(() => misc.deleteAnyPost(kind === "bug" ? "bug" : "question", id(postId)));
}
