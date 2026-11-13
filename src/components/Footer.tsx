import { GITHUB_REPO, GITHUB_REPO_URL, MOCK_GITHUB_REPO } from "@/lib/constants";

// GITHUB_REPO가 설정되지 않았으면(예시값) 링크 자리만 둔다
const GITHUB_URL = GITHUB_REPO === MOCK_GITHUB_REPO ? "#" : GITHUB_REPO_URL;
import Link from "next/link";
import { LogoMark } from "./Logo";

// ⚠ 푸터에도 관리자 로그인 링크를 두지 않는다 (UIR-002 ③)
export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark className="h-7 w-7" />
          <div>
            <p className="font-semibold text-fg">팀 헤이 자비스</p>
            <p>캡스톤디자인 프로젝트 · 비서 자비스</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="link font-semibold">
            개인정보처리방침
          </Link>
          <a href={GITHUB_URL} className="link" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span>© 2026 Hey Jarvis</span>
        </div>
      </div>
    </footer>
  );
}
