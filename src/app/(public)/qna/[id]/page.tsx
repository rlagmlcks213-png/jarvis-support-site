import Link from "next/link";
import { getAdminSession } from "@/server/auth";
import { hasUnlockCookie } from "@/server/unlock";
import { getQuestionPage } from "@/server/services/questions";
import QnaDetail from "./QnaDetail";

// UI-013 QnA 상세 — 서버에서 렌더링한다.
// 비밀글 본문은 이 글의 열람 쿠키(qna_unlock_{id}, Path=/qna/{id}) 또는 관리자 세션을 서버가 확인한 경우에만 내려준다.
export const dynamic = "force-dynamic";

export default async function QnaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const session = await getAdminSession();
  const unlocked = Number.isInteger(id) && id > 0 ? await hasUnlockCookie(id) : false;
  const view = await getQuestionPage(id, { isAdmin: !!session, unlocked });

  if (!view) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">질문을 찾을 수 없어요.</p>
        <p className="mt-1 text-sm text-muted">삭제되었거나 숨김 처리된 글일 수 있어요.</p>
        <Link href="/qna" className="btn-primary mt-6">
          목록으로
        </Link>
      </div>
    );
  }
  return <QnaDetail view={view} isAdmin={!!session} />;
}
