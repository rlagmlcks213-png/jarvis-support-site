import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // GITHUB_REPO는 공개 정보라 클라이언트에도 주입한다(빌드 시점에 고정 — 값을 바꾸면 dev 서버 재시작).
  // ⚠ SYNC_SECRET은 절대 여기에 넣지 말 것 (서버 라우트에서 process.env로만 읽음)
  env: {
    GITHUB_REPO: process.env.GITHUB_REPO ?? "",
  },
  experimental: {
    // 스크린샷(4MB 이하)을 FormData 원본으로 보냄 + 글 내용 → 여유 있게 5mb
    // (호스팅이나 리버스 프록시에도 요청 크기 제한이 있으면 5MB 이상으로 맞출 것)
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
