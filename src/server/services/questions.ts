import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { cleanText } from "@/lib/validation";
import {
  firstError,
  validateQuestionCreate,
  validateQuestionEdit,
  type QuestionCreateInput,
  type QuestionEditData,
  type QuestionEditInput,
} from "@/lib/post-validation";
import { LIMITS, checkLength } from "@/lib/validation";
import type { AnswerView, NotifyStatusLabel, QuestionDetail, QuestionListItem, QuestionPageView } from "@/lib/types";
import { RepoError } from "@/lib/repository/errors";
import { assertCaptcha, type CaptchaAnswer } from "../captcha";
import { assertPasswordAllowed, assertPostCooldown, recordPasswordFail, recordPost } from "../rate-limit";
import { sendAnswerNotification, type NotifyResult } from "../notify";
import { NOTIFY_LABEL } from "../mappers";

// ⚠ 공개 화면으로 가는 select에는 passwordHash · email · notifyStatus를 넣지 않는다 (처음부터 제외)
const answerSelect = { content: true, createdAt: true, updatedAt: true, admin: { select: { name: true } } } satisfies Prisma.AnswerSelect;
const publicSelect = {
  id: true,
  nickname: true,
  title: true,
  content: true,
  createdAt: true,
  isSecret: true,
  answer: { select: answerSelect },
} satisfies Prisma.QuestionSelect;

type AnswerRow = Prisma.AnswerGetPayload<{ select: typeof answerSelect }>;
type PublicRow = Prisma.QuestionGetPayload<{ select: typeof publicSelect }>;

const toAnswer = (a: AnswerRow | null): AnswerView | null =>
  a ? { content: a.content, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(), adminName: a.admin.name } : null;

const toDetail = (q: PublicRow): QuestionDetail => ({
  questionId: q.id,
  nickname: q.nickname,
  title: q.title,
  content: q.content,
  createdAt: q.createdAt.toISOString(),
  isSecret: q.isSecret,
  answered: !!q.answer,
  answer: toAnswer(q.answer),
});

function throwFieldErrors(errors: Record<string, string | undefined>) {
  const f = firstError(errors);
  if (f) throw new RepoError(f[1], "VALIDATION", Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Record<string, string>);
}

// ── 공개 ─────────────────────────────────────────
export async function listQuestions(page: number, pageSize: number, viewerIsAdmin: boolean) {
  const where: Prisma.QuestionWhereInput = { isHidden: false };
  const [total, rows] = await db.$transaction([
    db.question.count({ where }),
    db.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: Math.max(0, (page - 1) * pageSize),
      take: pageSize,
      select: { id: true, nickname: true, title: true, isSecret: true, createdAt: true, answer: { select: { id: true } } },
    }),
  ]);
  const items: QuestionListItem[] = rows.map((r) => ({
    questionId: r.id,
    nickname: r.nickname,
    // 비밀글은 실제 제목을 응답에 넣지 않는다 (관리자는 예외)
    title: r.isSecret && !viewerIsAdmin ? null : r.title,
    isSecret: r.isSecret,
    createdAt: r.createdAt.toISOString(),
    answered: !!r.answer,
  }));
  return { total, items };
}

/** 상세 — 비밀글은 열람 쿠키 또는 관리자 세션이 있을 때만 본문을 준다 */
export async function getQuestionPage(id: number, viewer: { isAdmin: boolean; unlocked: boolean }): Promise<QuestionPageView | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const q = await db.question.findFirst({ where: { id, isHidden: false }, select: publicSelect });
  if (!q) return null;
  if (q.isSecret && !viewer.isAdmin && !viewer.unlocked) {
    return { locked: true, questionId: q.id, nickname: q.nickname, createdAt: q.createdAt.toISOString(), isSecret: true, answered: !!q.answer };
  }
  return { locked: false, ...toDetail(q) };
}

export async function createQuestion(input: QuestionCreateInput, captcha: CaptchaAnswer, ipHash: string): Promise<number> {
  await assertCaptcha(captcha);
  throwFieldErrors(validateQuestionCreate(input));
  await assertPostCooldown(ipHash, "question");
  const email = cleanText(input.email ?? "");
  const q = await db.question.create({
    data: {
      nickname: cleanText(input.nickname),
      passwordHash: await hashPassword(input.password),
      email: email || null,
      notifyStatus: email ? "PENDING" : "NONE",
      isSecret: !!input.isSecret,
      title: cleanText(input.title),
      content: cleanText(input.content),
    },
    select: { id: true },
  });
  await recordPost(ipHash, "question");
  return q.id;
}

export interface PostAuth {
  password?: string;
  isAdmin: boolean;
  ipHash: string;
}

/**
 * 글 비밀번호 확인. 관리자는 통과.
 * 열람(unlock)뿐 아니라 수정·삭제의 비밀번호 확인도 같은 실패 횟수 제한을 받는다
 * (수정 화면에서 본문을 받아갈 수 있으므로, 우회 경로가 되지 않도록).
 */
async function authorizeQuestion(id: number, auth: PostAuth) {
  const q = await db.question.findFirst({
    where: { id, isHidden: false },
    select: { id: true, passwordHash: true, notifyStatus: true, answer: { select: { id: true } } },
  });
  if (!q) throw new RepoError("글을 찾을 수 없어요. 이미 삭제되었을 수 있어요.", "NOT_FOUND");
  if (auth.isAdmin) return q;
  await assertPasswordAllowed(auth.ipHash, "question", id);
  if (!auth.password || !(await verifyPassword(auth.password, q.passwordHash))) {
    await recordPasswordFail(auth.ipHash, "question", id);
    throw new RepoError("비밀번호가 일치하지 않아요. 다시 입력해 주세요.", "WRONG_PASSWORD");
  }
  return q;
}

/** 비밀글 열람 — 맞으면 본문+답변 (쿠키 발급은 라우트에서) */
export async function unlockQuestion(id: number, password: string, ipHash: string): Promise<QuestionDetail> {
  await authorizeQuestion(id, { password, isAdmin: false, ipHash });
  const q = await db.question.findUniqueOrThrow({ where: { id }, select: publicSelect });
  return toDetail(q);
}

export async function getQuestionForEdit(id: number, auth: PostAuth): Promise<QuestionEditData> {
  const meta = await authorizeQuestion(id, auth);
  const q = await db.question.findUniqueOrThrow({ where: { id }, select: { nickname: true, title: true, content: true, isSecret: true } });
  return {
    ...q,
    // 새 이메일은 아직 알림을 보내지 않았고(NONE/PENDING) 답변 전일 때만 받는다 (답변 후에 넣으면 알림이 갈 일이 없음)
    canSetEmail: (meta.notifyStatus === "NONE" || meta.notifyStatus === "PENDING") && !meta.answer,
    notifyPending: meta.notifyStatus === "PENDING",
  };
}

export async function updateQuestion(id: number, auth: PostAuth, input: QuestionEditInput) {
  const meta = await authorizeQuestion(id, auth);
  throwFieldErrors(validateQuestionEdit(input));
  const newEmail = cleanText(input.newEmail ?? "");
  const canSetEmail = (meta.notifyStatus === "NONE" || meta.notifyStatus === "PENDING") && !meta.answer;
  if (newEmail && !canSetEmail) throw new RepoError("답변 알림을 이미 처리한 글이라 이메일을 새로 넣을 수 없어요.", "VALIDATION", { newEmail: "이메일을 넣을 수 없어요." });
  await db.question.update({
    where: { id },
    data: {
      nickname: cleanText(input.nickname),
      title: cleanText(input.title),
      content: cleanText(input.content),
      isSecret: !!input.isSecret, // 답변이 달린 뒤에도 공개 ↔ 비밀 전환 가능
      ...(newEmail ? { email: newEmail, notifyStatus: "PENDING" as const } : {}),
    },
  });
}

export async function deleteQuestion(id: number, auth: PostAuth) {
  await authorizeQuestion(id, auth);
  await db.question.delete({ where: { id } }); // 답변은 onDelete: Cascade
}

// ── 관리자 ───────────────────────────────────────
export interface AdminQuestion {
  questionId: number;
  nickname: string;
  title: string;
  content: string;
  createdAt: string;
  isHidden: boolean;
  isSecret: boolean;
  notify: NotifyStatusLabel; // 이메일 원문 대신 상태만
  /** 발송 실패 후 보관 기한(FAILED_EMAIL_RETENTION_DAYS)이 지나 이메일이 삭제됨 → 재발송 불가 */
  notifyEmailExpired: boolean;
  answer: AnswerView | null;
}

export async function adminListQuestions(): Promise<AdminQuestion[]> {
  const rows = await db.question.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, nickname: true, title: true, content: true, createdAt: true, isHidden: true, isSecret: true, notifyStatus: true, email: true, answer: { select: answerSelect } },
  });
  // email은 "남아 있는지"만 계산하고 원문은 화면으로 보내지 않는다
  return rows.map((q) => ({
    questionId: q.id,
    nickname: q.nickname,
    title: q.title,
    content: q.content,
    createdAt: q.createdAt.toISOString(),
    isHidden: q.isHidden,
    isSecret: q.isSecret,
    notify: NOTIFY_LABEL[q.notifyStatus],
    notifyEmailExpired: q.notifyStatus === "FAILED" && !q.email,
    answer: toAnswer(q.answer),
  }));
}

/** 답변 저장 → (처음 등록일 때만) 알림 메일. 메일이 실패해도 답변 저장은 유지된다. */
export async function saveAnswer(questionId: number, content: string, adminId: number): Promise<{ isNew: boolean; notify: NotifyResult }> {
  const err = checkLength("답변", content, 2, LIMITS.content.max);
  if (err) throw new RepoError(err, "VALIDATION", { answer: err });
  const q = await db.question.findUnique({ where: { id: questionId }, select: { id: true, answer: { select: { id: true } } } });
  if (!q) throw new RepoError("질문을 찾을 수 없어요.", "NOT_FOUND");
  const isNew = !q.answer;
  await db.answer.upsert({
    where: { questionId },
    create: { questionId, adminId, content: cleanText(content) },
    update: { adminId, content: cleanText(content) },
  });
  const notify = isNew ? await sendAnswerNotification(questionId) : "skipped";
  return { isNew, notify };
}

export async function resendNotification(questionId: number): Promise<NotifyResult> {
  const q = await db.question.findUnique({ where: { id: questionId }, select: { notifyStatus: true, email: true } });
  if (!q) throw new RepoError("질문을 찾을 수 없어요.", "NOT_FOUND");
  if (q.notifyStatus !== "FAILED") throw new RepoError("발송 실패 상태인 글만 재발송할 수 있어요.", "CONFLICT");
  if (!q.email) throw new RepoError("보관 기한이 지나 이메일이 삭제돼서 재발송할 수 없어요.", "CONFLICT");
  return sendAnswerNotification(questionId);
}

export async function deleteAnswer(questionId: number) {
  await db.answer.deleteMany({ where: { questionId } });
}

export async function setQuestionHidden(questionId: number, hidden: boolean) {
  await db.question.update({ where: { id: questionId }, data: { isHidden: hidden } });
}
