import Link from "next/link";
import type { ReactNode } from "react";

// UI-009 메인(소개) — 관련: UIR-002
// 아직 개발되지 않은 기능(음성 STT/TTS, 스티커 메모 연동)은 넣지 않는다.

// 캐릭터 상태 6종 (화면 상위설계 v0.2 7장). public/images/ 의 임시 이미지를 같은 파일명의 최종 이미지로 덮어쓰면 된다.
const CHARACTER_STATES = [
  { src: "/images/character-walk.png", label: "걷기" },
  { src: "/images/character-sit.png", label: "앉기" },
  { src: "/images/character-pet.png", label: "쓰다듬기" },
  { src: "/images/character-notify.png", label: "알림" },
  { src: "/images/character-thinking.png", label: "응답 중" },
  { src: "/images/character-error.png", label: "오류" },
];

function CharacterPlaceholder() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -top-2 right-0 z-10 max-w-[13rem] rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm text-slate-700 shadow-lg ring-1 ring-slate-200 sm:-right-4">
        오후 3시 <b className="text-brand">팀 미팅</b>을 캘린더에 등록했어요! 📅
      </div>
      <div className="flex aspect-square items-center justify-center rounded-3xl border-2 border-dashed border-indigo-300 bg-[repeating-conic-gradient(#eef2ff_0_25%,#fff_0_50%)] bg-[length:24px_24px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CHARACTER_STATES[0].src} alt="자비스 캐릭터 (걷기) — 임시 이미지" className="animate-float h-3/5 w-3/5 object-contain" />
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500 sm:grid-cols-6" aria-label="캐릭터 상태 예시">
        {CHARACTER_STATES.map((s) => (
          <li key={s.label} className="flex flex-col items-center gap-1 whitespace-nowrap rounded-xl bg-white px-1 py-2 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.src} alt="" className="h-10 w-10 object-contain" />
            {s.label}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-center text-[11px] text-slate-400">캐릭터 일러스트 자리 · 최종 이미지로 교체 예정</p>
    </div>
  );
}

function Bubble({ children, from = "user" }: { children: ReactNode; from?: "user" | "jarvis" }) {
  return (
    <div className={`flex ${from === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
          from === "user" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-white text-slate-700 ring-1 ring-slate-200"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

const FEATURES: { id: string; title: string; desc: string; points: string[]; demo: ReactNode }[] = [
  {
    id: "F1",
    title: "화면을 가리지 않는 상주형 캐릭터 위젯",
    desc: "작업 표시줄 위를 걸어 다니는 캐릭터가 화면을 가리지 않는 반투명 말풍선으로 알려 줘요.",
    points: [
      "투명 배경 · 항상 위(Always-on-Top) 고정",
      "OFF 버튼으로 숨기고, 트레이 아이콘으로 다시 표시",
      "글로벌 단축키로 대화창을 0.5초 안에 즉시 호출",
    ],
    demo: (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
          <span className="font-mono text-xs text-slate-500">단축키</span>
          <span className="flex gap-1">
            {["Ctrl", "Shift", "Space"].map((k) => (
              <kbd key={k} className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs">
                {k}
              </kbd>
            ))}
          </span>
        </div>
        <Bubble from="jarvis">무엇을 도와드릴까요? 🙂</Bubble>
        <p className="text-center text-xs text-slate-400">예시 단축키 · 설정에서 변경 가능</p>
      </div>
    ),
  },
  {
    id: "F2",
    title: "한 줄 자연어로 일정 등록 · 질문",
    desc: "Gemini가 문장을 [제목 · 시작 · 종료 · 장소]로 나눠 구글 캘린더에 바로 등록해요. 평균 3초 이내.",
    points: ["“오늘 오후 3시 팀 미팅 잡아줘”", "“다음 주 회의 언제야?”", "“오늘 남은 일정 알려줘” → 말풍선으로 요약"],
    demo: (
      <div className="space-y-2">
        <Bubble>오늘 오후 3시 팀 미팅 잡아줘</Bubble>
        <Bubble from="jarvis">
          <span className="block font-semibold">팀 미팅 등록 완료!</span>
          <span className="text-xs text-slate-500">오늘 15:00 – 16:00</span>
        </Bubble>
        <Bubble>다음 주 회의 언제야?</Bubble>
        <Bubble from="jarvis">다음 주 화요일 오전 10시에 주간 회의가 있어요.</Bubble>
      </div>
    ),
  },
  {
    id: "F3",
    title: "스마트 말풍선 알림 & 원클릭 회의 접속",
    desc: "구글 캘린더와 실시간으로 동기화되고, 일정 시작 전에 화면 우측 하단에서 알려줘요.",
    points: ["일정 시작 5분 · 10분 전 말풍선 알림", "Zoom · Google Meet 링크가 있으면 [회의 참석] 버튼", "OAuth 2.0 연동, 일정 추가·수정·삭제 동기화"],
    demo: (
      <div className="ml-auto max-w-[16rem] rounded-2xl bg-white p-4 text-sm shadow-lg ring-1 ring-slate-200">
        <p className="text-xs font-semibold text-indigo-600">🔔 5분 후 시작</p>
        <p className="mt-1 font-semibold text-slate-800">디자인 리뷰</p>
        <p className="text-xs text-slate-500">14:00 – 14:30 · Google Meet</p>
        <span className="mt-3 inline-flex rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white">회의 참석</span>
      </div>
    ),
  },
  {
    id: "F4",
    title: "말로 맞추는 자연어 타이머",
    desc: "작업 중에 손을 떼지 않고, 한 문장으로 백그라운드 타이머를 맞춰요.",
    points: ["“3분 타이머 맞춰줘”", "“10분 뒤 알람 울려줘”", "시간이 되면 캐릭터가 말풍선으로 알려줘요"],
    demo: (
      <div className="space-y-2">
        <Bubble>10분 뒤 알람 울려줘</Bubble>
        <Bubble from="jarvis">
          ⏱ <b>10:00</b> 타이머를 시작했어요.
        </Bubble>
      </div>
    ),
  },
];

const SHORTCUTS = [
  { href: "/download", title: "다운로드", desc: "Windows용 최신 버전 받기", icon: "⬇️" },
  { href: "/releases", title: "릴리스 노트", desc: "버전별 변경 사항", icon: "📝" },
  { href: "/faq", title: "FAQ", desc: "자주 묻는 질문", icon: "💡" },
  { href: "/qna", title: "QnA", desc: "궁금한 점 질문하기", icon: "💬" },
  { href: "/bugs", title: "버그 신고", desc: "문제 알려주기", icon: "🐞" },
];

export default function HomePage() {
  return (
    <>
      {/* 히어로 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="badge-indigo mb-4">Windows 데스크톱 AI 일정 비서</p>
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
              작업 흐름을 깨지 않는
              <br />
              데스크톱 AI 비서, <span className="text-brand">자비스</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
              브라우저를 열지 않아도, 단축키 한 번과 한 줄 문장으로 구글 캘린더 일정을 관리하세요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/download" className="btn-primary px-6 py-3 text-base shadow-md">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M2 3.5 8.5 2.6v6.6H2V3.5Zm7.5-1L18 1.3v7.9H9.5V2.5ZM2 10.8h6.5v6.6L2 16.5v-5.7Zm7.5 0H18v7.9l-8.5-1.2v-6.7Z" />
                </svg>
                Windows용 무료 다운로드
              </Link>
              <Link href="/releases" className="btn-ghost px-4 py-3">
                릴리스 노트 보기 →
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">Windows 10 · 11 지원 · macOS는 추후 지원 예정이에요.</p>
          </div>
          <CharacterPlaceholder />
        </div>
      </section>

      {/* 기능 소개 */}
      <section aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="features-title" className="text-center text-2xl font-bold sm:text-3xl">
          창을 바꾸지 않고, 일정은 그대로
        </h2>
        <p className="mt-2 text-center text-slate-600">컨텍스트 스위칭 없이 일정을 다루는 네 가지 방법</p>
        <div className="mt-12 space-y-8">
          {FEATURES.map((f, i) => (
            <article key={f.id} className="card grid items-center gap-8 p-6 sm:p-10 md:grid-cols-2">
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <span className="font-mono text-sm font-bold text-indigo-500">{f.id}</span>
                <h3 className="mt-1 text-xl font-bold sm:text-2xl">{f.title}</h3>
                <p className="mt-3 text-slate-600">{f.desc}</p>
                <ul className="mt-4 space-y-2">
                  {f.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-0.5 text-indigo-500" aria-hidden>
                        ✓
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-indigo-50 p-5 sm:p-8">{f.demo}</div>
            </article>
          ))}
        </div>
      </section>

      {/* 안심 포인트 */}
      <section aria-labelledby="safe-title" className="bg-brand text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="safe-title" className="text-2xl font-bold sm:text-3xl">
            안심하고 쓸 수 있게
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white/10 p-6 ring-1 ring-white/20">
              <p className="text-2xl" aria-hidden>
                🔐
              </p>
              <h3 className="mt-2 text-lg font-semibold">키와 토큰은 암호화해서 보관</h3>
              <p className="mt-2 text-sm text-indigo-100">
                Gemini API Key와 구글 로그인 토큰은 OS 보안 금고(safeStorage)에 암호화해 저장해요. 평문 파일로 남지 않아요.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 ring-1 ring-white/20">
              <p className="text-2xl" aria-hidden>
                📴
              </p>
              <h3 className="mt-2 text-lg font-semibold">인터넷이 끊겨도 알림은 계속</h3>
              <p className="mt-2 text-sm text-indigo-100">
                오프라인이 되면 로컬 타이머 알림 모드로 전환돼서, 이미 받아 둔 일정 알림과 타이머는 그대로 울려요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 바로가기 */}
      <section aria-labelledby="shortcut-title" className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="shortcut-title" className="text-xl font-bold sm:text-2xl">
          바로가기
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SHORTCUTS.map((s) => (
            <Link key={s.href} href={s.href} className="card group p-5 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg">
              <span className="text-2xl" aria-hidden>
                {s.icon}
              </span>
              <p className="mt-2 font-semibold group-hover:text-brand">{s.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
