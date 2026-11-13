import "server-only";
import { db } from "@/lib/db";
import { deleteBugAttachment } from "@/lib/storage";
import { LIMITS, checkLength, cleanText } from "@/lib/validation";
import type { BugStatus, Faq, PublicBugReport, QuestionListItem, Release } from "@/lib/types";
import { BUG_STATUSES } from "@/lib/types";
import { pickLatestRelease, sortReleasesDesc } from "@/lib/release-utils";
import { RepoError } from "@/lib/repository/errors";
import { BUG_STATUS_TO_VIEW, toReleaseView, versionFromDb } from "../mappers";

// ── FAQ ──────────────────────────────────────────
const toFaq = (f: { id: number; question: string; answer: string; sortOrder: number }): Faq => ({
  faqId: f.id,
  question: f.question,
  answer: f.answer,
  sortOrder: f.sortOrder,
});

export async function listFaqs(): Promise<Faq[]> {
  return (await db.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] })).map(toFaq);
}

function validateFaq(question: string, answer: string) {
  const e = checkLength("질문", question, 2, 200) ?? checkLength("답변", answer, 2, LIMITS.content.max);
  if (e) throw new RepoError(e);
}

export async function createFaq(question: string, answer: string) {
  validateFaq(question, answer);
  const max = await db.faq.aggregate({ _max: { sortOrder: true } });
  await db.faq.create({ data: { question: cleanText(question), answer: cleanText(answer), sortOrder: (max._max.sortOrder ?? 0) + 1 } });
}

export async function updateFaq(faqId: number, question: string, answer: string) {
  validateFaq(question, answer);
  await db.faq.update({ where: { id: faqId }, data: { question: cleanText(question), answer: cleanText(answer) } });
}

export async function deleteFaq(faqId: number) {
  await db.faq.delete({ where: { id: faqId } });
}

export async function moveFaq(faqId: number, direction: "up" | "down") {
  const sorted = await db.faq.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true } });
  const i = sorted.findIndex((f) => f.id === faqId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= sorted.length) return;
  [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
  await db.$transaction(sorted.map((f, idx) => db.faq.update({ where: { id: f.id }, data: { sortOrder: idx + 1 } })));
}

// ── 통합 검색 ─────────────────────────────────────
export interface SearchResults {
  faqs: Faq[];
  releases: Release[];
  questions: (QuestionListItem & { content: string })[];
  bugs: PublicBugReport[];
}

export async function search(query: string): Promise<SearchResults> {
  const q = query.trim().slice(0, 50);
  if (!q) return { faqs: [], releases: [], questions: [], bugs: [] };
  const like = { contains: q, mode: "insensitive" as const };
  const [faqs, releases, questions, bugs] = await Promise.all([
    db.faq.findMany({ where: { OR: [{ question: like }, { answer: like }] }, orderBy: { sortOrder: "asc" } }),
    db.release.findMany({ where: { isHidden: false, OR: [{ version: like }, { releaseNote: like }] } }),
    // 숨김 글과 비밀글은 검색에서 아예 제외 (제목·내용 모두)
    db.question.findMany({
      where: { isHidden: false, isSecret: false, OR: [{ title: like }, { content: like }] },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, nickname: true, title: true, content: true, createdAt: true, isSecret: true, answer: { select: { id: true } } },
    }),
    db.bugReport.findMany({
      where: { OR: [{ title: like }, { content: like }] },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, nickname: true, title: true, appVersion: true, os: true, content: true, reproSteps: true, status: true, resolvedReleaseId: true, createdAt: true, mergedIntoBugId: true },
    }),
  ]);
  return {
    faqs: faqs.map(toFaq),
    releases: sortReleasesDesc(releases.map(toReleaseView)),
    questions: questions.map((x) => ({
      questionId: x.id,
      nickname: x.nickname,
      title: x.title,
      content: x.content,
      isSecret: false,
      createdAt: x.createdAt.toISOString(),
      answered: !!x.answer,
    })),
    bugs: bugs.map((b) => ({
      bugId: b.id,
      nickname: b.nickname,
      title: b.title,
      appVersion: b.appVersion,
      os: b.os,
      content: b.content,
      reproSteps: b.reproSteps,
      attachmentUrl: null,
      status: BUG_STATUS_TO_VIEW[b.status],
      resolvedReleaseId: b.resolvedReleaseId,
      createdAt: b.createdAt.toISOString(),
      mergedIntoBugId: b.mergedIntoBugId,
    })),
  };
}

// ── 대시보드 ─────────────────────────────────────
export async function getDashboard() {
  const [newQuestionCount, groups, releases, recentQuestions, recentBugs] = await Promise.all([
    db.question.count({ where: { isHidden: false, answer: null } }),
    db.bugReport.groupBy({ by: ["status"], _count: { _all: true } }),
    db.release.findMany({ include: { _count: { select: { resolvedBugs: true } } } }),
    db.question.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, createdAt: true, isHidden: true, isSecret: true, answer: { select: { id: true } } } }),
    db.bugReport.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, createdAt: true, status: true } }),
  ]);
  const byStatus = Object.fromEntries(BUG_STATUSES.filter((s) => s !== "배포됨").map((s) => [s, 0])) as Record<Exclude<BugStatus, "배포됨">, number>;
  let unresolvedBugCount = 0;
  for (const g of groups) {
    const s = BUG_STATUS_TO_VIEW[g.status];
    if (s !== "배포됨") {
      byStatus[s] = g._count._all;
      unresolvedBugCount += g._count._all;
    }
  }
  const latest = pickLatestRelease(releases.map(toReleaseView));
  const latestRow = latest ? releases.find((r) => versionFromDb(r.version) === latest.version) : undefined;
  return {
    newQuestionCount,
    unresolvedBugCount,
    unresolvedByStatus: byStatus,
    latestRelease: latest,
    latestReleaseBugCount: latestRow?._count.resolvedBugs ?? 0,
    recentQuestions: recentQuestions.map((q) => ({ questionId: q.id, title: q.title, createdAt: q.createdAt.toISOString(), isHidden: q.isHidden, isSecret: q.isSecret, answered: !!q.answer })),
    recentBugs: recentBugs.map((b) => ({ bugId: b.id, title: b.title, createdAt: b.createdAt.toISOString(), status: BUG_STATUS_TO_VIEW[b.status] })),
  };
}

// ── 게시물 강제 수정·삭제 (관리자) ──────────────────
export type PostKind = "question" | "bug";

export async function forceUpdatePost(kind: PostKind, id: number, data: { title: string; content: string }) {
  const e =
    checkLength("제목", data.title, LIMITS.title.min, LIMITS.title.max) ??
    checkLength("내용", data.content, LIMITS.content.min, LIMITS.content.max);
  if (e) throw new RepoError(e);
  const values = { title: cleanText(data.title), content: cleanText(data.content) };
  if (kind === "question") await db.question.update({ where: { id }, data: values });
  else await db.bugReport.update({ where: { id }, data: values });
}

export async function deleteAnyPost(kind: PostKind, id: number) {
  if (kind === "question") {
    await db.question.delete({ where: { id } });
    return;
  }
  const b = await db.bugReport.delete({ where: { id }, select: { attachmentUrl: true } });
  await deleteBugAttachment(b.attachmentUrl); // 저장소의 스크린샷 파일도 삭제
}
