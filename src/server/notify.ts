import "server-only";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { siteUrl } from "./env";

// 답변 알림 메일 — 처음 답변을 등록했을 때만 보낸다(수정 시 X).
// 성공: email = null, notifyStatus = SENT (보관 원칙: 발송 후 즉시 삭제)
// 실패: email 유지, notifyStatus = FAILED → 관리자 화면에서 [재발송]

const SUBJECT = "[비서 자비스] 문의하신 질문에 답변이 등록되었어요";
const FOOTER = "이 메일은 답변 알림을 위해 1회만 발송되며, 이메일 주소는 발송 후 삭제되었습니다.";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildMail(q: { id: number; nickname: string; title: string; isSecret: boolean }, answer: string) {
  const link = `${siteUrl()}/qna/${q.id}`;
  if (q.isSecret) {
    // 비밀글: 제목·답변 본문을 넣지 않는다 (이메일 주소를 잘못 입력했을 때 다른 사람에게 내용이 전달되지 않도록)
    const text = [`안녕하세요, ${q.nickname}님.`, "", "답변이 등록되었어요. 아래 링크에서 글 비밀번호를 입력해 확인해 주세요.", "", link, "", "---", FOOTER].join("\n");
    const html = `<p>안녕하세요, ${escapeHtml(q.nickname)}님.</p><p>답변이 등록되었어요. 아래 링크에서 글 비밀번호를 입력해 확인해 주세요.</p><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p><hr><p style="color:#64748b;font-size:12px">${FOOTER}</p>`;
    return { text, html };
  }
  const text = [`안녕하세요, ${q.nickname}님.`, "문의하신 질문에 답변이 등록되었어요.", "", `[질문] ${q.title}`, "", "[답변]", answer, "", `글 보러 가기: ${link}`, "", "---", FOOTER].join("\n");
  const html =
    `<p>안녕하세요, ${escapeHtml(q.nickname)}님.<br>문의하신 질문에 답변이 등록되었어요.</p>` +
    `<p><b>[질문]</b> ${escapeHtml(q.title)}</p>` +
    `<p><b>[답변]</b><br>${escapeHtml(answer).replace(/\n/g, "<br>")}</p>` +
    `<p><a href="${escapeHtml(link)}">글 보러 가기</a></p><hr><p style="color:#64748b;font-size:12px">${FOOTER}</p>`;
  return { text, html };
}

export type NotifyResult = "sent" | "failed" | "skipped";

/** notifyStatus가 PENDING(첫 발송) 또는 FAILED(재발송)이고 이메일이 있을 때만 보낸다 */
export async function sendAnswerNotification(questionId: number): Promise<NotifyResult> {
  const q = await db.question.findUnique({
    where: { id: questionId },
    select: { id: true, nickname: true, title: true, isSecret: true, email: true, notifyStatus: true, answer: { select: { content: true } } },
  });
  if (!q || !q.email || !q.answer || (q.notifyStatus !== "PENDING" && q.notifyStatus !== "FAILED")) return "skipped";

  try {
    const { text, html } = buildMail(q, q.answer.content);
    await sendMail({ to: q.email, subject: SUBJECT, text, html });
    await db.question.update({ where: { id: q.id }, data: { email: null, notifyStatus: "SENT" } });
    return "sent";
  } catch (e) {
    console.error(`[notify] 질문 #${q.id} 알림 메일 발송 실패:`, e instanceof Error ? e.message : e);
    await db.question.update({ where: { id: q.id }, data: { notifyStatus: "FAILED" } });
    return "failed";
  }
}
