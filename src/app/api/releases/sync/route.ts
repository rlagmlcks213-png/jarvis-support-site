import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncFromGithub } from "@/server/services/releases";

// POST /api/releases/sync — GitHub Actions가 새 릴리스를 만든 직후 호출하는 등록용 엔드포인트.
// 인증: 관리자 세션이 아니라 Authorization: Bearer <SYNC_SECRET> 토큰으로만 한다.
// 검증(형식·우리 저장소 URL·해시·중복) 통과 시 release 행을 만들고(source=GITHUB) 바로 공개된다.
export const dynamic = "force-dynamic";

function authorized(header: string | null, secret: string): boolean {
  const m = header?.match(/^Bearer (.+)$/);
  if (!m) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "서버에 SYNC_SECRET이 설정되지 않았어요. .env를 확인해 주세요." }, { status: 500 });
  }
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "인증 토큰이 없거나 올바르지 않아요." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바른 JSON이 아니에요." }, { status: 400 });
  }

  const result = await syncFromGithub(body);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.duplicate ? "이미 등록된 버전이에요." : "입력값 형식이 올바르지 않아요.", errors: result.errors },
      { status: result.duplicate ? 409 : 422 },
    );
  }
  return NextResponse.json({ ok: true, release: result.release, message: "릴리스를 등록했어요." }, { status: 201 });
}
