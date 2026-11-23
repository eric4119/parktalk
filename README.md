# 파크톡 웹앱

Pronto와 같은 방식으로 브라우저에서 실행하고 휴대폰 홈 화면에 설치할 수 있는 PWA 시연판입니다. `index.html`이 실제 앱이고, `app.html`은 PC에서 휴대폰 크기를 보여 주는 미리보기입니다.

## 실행

Node.js 18 이상에서 이 폴더 안에서 다음 명령을 실행하세요.

```bash
npm start
```

`http://localhost:8788`에서 앱을, `http://localhost:8788/app.html`에서 PC용 휴대폰 크기 미리보기를 열 수 있습니다. AI 답변과 관리자 페이지를 쓰려면 아래 [AI 생활 도우미](#ai-생활-도우미)의 키 설정 후 `npm run start:env`로 실행하세요. 같은 와이파이의 휴대폰에서는 `http://컴퓨터의IP:8788`로 화면을 볼 수 있습니다. 홈 화면 설치와 오프라인 사용은 HTTPS 또는 `localhost`처럼 보안 연결에서 지원됩니다.

## AI 생활 도우미

기본 AI는 Google Gemini(무료 단계 사용 가능)입니다.

> **키가 없어도 앱은 모두 동작합니다.** 챗봇만 AI 대신 FAQ·에버랜드 공식 안내·게시판 검색 결과로 답합니다. 다른 기능을 개발하는 팀원은 키 없이 `npm start`로 실행하면 됩니다. AI 답변까지 직접 확인하고 싶을 때만 아래처럼 **각자 무료 키**를 발급받아 넣으세요.

### 1) Gemini API 키 발급 (무료, 카드 등록 없음)

1. <https://aistudio.google.com>에 구글 계정으로 로그인합니다.
2. **Get API key → Create API key**를 누르고 만들어진 키(`AIza`로 시작)를 복사합니다.
3. 키는 비밀번호처럼 다룹니다. 깃·단톡방·스크린샷에 올리지 말고, 새어 나갔다면 AI Studio에서 그 키를 삭제한 뒤 새로 만드세요.

### 2) `.env` 파일 만들기

프로젝트 폴더(`package.json`이 있는 폴더)에 `.env` 파일을 만듭니다. `.env`는 `.gitignore`에 들어 있어 깃에 올라가지 않습니다. 형식은 `.env.example`을 참고하세요.

**Windows PowerShell** (`여기에키`를 복사한 키로 바꿔서 입력)

```powershell
Set-Content -Path .env -Value "GEMINI_API_KEY=여기에키" -Encoding ascii
# 관리자 페이지도 쓸 경우, 기존 줄을 지우지 않도록 Add-Content로 추가
Add-Content -Path .env -Value "ADMIN_PASSWORD=원하는비밀번호" -Encoding ascii
Get-Content .env   # 내용 확인
```

- `-Encoding ascii`를 꼭 붙이세요. `echo ... > .env`로 만들면 UTF-16으로 저장돼 Node가 키를 읽지 못하고, 실행은 되지만 계속 FAQ 답변만 나옵니다.
- 메모장으로 만들 때는 저장 창에서 **파일 형식을 '모든 파일'**로 바꾸고 이름을 `.env`로 하세요. 그대로 저장하면 `.env.txt`가 됩니다.

**Mac/Linux**

```bash
printf 'GEMINI_API_KEY=여기에키\nADMIN_PASSWORD=원하는비밀번호\n' > .env
```

### 3) 실행과 확인

```bash
npm run start:env      # Node 20.6 이상 (node -v로 확인)
```

터미널에 다음 줄이 보이면 연결된 것입니다.

```
AI 도우미: gemini · gemini-3.1-flash-lite 사용
관리자 페이지: /admin.html
```

브라우저에서 `http://localhost:8788` → 로그인 없이 시연하기 → AI 생활 도우미에서 질문했을 때 답변 아래에 **"AI 답변"**이 보이면 성공입니다. "FAQ 답변"·"공식 안내 검색 답변"이 보이면 AI 호출이 실패해 대체 답변이 나온 것이니 서버 터미널의 오류를 확인하세요.

Node가 20.6보다 낮아 `--env-file`을 못 쓰면 키를 직접 넣고 실행합니다.

```powershell
$env:GEMINI_API_KEY="여기에키"; $env:ADMIN_PASSWORD="원하는비밀번호"; npm start
```

### 4) 문제 해결

| 증상 / 터미널 메시지 | 원인과 해결 |
|---|---|
| `node: .env: not found` | `.env` 파일이 없음. `Get-ChildItem -Force .env*`로 확인하고, `.env.txt`면 `Rename-Item .env.txt .env` |
| 실행은 되는데 `GEMINI_API_KEY가 없어` 문구가 뜸 | `.env` 인코딩 문제(UTF-16) 또는 오타. 위 `Set-Content ... -Encoding ascii`로 다시 만들기 |
| `AI 호출 실패(gemini) HTTP 400/403` | 키가 틀렸거나 삭제됨 → 새 키 발급 |
| `AI 호출 실패(gemini) HTTP 429` | 무료 한도 초과 → 잠시 후 다시 시도(한도는 키가 아니라 구글 프로젝트 단위) |
| `AI 호출 실패(gemini) HTTP 404` | 모델 이름 오류 → `.env`의 `GEMINI_MODEL` 확인 또는 삭제 |
| 연결 오류(fetch failed 등) | 학교·회사 네트워크가 `generativelanguage.googleapis.com`을 막는 경우 → 다른 네트워크에서 시도 |
| 관리자 로그인 시 "ADMIN_PASSWORD를 설정해야" | `.env`에 `ADMIN_PASSWORD` 줄 추가 후 서버 재시작 |

### 5) 팀 시연·배포

키를 팀원끼리 나눠 갖는 대신, 서버를 한 번 배포하고 키는 **호스팅 서비스의 환경 변수(Environment Variables)**에만 넣는 방법이 가장 안전하고 편합니다. 팀원과 휴대폰은 그 주소로 접속만 하면 되고, 키는 서버에만 있어 브라우저로 전달되지 않습니다.

- 정적 호스팅(GitHub Pages, Netlify 등)은 `server.js`가 실행되지 않아 AI·관리자 기능이 동작하지 않습니다. Node 서버를 실행하는 곳(Render, Railway 등)을 쓰고 시작 명령은 `npm start`입니다.
- 환경 변수에 `GEMINI_API_KEY`, `ADMIN_PASSWORD`를 등록합니다.
- 무료 호스팅은 접속이 없으면 잠들어 첫 접속이 느릴 수 있고, 재시작 시 관리자 데이터(`data/admin.json`)가 지워질 수 있습니다.

### 환경 변수 전체

| 환경 변수 | 설명 |
|---|---|
| `GEMINI_API_KEY` | Gemini 키 |
| `GEMINI_MODEL` | 모델 변경(기본 `gemini-3.1-flash-lite`) |
| `AI_PROVIDER` | `gemini` 또는 `anthropic`. 비우면 키가 있는 쪽을 씁니다 |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Claude를 쓸 때 |

무료 단계에서 보낸 내용은 구글 제품 개선에 쓰일 수 있으니 실제 개인정보는 보내지 마세요. 배포할 때는 Node 서버를 실행하는 호스팅(Render, Railway 등)에 올리고 키는 호스팅의 환경 변수에 등록하세요. API 키는 브라우저 코드에 넣지 마세요.

질문과 관련된 게시글(제목·본문·댓글)을 현재 모드에서 볼 수 있는 범위 안에서 최대 3개 찾아 함께 보내고, 답변에 참고한 글은 '출처: OO 게시판 · 제목'으로 표시합니다. 출처를 누르면 원래 글이 열립니다.

FAQ, 주변 가게, 식단 연동 상태는 `park-data.js` 한 곳에서 관리하고 브라우저와 서버가 함께 읽습니다. 서버 엔드포인트는 `POST /api/assistant`입니다.

## 팀원 기능 연결 방법 (캐스트 모드 페이지 추가)

`script.js`를 직접 고치지 않고, 자기 파일에서 페이지를 등록하면 됩니다.

```js
window.ParkCast.registerPage("avatar", {
  render: () => `<section class="card padded">...</section>`, // 화면 HTML
  title: "아바타 꾸미기",                                       // 브라우저 탭 제목
  nav: { group: "동물 친구", icon: "paw", label: "아바타 꾸미기" }, // 왼쪽 메뉴(선택)
  mount: () => window.ParkMap?.mount(),     // 화면을 그린 직후(캔버스·타이머 시작, 선택)
  unmount: () => window.ParkMap?.unmount(), // 다른 화면으로 나갈 때(정리, 선택)
});
```

1. 파일을 `index.html`의 `script.js` 다음, `auth.js` 앞에 넣습니다.
2. `sw.js`의 `APP_FILES`에 파일을 추가하고 `CACHE` 이름의 버전을 올립니다.
3. 화면 이동은 `data-nav="avatar"` 버튼이나 `window.ParkCast.go("avatar")`로 합니다.

주소의 `#페이지id`(캐스트), `#visitor/화면`(방문객)으로 현재 화면이 기록되어 새로고침해도 같은 화면이 열립니다. '로그인 없이 시연하기'는 캐스트 모드로 들어가며 화면과 게시글에는 '게스트'로 표시됩니다.

## 에버랜드 공식 안내

AI 도우미는 에버랜드 공식 홈페이지의 자주하는 질문(약 440개)과 이용 안내 사항·교통정보 페이지를 근거로 답하고, 답변에 "출처: 에버랜드 공식 ○○ · 질문 (기준일)" 링크를 붙입니다. 질문과 관련된 항목만 최대 5개 골라 AI에 보냅니다.

- `official/everland-faq.raw.json`: 공식 FAQ 원본(브라우저로 받은 파일)
- `official/guide-pages.json`: 이용 안내 사항·교통·주차 페이지를 질문/답변으로 옮긴 정리본(직접 수정)
- `official-faq.json`: 위 두 파일을 정리한 결과물(앱과 서버가 읽음). `npm run build:official [새 원본 경로]`로 다시 만듭니다.
- 관리자 페이지의 '공식 안내' 탭에서 카테고리를 끄거나 검색 결과를 미리 볼 수 있습니다.
- 요금·운영시간처럼 바뀌는 정보는 기준일과 함께 안내하므로, 주기적으로 원본을 새로 받아 다시 만들어 주세요.

## 관리자 페이지

`/admin.html`(예: `http://localhost:8788/admin.html`)에서 식단, 주변 가게(캐스트 제휴 여부·혜택), FAQ를 관리합니다. PC 화면 기준입니다.

1. `.env`에 `ADMIN_PASSWORD=비밀번호`를 추가하고 서버를 다시 실행합니다.
2. 관리자 페이지에서 비밀번호로 로그인합니다(로그인은 8시간 유지, 1분에 5회 이상 틀리면 잠시 막힘).
3. 저장한 내용은 서버의 `data/admin.json`에 기록되고, 앱 화면과 AI 도우미에 바로 반영됩니다. 저장 전 값이 없으면 `park-data.js`의 기본값을 씁니다.

- 공개 API: `GET /api/park-data`(앱이 읽는 식단·가게·FAQ)
- 관리자 API: `POST /api/admin/login`, `GET·PUT /api/admin/data`(토큰 필요), `POST /api/admin/logout`
- 두 사람이 동시에 수정하면 늦게 저장한 쪽은 덮어쓰지 않고 새로고침하라는 안내가 나옵니다.
- `data/`는 `.gitignore`에 들어 있어 깃에 올라가지 않습니다. 무료 호스팅은 재시작하면 파일이 지워질 수 있으니 실제 운영에는 DB가 필요합니다.
- `.env`, `data/`, 서버 코드처럼 점(.)으로 시작하거나 비공개인 파일은 정적 서버가 내보내지 않습니다.

## 설치

- 안드로이드 Chrome: 웹주소 접속 → 브라우저 메뉴 → **앱 설치** 또는 **홈 화면에 추가**
- iPhone Safari: 웹주소 접속 → 공유 → **홈 화면에 추가**

설치형 설정은 `manifest.webmanifest`, `sw.js`, `pwa.js`, `icons/icon.svg`에 있습니다. 앱 기능별 코드는 `script.js`(캐스트), `visitor.js`(방문객), `auth.js`(로그인)에 있습니다.

## 현재 시연 범위

캐스트 게시판의 글·댓글·좋아요는 이 브라우저의 저장 공간에 보관됩니다. 동물 키우기는 화면만 준비된 기획 단계입니다. 다른 기기의 캐스트와 함께 쓰려면 계정 인증과 데이터 서버를 연결해야 합니다. 사원증 인증 방식은 아직 확정되지 않았습니다.
