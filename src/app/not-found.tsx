import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-extrabold text-brand">404</p>
      <h1 className="mt-3 text-xl font-bold">페이지를 찾을 수 없어요.</h1>
      <p className="mt-1 text-sm text-muted">주소를 다시 확인하거나 메인으로 돌아가 주세요.</p>
      <Link href="/" className="btn-primary mt-6">
        메인으로
      </Link>
    </div>
  );
}
