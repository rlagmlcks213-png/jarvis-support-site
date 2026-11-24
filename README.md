# 비서 자비스 — 사용자 지원 웹사이트

> 캡스톤디자인1 · 팀 헤이 자비스
> Windows 데스크톱 AI 일정 비서 **"비서 자비스"**의 소개·다운로드·릴리스 노트·FAQ·QnA·버그 신고 사이트와 관리자 화면입니다.

일반 사용자는 회원가입 없이 **닉네임 + 글 비밀번호**로 질문하고 버그를 신고합니다. 개발팀은 공용 관리자 계정으로 답변, 버그 처리, 릴리스, FAQ를 관리합니다. 설치 파일(.exe)은 앱 저장소의 **GitHub Releases**에 올리고, 이 사이트는 그 파일로 연결합니다.

---

## 주요 기능

**공개 화면** (PC·모바일 반응형, 로그인 없음)

| 화면 | 주소 | 내용 |
|---|---|---|
| 메인 | `/` | 앱 소개, 기능 카드, 캐릭터 상태 6종 |
| 다운로드 | `/download` | 최신·이전 버전, SHA-256·파일 크기, SmartScreen 안내 |
| 릴리스 노트 | `/releases` | 버전별 변경 사항, 해결된 버그 링크 |
| FAQ | `/faq` | 자주 묻는 질문, 키워드 필터 |
| QnA | `/qna` | 질문 작성·수정·삭제, 비밀글, 답변 알림 메일(선택) |
| 버그 신고 | `/bugs` | 스크린샷 첨부, 처리 상태(접수 → 확인 중 → 수정 완료 → 배포됨), 앱 트레이에서 버전·OS 자동 입력 |
| 개인정보처리방침 | `/privacy` | 수집 항목·목적·보관 기간, 구글·Gemini 데이터 고지 |
| 통합 검색 | `/search` | FAQ·릴리스·QnA·버그 한 번에 검색 |

**관리자 화면** (`/admin` 직접 입력, 공개 화면에는 관리자 버튼이 없음)

| 화면 | 내용 |
|---|---|
| 대시보드 | 새 질문·미처리 버그 수, 최신 릴리스 |
| 릴리스 관리 | GitHub Actions 자동 등록 확인, 수동 등록, 노트 수정, 해결 버그 연결, 숨김·삭제 |
| 답변·상태 관리 | QnA 답변·숨김, 버그 상태·메모·병합, FAQ 관리, 게시물 강제 수정·삭제 |

**앱 연동 API**

| API | 용도 |
|---|---|
| `GET /api/releases/latest` | 데스크톱 앱이 새 버전을 확인할 때 씀. `version`은 `v1.0.2` 형식 |
| `POST /api/releases/sync` | GitHub Actions가 새 릴리스를 등록할 때 씀 (`Bearer SYNC_SECRET`) |
| `/bugs/new?appVersion=1.0.2&os=windows11&from=tray` | 앱 트레이 메뉴 → 버그 신고 (버전·OS 자동 입력) |

---

## 기술 스택

- **Next.js 15** (App Router, Server Actions) · **React 19** · **TypeScript** · **Tailwind CSS v4**
- **Prisma 6** + **PostgreSQL** (로컬: 내장 PostgreSQL 또는 Docker)
- 스크린샷: 배포는 Netlify Blobs, 로컬은 `uploads/` 폴더 (`UPLOAD_DIR`)
- 배포: **Netlify** + PostgreSQL(Neon) — 절차는 [IMPLEMENTATION.md 12-6](IMPLEMENTATION.md#12-6-netlify-배포-절차)
- 메일: console / Gmail SMTP / Resend 중 선택

---

## 로컬에서 실행하기

Node.js 20 이상이 필요합니다.

```bash
npm install
cp .env.example .env            # 값 채우기 (아래 "환경변수")
```

**DB 띄우기 — 둘 중 하나**

| 방법 | 명령 | `.env` DB 포트 |
|---|---|---|
| Docker 없이 (Windows) | 터미널 하나에서 `npm run db:local`을 켜 둔다 | `54329` |
| Docker Desktop | `npm run db:up` | `5432` |

- `db:local`의 데이터는 `%LOCALAPPDATA%\jarvis-localdb`에 저장됩니다.

**처음 한 번 → 실행**

```bash
npx prisma migrate deploy       # 테이블 만들기
npm run db:seed                 # 관리자 계정 1개 (.env의 ADMIN_INITIAL_*)
npm run db:demo                 # (선택) 시연용 예시 글 — 글 비밀번호 1234
npm run dev                     # http://localhost:3000 · 관리자: /admin
```

- DB 내용 보기: `npm run db:studio`
- Docker DB 중지: `npm run db:down` / 데이터까지 지우기: `docker compose down -v`

---

## 환경변수

`.env.example`을 복사해 `.env`를 만듭니다. **`.env`와 `.env*.local`은 커밋하지 않습니다**(`.gitignore`에 포함).

| 이름 | 설명 |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL 주소 (DIRECT_URL은 마이그레이션용 직접 연결 주소) |
| `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD` | `db:seed` 때만 쓰는 관리자 계정. 배포 DB는 12자 이상만 받음. **배포 서버 환경변수에 넣지 않음** |
| `SESSION_SECRET` | 세션·열람 쿠키·캡차 서명 키 (32자 이상 무작위) |
| `SYNC_SECRET` | 릴리스 자동 등록 API 인증 토큰 (앱 저장소 Actions Secret과 같은 값) |
| `GITHUB_REPO` | 설치 파일이 올라가는 **앱 저장소**(공개)의 `OWNER/REPO`. 이 사이트 저장소가 아님 |
| `UPLOAD_DIR` | (선택, 로컬 전용) 스크린샷 저장 폴더. 기본값은 프로젝트 폴더의 `uploads/`. Netlify에서는 자동으로 Netlify Blobs에 저장 |
| `MAIL_PROVIDER`, `GMAIL_*`, `RESEND_API_KEY`, `MAIL_FROM` | 답변 알림 메일 |
| `SITE_URL` | 메일 속 링크 주소 |

- Prisma CLI는 `.env`만 읽습니다. DB 관련 값은 꼭 `.env`에 두세요.
- 배포 서버·앱 저장소·로컬에 각각 어떤 값을 넣는지는 [IMPLEMENTATION.md 12-2](IMPLEMENTATION.md#12-2-환경변수--어디에-무엇을-넣나)에 정리돼 있습니다.

---

## 브랜치 전략 (PMR-001)

| 브랜치 | 용도 |
|---|---|
| `main` | 배포본 |
| `dev` | 통합 브랜치 |
| `feature/*` | 기능·수정 작업 |

```bash
git switch dev && git pull
git switch -c feature/작업-이름
# 작업 후 push → GitHub에서 feature/* → dev PR
# 배포할 때 dev → main PR
```

---

## 폴더 구조

```
prisma/          schema.prisma · migrations/ · seed.ts · seed-demo.ts
scripts/         local-db.mjs (Docker 없이 쓰는 로컬 PostgreSQL)
public/images/   캐릭터·SmartScreen 이미지 (현재 임시 이미지)
src/
  app/(public)/  공개 화면
  app/admin/     관리자 화면 (로그인 · 대시보드 · 릴리스 · 답변·상태 관리)
  app/api/       releases/latest · releases/sync · qna/[id]/unlock · uploads/bugs/[name]
  middleware.ts  /admin/* 1차 확인
  server/        ★ 서버 전용 — Server Actions, 업무 로직, 인증, 제한, 메일, 정리
  lib/           repository(화면 → 서버 창구), 공용 검증, DB·저장소·메일 클라이언트
  components/    공통 UI
```

화면 코드는 `@/lib/repository`만 호출합니다. DB·비밀번호·메일·저장소 코드는 `server/`와 `lib/`의 서버 전용 파일에만 둡니다.

---

## 보안 요약

- 관리자·글 비밀번호는 **bcrypt 해시**로만 저장하고, 비교도 서버에서만 합니다.
- 관리자 권한은 3단계로 확인합니다: middleware → 관리자 레이아웃 → 모든 Server Action의 `requireAdmin()`.
- 관리자 로그인은 5회 실패 시 5분 잠금입니다. 계정이 공용 1개이므로 잠금도 공용입니다.
- 글 비밀번호(QnA 열람·수정·삭제, 버그 수정·삭제)는 같은 IP·같은 글에서 10분 안에 5회 틀리면 10분 동안 차단합니다.
- 비로그인 글쓰기에는 캡차와 30초 재등록 제한을 적용합니다. 출력은 React 기본 이스케이프만 씁니다.
- 공개 응답에서는 비밀번호 해시·이메일·알림 상태·관리자 메모를 DB 조회 단계에서 제외합니다.
- 스크린샷은 png/jpeg/gif/webp만 받고(파일 내용까지 검사), 4MB 이하입니다.
- 이메일은 알림을 보낸 뒤 즉시 삭제합니다. 발송에 실패한 이메일은 7일, IP 해시는 1일 뒤 자동 삭제합니다.
- 운영 환경의 쿠키에는 `Secure`·`HttpOnly`를 붙입니다.

---

## 문서

- [IMPLEMENTATION.md](IMPLEMENTATION.md) — 구현 현황 전체
  - 화면별 기능, DB, API·연동 규약
  - 환경변수 구분, 배포할 때 확인할 점
- 팀 결정이 필요한 항목은 코드에서 `TODO(확정 필요)`로 검색할 수 있습니다.
- 기준 문서: 요구사항명세서 v0.2, 화면 상위설계 계획서 v0.2
