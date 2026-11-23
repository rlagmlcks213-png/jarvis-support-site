import { readBugAttachment } from "@/lib/storage";

// GET /api/uploads/bugs/[name] — 버그 신고 스크린샷 이미지 (lib/storage.ts 업로드 폴더에서 읽음)
// 파일명은 서버가 만든 UUID 형식만 허용 (경로 조작 차단). png/jpeg/gif/webp만 저장되므로 SVG 스크립트 걱정 없음.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const file = await readBugAttachment((await params).name);
  if (!file) return new Response("첨부 파일이 없어요.", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Cache-Control": "public, max-age=86400, immutable", // 파일명이 UUID라 내용이 바뀌지 않음
    },
  });
}
