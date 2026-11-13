"use server";

// 공개 화면용 Server Actions — 로그인 없이 호출 가능. 관리자 세션이 있으면 비밀번호 없이 수정·삭제·비밀글 열람 가능.
import { LIST_PAGE_SIZE } from "@/lib/constants";
import { BUG_STATUSES, type BugOs, type BugStatus } from "@/lib/types";
import type { QuestionCreateInput, QuestionEditInput } from "@/lib/post-validation";
import { getAdminSession, isAdmin } from "../auth";
import { issueCaptcha, type CaptchaAnswer } from "../captcha";
import { getIpHash } from "../request";
import { bool, id, obj, page, run, str } from "../run";
import { RepoError } from "@/lib/repository/errors";
import * as qna from "../services/questions";
import * as bugs from "../services/bugs";
import * as releases from "../services/releases";
import * as misc from "../services/misc";

const captchaOf = (v: unknown): CaptchaAnswer => {
  const o = obj(v);
  return { token: str(o.token, 2000), answer: str(o.answer, 5) };
};
const auth = async (password: unknown): Promise<qna.PostAuth> => ({
  password: str(password, 100) || undefined,
  isAdmin: await isAdmin(),
  ipHash: await getIpHash(),
});

/** 지금 보는 사람이 관리자인지 (화면에서 관리자 버튼 표시용 — 실제 권한은 각 서버 함수에서 다시 확인) */
export async function getViewerAction() {
  return run(async () => {
    const s = await getAdminSession();
    return { isAdmin: !!s, name: s?.name ?? null };
  });
}

export async function getCaptchaAction() {
  return run(issueCaptcha);
}

// ── QnA ──────────────────────────────────────────
export async function listQuestionsAction(p: unknown) {
  return run(async () => qna.listQuestions(page(p), LIST_PAGE_SIZE, await isAdmin()));
}

export async function createQuestionAction(input: unknown, captcha: unknown) {
  return run(async () => {
    const o = obj(input);
    const v: QuestionCreateInput = {
      nickname: str(o.nickname, 100),
      password: str(o.password, 100),
      email: str(o.email, 200),
      emailConsent: bool(o.emailConsent),
      title: str(o.title, 300),
      content: str(o.content),
      isSecret: bool(o.isSecret),
    };
    return qna.createQuestion(v, captchaOf(captcha), await getIpHash());
  });
}

export async function getQuestionForEditAction(questionId: unknown, password: unknown) {
  return run(async () => qna.getQuestionForEdit(id(questionId), await auth(password)));
}

export async function updateQuestionAction(questionId: unknown, password: unknown, input: unknown) {
  return run(async () => {
    const o = obj(input);
    const v: QuestionEditInput = {
      nickname: str(o.nickname, 100),
      title: str(o.title, 300),
      content: str(o.content),
      isSecret: bool(o.isSecret),
      newEmail: str(o.newEmail, 200),
      emailConsent: bool(o.emailConsent),
    };
    await qna.updateQuestion(id(questionId), await auth(password), v);
  });
}

export async function deleteQuestionAction(questionId: unknown, password: unknown) {
  return run(async () => qna.deleteQuestion(id(questionId), await auth(password)));
}

// ── 버그 신고 ─────────────────────────────────────
// 버그 신고 작성·수정은 FormData로 받는다 (스크린샷 원본 파일을 base64 없이 그대로 전송)
//   input: 글 내용 JSON · captcha: 캡차 JSON(작성) · attachment: File · attachmentMode: keep | remove | replace (수정)
function formOf(v: unknown): FormData {
  if (!(v instanceof FormData)) throw new RepoError("잘못된 요청이에요.", "VALIDATION");
  return v;
}
function jsonField(form: FormData, key: string): Record<string, unknown> {
  const raw = form.get(key);
  try {
    return obj(typeof raw === "string" ? JSON.parse(raw) : null);
  } catch {
    return {};
  }
}
async function fileOf(v: FormDataEntryValue | null): Promise<bugs.UploadedFile | null> {
  if (!(v instanceof File) || v.size === 0) return null;
  return { name: v.name.slice(0, 200), size: v.size, type: v.type, bytes: new Uint8Array(await v.arrayBuffer()) };
}

function bugFields(o: Record<string, unknown>) {
  return {
    nickname: str(o.nickname, 100),
    title: str(o.title, 300),
    appVersion: str(o.appVersion, 30),
    os: str(o.os, 30) as BugOs,
    content: str(o.content),
    reproSteps: str(o.reproSteps),
  };
}

export async function listBugsAction(status: unknown, p: unknown) {
  return run(async () => {
    const s = BUG_STATUSES.includes(status as BugStatus) ? (status as BugStatus) : "전체";
    return bugs.listBugs({ status: s, page: page(p), pageSize: LIST_PAGE_SIZE });
  });
}

export async function getBugAction(bugId: unknown) {
  return run(async () => bugs.getBug(id(bugId)));
}

export async function createBugAction(form: unknown) {
  return run(async () => {
    const fd = formOf(form);
    const o = jsonField(fd, "input");
    const v = { ...bugFields(o), password: str(o.password, 100), attachment: await fileOf(fd.get("attachment")) };
    return bugs.createBug(v, captchaOf(jsonField(fd, "captcha")), await getIpHash());
  });
}

export async function getBugForEditAction(bugId: unknown, password: unknown) {
  return run(async () => bugs.getBugForEdit(id(bugId), await auth(password)));
}

export async function updateBugAction(form: unknown) {
  return run(async () => {
    const fd = formOf(form);
    const mode = fd.get("attachmentMode");
    const attachment = mode === "keep" ? ("keep" as const) : mode === "replace" ? await fileOf(fd.get("attachment")) : null;
    const v = { ...bugFields(jsonField(fd, "input")), attachment };
    await bugs.updateBug(id(fd.get("bugId")), await auth(fd.get("password")), v);
  });
}

export async function deleteBugAction(bugId: unknown, password: unknown) {
  return run(async () => bugs.deleteBug(id(bugId), await auth(password)));
}

// ── 릴리스·FAQ·검색 ─────────────────────────────────
export async function getReleasesAction() {
  return run(releases.listVisibleReleases);
}

export async function getReleaseNotesAction() {
  return run(releases.getReleaseNotes);
}

export async function getFaqsAction() {
  return run(misc.listFaqs);
}

export async function searchAction(q: unknown) {
  return run(async () => misc.search(str(q, 50)));
}
