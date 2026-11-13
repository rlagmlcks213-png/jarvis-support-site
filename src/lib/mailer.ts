// 메일 발송 모듈 — 구현체를 MAIL_PROVIDER 환경변수로 바꾼다.
//   console : 개발용. 실제 발송 없이 서버 콘솔에 출력 (기본값)
//   gmail   : nodemailer + Gmail SMTP (앱 비밀번호) — GMAIL_USER, GMAIL_APP_PASSWORD
//   resend  : Resend API (도메인 인증 필요) — RESEND_API_KEY, MAIL_FROM
// ⚠ 비밀번호·키는 .env에만 두고 코드에 하드코딩하지 말 것.
import "server-only";
import nodemailer from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type MailProvider = "console" | "gmail" | "resend";

export function mailProvider(): MailProvider {
  const p = (process.env.MAIL_PROVIDER || "console").toLowerCase();
  if (p === "gmail" || p === "resend" || p === "console") return p;
  throw new Error(`알 수 없는 MAIL_PROVIDER 값이에요: ${p} (console | gmail | resend)`);
}

/** 실패하면 throw 한다 (호출한 쪽에서 FAILED 처리) */
export async function sendMail(msg: MailMessage): Promise<void> {
  const provider = mailProvider();

  if (provider === "console") {
    console.log(
      ["", "┌──── [메일 발송: console 모드 — 실제로 보내지 않음] ────", `│ To: ${msg.to}`, `│ Subject: ${msg.subject}`, "│", ...msg.text.split("\n").map((l) => `│ ${l}`), "└──────────────────────────────────────────", ""].join("\n"),
    );
    return;
  }

  if (provider === "gmail") {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD 환경변수가 없어요.");
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await transporter.sendMail({ from: process.env.MAIL_FROM || user, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    return;
  }

  // resend
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) throw new Error("RESEND_API_KEY / MAIL_FROM 환경변수가 없어요.");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
  });
  if (!res.ok) throw new Error(`Resend 발송 실패 (${res.status}): ${(await res.text()).slice(0, 200)}`);
}
