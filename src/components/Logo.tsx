/** 로고 — public/images/logo.svg (placeholder. 정식 로고가 나오면 같은 파일명으로 덮어쓰기) */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/logo.svg" alt="" aria-hidden className={className} />;
}
