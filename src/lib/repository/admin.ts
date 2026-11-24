// 관리자용 repository (클라이언트). 권한 확인은 서버(Server Action 안의 requireAdmin)에서 한다.
import * as A from "@/server/actions/admin";
import type { ReleasePayload } from "../release-validation";
import type { BugStatus } from "../types";
import { mutate, unwrap } from "./client";

export type { AdminQuestion } from "@/server/services/questions";
export type { AdminBug } from "@/server/services/bugs";
export type { AdminRelease } from "@/server/services/releases";
export type { GithubImportSummary } from "@/server/github-release";
export type { PostKind } from "@/server/services/misc";

// 인증
export const adminLogin = (loginId: string, password: string) => unwrap(A.loginAction(loginId, password));
export const adminLogout = () => unwrap(A.logoutAction());

// 대시보드
export const getDashboard = () => unwrap(A.dashboardAction());

// QnA
export const adminGetQuestions = () => unwrap(A.adminQuestionsAction());
export const saveAnswer = (questionId: number, content: string) => mutate(A.saveAnswerAction(questionId, content));
export const resendNotification = (questionId: number) => mutate(A.resendNotificationAction(questionId));
export const deleteAnswer = (questionId: number) => mutate(A.deleteAnswerAction(questionId));
export const setQuestionHidden = (questionId: number, hidden: boolean) => mutate(A.setQuestionHiddenAction(questionId, hidden));

// 버그
export const adminGetBugs = () => unwrap(A.adminBugsAction());
export const updateBugStatus = (bugId: number, status: BugStatus, releaseId?: number | null) =>
  mutate(A.updateBugStatusAction(bugId, status, releaseId));
export const updateBugMemo = (bugId: number, memo: string) => mutate(A.updateBugMemoAction(bugId, memo));
export const mergeBug = (bugId: number, targetId: number | null) => mutate(A.mergeBugAction(bugId, targetId));

// 릴리스
export const adminGetReleases = () => unwrap(A.adminReleasesAction());
export const buildSimulatedSyncPayload = () => unwrap(A.buildSyncPayloadAction());
export const simulateGithubSync = (payload: ReleasePayload) => mutate(A.simulateSyncAction(payload));
export const importGithubReleases = () => mutate(A.importGithubReleasesAction());
export const createManualRelease = (payload: ReleasePayload) => mutate(A.createManualReleaseAction(payload));
export const updateReleaseNote = (releaseId: number, note: string) => mutate(A.updateReleaseNoteAction(releaseId, note));
export const setReleaseHidden = (releaseId: number, hidden: boolean) => mutate(A.setReleaseHiddenAction(releaseId, hidden));
export const linkBugsToRelease = (releaseId: number, bugIds: number[]) => mutate(A.linkBugsAction(releaseId, bugIds));
export const deleteRelease = (releaseId: number) => mutate(A.deleteReleaseAction(releaseId));
export const getFixedBugs = () => unwrap(A.fixedBugsAction());

// FAQ
export const adminGetFaqs = () => unwrap(A.adminFaqsAction());
export const createFaq = (q: string, a: string) => mutate(A.createFaqAction(q, a));
export const updateFaq = (id: number, q: string, a: string) => mutate(A.updateFaqAction(id, q, a));
export const deleteFaq = (id: number) => mutate(A.deleteFaqAction(id));
export const moveFaq = (id: number, direction: "up" | "down") => mutate(A.moveFaqAction(id, direction));

// 게시물
export const forceUpdatePost = (kind: "question" | "bug", id: number, data: { title: string; content: string }) =>
  mutate(A.forceUpdatePostAction(kind, id, data));
export const deleteAnyPost = (kind: "question" | "bug", id: number) => mutate(A.deleteAnyPostAction(kind, id));
