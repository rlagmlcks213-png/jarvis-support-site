// 공개 화면용 repository (클라이언트). 실제 처리는 서버(Server Action / API 라우트)에서 한다.
// 비밀번호 확인·DB 접근은 모두 서버에서만 일어나고, 여기서는 호출과 오류 변환만 한다.
import * as A from "@/server/actions/public";
import type { CaptchaAnswer, CaptchaChallenge } from "@/server/captcha";
import type { BugCreateInput, BugEditInput, QuestionCreateInput, QuestionEditInput } from "../post-validation";
import type { AttachmentUpload, BugStatus, QuestionDetail } from "../types";
import { RepoError } from "./errors";
import { mutate, unwrap } from "./client";

export type { CaptchaAnswer, CaptchaChallenge };
export type { BugListItem } from "@/server/services/bugs";
export type { ReleaseWithBugs } from "@/server/services/releases";
export type { SearchResults } from "@/server/services/misc";

export const getViewer = () => unwrap(A.getViewerAction());
export const getCaptcha = () => unwrap(A.getCaptchaAction());

// ── QnA ──────────────────────────────────────────
export const getQuestions = (p: { page: number }) => unwrap(A.listQuestionsAction(p.page));
export const createQuestion = (v: QuestionCreateInput, captcha: CaptchaAnswer | null) => mutate(A.createQuestionAction(v, captcha));
/** 관리자는 password 없이 호출 가능 (서버에서 세션 확인) */
export const getQuestionForEdit = (id: number, password?: string) => unwrap(A.getQuestionForEditAction(id, password));
export const updateQuestion = (id: number, password: string | undefined, v: QuestionEditInput) => mutate(A.updateQuestionAction(id, password, v));
export const deleteQuestion = (id: number, password?: string) => mutate(A.deleteQuestionAction(id, password));

/** 비밀글 열람 — 맞으면 서버가 이 글 전용 열람 쿠키(30분)를 발급한다 */
export async function unlockQuestion(id: number, password: string): Promise<QuestionDetail> {
  const res = await fetch(`/api/qna/${id}/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new RepoError(body.error ?? "잠시 후 다시 시도해 주세요.", body.code ?? "SERVER");
  return body.question as QuestionDetail;
}

// ── 버그 신고 ─────────────────────────────────────
export const getBugReports = (p: { status: BugStatus | "전체"; page: number }) => unwrap(A.listBugsAction(p.status, p.page));
export const getBugReport = (id: number) => unwrap(A.getBugAction(id));
/** 스크린샷은 원본 파일 그대로 FormData에 담아 보낸다 (base64 변환 없음 → 4MB까지) */
function bugForm(v: Omit<BugCreateInput, "password" | "attachment"> & { password?: string; attachment: AttachmentUpload | null | "keep" }) {
  const { attachment, ...fields } = v;
  const fd = new FormData();
  fd.set("input", JSON.stringify(fields));
  fd.set("attachmentMode", attachment === "keep" ? "keep" : attachment ? "replace" : "remove");
  if (attachment && attachment !== "keep") fd.set("attachment", attachment.file, attachment.name);
  return fd;
}
export const createBugReport = (v: Omit<BugCreateInput, "attachment"> & { attachment: AttachmentUpload | null }, captcha: CaptchaAnswer | null) => {
  const fd = bugForm(v);
  fd.set("captcha", JSON.stringify(captcha ?? {}));
  return mutate(A.createBugAction(fd));
};
export const getBugForEdit = (id: number, password?: string) => unwrap(A.getBugForEditAction(id, password));
export const updateBugReport = (id: number, password: string | undefined, v: Omit<BugEditInput, "attachment"> & { attachment: AttachmentUpload | null | "keep" }) => {
  const fd = bugForm(v);
  fd.set("bugId", String(id));
  fd.set("password", password ?? "");
  return mutate(A.updateBugAction(fd));
};
export const deleteBugReport = (id: number, password?: string) => mutate(A.deleteBugAction(id, password));

// ── 릴리스·FAQ·검색 ─────────────────────────────────
export const getReleases = () => unwrap(A.getReleasesAction());
export const getReleaseNotes = () => unwrap(A.getReleaseNotesAction());
export const getFaqs = () => unwrap(A.getFaqsAction());
export const search = (q: string) => unwrap(A.searchAction(q));
