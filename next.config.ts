import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // GITHUB_REPO는 공개 정보라 클라이언트에도 주입한다(빌드 시점에 고정 — 값을 바꾸면 dev 서버 재시작).
  // ⚠ SYNC_SECRET은 절대 여기에 넣지 말 것 (서버 라우트에서 process.env로만 읽음)
  env: {
    GITHUB_REPO: process.env.GITHUB_REPO ?? "",
    // 스크린샷 저장 위치 (lib/storage.ts). Netlify 빌드에서는 NETLIFY=true가 자동으로 붙어 Netlify Blobs를 쓴다.
    // 직접 정하려면 UPLOAD_STORAGE를 "netlify" 또는 "fs"로 지정.
    UPLOAD_STORAGE: process.env.UPLOAD_STORAGE || (process.env.NETLIFY === "true" ? "netlify" : "fs"),
  },
  experimental: {
    // 스크린샷(4MB 이하)을 FormData 원본으로 보냄 + 글 내용 → 여유 있게 5mb
    // (Netlify 함수의 요청 크기 상한은 6MB라 그 안에 들어온다)
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
