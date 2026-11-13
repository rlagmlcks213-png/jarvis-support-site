// 시연용 예시 데이터 (선택): 릴리스 2 · 버그 5 · QnA 6(비밀글·숨김 포함) · 답변 3
// 실행: npm run db:seed (관리자·FAQ 먼저) → npm run db:demo
// 예시 글 비밀번호는 모두 1234 (실서비스 DB에서는 실행하지 말 것)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const REPO = process.env.GITHUB_REPO || "OWNER/REPO";
const gh = (v: string) => ({
  downloadUrl: `https://github.com/${REPO}/releases/download/v${v}/HeyJarvis-Setup-${v}.exe`,
  githubReleaseUrl: `https://github.com/${REPO}/releases/tag/v${v}`,
});
const at = (s: string) => new Date(s);

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("운영 환경에서는 예시 데이터를 넣지 않아요.");
  const admin = await db.admin.findFirst();
  if (!admin) throw new Error("관리자 계정이 없어요. 먼저 npm run db:seed 를 실행해 주세요.");
  if ((await db.question.count()) > 0 || (await db.release.count()) > 0) {
    console.log("이미 데이터가 있어서 예시 데이터를 넣지 않았어요.");
    return;
  }
  const pw = await bcrypt.hash("1234", 10);

  const r1 = await db.release.create({
    data: {
      version: "v1.0.0",
      releasedAt: at("2026-10-20T00:00:00Z"),
      releaseNote:
        "비서 자비스 첫 배포 버전이에요.\n- 상주형 캐릭터 위젯 (투명 배경 · 최상단 고정)\n- 글로벌 단축키로 대화창 호출\n- Gemini 기반 자연어 일정 등록 · 질의응답\n- 구글 캘린더 OAuth 연동 및 실시간 동기화\n- 일정 시작 5분 · 10분 전 말풍선 알림\n- 자연어 타이머",
      ...gh("1.0.0"),
      sha256: "b9d71a06116f530f3056901eaa0e80dad22e084f9da1675638bf951fc6b11610",
      fileSize: 87_340_544,
      source: "MANUAL",
      uploadedBy: admin.id,
    },
  });
  const r2 = await db.release.create({
    data: {
      version: "v1.0.1",
      releasedAt: at("2026-11-03T00:00:00Z"),
      releaseNote:
        "버그 수정 패치예요.\n- 알림 말풍선이 듀얼 모니터에서 엉뚱한 화면에 뜨던 문제 수정\n- '내일 오전' 같은 표현의 시간 파싱 정확도 개선\n- 트레이 메뉴에 [문의/버그 신고] 추가",
      ...gh("1.0.1"),
      sha256: "fe6c28939b35bd233b8647832a6cfb8ff29468eec3573285479f6eaa831b3ed2",
      fileSize: 87_812_096,
      source: "GITHUB",
    },
  });
  void r1;

  const bug = (d: { nickname: string; title: string; appVersion: string; os: string; content: string; reproSteps: string; status: "RECEIVED" | "CHECKING" | "FIXED" | "DEPLOYED"; createdAt: string; resolved?: boolean; adminMemo?: string }) =>
    db.bugReport.create({
      data: {
        nickname: d.nickname, passwordHash: pw, title: d.title, appVersion: d.appVersion, os: d.os, content: d.content, reproSteps: d.reproSteps,
        status: d.status, createdAt: at(d.createdAt), resolvedReleaseId: d.resolved ? r2.id : null, adminMemo: d.adminMemo ?? null,
      },
    });
  await bug({ nickname: "코딩하는곰", title: "듀얼 모니터에서 알림 말풍선이 보조 모니터에 떠요", appVersion: "v1.0.0", os: "Windows 11", content: "메인 모니터에서 작업 중인데 일정 알림 말풍선이 보조 모니터 우측 하단에 떠서 놓쳤어요.", reproSteps: "1. 듀얼 모니터 연결\n2. 보조 모니터를 왼쪽에 배치\n3. 5분 뒤 일정 등록 후 대기", status: "DEPLOYED", resolved: true, createdAt: "2026-10-22T01:15:00Z", adminMemo: "디스플레이 기준을 위젯이 있는 화면으로 변경함." });
  await bug({ nickname: "새벽세시", title: "'내일 오전 10시'로 등록하면 오늘 날짜로 들어가요", appVersion: "v1.0.0", os: "Windows 10", content: "자정 넘어서 '내일 오전 10시 회의'라고 입력하면 날짜가 하루 밀리지 않고 당일로 등록돼요.", reproSteps: "1. 00:30쯤 대화창 호출\n2. '내일 오전 10시 회의 잡아줘' 입력", status: "DEPLOYED", resolved: true, createdAt: "2026-10-24T15:42:00Z" });
  await bug({ nickname: "일정러버", title: "Zoom 링크가 설명란에 있으면 [회의 참석] 버튼이 안 보여요", appVersion: "v1.0.1", os: "Windows 11", content: "위치 칸이 아니라 일정 설명란에 Zoom 링크를 넣으면 알림에 [회의 참석] 버튼이 나오지 않아요.", reproSteps: "1. 구글 캘린더 설명란에 Zoom 링크 입력\n2. 알림 시점까지 대기", status: "FIXED", createdAt: "2026-11-04T05:03:00Z", adminMemo: "설명란 링크 파싱 추가. 다음 패치에 포함 예정." });
  await bug({ nickname: "타이머장인", title: "타이머 두 개를 동시에 맞추면 하나만 울려요", appVersion: "v1.0.1", os: "Windows 11", content: "'3분 타이머'와 '10분 타이머'를 연달아 맞추면 먼저 맞춘 타이머가 사라져요.", reproSteps: "1. '3분 타이머 맞춰줘'\n2. 바로 '10분 타이머 맞춰줘'", status: "CHECKING", createdAt: "2026-11-06T00:20:00Z" });
  await bug({ nickname: "초보사용자", title: "트레이 아이콘을 눌러도 위젯이 다시 안 나와요", appVersion: "v1.0.1", os: "기타", content: "OFF 버튼으로 위젯을 숨긴 뒤 트레이 아이콘을 클릭했는데 위젯이 다시 표시되지 않아요.", reproSteps: "1. 위젯 OFF 버튼 클릭\n2. 트레이 아이콘 클릭", status: "RECEIVED", createdAt: "2026-11-08T10:47:00Z" });

  const q = (d: { nickname: string; title: string; content: string; createdAt: string; email?: string; isSecret?: boolean; isHidden?: boolean; answer?: string; notify?: "NONE" | "PENDING" | "SENT" }) =>
    db.question.create({
      data: {
        nickname: d.nickname, passwordHash: pw, title: d.title, content: d.content, createdAt: at(d.createdAt),
        email: d.notify === "PENDING" ? d.email ?? null : null,
        notifyStatus: d.notify ?? "NONE",
        isSecret: !!d.isSecret, isHidden: !!d.isHidden,
        ...(d.answer ? { answer: { create: { adminId: admin.id, content: d.answer } } } : {}),
      },
    });
  await q({ nickname: "기획자김", title: "회사 구글 워크스페이스 계정도 연동되나요?", content: "개인 지메일이 아니라 회사 워크스페이스 계정으로 로그인하려고 하는데 가능한가요?", createdAt: "2026-10-21T02:00:00Z", notify: "SENT", answer: "네, 가능해요. 다만 회사 관리자가 외부 앱의 캘린더 접근을 막아 둔 경우에는 연동이 거부될 수 있어요. 이 경우 사내 IT 담당자에게 문의해 주세요." });
  await q({ nickname: "개발자박", title: "Gemini API 무료 한도를 넘으면 어떻게 되나요?", content: "무료 한도를 다 쓰면 앱이 멈추는지, 아니면 안내가 나오는지 궁금해요.", createdAt: "2026-10-24T07:30:00Z", answer: "한도를 넘으면 캐릭터가 말풍선으로 안내해 드리고, 일정 알림·타이머 같은 로컬 기능은 계속 동작해요." });
  await q({ nickname: "디자이너이", title: "캐릭터 크기를 줄일 수 있나요?", content: "작은 노트북 화면에서는 위젯이 조금 커 보여요. 크기 조절 기능이 있을까요?", createdAt: "2026-11-01T00:12:00Z" });
  await q({ nickname: "학생최", title: "회사 일정이 보이면 안 되는데 괜찮을까요?", content: "회사 캘린더 일정 제목이 화면에 뜨면 곤란한 상황이 있어서요. 개인적인 부분이라 비밀글로 남겨요.", createdAt: "2026-11-05T11:05:00Z", isSecret: true, email: "choi@example.com", notify: "PENDING" });
  await q({ nickname: "야근요정", title: "알림 소리를 끌 수 있나요?", content: "회의 중에 알림 소리가 나면 곤란해서요. 말풍선만 뜨게 할 수 있을까요?", createdAt: "2026-11-07T13:40:00Z", email: "night@example.com", notify: "PENDING" });
  await q({ nickname: "광고봇", title: "최저가 상품 안내", content: "스팸 예시 글입니다. (관리자에 의해 숨김 처리됨)", createdAt: "2026-11-07T18:00:00Z", isHidden: true });

  console.log("예시 데이터 완료 (글 비밀번호: 1234)");
}

main().finally(() => db.$disconnect());
