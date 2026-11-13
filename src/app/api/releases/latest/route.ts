import { NextResponse } from "next/server";
import { getLatestRelease } from "@/server/services/releases";

// GET /api/releases/latest — 앱 연동용 최신 버전 정보 (SFR-005 ④)
// 데스크톱 앱이 실행 시 이 값을 확인해 새 버전을 말풍선으로 안내한다. 숨김 제외 가장 최신 버전.
// version은 "v1.0.2" 형식(PMR-002 ②: 앱·GitHub 태그·웹사이트 동일). 앱은 package.json의 "1.0.2" 앞에 v를 붙여 비교한다.
export const dynamic = "force-dynamic";

export async function GET() {
  const latest = await getLatestRelease();
  if (!latest) {
    return NextResponse.json({ error: "배포된 버전이 없어요." }, { status: 404 });
  }
  return NextResponse.json(
    {
      version: `v${latest.version.replace(/^v/i, "")}`,
      releasedAt: latest.releasedAt,
      downloadUrl: latest.downloadUrl,
      sha256: latest.sha256,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
