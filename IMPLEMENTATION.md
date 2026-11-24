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
| 파일 | 설치 파일(.exe): **GitHub Releases에만** 둔다 (SFR-005 ①, SER-002 ⑤)<br>스크린샷: Netlify Blobs(배포) 또는 서버 업로드 폴더 `UPLOAD_DIR`(로컬)에 두고 DB에는 주소만 저장 |
| 배포 | **Netlify** + 외부 PostgreSQL(Neon 권장) + Netlify Blobs(스크린샷). 절차는 12-6 |
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
  - 정리 시점: 글 등록·비밀번호 실패·관리자 대시보드 조회 때 응답 후 실행(after). 방문자가 없는 기간에는 정리가 미뤄진다(12-5 참고).
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
| `GET /api/uploads/bugs/[name]` | 버그 신고 스크린샷 이미지 | 없음 | 업로드 폴더의 이미지. 서버가 만든 UUID 파일명만 허용, `nosniff`·`CSP default-src 'none'` |

- 스크린샷 파일은 DB가 아니라 업로드 폴더에 있고, DB에는 `/api/uploads/bugs/{파일명}` 주소만 저장한다.

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
uploads/        스크린샷 저장 폴더 (UPLOAD_DIR 기본값, git 제외)
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
    cleanup.ts               개인정보 자동 파기 — after()로 요청 응답 후 실행 (서버 인스턴스당 10분에 1번)
    captcha.ts notify.ts unlock.ts request.ts(IP 해시) env.ts mappers.ts run.ts
  lib/
    repository/              ★ 화면은 이것만 import
    storage.ts               스크린샷 저장 · 읽기 · 삭제 (UPLOAD_DIR 폴더) — 서버 전용
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
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL. 로컬은 `localhost:54329`(db:local) 또는 `5432`(Docker). 배포 서버는 그 서버의 PostgreSQL 주소 (DIRECT_URL = 마이그레이션용 직접 연결) |
| `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD` | seed 때만 쓴다. `change-me…`는 거부하고, 배포 DB는 12자 이상만 받는다 |
| `SESSION_SECRET` | 32자 이상 무작위. 세션·열람 쿠키·캡차 서명 키 |
| `SYNC_SECRET` | `/api/releases/sync` 인증 토큰. **서버 전용** |
| `GITHUB_REPO` | **설치 파일(.exe)이 올라가는 "앱 저장소"(공개)**의 `OWNER/REPO`. 사이트 저장소가 아니다. 다운로드 URL 검증·링크에 쓴다 |
| `UPLOAD_DIR` | (선택) 스크린샷 저장 폴더. 기본값: 프로젝트 폴더의 `uploads/`. 운영에서는 재배포해도 지워지지 않는 경로로 |
| `MAIL_PROVIDER` | `console` / `gmail` / `resend` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Gmail SMTP |
| `RESEND_API_KEY`, `MAIL_FROM` | Resend |
| `SITE_URL` | 메일 속 링크 주소 |

Prisma CLI는 `.env`만 읽는다. `.env.local`은 Next.js만 읽는다.
어디에 어떤 값을 넣는지(배포 서버 / 앱 저장소 Actions / 로컬)는 **12-2**에 나눠 정리했다.

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

- 운영 서버 실행 순서는 12-3 참고: `npm ci` → `npx prisma migrate deploy` → `npm run build` → `npm start`.

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
| 배포 | Netlify로 결정 (12-6). 운영 DB 서비스(Neon/Supabase) 최종 선택은 팀 확정 필요 |
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

> **배포 방식: Netlify** (2026-11-24 결정). 구체적인 절차는 **12-6**에 있다.
> Netlify 전용으로 들어간 것은 `netlify.toml`, 스크린샷 저장소(Netlify Blobs, `@netlify/blobs`), IP 헤더(`x-nf-client-connection-ip`), Prisma `binaryTargets` 뿐이다. 나머지는 순수 Next.js 그대로라 다른 플랫폼으로 옮겨도 12-3 절차로 돌릴 수 있다.

### 12-1. Git 브랜치 전략 (PMR-001)

| 브랜치 | 용도 |
|---|---|
| `main` | 배포본. PR로만 합친다 |
| `dev` | 통합 브랜치. feature PR이 모이는 곳 |
| `feature/*` | 기능·수정 작업. 예: `feature/privacy-contact` |

- **작업 흐름**
  1. `dev`에서 `feature/*` 브랜치를 만든다.
  2. `feature/*` → `dev` PR을 열고 리뷰한 뒤 합친다.
  3. 배포할 때 `dev` → `main` PR을 연다.
- 사이트 저장소는 공개 저장소다(https://github.com/rlagmlcks213-png/jarvis-support-site). 그래서 비밀값은 절대 코드·커밋에 넣지 않는다. `.env`, `.env*.local`은 `.gitignore`로 제외돼 있다.
- 권장: GitHub → Settings → Branches에서 `main`·`dev`에 "PR 필수" 보호 규칙을 건다.

### 12-2. 환경변수 — 어디에 무엇을 넣나

**`GITHUB_REPO`는 설치 파일(.exe)이 올라가는 "앱 저장소"(공개)의 `OWNER/REPO`다.**
- 사이트 저장소 주소가 아니다.
- 다운로드 URL은 `https://github.com/{GITHUB_REPO}/releases/...`로 시작해야 등록된다.

**① 배포 서버 (사이트를 실행하는 곳)**

| 이름 | 값 | 비고 |
|---|---|---|
| `DATABASE_URL` | 운영 PostgreSQL 주소 | 커넥션 풀러가 있으면 그 주소 |
| `DIRECT_URL` | 운영 PostgreSQL 직접 연결 주소 | 마이그레이션용. 풀러가 없으면 `DATABASE_URL`과 같은 값 |
| `SESSION_SECRET` | 32자 이상 무작위 | 바꾸면 전원 로그아웃 |
| `SYNC_SECRET` | 무작위 (앱 저장소 Secret과 **같은 값**) | `change-me` 금지 |
| `GITHUB_REPO` | 앱 저장소 `OWNER/REPO` | 빌드 시 화면에도 들어가는 공개 정보 |
| `SITE_URL` | 운영 주소 (`https://…`) | 알림 메일 속 링크 |
| `UPLOAD_DIR` | **Netlify에서는 넣지 않음** | Netlify는 Blobs에 저장. 직접 운영하는 서버일 때만 재배포해도 유지되는 디스크 경로 |
| `MAIL_PROVIDER` + `GMAIL_USER`·`GMAIL_APP_PASSWORD` 또는 `RESEND_API_KEY`·`MAIL_FROM` | 실제 발송 설정 | 정하기 전에는 `console` |

- **배포 서버에 넣지 않는 값**: `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD`. seed 때 로컬 터미널에서만 쓴다(12-3).
- 테스트용 서버를 따로 둔다면 DB와 `SESSION_SECRET`은 운영과 다른 값을 쓴다.

**② 앱 저장소 GitHub Actions Secrets** (설치 파일 빌드·릴리스 워크플로가 쓰는 값)

| 이름(예시) | 값 | 용도 |
|---|---|---|
| `SYNC_SECRET` | 배포 서버의 `SYNC_SECRET`과 **같은 값** | `Authorization: Bearer` 헤더 |
| `SITE_URL` | 사이트 운영 주소 (`https://…`, 끝에 `/` 없이) | `POST {SITE_URL}/api/releases/sync` 호출 대상 |

- GitHub Release 생성에는 Actions 기본 제공 `GITHUB_TOKEN`을 쓴다(별도 등록 불필요).

**③ 로컬에서만 쓰는 값** (`.env`, 커밋 금지)

| 이름 | 값 |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `localhost:54329`(db:local) 또는 `5432`(Docker) |
| `ADMIN_INITIAL_LOGIN_ID`, `ADMIN_INITIAL_PASSWORD` | 로컬 테스트용(`admin`/`admin`). 배포 seed 때는 터미널에서 임시로 지정 |
| `SESSION_SECRET` | 로컬용 무작위 (운영 값과 다르게) |
| `MAIL_PROVIDER` | `console` |
| `SYNC_SECRET`, `GITHUB_REPO` | 로컬 테스트용. `.env.local`에 둬도 됨 |

### 12-3. 운영 서버 실행 순서 (플랫폼 공통)

배포 플랫폼이 무엇이든, 사이트를 운영하려면 아래가 필요하다.

**필요한 것**
- Node.js 20 이상이 도는 서버(또는 Next.js를 지원하는 호스팅)
- PostgreSQL
- 스크린샷 저장소. Netlify는 Blobs를 자동으로 쓴다(12-6). 직접 운영하는 서버라면 **지워지지 않는 디스크**(`UPLOAD_DIR`)를 쓰고 `UPLOAD_STORAGE=fs`로 빌드한다.
- HTTPS. 운영 환경에서는 쿠키에 `Secure`를 붙이므로 http에서는 관리자 로그인이 유지되지 않는다.

**실행**

```bash
npm ci
npx prisma migrate deploy      # DB 테이블 만들기·갱신 (DIRECT_URL 사용)
npm run build
npm start                      # 기본 포트 3000 (PORT 환경변수로 변경)
```

**관리자 계정 seed (로컬에서 한 번만)**
- 운영 DB의 **직접 연결 주소**로 실행한다.
- 관리자 비밀번호(12자 이상)는 서버나 파일에 저장하지 않고, 이 터미널에서만 임시로 지정한다.
- Windows PowerShell 예시:

```powershell
$env:DATABASE_URL = "<운영 DB 직접 연결 주소>"
$env:DIRECT_URL   = "<운영 DB 직접 연결 주소>"
$env:ADMIN_INITIAL_LOGIN_ID = "<공용 로그인 아이디>"
$env:ADMIN_INITIAL_PASSWORD = "<12자 이상 비밀번호>"
npx prisma db seed
Remove-Item Env:DATABASE_URL, Env:DIRECT_URL, Env:ADMIN_INITIAL_LOGIN_ID, Env:ADMIN_INITIAL_PASSWORD
```

- 터미널에서 지정한 값이 `.env`보다 우선한다(확인 완료). 그래서 로컬 `.env` 파일은 바꾸지 않아도 된다.
- seed는 이미 같은 아이디가 있으면 아무것도 바꾸지 않는다.
- 비밀번호는 팀 내부에서만 안전하게 공유한다. 사이트에 비밀번호 변경 화면은 없다(SFR-006 ①).

### 12-4. 스크린샷 업로드 크기 — 어떻게 설정돼 있나

| 항목 | 현재 설정 |
|---|---|
| 업로드 경로 | **Server Action** (`createBugAction` / `updateBugAction`)이 **FormData**로 원본 파일을 받는다(base64 변환 없음) |
| 파일 크기 상한 (앱) | **4MB** — `ATTACHMENT_MAX_BYTES` (`src/lib/constants.ts`). 화면(`BugForm.tsx`)과 서버(`services/bugs.ts`)에서 각각 확인 |
| 요청 본문 상한 (Next.js) | **5mb** — `next.config.ts`의 `experimental.serverActions.bodySizeLimit` (기본값 1MB에서 올림) |
| 저장 위치 | Netlify: Blobs 스토어 `bug-screenshots`의 `{UUID}.{확장자}` / 로컬: `UPLOAD_DIR/bugs/{UUID}.{확장자}`. 화면에는 둘 다 `GET /api/uploads/bugs/{파일명}`으로 보여준다 |
| 플랫폼 상한 | Netlify 함수 요청 본문 6MB → 5mb 설정이 그 안에 들어온다 |

### 12-5. 배포한 뒤 확인할 것

- [ ] **요청 크기 제한**
  - 호스팅이나 리버스 프록시(nginx 등)에도 요청 크기 제한이 있으면 **5MB 이상**으로 맞춘다.
  - 3.5~3.9MB 이미지로 버그 신고를 작성·교체해 보고, 이미지가 보이는지 확인한다.
- [ ] **업로드 폴더 유지**
  - 재배포한 뒤에도 예전 스크린샷이 보이는지 확인한다.
  - 글 삭제·스크린샷 교체 뒤 예전 파일이 지워졌는지 확인한다(Netlify: 프로젝트 화면 Blobs → `bug-screenshots`).
- [ ] **IP 확인**
  - 30초 재등록 제한·비밀번호 대입 제한이 IP 기준이다. 버그 신고를 30초 안에 두 번 등록해 거부되는지 확인한다(Netlify는 `x-nf-client-connection-ip` 사용).
- [ ] **쿠키**
  - HTTPS 운영 주소에서 관리자 로그인 후 `jarvis_admin_session` 쿠키에 Secure가 붙는지 개발자 도구로 확인한다.
- [ ] **seed**
  - 운영 DB에서 `admin`/`admin` 같은 약한 비밀번호가 거부되는지 확인한다.
- [ ] **공용 계정 동시 로그인**
  - 팀원 3명이 각자 기기에서 로그인해도 서로 로그아웃되지 않는지 확인한다.
- [ ] **개인정보 정리 주기**
  - 정리는 요청이 들어올 때(글 등록·비밀번호 실패·관리자 대시보드) 응답 후 실행된다.
  - 방문자가 없는 기간에도 보관 기한을 꼭 지켜야 하면, 배포 플랫폼의 예약 작업 기능으로 정리를 하루 1번 호출하는 방법을 추가 검토한다.

### 12-6. Netlify 배포 절차

**구성**

| 역할 | 서비스 |
|---|---|
| 사이트(화면 + Server Actions + API) | Netlify (Next.js 자동 인식, OpenNext 어댑터) |
| DB | 외부 PostgreSQL — **Neon 권장** (무료 플랜). Supabase도 같은 방식 |
| 스크린샷 | Netlify Blobs (별도 가입·키 없음. Netlify 빌드에서 자동 선택) |

**① DB 만들기 (Neon 기준)**
1. https://neon.tech 에서 프로젝트를 만든다. 리전은 가까운 곳(예: AWS Asia Pacific — Singapore)으로 고른다.
2. Connection string을 두 개 복사한다.
   - **Pooled connection**(호스트에 `-pooler`가 붙은 주소) → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`
   - 두 주소 모두 끝에 `?sslmode=require`가 있어야 한다.
   - 서버리스 함수는 요청마다 연결을 새로 열 수 있어서, 앱은 반드시 풀러 주소를 쓴다.
3. 내 PC에서 테이블을 만들고 관리자 계정을 넣는다 (12-3의 PowerShell 방법 그대로, 주소만 Neon **직접 연결 주소**로).

```powershell
$env:DATABASE_URL = "<Neon Direct 주소>"
$env:DIRECT_URL   = "<Neon Direct 주소>"
npx prisma migrate deploy
$env:ADMIN_INITIAL_LOGIN_ID = "<추측하기 어려운 아이디>"
$env:ADMIN_INITIAL_PASSWORD = "<12자 이상 비밀번호>"
npx prisma db seed
Remove-Item Env:DATABASE_URL, Env:DIRECT_URL, Env:ADMIN_INITIAL_LOGIN_ID, Env:ADMIN_INITIAL_PASSWORD
```

- 나중에 스키마를 바꾸면(새 마이그레이션) 배포 전에 같은 방법으로 `npx prisma migrate deploy`만 다시 실행한다. 빌드 때 자동으로 돌리지 않는 이유: 미리보기(PR) 배포가 운영 DB를 바꾸지 않게 하기 위해서.

**② Netlify 프로젝트 만들기**
1. Netlify → **Add new project → Import an existing project → GitHub** → 사이트 저장소 선택.
2. 배포 브랜치: `main`. 빌드 설정은 `netlify.toml`에서 읽는다 (`npm run build`, Node 22). 화면에서 바꿀 것 없음.
3. 첫 배포 전에 **Site configuration → Environment variables**에 아래 값을 넣는다. (Scopes: 전체 / Deploy contexts: Production 기준)

| 이름 | 값 |
|---|---|
| `DATABASE_URL` | Neon Pooled 주소 |
| `DIRECT_URL` | Neon Direct 주소 |
| `SESSION_SECRET` | 32자 이상 무작위 (운영 전용) |
| `SYNC_SECRET` | 무작위 (앱 저장소 Actions Secret과 같은 값) |
| `GITHUB_REPO` | 앱 저장소 `OWNER/REPO` |
| `SITE_URL` | `https://<프로젝트명>.netlify.app` (끝에 `/` 없이) |
| `MAIL_PROVIDER` 등 | 메일 설정 (정하기 전에는 `console`) |

- 넣지 않는 값: `ADMIN_INITIAL_*`, `UPLOAD_DIR`, `NETLIFY`(Netlify가 자동으로 넣음).
- `GITHUB_REPO`·`UPLOAD_STORAGE`는 빌드 시점에 코드에 고정된다. 바꾸면 **Deploys → Trigger deploy → Clear cache and deploy**로 다시 배포한다.
- 무작위 값 만들기: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

4. **Deploy**. 끝나면 `https://<프로젝트명>.netlify.app`에서 확인한다. 주소를 바꾸려면 Site configuration → Change project name (바꾸면 `SITE_URL`과 앱 저장소 Secret도 같이 바꾼다).

**③ 앱 저장소 연결**
- 앱 저장소 GitHub → Settings → Secrets and variables → Actions:
  - `SITE_URL` = Netlify 주소, `SYNC_SECRET` = Netlify에 넣은 값과 동일.
- 데스크톱 앱의 새 버전 확인 주소도 `https://<프로젝트명>.netlify.app/api/releases/latest`로 맞춘다.

**④ 로컬 개발은 그대로**
- `npm run dev`는 Netlify가 아니므로 스크린샷을 예전처럼 `uploads/` 폴더에 저장한다(`UPLOAD_STORAGE=fs`).
- Netlify Blobs까지 로컬에서 시험하려면 Netlify CLI의 `netlify dev`를 쓴다(선택).

**⑤ 알아둘 점**
- PR을 열면 Netlify가 미리보기 주소(Deploy Preview)를 만든다. 환경변수를 Production에만 넣었다면 미리보기는 DB 연결 없이 뜨므로 화면 확인용으로만 본다. 미리보기에서 글쓰기까지 시험하려면 Neon 브랜치(별도 DB)를 만들어 Deploy Previews 컨텍스트에 따로 넣는다. **운영 DB를 미리보기에 연결하지 않는다.**
- 함수 실행 시간 상한이 있으므로(기본 수십 초) 메일 발송이 오래 걸리는 SMTP보다 Resend가 안정적이다.
- 배포 후 12-5 체크리스트를 확인한다.
