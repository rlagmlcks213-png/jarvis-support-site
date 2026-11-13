# 비서 자비스 사용자 지원 웹사이트 — 구현 현황

> 기준일: 2026-11-13 · 프로젝트 폴더: `UI/`
> **「웹사이트_계획서기준_수정지시서」(W-1 ~ W-10) 반영 완료본**입니다.
> 이 문서는 지금 코드에 실제로 구현된 내용을 정리합니다.
>
> **기준 문서 (우선순위 순)**
> 1. 요구사항명세서 v0.2 (SFR/SER/UIR/DAR/PMR/COR)
> 2. 화면 상위설계 계획서 v0.2 (UI-009 ~ UI-019)
> 3. 개발계획서
>
> **표시 규칙**
> - **[팀 결정]** 문서에는 없지만 팀이 유지하기로 정한 기능 (문서 v0.3에 추가 예정)
> - **[미정]** 아직 팀 확정이 필요한 값. 코드에서 `TODO(확정 필요)`로 검색됨

---

## 1. 한눈에 보기

| 항목 | 내용 |
|---|---|
| 목적 | Windows 데스크톱 앱 "비서 자비스"의 소개·다운로드·릴리스 노트·FAQ·QnA·버그 신고·개인정보처리방침 사이트 + 관리자 화면 |
| 사용자 | **일반 사용자**: 회원가입 없음. 닉네임 + 글 비밀번호(+ 선택 이메일)로 글을 쓰고, 수정·삭제·비밀글 열람 때 그 비밀번호만 입력 (SFR-004)<br>**관리자**: 미리 등록된 계정만 `/admin`에서 로그인. 로그인하면 모든 관리 기능을 쓰고, 공개 화면의 글도 비밀번호 없이 열람·수정·삭제 (SFR-006) |
| 스택 | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 6 · PostgreSQL |
| 인증 | 관리자만 로그인. HMAC 서명 쿠키 세션(외부 인증 라이브러리 없음) |
| 파일 | 설치 파일(.exe): **GitHub Releases에만** 둔다 (SFR-005 ①, SER-002 ⑤)<br>스크린샷: 파일 저장소(Vercel Blob)에 두고 DB에는 주소만 저장 |
| 배포 계획 | Vercel(사이트 + Blob) + Neon(PostgreSQL) |
| 상태 | 기능 구현 완료, 로컬 실행·체크리스트 검증 완료. 글 데이터는 비워 둔 상태(관리자 계정만 있음) |

---

## 2. 화면 목록

### 2-1. 공개 화면 (라이트 테마, PC·모바일 반응형 — UIR-002 ④)

| ID | 주소 | 화면 | 주요 기능 |
|---|---|---|---|
| UI-009 | `/` | 메인(소개) | **콘텐츠**<br>- 앱 소개, 기능 카드 4개(작업 표시줄 위를 걷는 캐릭터와 반투명 말풍선 · 자연어 일정 등록 · 말풍선 알림/회의 접속 · 자연어 타이머)<br>- 캐릭터 상태 6종 예시: 걷기 · 앉기 · 쓰다듬기 · 알림 · 응답 중 · 오류 (임시 이미지)<br>- 다운로드 / QnA / 버그 신고 바로가기<br>- "Windows 10·11 지원 · macOS는 추후 지원 예정" |
| UI-010 | `/download` | 다운로드 | **최신 버전**: `v1.0.2` 형식 버전, 배포일, 파일 크기, SHA-256, 다운로드 버튼(GitHub Releases 파일 주소로 연결)<br>**안내**<br>- SmartScreen 경고 대처법 (이미지 2장)<br>- PowerShell `Get-FileHash` 검증 방법 (파일명은 실제 다운로드 파일명)<br>- "macOS는 추후 지원 예정"<br>**이전 버전 목록** |
| UI-011 | `/releases` | 릴리스 노트 | 버전별 노트(최신 표시), 각 버전의 "해결된 버그" 목록과 버그 상세 링크. 숨긴 릴리스는 안 보임 |
| UI-012 | `/faq` | FAQ | 아코디언 목록, 키워드 필터 **[팀 결정]**, "원하는 답이 없나요?" → QnA. 카테고리 필터는 없음 (DAR-002에 칼럼 없음) |
| UI-013 | `/qna`, `/qna/[id]` | QnA 목록·상세 | **목록**: 페이지당 5개, 번호/상태/제목/작성자/작성일. 비밀글은 🔒 표시와 제목 가림<br>**작성 모달**: 이메일 동의 문구 옆 **[자세히 보기] → /privacy**<br>**상세**: 본문, 관리자 답변, 수정/삭제(글 비밀번호), 비밀글 열람 폼 |
| UI-014 | `/bugs`, `/bugs/new`, `/bugs/[id]` | 버그 신고 목록·작성·상세 | **목록**: 상태 필터(전체/접수/확인 중/수정 완료/배포됨), 페이지당 5개<br>**작성 폼**: 앱 트레이 진입 시 앱 버전·OS 자동 입력, 스크린샷 첨부<br>**상세**: 발생 상황, 재현 방법, 첨부 이미지, 처리 상태, "vX.Y.Z에서 해결됨", 병합 안내, 수정/삭제(글 비밀번호) |
| **UI-019** | `/privacy` | 개인정보처리방침 | **수집 항목·목적·보관 기간 표**: 닉네임/글, 글 비밀번호, 이메일, 스크린샷, IP 해시<br>**고지**<br>- 구글 캘린더 데이터는 서버로 보내지 않음<br>- 구글 데이터는 AI 학습에 쓰지 않음<br>- Gemini 무료 티어 고지 (COR-001)<br>**버그 신고 주의, 문의처** (문의 이메일 **[미정]**)<br>**진입**: 공통 푸터 링크, QnA 동의 문구 [자세히 보기] (새 탭). 앱 설정 화면 진입은 데스크톱 앱 담당 |
| — | `/search?q=` | 통합 검색 **[팀 결정]** | 헤더 검색창. FAQ·릴리스 노트·QnA·버그를 한 번에 검색하고 검색어 주변 문장을 발췌. 숨긴 릴리스, 숨긴 QnA, 비밀글은 제외 |
| — | 404 | 없는 주소 안내 | |

- **공통 헤더**: 로고, 메뉴(소개/다운로드/릴리스 노트/FAQ/QnA/버그 신고), 검색창. 모바일은 햄버거 메뉴.
- **공통 푸터**: 개인정보처리방침, GitHub 링크.
- 공개 화면 어디에도 관리자 버튼·링크가 없다 (SFR-006 ③, UIR-002 ③). dev 실행에서도 마찬가지다.

### 2-2. 관리자 화면 (다크 테마 **[팀 결정]**)

| ID | 주소 | 화면 | 주요 기능 |
|---|---|---|---|
| UI-015 | `/admin` | 로그인 | 아이디/비밀번호 입력. 5회 연속 실패 시 5분 잠금, 남은 시도 횟수 안내 |
| UI-016 | `/admin/dashboard` | 대시보드 | **맨 위**: 새 질문(답변 대기) 수, 미처리 버그(배포 전) 수<br>**부가 표시** **[팀 결정]**: 최신 공개 릴리스, 최근 질문·버그 5개씩, 해결 버그 미연결 경고 |
| UI-017 | `/admin/releases` | 릴리스 관리 | 4-5 참고 |
| UI-018 | `/admin/manage?tab=qna\|bugs\|faq\|posts` | 답변·상태 관리 | 탭 4개: QnA / 버그 / FAQ / 게시물. 4-4 참고 |

- 관리자는 주소창에 `/admin`을 직접 입력해서만 들어간다.
- 관리자 메뉴: 대시보드 · 릴리스 관리 · 답변·상태 관리 · 로그아웃.

---

## 3. 일반 사용자 기능 상세

### 3-1. 글쓰기 공통 규칙 (QnA·버그 신고)

- 회원가입 없이 **닉네임 + 글 비밀번호**로 작성한다.
- 글 비밀번호는 bcrypt 해시로만 저장한다 (SER-002 ③).
- 수정·삭제는 작성 때 입력한 비밀번호로 한다.
- **비밀번호 대입 방지** (SER-002 ③, SFR-004 ②):
  - 같은 IP·같은 글에서 10분 안에 5번 틀리면 10분 동안 차단한다. 차단 중에는 맞는 비밀번호도 거부한다.
  - 적용 범위: QnA 비밀글 열람·수정·삭제, 버그 신고 수정·삭제 전부.
  - 기록: `post_attempt` (`action=password_fail`, `target_type=question|bug_report`).
  - 관리자는 제한 없이 통과한다.
- **스팸 방지** (SER-002 ④) **[팀 결정]**:
  - 덧셈 캡차: 서명 토큰 방식, 10분 유효.
  - 같은 IP 30초 재등록 제한: 질문·버그를 각각 따로 센다. IP는 해시로만 저장한다.
- **입력 길이** **[미정]**:

  | 항목 | 길이 |
  |---|---|
  | 닉네임 | 2~20자 |
  | 글 비밀번호 | 4~20자 |
  | 제목 | 2~100자 |
  | 내용 | 5~3000자 |
  | 이메일 | 100자 이하 |

  - 화면(미리 검사)과 서버(최종 검사)가 같은 검증 함수를 쓴다.
- **XSS 방지**: 출력은 React 기본 이스케이프만 쓴다. HTML·마크다운 렌더링과 `dangerouslySetInnerHTML`은 쓰지 않는다.

### 3-2. QnA

- **작성 항목**: 닉네임, 글 비밀번호, 이메일(선택), 이메일 수집·이용 동의, 제목, 내용, 비밀글 체크.
  - 동의는 이메일을 입력했을 때만 필수다.
  - 동의 문구 옆에 [자세히 보기] → `/privacy` (새 탭).
- **비밀글** **[팀 결정]**:
  - 목록에서는 "🔒 비밀글입니다"로 보인다.
  - 비밀번호가 맞으면 그 글 전용 열람 쿠키를 발급한다: 30분, `qna_unlock_{id}`, Path=`/qna/{id}`, HttpOnly, 운영 환경에서 Secure.
  - 본문은 서버가 열람 쿠키나 관리자 세션을 확인했을 때만 내려준다. 검색 결과에서도 제외한다.
- **수정**: 닉네임·제목·내용·비밀글 여부를 바꿀 수 있다. 기존 이메일은 보여주지 않는다. 답변 전이고 알림 상태가 NONE/PENDING일 때만 새 이메일을 넣을 수 있다.
- **삭제**: 답변도 함께 삭제된다.
- **관리자가 숨긴 글**: 목록·상세·검색에서 모두 안 보인다.

### 3-3. 답변 알림 메일 **[팀 결정]**

- 관리자가 **처음 답변을 등록할 때 1회만** 보낸다. 답변을 수정할 때는 보내지 않는다.
- 상태값 `notifyStatus`:

  | 값 | 의미 |
  |---|---|
  | NONE | 이메일 없음 |
  | PENDING | 이메일 있음, 답변 전 |
  | SENT | 발송 성공 |
  | FAILED | 발송 실패 |

- **파기 규칙** (SER-002 주석 "답변 완료 후 파기"):
  - 발송·재발송에 성공하면 이메일을 즉시 삭제하고 SENT로 바꾼다.
  - 실패하면 이메일을 보관하고 FAILED로 바꾼다. 관리자 화면에 [재발송] 버튼이 생긴다.
  - FAILED 이메일은 첫 답변 후 **7일**(`FAILED_EMAIL_RETENTION_DAYS`, **[미정]**)이 지나면 자동 삭제한다. 그 뒤 관리자 화면에는 "보관 기한이 지나 이메일을 삭제했어요 (재발송 불가)"가 표시된다.
  - 정리 시점: 요청 후 실행(after) + Vercel Cron 하루 1번 → 방문자가 없어도 기한을 지킨다.
- 비밀글이면 메일에 제목·답변 본문을 넣지 않는다. 링크만 보낸다.
- 발송 방식은 `MAIL_PROVIDER`로 고른다: `console`(기본, 콘솔 출력) / `gmail`(nodemailer SMTP) / `resend`.

### 3-4. 버그 신고

- **작성 항목**: 닉네임, 글 비밀번호, 제목, 앱 버전, OS(Windows 10 / Windows 11 / 기타), 발생 상황, 재현 방법, 스크린샷(선택) (SFR-004 ③).
- **앱 버전** (PMR-002 ②):
  - 입력은 `1.0.2`와 `v1.0.2`를 모두 받는다.
  - 저장·표시는 `v1.0.2`로 통일한다.
- **앱 트레이에서 들어올 때 자동 입력** (SFR-004 ⑤):
  - 주소: `/bugs/new?appVersion=1.0.2&os=windows11&from=tray` (형식은 6장)
  - 채워진 칸 옆에 "앱에서 자동 입력됨" 뱃지를 보여준다. 사용자가 고칠 수 있고, 고치면 뱃지가 사라진다.
- **스크린샷**:
  - png/jpeg/gif/webp만 받는다. 파일 앞부분 바이트까지 검사하고 SVG는 거부한다.
  - **4MB 이하**.
  - 파일은 저장소에 두고 DB `attachment_url`에는 **주소만** 저장한다.
  - 글을 삭제하거나 스크린샷을 교체·삭제하면 저장소 파일도 지운다. 관리자 강제 삭제도 포함한다.
  - 파일은 base64로 바꾸지 않고 FormData로 원본 그대로 서버에 보낸다.
- **개인정보 경고**: 본문에 Google API Key(`AIza…`)나 토큰(`ya29.`, `1//0`) 같은 문자열이 있으면 경고를 띄운다 (SER-002 ⑥).
- **처리 상태**: 접수 → 확인 중 → 수정 완료 → 배포됨 (SFR-004 ④). "배포됨"이면 "vX.Y.Z에서 해결됨"과 릴리스 노트 링크를 보여준다.
- 관리자가 중복으로 병합한 글에는 "#N로 병합됨" 안내가 붙는다.
- 버그 글에는 숨김 기능이 없다 (DAR-002 bug_report에 숨김 칼럼 없음).

### 3-5. 다운로드·릴리스

- 다운로드 버튼은 최신 공개 릴리스의 `downloadUrl`(GitHub Releases 파일 주소)로 연결된다.
- `GITHUB_REPO`가 예시값 `OWNER/REPO`이면 "목업 환경" 안내를 띄운다.
- 앱 연동 API `GET /api/releases/latest`는 `version`을 `v1.0.2` 형식으로 반환한다 (6장).

---

## 4. 관리자 기능 상세

### 4-1. 로그인·권한 (SFR-006, SER-002 ①②)

- 계정: DB `admin` 테이블. 회원가입, 관리자 추가, 비밀번호 변경 화면은 없다 (SFR-006 ①).
  - `npm run db:seed`가 `.env`의 `ADMIN_INITIAL_LOGIN_ID` / `ADMIN_INITIAL_PASSWORD`로 1명을 만든다.
  - 로컬 테스트 계정은 `admin` / `admin`이다. 배포 DB에서는 12자 미만 비밀번호를 거부한다.
- **관리자 계정은 개발팀 공용 1개다.** 팀원 3명이 같은 아이디·비밀번호로 로그인한다. seed는 1명만 만들고, 여러 명을 만드는 기능은 두지 않는다.
  - **로그인 잠금도 공용이다.** 잠금은 계정 단위(`admin.failed_count` / `locked_until`)라서, 한 명이 5회 틀리면 전원이 5분 동안 로그인할 수 없다.
  - 여러 기기에서 동시에 로그인해도 서로 로그아웃되지 않는다. 세션이 서버 저장 없는 서명 쿠키라서 기기마다 따로 유지된다.
    - 검증(2026-11-13): 3개 브라우저에서 동시 로그인 → 한 곳에서 로그아웃·재로그인 → 나머지 두 곳은 관리자 기능을 계속 사용. 통과.
  - 로그아웃은 그 기기의 쿠키만 지운다. 기기를 잃어버리는 등 모든 세션을 강제로 끊어야 하면 `SESSION_SECRET`을 바꾼다. 이때 전원 로그아웃되고, 비밀글 열람 쿠키도 초기화된다.
  - 권장: 배포 계정의 로그인 아이디는 `admin` 같은 추측하기 쉬운 값을 피한다. 아이디를 아는 사람은 일부러 5회 틀려서 팀 전체를 잠글 수 있기 때문이다.
- 세션 쿠키 `jarvis_admin_session`:
  - HttpOnly, SameSite=Lax, 8시간, HMAC-SHA256 서명.
  - **운영 환경에서는 Secure**를 붙인다 (`NODE_ENV=production`).
- 권한은 3단계로 확인한다:
  1. `middleware.ts`
  2. 관리자 레이아웃(서버)
  3. 모든 관리자 Server Action의 `requireAdmin()`
- 로그인 상태에서는 공개 화면에서도 비밀글을 바로 열고, 모든 글을 비밀번호 없이 수정·삭제할 수 있다. 화면에 "관리자로 보는 중" 표시가 나온다.

### 4-2. 대시보드 (UI-016)

- 맨 위: 새 질문 수(숨김 제외, 답변 대기), 미처리 버그 수(배포 전).
- 부가 표시: 최신 공개 릴리스(`v1.0.2`), 최근 질문 5개·최근 버그 5개, 해결 버그 미연결 경고.
- 대시보드를 열 때 개인정보 자동 정리도 함께 예약한다 (7장 cleanup).

### 4-3. 공통 동작

- 저장하면 토스트 알림을 띄우고 목록을 자동으로 새로 고친다.
- 위험한 작업은 확인 모달을 거친다.
- 모달이 겹쳐도 ESC는 맨 위 모달만 닫는다.

### 4-4. 답변·상태 관리 (UI-018)

**① QnA 탭**
- 모든 질문을 본다. 비밀글·숨김 글 포함, 비밀번호 없이.
- 답변 작성·수정·삭제. 첫 답변을 등록하면 알림 메일을 보낸다.
- 알림 상태 표시. 실패면 [재발송]. 보관 기한이 지났으면 재발송 불가 안내.
- 숨김 / 숨김 해제.

**② 버그 탭**
- 처리 상태 변경. "배포됨"은 해결 릴리스를 골라야만 저장할 수 있다.
- 비공개 관리자 메모. 공개 응답에는 절대 포함하지 않는다.
- 중복 신고 병합 / 해제.

**③ FAQ 탭**
- 추가·수정·삭제, 위/아래 순서 이동.

**④ 게시물 탭**
- QnA·버그 글 강제 수정(제목·본문)과 강제 삭제. 버그를 강제 삭제하면 스크린샷 파일도 삭제한다.

### 4-5. 릴리스 관리 (UI-017)

- 사이트는 설치 파일을 업로드받지 않는다. 정보(버전·주소·해시·크기·노트)만 등록한다.

**등록 방법 3가지**
1. **자동 등록 (운영)**: GitHub Actions → `POST /api/releases/sync`. `source = GITHUB`로 저장하고 바로 공개한다.
2. **동기화 시뮬레이션 (시연용)**: 다음 버전 요청 JSON을 미리 보여주고, 자동 등록과 같은 검증으로 등록한다.
3. **수동 등록 (자동 실패 대비)**: `source = MANUAL`, 등록 관리자 ID를 기록한다. GitHub 릴리스 주소를 비우면 태그 주소를 자동으로 만든다.

**등록 검증** (화면·서버 공용)

| 항목 | 규칙 |
|---|---|
| 버전 | `v1.0.2` 형식, 중복 금지. DB에는 `v1.0.2`로 저장하고 모든 화면에도 `v1.0.2`로 표시 |
| 배포일 | `YYYY-MM-DD` |
| 릴리스 노트 | 2~3000자 |
| 다운로드 URL | `https://github.com/{GITHUB_REPO}/releases/`로 시작하는 `.exe` 파일만 (SER-002 ⑦) |
| SHA-256 | 64자리 16진수 |
| 파일 크기 | 2GB 미만 양의 정수(byte) |

**등록 후 관리**
- 릴리스 노트 수정.
- **숨김 / 숨김 해제**: 숨기면 공개 화면, 검색, `latest` API, 다운로드에서 빠진다. 연결된 버그 상태는 그대로다.
- **해결 버그 연결**: 공개 릴리스에 연결하면 확인 모달을 거친 뒤 '배포됨'으로 바꾼다. 숨긴 릴리스에 연결하면 상태를 유지한다.
- **삭제**: 영향받는 버그 목록과 숨김 권장 안내를 보여준다. 실제로 삭제하면 연결 버그는 '수정 완료'로 돌아간다.

---

## 5. 데이터베이스 (Prisma, `prisma/schema.prisma`)

DAR-002 v0.2 기준에 **[팀 결정]** 칼럼·테이블을 추가했다. 대상: 관리자 로그인 잠금, `question.is_secret`·`notify_status`, `answer.updated_at`, `post_attempt`.

| 테이블 | 주요 칼럼 | 비고 |
|---|---|---|
| `admin` | id, login_id(unique), password_hash, name, failed_count, locked_until | 로그인 잠금 정보 포함 |
| `question` | id, nickname, password_hash, email?, title, content, created_at, is_hidden, is_secret, notify_status | email은 알림 후, 또는 실패 후 7일 지나면 null |
| `answer` | id, question_id(unique), admin_id, content, created_at, updated_at | 질문 삭제 시 함께 삭제(Cascade) |
| `bug_report` | id, nickname, password_hash, title, app_version(`vX.Y.Z`), os, content, repro_steps, attachment_url?(저장소 주소), status, resolved_release_id?, created_at, admin_memo?, merged_into_bug_id? | |
| `release` | id, version(unique, `vX.Y.Z`), released_at, release_note, download_url, sha256(char 64), file_size, github_release_url?, source(GITHUB/MANUAL), uploaded_by?, is_hidden | |
| `faq` | id, question, answer, sort_order | |
| `post_attempt` | id, ip_hash, action(`question`/`bug_report`/`password_fail`), **target_type**(`question`/`bug_report`)?, target_id?, created_at | 1일 지나면 자동 삭제 |

Enum 값:
- `NotifyStatus`: NONE / PENDING / SENT / FAILED
- `BugStatus`: RECEIVED / CHECKING / FIXED / DEPLOYED (영문 저장, 한글 표시 **[팀 결정]**)
- `ReleaseSource`: GITHUB / MANUAL

**마이그레이션**

| 이름 | 내용 |
|---|---|
| `20261110041019_init` | 최초 스키마 |
| `20261113090000_password_fail_and_version` | `post_attempt.target_type` 추가, 기존 `unlock_fail` → `password_fail`로 변환, 인덱스 교체, 앱 버전·릴리스 버전 `vX.Y.Z` 정규화(데이터 업데이트) |

---

## 6. API · 연동 규약

| 메서드·주소 | 용도 | 인증 | 응답 |
|---|---|---|---|
| `GET /api/releases/latest` | 데스크톱 앱 새 버전 확인 (SFR-005 ④) | 없음 | `{ version: "v1.0.2", releasedAt, downloadUrl, sha256 }`. 없으면 404. `Cache-Control: no-store`. 앱은 `package.json`의 `1.0.2` 앞에 `v`를 붙여 비교한다 |
| `POST /api/releases/sync` | GitHub Actions 자동 등록 | `Authorization: Bearer {SYNC_SECRET}` (timing-safe 비교) | 201 등록 / 401 인증 실패 / 409 중복 / 422 형식 오류(필드별 `errors`) / 500 SYNC_SECRET 미설정 |
| `POST /api/qna/[id]/unlock` | 비밀글 비밀번호 확인 | 글 비밀번호 | 성공하면 열람 쿠키 발급. 실패 제한 적용 시 429 |
| `GET /api/cron/cleanup` | 개인정보 정리 (Vercel Cron, 하루 1번) | `Authorization: Bearer {CRON_SECRET}` (timing-safe 비교) | 200 `{ ok, removed: { attempts, emails } }` / 401 인증 실패 / 500 CRON_SECRET 미설정 |

- 예전 `GET /api/bugs/[id]/attachment` 라우트는 **삭제**했다. 스크린샷은 저장소 주소로 바로 보여준다.

**`/api/releases/sync` 요청 본문**

```json
{
  "version": "v1.0.2",
  "releasedAt": "2026-11-20",
  "releaseNote": "버그 수정 패치예요.\n- …",
  "downloadUrl": "https://github.com/OWNER/REPO/releases/download/v1.0.2/HeyJarvis-Setup-1.0.2.exe",
  "sha256": "64자리 16진수",
  "fileSize": 88000000,
  "githubReleaseUrl": "https://github.com/OWNER/REPO/releases/tag/v1.0.2"
}
```

**데스크톱 앱 트레이 → 버그 신고 연동 규약** (SFR-004 ⑤ · 앱 팀 전달용 고정 형식)

```
/bugs/new?appVersion=1.0.2&os=windows11&from=tray
```

| 파라미터 | 허용 값 | 처리 |
|---|---|---|
| `appVersion` | `1.0.2` 또는 `v1.0.2` | `v1.0.2`로 정규화 |
| `os` | `windows10` / `windows11` / `other` | Windows 10 / Windows 11 / 기타 |
| `from` | `tray` | 화면 상단에 "앱 트레이 메뉴에서 열었어요" 안내 |

- 형식에 맞지 않는 값은 무시하고 빈칸(기본값)으로 둔다.
- 자동으로 채운 칸에는 "앱에서 자동 입력됨" 뱃지를 붙인다.

그 밖의 화면 데이터 요청은 모두 **Server Actions**로 처리한다(7장).

---

## 7. 코드 구조와 규칙

```
prisma/        schema.prisma · migrations/ · seed.ts(관리자 1명) · seed-demo.ts(시연 데이터, 선택)
scripts/       local-db.mjs (Docker 없이 쓰는 로컬 PostgreSQL)
public/images/ 캐릭터 6종·SmartScreen 임시 이미지 (같은 파일명으로 교체)
public/uploads/ 개발용 스크린샷 저장 위치 (git 제외)
src/
  app/(public)/              공개 화면 (privacy 포함)
  app/admin/                 로그인 · (protected)/ 대시보드·릴리스·관리 탭
  app/api/                   6장의 API
  middleware.ts              /admin/* 1차 확인
  components/                Header, Footer, Modal, ConfirmModal, PasswordModal, QuestionFormModal, BugForm, Captcha, Toast, ui
  hooks/useRepo.ts           데이터 로딩 훅
  server/   ★ 서버 전용 (import "server-only")
    actions/public.ts        공개 Server Actions (버그 작성·수정은 FormData)
    actions/admin.ts         관리자 Server Actions (전부 requireAdmin)
    services/                questions · bugs · releases · misc(FAQ·검색·대시보드·강제 수정/삭제)
    auth.ts                  세션·로그인 잠금
    rate-limit.ts            30초 재등록 제한, 글 비밀번호 실패 제한(password_fail)
    cleanup.ts               개인정보 자동 파기 — ① after()로 요청 응답 후 실행(인스턴스당 10분에 1번)
                             ② Vercel Cron 하루 1번 (app/api/cron/cleanup · vercel.json "0 18 * * *" = 매일 03:00 KST)
    captcha.ts notify.ts unlock.ts request.ts(IP 해시) env.ts mappers.ts run.ts
  lib/
    repository/              ★ 화면은 이것만 import
    storage.ts               스크린샷 저장소 (STORAGE_PROVIDER: blob | local) — 서버 전용
    types.ts constants.ts format.ts release-utils.ts
    validation.ts post-validation.ts release-validation.ts   화면·서버 공용 검증 (VERSION_RE, normalizeVersion 포함)
    signed-token.ts db.ts password.ts mailer.ts
```

**규칙**
- 화면은 `@/lib/repository`만 호출한다. Prisma·bcrypt·메일·저장소 코드는 `server/`와 `lib/db·password·mailer·storage`에만 둔다.
- Server Action은 `{ ok, data | error }` 결과 객체를 돌려준다. repository가 이를 `RepoError`로 바꾸고, 데이터가 바뀌면 `jarvis-data-change` 이벤트로 목록을 새로 고친다.
- 공개 응답에서는 `passwordHash`, `email`, `notifyStatus`, `adminMemo`를 **Prisma select 단계에서 제외**한다.
- 버그 작성·수정 FormData 필드:

  | 필드 | 내용 |
  |---|---|
  | `input` | 글 내용 JSON |
  | `captcha` | 캡차 JSON (작성 때만) |
  | `attachment` | File |
  | `attachmentMode` | `keep` / `remove` / `replace` |
  | `bugId`, `password` | 수정 때만 |

- 설정값은 `src/lib/constants.ts`에 모아 둔다:

  | 상수 | 값 |
  |---|---|
  | 세션 유지 | 8시간 |
  | 로그인 잠금 | 5회 실패 → 5분 |
  | 재등록 제한 | 30초 |
  | 글 비밀번호 실패 제한 | 5회 / 10분 → 10분 차단 |
  | 열람 쿠키 | 30분 |
  | 캡차 유효 시간 | 10분 |
  | 첨부 파일 | **4MB** |
  | 목록 페이지당 글 수 | 5개 |
  | `FAILED_EMAIL_RETENTION_DAYS` | 7 **[미정]** |
  | `POST_ATTEMPT_RETENTION_DAYS` | 1 **[미정]** |
  | `PRIVACY_CONTACT_EMAIL` | `""` **[미정]** |

**Server Actions 목록**
- 공개:
  - 공통: getViewer, getCaptcha
  - QnA: listQuestions, createQuestion, getQuestionForEdit, updateQuestion, deleteQuestion
  - 버그: listBugs, getBug, createBug(FormData), getBugForEdit, updateBug(FormData), deleteBug
  - 조회: getReleases, getReleaseNotes, getFaqs, search
- 관리자:
  - 인증·대시보드: login, logout, dashboard
  - QnA: adminQuestions, saveAnswer, resendNotification, deleteAnswer, setQuestionHidden
  - 버그: adminBugs, updateBugStatus, updateBugMemo, mergeBug
  - 릴리스: adminReleases, buildSyncPayload, simulateSync, createManualRelease, updateReleaseNote, setReleaseHidden, linkBugs, deleteRelease, fixedBugs
  - FAQ: adminFaqs, createFaq, updateFaq, deleteFaq, moveFaq
  - 게시물: forceUpdatePost, deleteAnyPost

---

## 8. 환경변수 (`.env`)

| 이름 | 설명 |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL. 로컬은 `localhost:54329`(db:local) 또는 `5432`(Docker). 배포는 Neon pooled / direct |
| `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD` | seed 때만 쓴다. `change-me…`는 거부하고, 배포 DB는 12자 이상만 받는다 |
| `SESSION_SECRET` | 32자 이상 무작위. 세션·열람 쿠키·캡차 서명 키 |
| `SYNC_SECRET` | `/api/releases/sync` 인증 토큰. **서버 전용** |
| `GITHUB_REPO` | **설치 파일(.exe)이 올라가는 "앱 저장소"(공개)**의 `OWNER/REPO`. 사이트 저장소가 아니다. 다운로드 URL 검증·링크에 쓴다 |
| `CRON_SECRET` | `/api/cron/cleanup` 인증 토큰 (16자 이상 무작위). Vercel에 넣으면 Cron 호출에 자동으로 붙음. **서버 전용** |
| `STORAGE_PROVIDER` | `blob`(배포) / `local`(개발, 운영에서는 거부) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 토큰 (Vercel 프로젝트 → Storage → Blob 생성 시 발급) |
| `MAIL_PROVIDER` | `console` / `gmail` / `resend` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Gmail SMTP |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend |
| `SITE_URL` | 메일 속 링크 주소 |

Prisma CLI는 `.env`만 읽는다. `.env.local`은 Next.js만 읽는다.
어디에 어떤 값을 넣는지(Vercel / 앱 저장소 Actions / 로컬)는 **12-2**에 나눠 정리했다.

---

## 9. 실행 방법

```bash
npm install
# DB (둘 중 하나)
npm run db:local        # Docker 없이: 이 창을 켜 둔다 (데이터: %LOCALAPPDATA%\jarvis-localdb)
npm run db:up           # Docker Desktop이 있을 때 (.env 포트를 5432로)
# 처음 한 번
npx prisma migrate deploy
npm run db:seed         # 관리자 1명
npm run db:demo         # (선택) 시연용 예시 글, 글 비밀번호 1234
# 사이트
npm run dev             # http://localhost:3000  · 관리자: /admin 직접 입력
```

- 배포(Vercel)할 때는 `vercel-build`가 `prisma generate → prisma migrate deploy → next build`를 실행한다.

---

## 10. 검증 결과 (수정 지시서 6장 체크리스트, 2026-11-13)

자동 브라우저 테스트(Playwright + Edge)로 dev 서버에서 36개 항목을 직접 실행했다. 쿠키 Secure는 운영 빌드(`next start`)에서 확인했다. 테스트로 만든 데이터는 끝난 뒤 모두 지웠다.

| 체크 항목 | 결과 |
|---|---|
| `/privacy` 존재, 푸터·QnA 동의 문구 링크, 모바일 가로 스크롤 없음 | 통과 |
| dev 실행에서도 헤더에 어드민 버튼 없음 | 통과 |
| 스크린샷은 저장소에, DB는 주소만. 3.5MB 업로드 성공, 4MB 초과 거부, 가짜 이미지 거부, 교체·삭제 시 파일 삭제 | 통과 |
| 다운로드·릴리스 노트·대시보드·버그 상세·검색·latest API 버전이 `v1.0.2` 형식 | 통과 |
| `/bugs/new?appVersion=1.0.2&os=windows11&from=tray` → `v1.0.2` / Windows 11 + 뱃지. 틀린 값은 무시 | 통과 |
| 버그 삭제·QnA 수정 비밀번호 5번 틀리면 10분 차단 (`password_fail` 기록) | 통과 |
| 운영 빌드에서 관리자 세션·비밀글 열람 쿠키에 Secure | 통과 |
| 7일 지난 FAILED 이메일, 1일 지난 `post_attempt` 정리 (최근 것은 유지) | 통과 |
| 메인 "macOS는 추후 지원 예정", 캐릭터 상태 6종 | 통과 |
| 숨긴 릴리스는 검색에 안 나옴 | 통과 |
| `tsc --noEmit`, `next build` | 통과 |

---

## 11. 남은 일 / 팀 확정 필요 (`TODO(확정 필요)`)

| 항목 | 현재 임시값 |
|---|---|
| 입력 길이 제한 | 닉네임 2~20, 비밀번호 4~20, 제목 2~100, 내용 5~3000, 이메일 100 |
| FAILED 이메일 보관 기한 | 7일 |
| IP 해시 보관 기한 | 1일 |
| 개인정보처리방침 문의 이메일 | 미정 ("준비 중 · QnA에 남겨 주세요"로 표시) |
| 실제 메일 발송 | Gmail 앱 비밀번호로 실발송 1회 확인 필요 |
| 캐릭터·SmartScreen 이미지 | 임시 이미지 (같은 파일명으로 교체) |
| 캡차 | 덧셈 캡차. 스팸이 많으면 Turnstile / reCAPTCHA 검토 |
| 저장 시 HTML 이스케이프 | 원문 저장 + 출력 시 React 이스케이프. 다른 클라이언트가 HTML로 그리면 재검토 |
| 배포 | 아래 12장 "배포할 때 할 일" 참고 (Git 브랜치·Vercel 연결·환경변수 구분·seed 절차) |
| GitHub Actions 워크플로 | 앱 저장소에서 `.exe` 빌드 → Release 생성 → sync 호출 (사이트 쪽 API는 준비 완료) |

**만들지 않는 것** (문서 위반)
- 공개 화면의 관리자 버튼
- 회원가입, 관리자 추가·비밀번호 변경
- 사이트에서 .exe 업로드
- macOS 다운로드 카드
- FAQ 카테고리, 릴리스 태그
- 버그 글 숨김
- 음성·스티커 메모 소개

---

## 12. 배포할 때 할 일

### 12-1. Git 브랜치 전략 (PMR-001)과 Vercel 연결

**사이트 저장소는 공개 저장소로 만든다.** Vercel Hobby에서 팀원 커밋도 배포되게 하려는 것이다. 그래서 비밀값은 절대 코드·커밋에 넣지 않는다. `.env`, `.env*.local`은 `.gitignore`로 제외돼 있다.

| 브랜치 | 용도 | Vercel |
|---|---|---|
| `main` | 배포본. PR로만 합친다 | **Production** (실제 주소) |
| `dev` | 통합 브랜치. feature PR이 모이는 곳 | **Preview** (dev 전용 미리보기 주소) |
| `feature/*` | 기능·수정 작업. 예: `feature/privacy-contact` | PR을 열면 **Preview** |

- **작업 흐름**
  1. `dev`에서 `feature/*` 브랜치를 만든다.
  2. `feature/*` → `dev` PR을 열고 리뷰한 뒤 합친다.
  3. 배포할 때 `dev` → `main` PR을 연다.
- **첫 커밋**: `main`에 만들고, 바로 `dev` 브랜치를 생성한다.

**Vercel 연결 방법**
1. Vercel → Add New → Project → GitHub 사이트 저장소를 Import한다. Framework는 Next.js로 자동 인식된다.
2. Settings → Git → **Production Branch = `main`**으로 둔다(기본값). `main`이 아닌 브랜치 push와 PR은 자동으로 Preview 배포된다.
3. (선택) Settings → Domains에서 `dev` 브랜치에 고정 미리보기 주소를 연결한다. 예: `dev-jarvis.vercel.app` → Git Branch: `dev`
4. Settings → Environment Variables에서 값마다 적용 환경(Production / Preview)을 고른다(12-2 표).
5. GitHub 저장소 → Settings → Branches에서 `main`·`dev`에 보호 규칙을 건다. 직접 push를 막고 PR 필수로 하는 것을 권장한다.

**⚠ Preview DB는 반드시 분리한다**
- `vercel-build`는 배포할 때마다 `prisma migrate deploy`를 실행한다. Preview도 마찬가지다.
- Preview가 운영 DB를 가리키면, 아직 합치지 않은 feature 브랜치의 마이그레이션이 **운영 DB에 먼저 적용된다**.
- Neon에서 `dev` 브랜치(DB 복제본)를 만들고, Preview 환경의 `DATABASE_URL`·`DIRECT_URL`은 그 주소로 넣는다.

### 12-2. 환경변수 — 어디에 무엇을 넣나

**`GITHUB_REPO`는 설치 파일(.exe)이 올라가는 "앱 저장소"(공개)의 `OWNER/REPO`다.**
- 사이트 저장소 주소가 아니다.
- 다운로드 URL은 `https://github.com/{GITHUB_REPO}/releases/...`로 시작해야 등록된다.

**① Vercel (사이트 저장소 프로젝트)**

| 이름 | Production | Preview | 비고 |
|---|---|---|---|
| `DATABASE_URL` | Neon 운영 pooled 주소 | Neon **dev 브랜치** pooled 주소 | |
| `DIRECT_URL` | Neon 운영 direct 주소 | Neon dev 브랜치 direct 주소 | 마이그레이션용 |
| `SESSION_SECRET` | 32자 이상 무작위 | Production과 **다른** 값 | 바꾸면 전원 로그아웃 |
| `SYNC_SECRET` | 무작위 (앱 저장소 Secret과 **같은 값**) | 넣지 않아도 됨 | 자동 등록은 운영 주소로만 호출 |
| `CRON_SECRET` | 16자 이상 무작위 | 넣지 않아도 됨 | Cron은 Production에서만 실행 |
| `GITHUB_REPO` | 앱 저장소 `OWNER/REPO` | 같은 값 | 빌드 시 화면에도 들어가는 공개 정보 |
| `SITE_URL` | 운영 주소 (`https://…`) | dev 미리보기 주소 | 알림 메일 속 링크 |
| `STORAGE_PROVIDER` | `blob` | `blob` | |
| `BLOB_READ_WRITE_TOKEN` | Blob 연결 시 자동 | 자동 | 직접 입력하지 않음 |
| `MAIL_PROVIDER` + `GMAIL_USER`·`GMAIL_APP_PASSWORD` 또는 `RESEND_API_KEY`·`MAIL_FROM` | 실제 발송 설정 | `console` 권장 | Preview에서 실제 메일이 나가지 않게 |

- **Vercel에 넣지 않는 값**: `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD`. seed 때 로컬 터미널에서만 쓴다(12-3).

**② 앱 저장소 GitHub Actions Secrets** (설치 파일 빌드·릴리스 워크플로가 쓰는 값)

| 이름(예시) | 값 | 용도 |
|---|---|---|
| `SYNC_SECRET` | Vercel Production의 `SYNC_SECRET`과 **같은 값** | `Authorization: Bearer` 헤더 |
| `SITE_URL` | 사이트 운영 주소 (`https://…`, 끝에 `/` 없이) | `POST {SITE_URL}/api/releases/sync` 호출 대상 |

- GitHub Release 생성에는 Actions 기본 제공 `GITHUB_TOKEN`을 쓴다(별도 등록 불필요).

**③ 로컬에서만 쓰는 값** (`.env`, 커밋 금지)

| 이름 | 값 |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `localhost:54329`(db:local) 또는 `5432`(Docker) |
| `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD` | 로컬 테스트용(`admin`/`admin`). 배포 seed 때는 터미널에서 임시로 지정 |
| `SESSION_SECRET` | 로컬용 무작위 (운영 값과 다르게) |
| `STORAGE_PROVIDER` | `local` |
| `MAIL_PROVIDER` | `console` |
| `CRON_SECRET`, `SYNC_SECRET`, `GITHUB_REPO` | 로컬 테스트용. `SYNC_SECRET`·`GITHUB_REPO`는 `.env.local`에 둬도 됨 |

### 12-3. 배포 순서

1. 사이트 저장소(공개)를 GitHub에 만들고 `main`·`dev`를 push한다(12-1).
2. Neon에서 프로젝트를 만든다. 운영 DB(main 브랜치)와 `dev` 브랜치를 만들고, 각각 pooled / direct 주소를 받는다.
3. Vercel에서 프로젝트를 Import하고, Storage → **Blob**을 만들어 연결한다.
4. Vercel 환경변수를 12-2 ① 표대로 넣는다.
5. `main`을 배포한다. `vercel-build`가 `prisma migrate deploy`로 운영 DB 테이블을 만든다.
6. **관리자 계정 seed (로컬에서 한 번만)**
   - 운영 DB의 **direct 주소**로 실행한다.
   - 관리자 비밀번호(12자 이상)는 Vercel이나 파일에 저장하지 않고, 이 터미널에서만 임시로 지정한다.
   - Windows PowerShell 예시:

   ```powershell
   $env:DATABASE_URL = "<Neon 운영 DIRECT 주소>"
   $env:DIRECT_URL   = "<Neon 운영 DIRECT 주소>"
   $env:ADMIN_INITIAL_LOGIN_ID = "<공용 로그인 아이디>"
   $env:ADMIN_INITIAL_PASSWORD = "<12자 이상 비밀번호>"
   npx prisma db seed
   Remove-Item Env:DATABASE_URL, Env:DIRECT_URL, Env:ADMIN_INITIAL_LOGIN_ID, Env:ADMIN_INITIAL_PASSWORD
   ```

   - 터미널에서 지정한 값이 `.env`보다 우선한다. 그래서 로컬 `.env` 파일은 바꾸지 않아도 된다.
   - seed는 이미 같은 아이디가 있으면 아무것도 바꾸지 않는다(다시 실행해도 비밀번호가 바뀌지 않음).
   - 비밀번호는 팀 내부에서만 안전하게 공유한다. 사이트에 비밀번호 변경 화면은 없다(SFR-006 ①).
   - Preview(dev 브랜치 DB)에서도 관리자가 필요하면, dev 브랜치 direct 주소로 같은 방법을 한 번 더 실행한다.
7. 앱 저장소에 Actions Secrets(12-2 ②)를 넣고, 릴리스 워크플로가 sync API를 호출하도록 한다.
8. 12-5 확인 목록을 점검한다.

### 12-4. 스크린샷 업로드 크기 — 어떻게 설정돼 있나

| 항목 | 현재 설정 |
|---|---|
| 업로드 경로 | **Server Action** (Route Handler 아님)<br>`createBugAction` / `updateBugAction` (`src/server/actions/public.ts`)이 **FormData**를 받는다<br>파일은 base64 변환 없이 원본 바이트로 전송한다 |
| 파일 크기 상한 (앱) | **4MB** — `ATTACHMENT_MAX_BYTES` (`src/lib/constants.ts`)<br>① 화면: `BugForm.tsx`에서 파일을 고를 때 거부<br>② 서버: `services/bugs.ts`의 `checkAttachment`에서 다시 거부 (형식·매직 바이트 검사 포함) |
| 요청 본문 상한 (Next.js) | **5mb** — `next.config.ts`의 `experimental.serverActions.bodySizeLimit`<br>Server Action 기본값은 1MB라서 올렸다. 4MB 파일 + 글 내용(최대 수십 KB)을 담을 수 있다 |
| 요청 본문 상한 (Vercel) | **4.5MB** — Vercel Functions의 플랫폼 고정 한도(설정으로 못 바꿈). 배포 환경의 실제 상한은 이 값이다<br>4MB 파일 + 글 내용 + multipart 오버헤드는 이 안에 들어간다 |

### 12-5. Vercel에서 확인할 것

- [ ] **업로드 실측**
  - 3.5~3.9MB 이미지로 버그 신고를 작성하고, 수정해서 교체도 해 본다.
  - 성공하면 DB `attachment_url`이 `https://….blob.vercel-storage.com/bugs/…`인지 확인한다.
- [ ] **4.5MB 초과 요청**
  - Vercel이 앱에 도달하기 전에 `413 FUNCTION_PAYLOAD_TOO_LARGE`로 막는다. 이때는 우리 오류 문구가 아니라 일반 오류가 뜬다.
  - 정상 화면에서는 4MB 초과 파일을 고르는 순간 거부되므로 생기지 않아야 한다.
  - 상한을 올리면 안 된다. 올리려면 Blob 클라이언트 직접 업로드 방식으로 바꿔야 한다(현재 범위 밖).
- [ ] **Blob 파일 삭제**
  - 글을 삭제하거나 스크린샷을 교체·삭제한 뒤, Vercel Storage → Blob 목록에서 예전 파일이 지워졌는지 본다.
  - 삭제가 실패하면 서버 로그에 `[storage] 첨부 파일 삭제 실패`가 남는다.
- [ ] **`STORAGE_PROVIDER=blob` 누락**
  - 빠지면 운영에서 첨부 업로드가 "운영 환경에서는 STORAGE_PROVIDER=blob" 오류로 거부된다(의도된 동작).
- [ ] **Cron 등록**
  - Vercel → Settings → Cron Jobs에 `/api/cron/cleanup`(매일 18:00 UTC = 03:00 KST)이 보이는지 확인한다.
  - [Run]을 눌러 200과 `removed` 건수를 확인한다.
  - Cron은 Production 배포에서만 돈다. Hobby 플랜은 하루 1번까지 가능하고, 실행 시각이 그 시간대 안에서 조금 밀릴 수 있다.
  - `CRON_SECRET`이 없으면 500, 토큰이 틀리면 401이다.
- [ ] **쿠키**
  - 운영 주소(HTTPS)에서 관리자 로그인 후 `jarvis_admin_session` 쿠키에 Secure가 붙는지 개발자 도구로 확인한다.
- [ ] **seed**
  - 배포 DB에서 `admin`/`admin` 같은 약한 비밀번호가 거부되는지 확인한다. 12자 이상이어야 계정이 만들어진다.
- [ ] **공용 계정 동시 로그인**
  - 팀원 3명이 각자 기기에서 로그인해도 서로 로그아웃되지 않는지 운영 주소에서 한 번 확인한다.
- [ ] **Preview DB 분리**
  - Preview 배포의 환경변수가 Neon dev 브랜치를 가리키는지 확인한다. 운영 DB를 가리키면 안 된다.
