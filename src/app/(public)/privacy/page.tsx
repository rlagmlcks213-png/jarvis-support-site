import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { FAILED_EMAIL_RETENTION_DAYS, POST_ATTEMPT_RETENTION_DAYS, PRIVACY_CONTACT_EMAIL } from "@/lib/constants";

// UI-019 개인정보처리방침 — 관련: UIR-002 ①, SER-002(이메일), COR-001(Gemini 고지), COR-003
// 진입: 공통 푸터, QnA 작성·수정 모달의 이메일 동의 문구 [자세히 보기], (앱 설정 화면은 데스크톱 앱 담당)

export const metadata: Metadata = { title: "개인정보처리방침" };

const ITEMS = [
  { item: "닉네임, 글 내용", purpose: "QnA·버그 신고 게시판 운영", period: "글을 삭제할 때까지" },
  { item: "글 비밀번호", purpose: "본인 글 수정·삭제 확인 (원문이 아닌 암호화된 값만 저장)", period: "글을 삭제할 때까지" },
  { item: "이메일 (선택)", purpose: "QnA 답변 등록 알림 1회", period: `알림 발송 후 즉시 삭제 · 발송에 실패하면 최대 ${FAILED_EMAIL_RETENTION_DAYS}일 보관 후 삭제` },
  { item: "스크린샷 (선택)", purpose: "버그 확인", period: "글을 삭제할 때까지" },
  { item: "IP 주소의 해시값", purpose: "스팸·반복 등록 방지, 비밀번호 대입 방지", period: `${POST_ATTEMPT_RETENTION_DAYS}일 후 삭제` },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader title="개인정보처리방침" description="비서 자비스 웹사이트와 데스크톱 앱이 어떤 정보를 어떻게 다루는지 알려 드려요." />

      <div className="card p-6 sm:p-8">
        <Section title="1. 웹사이트에서 받는 정보">
          <p>회원가입 없이 이용할 수 있어요. 글을 쓸 때 아래 정보만 받아요.</p>
          {/* 모바일: 카드 / PC: 표 */}
          <ul className="mt-3 space-y-3 sm:hidden">
            {ITEMS.map((r) => (
              <li key={r.item} className="rounded-lg border border-line p-3 text-sm">
                <p className="font-semibold text-fg">{r.item}</p>
                <p className="mt-1">목적: {r.purpose}</p>
                <p className="mt-0.5">보관: {r.period}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-line sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">수집 항목</th>
                  <th className="px-4 py-2.5 font-semibold">목적</th>
                  <th className="px-4 py-2.5 font-semibold">보관 기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ITEMS.map((r) => (
                  <tr key={r.item}>
                    <td className="px-4 py-3 font-medium text-fg">{r.item}</td>
                    <td className="px-4 py-3">{r.purpose}</td>
                    <td className="px-4 py-3">{r.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted">이메일은 공개되지 않고, 관리자 화면에서도 주소 원문은 보이지 않아요.</p>
        </Section>

        <Section title="2. 데스크톱 앱의 구글·Gemini 데이터">
          <ul className="list-disc space-y-2 pl-5">
            <li>구글 캘린더 데이터는 사용자 PC와 구글 사이에서만 처리해요. 웹사이트 서버로는 보내지 않아요.</li>
            <li>구글 데이터는 AI 학습에 사용하지 않아요.</li>
            <li>Gemini에는 사용자 문장과 답변에 필요한 최소한의 일정 정보만 보내요.</li>
            <li>
              Gemini <b>무료 티어</b>를 쓰면 입력한 문장이 Google 서비스 개선에 쓰일 수 있어요. 민감한 내용은 입력하지 않는 것을 권장해요.
            </li>
          </ul>
        </Section>

        <Section title="3. 버그 신고 시 주의">
          <p>스크린샷과 내용에 API Key, 구글 로그인 정보, 일정 내용이 보이지 않게 가려 주세요. 신고 글은 누구나 볼 수 있어요.</p>
        </Section>

        <Section title="4. 삭제 요청·문의">
          <p>
            글은 작성할 때 정한 비밀번호로 직접 삭제할 수 있어요. 비밀번호를 잊었거나 다른 문의가 있으면 아래로 연락해 주세요.
          </p>
          <p>
            문의처:{" "}
            {PRIVACY_CONTACT_EMAIL ? (
              <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`} className="link">
                {PRIVACY_CONTACT_EMAIL}
              </a>
            ) : (
              <span className="text-muted">팀 연락 이메일 준비 중 · 지금은 <Link href="/qna" className="link">QnA</Link>에 남겨 주세요</span>
            )}
          </p>
        </Section>

        <p className="mt-10 text-xs text-muted">시행일: 2026년 11월 13일</p>
      </div>
    </div>
  );
}
