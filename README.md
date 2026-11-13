# 비서 자비스 — 사용자 지원 웹사이트

캡스톤디자인1 · 팀 헤이 자비스. Next.js(App Router) + TypeScript + Tailwind + **Prisma + PostgreSQL**.

## 처음 실행하기

```bash
# 0) Docker Desktop 설치·실행 (로컬 PostgreSQL용)
npm install
cp .env.example .env          # 값 채우기 (아래 표)
npm run db:up                 # PostgreSQL 컨테이너 시작 (docker compose)
npm run db:migrate            # 테이블 만들기 (prisma/migrations)
npm run db:seed               # 관리자 1명 (글·FAQ는 사이트에서 직접 작성)
npm run db:demo               # (선택) 시연용 릴리스·버그·QnA — 글 비밀번호 1234
npm run dev                   # http://localhost:3000
```

**Docker 없이 실행하기:** `npm run db:up` 대신 터미널 하나에서 `npm run db:local`을 켜 두세요. 이 명령은 내장 PostgreSQL을 localhost:54329로 띄우고, 데이터는 `%LOCALAPPDATA%\jarvis-localdb`에 저장합니다. 그다음 다른 터미널에서 `npx prisma migrate deploy` → `db:seed` → `db:demo` → `dev` 순서로 실행합니다. `.env`의 DB 주소 포트는 54329로 맞춰야 합니다.

- 관리자: 주소창에 `/admin` 직접 입력 → `.env`의 `ADMIN_INITIAL_LOGIN_ID` / `ADMIN_INITIAL_PASSWORD`
  (공개 화면에는 관리자 버튼이 없음. 로그인하면 공개 화면에서도 비밀글 열람·글 수정/삭제를 비밀번호 없이 할 수 있음)
- DB 내용 보기: `npm run db:studio`
- 중지: `npm run db:down` (데이터 유지) / 데이터까지 지우기: `docker compose down -v`

### 환경변수 (`.env`)

| 이름 | 설명 |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL 주소. 로컬은 docker-compose 값 그대로, 배포는 Neon 등의 pooled / direct 주소 |
| `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD` | `db:seed` 때만 쓰는 최초 관리자 계정 (`change-me…`이면 seed가 거부함) |
| `SESSION_SECRET` | 관리자 세션·비밀글 열람 쿠키·캡차 서명 키. **32자 이상 무작위** (운영에서 `change-me…` 금지) |
| `SYNC_SECRET` | GitHub Actions → `POST /api/releases/sync` 인증 토큰 |
| `GITHUB_REPO` | 설치 파일을 올리는 공개 저장소 `OWNER/REPO` (바꾸면 dev 서버 재시작) |
| `MAIL_PROVIDER` | `console`(기본, 콘솔 출력) · `gmail` · `resend` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Gmail SMTP (2단계 인증 + 앱 비밀번호) |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend (도메인 인증 필요) |
| `SITE_URL` | 알림 메일 속 링크 주소 |
| `CRON_SECRET` | Vercel Cron → `GET /api/cron/cleanup`(개인정보 정리, 매일 03:00 KST · vercel.json) 인증 토큰 |
| `STORAGE_PROVIDER`, `BLOB_READ_WRITE_TOKEN` | 스크린샷 저장소. 개발 `local`, 배포 `blob`(Vercel Blob 토큰) |

> Prisma CLI는 `.env`만 읽습니다. `.env.local`에 넣은 값은 Next.js만 읽으니, DB 관련 값은 꼭 `.env`에 두세요.

## 구조

```
prisma/
  schema.prisma            DB 스키마 (DAR-002 v0.2 기준) · migrations/ · seed.ts · seed-demo.ts
src/
  app/(public)/            공개 화면 UI-009~014 · UI-019(/privacy) + /search (라이트 테마)
  app/admin/               UI-015 로그인 · (protected)/ UI-016~018 (다크 테마, 서버에서 세션 확인)
  app/api/
    qna/[id]/unlock        POST 비밀글 열람 → 글 전용 열람 쿠키(30분)
    releases/latest        GET  최신 버전 JSON (앱 연동)
    releases/sync          POST GitHub Actions 등록 (Bearer SYNC_SECRET)
    cron/cleanup           GET  Vercel Cron 개인정보 정리 (Bearer CRON_SECRET)
  middleware.ts            /admin/* 서명 쿠키 확인 (1차)
  server/                  ★ 서버 전용 — DB·비밀번호·메일·권한
    actions/               Server Actions (화면이 호출하는 서버 함수)
    services/              업무 로직 (Prisma)
    auth.ts                관리자 서명 쿠키 세션 · 로그인 잠금
    rate-limit.ts          post_attempt: 30초 재등록 제한 · 글 비밀번호 5회 실패 10분 차단
    cleanup.ts             개인정보 자동 파기 (실패 이메일 7일 · IP 해시 1일)
    captcha.ts notify.ts unlock.ts request.ts
  lib/
    repository/            화면 → 서버 호출 창구 (화면은 이것만 import)
    db.ts password.ts      Prisma 클라이언트 · bcrypt (서버 전용)
    mailer.ts              메일 발송 (console | gmail | resend)
    storage.ts             스크린샷 저장소 (blob | local)
    post-validation.ts release-validation.ts   화면·서버 공용 입력 검증
```

## 보안 요약

- 비밀번호(관리자·글)는 서버에서 **bcrypt** 해시만 저장. 비교도 서버에서만.
- 공개 화면 응답에는 `passwordHash` · `email` · `notifyStatus` · `adminMemo`를 Prisma select 단계에서 제외.
- 관리자 권한: middleware → 관리자 레이아웃 → 각 Server Action의 `requireAdmin()` 3단계.
- 비밀글 본문은 서버가 열람 쿠키 또는 관리자 세션을 확인한 경우에만 내려줌. 검색 결과에서도 제외.
- 답변 알림 메일은 첫 답변 때 1회. 성공하면 이메일 즉시 삭제, 실패하면 보관 후 관리자가 재발송.
- 스크린샷은 png/jpeg/gif/webp만(파일 내용까지 검사), 4MB 이하. 파일은 저장소(Vercel Blob / 개발용 public/uploads)에, DB에는 주소만 저장.
- 글 비밀번호(QnA 열람·수정·삭제, 버그 수정·삭제)는 같은 IP·같은 글 10분 5회 실패 시 10분 차단.
- 운영 환경에서 관리자 세션·비밀글 열람 쿠키에 Secure. 실패 이메일(7일)·IP 해시(1일)는 자동 삭제.

`TODO(확정 필요)`로 검색하면 팀 결정이 필요한 항목을 찾을 수 있습니다.

자세한 구현 현황은 [IMPLEMENTATION.md](IMPLEMENTATION.md)를 보세요.
