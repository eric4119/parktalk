/* 캐스트 모드 화면.
 *
 * 페이지 추가 방법(팀원용)
 *   1) 다른 파일에서 window.ParkCast.registerPage("페이지id", {
 *        render: () => "<section>...</section>",   // 필수: 화면 HTML을 돌려주는 함수
 *        title: "브라우저 탭 제목",                  // 선택
 *        nav: { group: "생활", icon: "food", label: "메뉴 이름" }, // 선택: 왼쪽 메뉴에 추가
 *        mount: () => {},                           // 선택: 화면이 그려진 직후(캔버스 시작 등)
 *        unmount: () => {},                         // 선택: 다른 화면으로 나갈 때(타이머·애니메이션 정리)
 *      });
 *   2) index.html에서 script.js 다음, auth.js 앞에 그 파일을 넣고 sw.js의 APP_FILES에도 추가한다.
 *   3) 화면 이동은 data-nav="페이지id" 버튼이나 window.ParkCast.go("페이지id")로 한다.
 */
const $ = (s) => document.querySelector(s);
const iosIcon = (name) => window.ParkIcons(name);
const esc = (x) =>
  String(x).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// 왼쪽 메뉴: [그룹 이름, "아이콘|메뉴 이름|페이지id", ...]
const navGroups = [
  [
    "커뮤니티",
    "home|커뮤니티 홈|home",
    "board|캐스트 게시판|board",
    "tag|중고거래|trade",
    "grid|부서별 게시판|department",
    "personAdd|신규 캐스트 Q&A|new",
  ],
  ["소통", "messages|채팅·쪽지|messages"],
  ["생활", "food|식당 메뉴|menu", "calendar|가게 예약|booking"],
  ["동물 친구", "sparkles|동물 키우기|map"],
  ["도움", "sparkles|AI 생활 도우미|ai", "search|분실물·습득물|lost"],
];

let state = { page: "home", search: "", menuDate: null };
let boardMenuOpen = false;
let demoChat = JSON.parse(localStorage.getItem("parktalk-demo-chat") || "[]");
let assistantTurns = [];
let joinedRooms = JSON.parse(sessionStorage.getItem("parktalk-demo-joined-rooms") || "[]");
const isJoined = (name) => joinedRooms.includes(name);

function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2600);
}
function modal(html) {
  $("#modalBody").innerHTML = html;
  if (!$("#modal").open) $("#modal").showModal();
}

// ---------- 계정 표시 ----------
// 로그인 없이 시연하기(게스트)는 캐스트 모드로 들어가되 화면에는 '게스트 시연'으로 표시한다.
function account() {
  const name = window.ParkAuth?.name() || "캐스트";
  const guest = window.ParkAuth?.id() === "guest-demo";
  return { name, guest, initial: name.slice(0, 1), type: guest ? "게스트 시연" : "캐스트 계정" };
}
function refreshProfile() {
  const me = account();
  document.querySelectorAll(".top-avatar, .side-bottom .mini-avatar").forEach((el) => { el.innerHTML = window.ParkProfiles.avatar(window.ParkAuth?.id?.(), me.name); });
  document.querySelectorAll(".top-name, .side-bottom strong").forEach((el) => { el.textContent = me.name; });
  const sideType = $(".side-bottom small");
  if (sideType) sideType.textContent = me.type;
  const chip = $(".demo-chip");
  if (chip) chip.textContent = me.guest ? "게스트 시연" : "캐스트";
}

// ---------- 공통 화면 조각 ----------
function nav() {
  const groups = navGroups.map((group) => [...group]);
  // registerPage로 추가된 메뉴를 해당 그룹(없으면 새 그룹)에 붙인다.
  for (const [id, page] of Object.entries(pages)) {
    if (!page.nav || groups.some((group) => group.slice(1).some((item) => item.split("|")[2] === id))) continue;
    const entry = `${page.nav.icon || "sparkles"}|${page.nav.label || id}|${id}`;
    const target = groups.find((group) => group[0] === page.nav.group);
    if (target) target.push(entry);
    else groups.push([page.nav.group || "기타", entry]);
  }
  $("#nav").innerHTML = groups
    .map((g) => `<div class="nav-group">${g[0]}</div>${g
      .slice(1)
      .map((i) => {
        const [icon, label, id] = i.split("|");
        if (id === "board") return `<button class="nav-item ${state.page === "board" ? "active" : ""}" type="button" data-board-toggle aria-expanded="${boardMenuOpen}" aria-controls="boardSubnav"><span class="nav-icon">${iosIcon(icon)}</span>${label}<span class="nav-chevron">${boardMenuOpen ? "⌃" : "⌄"}</span></button><div id="boardSubnav" class="board-subnav" ${boardMenuOpen ? "" : "hidden"}>${[["popular","인기 게시판"],["free","자유게시판"],["trade","중고 거래"],["department","부서별 게시판"],["question","신규 캐스트 Q&A"],["praise","칭찬 게시판"],["missing","미아 게시판"],["lost","분실물 게시판"]].map(([kind,text]) => `<button type="button" data-board-section="${kind}" class="${window.ParkBoards.currentKind() === kind && state.page === "board" ? "active" : ""}">${text}</button>`).join("")}</div>`;
        return `<button class="nav-item ${state.page === id ? "active" : ""}" data-nav="${id}">
<span class="nav-icon">${iosIcon(icon)}</span>${label}</button>`;
      })
      .join("")}`)
    .join("");
}
function bottomNav() {
  const selected = BOARD_KINDS[state.page] !== undefined ? "board" : state.page;
  $("#castBottomNav").innerHTML = [
    ["home", "홈"], ["board", "게시판"], ["messages", "채팅"], ["settings", "앱 설정"],
  ].map(([id, label]) => `<button type="button" data-nav="${id}" class="cast-bottom-tab ${selected === id ? "active" : ""}" ${selected === id ? 'aria-current="page"' : ""}>${iosIcon(id)}<span>${label}</span></button>`).join("");
}
function head(title, sub, action = "") {
  return `<div class="page-head">
<div>
<h1>${title}</h1>
<p>${sub}</p>
</div>${action}</div>`;
}

// ── 페이지별 상단 헤더 ──
let _defaultTopbarHTML = null;
function setPageTopbar(title, subtitle, rightHtml = '', leftHtml = '') {
  const t = document.querySelector('.topbar');
  if (!t) return;
  if (!_defaultTopbarHTML) _defaultTopbarHTML = t.innerHTML;
  const sub = subtitle ? `<small class="page-topbar-sub">${esc(subtitle)}</small>` : '';
  t.innerHTML = `<div class="top-actions page-topbar-left">${leftHtml}</div><span class="page-topbar-title">${esc(title)}${sub}</span><div class="top-actions page-topbar-actions">${rightHtml}</div>`;
}
function restoreTopbar() {
  const t = document.querySelector('.topbar');
  if (t && _defaultTopbarHTML) { t.innerHTML = _defaultTopbarHTML; refreshProfile(); }
}
const BOARD_LABELS = { board: "게시판", free: "자유게시판", trade: "중고 거래", department: "부서별 게시판", new: "신규 Q&A", qa: "Q&A", praise: "칭찬 게시판", missing: "미아 게시판", lost: "분실물 게시판" };
const _homeBtn = () => `<button class="icon-btn" data-nav="home" aria-label="홈으로">${iosIcon("home")}</button>`;
function boardTopbar() {
  const title = BOARD_LABELS[state.page] || "게시판";
  setPageTopbar(title, '',
    `<button class="icon-btn" id="searchToggleBtn" aria-label="검색">${iosIcon("search")}</button><button class="icon-btn" data-pb-write aria-label="글쓰기">${iosIcon("compose")}</button>`,
    _homeBtn());
}
window.ParkTopbar = { set: setPageTopbar, board: boardTopbar };

// ---------- 페이지 ----------
function sideCards() {
  return `<div class="stack right-col">
<section class="card padded menu-card">
<span class="eyebrow">오늘의 식당 메뉴</span>
<div class="menu-food">${iosIcon("meal")}</div>
${todayMenuPreview()}
<button class="outline" style="margin-top:12px" data-nav="menu">자세히 보기</button>
</section>
<section class="card avatar-card">
<span class="eyebrow">새로운 공간을 준비 중이에요</span>
<div class="avatar-scene">${iosIcon("paw")}</div>
<p>동물 친구를 고르고 함께 키우는 공간이 생길 예정이에요.</p>
<button class="primary" data-nav="map">동물 키우기 보기</button>
</section>
</div>`;
}
function home() {
  return `<div class="grid">
<div class="stack">
${window.ParkBoards.home()}
<button class="pb-benefit" data-nav="booking"><span class="promo-icon">${iosIcon("store")}</span><span><strong>근처 가게 단체 혜택</strong><small>제휴 혜택과 예약 문의</small></span><span>›</span></button>
<div class="quick">
<button data-nav="new">
<span class="quick-icon">${iosIcon("board")}</span>신규 캐스트 Q&A</button>
</div>
</div>${sideCards()}</div>`;
}

const POPULAR_SEARCHES = ["연장근무", "복지카드", "유니폼", "운동화", "식단", "교육일정", "콘서트", "당직", "파크행사", "파크패스"];
function getRecentSearches() { try { return JSON.parse(localStorage.getItem("pk_recent") || "[]"); } catch(e) { return []; } }
function saveRecentSearch(q) {
  const list = [q, ...getRecentSearches().filter(x => x !== q)].slice(0, 10);
  try { localStorage.setItem("pk_recent", JSON.stringify(list)); } catch(e) {}
}
function removeRecentSearch(q) {
  try { localStorage.setItem("pk_recent", JSON.stringify(getRecentSearches().filter(x => x !== q))); } catch(e) {}
}
function searchPage() {
  const recent = getRecentSearches();
  return `<div class="srch-wrap">
    <div class="srch-bar">
      <button class="srch-back" data-nav="home" aria-label="뒤로">${iosIcon("back")}</button>
      <div class="search-wrap srch-input-wrap">
        <span>${iosIcon("search")}</span>
        <input id="srchInput" placeholder="글 제목, 내용, 해시태그" autocomplete="off" />
      </div>
    </div>
    ${recent.length ? `<section class="srch-section">
      <div class="srch-head"><span class="eyebrow">최근 검색어</span><button class="srch-clear-all" id="srchClearAll">전체삭제</button></div>
      <div class="srch-chips">${recent.map(q => `<span class="srch-chip" data-q="${esc(q)}">${esc(q)}<button class="srch-remove" data-remove="${esc(q)}" aria-label="삭제">×</button></span>`).join("")}</div>
    </section>` : ""}
    <section class="srch-section">
      <div class="srch-head"><span class="eyebrow">인기 검색어</span></div>
      <div class="srch-chips">${POPULAR_SEARCHES.map(q => `<button class="srch-chip srch-chip--hot" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    </section>
  </div>`;
}
// 게시판 페이지id → boards.js의 게시판 종류. board는 마지막으로 보던 게시판을 그대로 연다.
const BOARD_KINDS = { board: null, free: "free", trade: "trade", department: "department", new: "question", qa: "question", praise: "praise", missing: "missing", lost: "lost" };
function board() {
  return window.ParkBoards.page("cast", BOARD_KINDS[state.page] || undefined);
}
function map() {
  return window.ParkPets.render();
}
function todayMenuPreview() {
  const D = window.ParkData;
  const today = D ? D.menusFor(D.todayKey()) : [];
  if (!today.length) return `<strong>등록된 메뉴 없음</strong><p>관리자가 오늘 식단을 등록하면 이곳에 표시됩니다.</p>`;
  const first = today.find((m) => m.meal === "중식") || today[0];
  return `<strong>${esc(first.restaurant)} · ${esc(first.meal)}</strong><p>${first.items.slice(0, 4).map(esc).join(" · ")}${first.items.length > 4 ? " 외" : ""}</p>${today.length > 1 ? `<small class="muted">오늘 식단 ${today.length}개</small>` : ""}`;
}
function menu() {
  const D = window.ParkData;
  const date = state.menuDate || D.todayKey();
  const list = D.menusFor(date);
  const restaurants = [...new Set(list.map((m) => m.restaurant))];
  const label = date === D.todayKey() ? "오늘" : date === D.shiftDate(D.todayKey(), 1) ? "내일" : date === D.shiftDate(D.todayKey(), -1) ? "어제" : "";
  const day = ["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T00:00:00Z`).getUTCDay()];
  return (
    head("식당 메뉴", "관리자가 등록한 날짜별 캐스트 식당 메뉴예요.") +
    `<div class="menu-date-nav"><button type="button" class="outline" data-menu-shift="-1" aria-label="이전 날짜">‹</button><strong>${date.slice(5).replace("-", "월 ")}일 (${day})${label ? ` · ${label}` : ""}</strong><button type="button" class="outline" data-menu-shift="1" aria-label="다음 날짜">›</button></div>
${list.length ? restaurants.map((name) => `<section class="card padded menu-day-card">
<h2 style="font-size:17px">${esc(name)}</h2>
${list.filter((m) => m.restaurant === name).map((m) => `<div class="menu-meal"><span class="pill">${esc(m.meal)}</span><p>${m.items.map(esc).join(" · ")}</p></div>`).join("")}
</section>`).join("") : `<section class="card padded">
<h2 style="font-size:17px">등록된 메뉴가 없어요</h2>
<p class="muted">관리자가 이 날짜의 식단표를 등록하면 식당별로 표시됩니다. 캐스트 식당 식단은 공개 API가 없어 관리자가 직접 입력해요.</p>
</section>`}`
  );
}
function booking() {
  const stores = window.ParkData?.stores || [];
  return (
    head("가게 예약", "에버랜드 주변 가게와 캐스트 제휴 혜택") +
    `<p class="note">공개 자료로 모은 주변 가게입니다. 캐스트 제휴 여부와 할인 내용은 관리자가 가게와 확인한 뒤 표시돼요.</p>
<div class="store-list">${stores.map((store) => `<section class="card padded store-card">
<div class="store-card__top"><span class="pill">${esc(store.category)}</span><span class="store-badge ${store.partner ? "store-badge--on" : ""}">${store.partner ? "캐스트 제휴" : "제휴 확인 전"}</span></div>
<h3>${esc(store.name)}</h3>
<p class="muted">${esc(store.address)}</p>
<p class="store-note">${esc(store.note)}</p>
${store.partner && store.benefit ? `<p class="store-benefit">${esc(store.benefit)}</p>` : ""}
<div class="store-actions">${store.phone ? `<a class="outline" href="tel:${esc(store.phone.replace(/[^0-9]/g, ""))}">전화 예약</a>` : ""}<a class="outline" href="https://map.naver.com/p/search/${encodeURIComponent(store.name)}" target="_blank" rel="noopener">지도 보기</a></div>
</section>`).join("")}</div>`
  );
}
function ai() {
  const prompts = ["오늘 식당 메뉴 알려줘", "반려동물 데려와도 돼?", "주차장 꽉 차면 어디로 가?", "근처 제휴 가게 있어?"];
  return head("AI 생활 도우미", "캐스트 생활에 관해 질문해 보세요.") + `<section class="card padded chat-card">
    <p class="note">파크톡 FAQ, 에버랜드 공식 안내(FAQ·이용 안내·교통), 주변 가게, 게시판 글을 바탕으로 AI가 답해요. 가져온 내용은 출처를 함께 보여주고, 누르면 원래 글이나 공식 페이지로 이동해요.</p>
    <div class="chat-messages" aria-label="도우미 대화" aria-live="polite"><p class="chat-bubble chat-bubble--other">안녕하세요! 식단, 캐스트 인증, 주변 가게, 앱 사용법을 물어보세요.</p>${assistantTurns.map((turn) => `<p class="chat-bubble chat-bubble--me">${esc(turn.question)}</p><p class="chat-bubble chat-bubble--other ${turn.pending ? "chat-bubble--pending" : ""}">${esc(turn.answer)}${turn.pending ? "" : sourceLine(turn)}</p>`).join("")}</div>
    <div class="chat-prompts">${prompts.map((prompt) => `<button type="button" class="outline" data-ai-prompt="${esc(prompt)}">${esc(prompt)}</button>`).join("")}</div>
    <form id="assistantForm" class="chat-compose"><input name="question" maxlength="200" aria-label="도우미에게 질문" placeholder="궁금한 내용을 입력해 주세요" required><button class="primary" type="submit">질문</button></form>
  </section>`;
}
function sourceLine(turn) {
  const label = { ai: "AI 답변", faq: "FAQ 답변", board: "게시판 검색 답변", official: "공식 안내 검색 답변" }[turn.source] || "답변";
  // 공식 안내는 에버랜드 홈페이지로 연결하고, 게시글은 앱 안의 원래 글을 연다.
  const links = (turn.sources || []).map((src) => src.type === "official"
    ? `<a class="chat-source-link" href="${esc(/^https:\/\/(www\.|reservation\.)?everland\.com\//.test(src.url) ? src.url : "https://www.everland.com/cscenter/faq-list")}" target="_blank" rel="noopener">출처: ${esc(src.board)} · ${esc(src.title)}${src.date ? ` (${esc(src.date)} 기준)` : ""}</a>`
    : `<button type="button" class="chat-source-link" data-pb-post="${esc(src.id)}">출처: ${esc(src.board)} · ${esc(src.title)}</button>`).join("");
  return `<small class="chat-source">${label}</small>${links ? `<span class="chat-source-list">${links}</span>` : ""}`;
}
// 에버랜드 공식 안내는 AI 서버를 못 쓸 때만 필요하므로 처음 필요할 때 한 번만 불러온다.
let officialCache = null;
async function loadOfficial() {
  if (officialCache) return officialCache;
  try {
    const response = await fetch("official-faq.json");
    officialCache = response.ok ? (await response.json()).items || [] : [];
  } catch { officialCache = []; }
  return officialCache;
}
async function askAssistant(question) {
  const text = String(question || "").trim().slice(0, 200);
  if (!text || assistantTurns.some((turn) => turn.pending)) return;
  const history = assistantTurns.filter((turn) => !turn.pending).slice(-6).map(({ question, answer }) => ({ question, answer }));
  const turn = { question: text, answer: "답변을 준비하고 있어요…", pending: true };
  assistantTurns.push(turn);
  if (state.page === "ai") render();
  // 현재 모드에서 볼 수 있는 게시글만 검색된다(캐스트 전용 게시판은 방문객에게 안 보임).
  const posts = window.ParkBoards?.search?.(text, 3) || [];
  let result = null;
  try {
    const response = await fetch("api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: text, history, role: window.ParkAuth?.role() || "cast", posts }),
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.answer) {
      const used = new Set(body.usedPostIds || []);
      const official = (body.usedOfficial || []).filter((src) => src && src.id).map((src) => ({ ...src, type: "official" }));
      result = { answer: body.answer, source: "ai", sources: [...official, ...posts.filter((post) => used.has(post.id)).map(({ id, board, title }) => ({ id, board, title }))] };
    }
  } catch { /* 서버가 없거나 오프라인이면 FAQ·공식 안내·게시판 검색으로 답한다. */ }
  if (!result) {
    const officialItems = await loadOfficial();
    result = window.ParkData.localAnswer(text, posts, window.ParkData.searchOfficial(text, officialItems, 3));
  }
  Object.assign(turn, result, { pending: false });
  if (state.page === "ai") {
    render();
    $(".chat-messages")?.scrollTo(0, $(".chat-messages").scrollHeight);
  }
}
function messages() {
  return `<section class="card padded chat-card">
      <div class="chat-heading"><span class="chat-avatar">${iosIcon("messages")}</span><div><strong>파크톡 시연 대화</strong><small>이 브라우저에만 표시됩니다</small></div></div>
      <div class="chat-messages" aria-label="시연 대화 내용"><p class="chat-bubble chat-bubble--other">안녕하세요! 여기서 채팅 화면을 체험할 수 있어요.</p>${demoChat.map((message) => `<p class="chat-bubble chat-bubble--me">${esc(message)}</p>`).join("")}</div>
      <form id="demoChatForm" class="chat-compose"><input name="message" maxlength="200" aria-label="시연 메시지" placeholder="메시지를 입력해 보세요" required><button class="primary" type="submit">보내기</button></form>
      <div class="chat-footer"><p class="muted chat-note">실제 캐스트에게 메시지가 전송되지 않습니다.</p>${demoChat.length ? '<button class="chat-clear" type="button" data-chat-clear>시연 대화 지우기</button>' : ""}</div>
    </section>`;
}
function settings() {
  const me = account();
  return head("앱 설정", "내 이용 정보를 확인하고 모드를 변경해요.") +
    `<section class="card padded settings-card"><button type="button" class="settings-profile profile-edit-row" data-profile-edit><span class="mini-avatar">${window.ParkProfiles.avatar(window.ParkAuth?.id?.(), me.name)}</span><div><strong>${esc(me.name)}</strong><small>캐스트 모드 · ${me.type}</small></div><span class="profile-edit-hint">수정 ›</span></button>
      <div class="settings-row"><span>이용 모드</span><strong>캐스트</strong></div>
      <div class="settings-row"><span>계정 유형</span><strong>${me.type}</strong></div>
      <div class="settings-row"><span>사원증 인증</span><strong>기획 중</strong></div>
      <p class="note">${me.guest ? "로그인 없이 체험 중이에요. 글과 댓글은 '게스트'로 표시돼요. " : ""}실제 계정 인증과 다른 사용자와의 채팅은 서버 연동 후 제공됩니다.</p>
      <div class="settings-actions"><button class="outline" type="button" data-auth-action="switch">일반 사용자 모드로 전환</button><button class="outline" type="button" data-auth-action="logout">로그아웃</button></div>
    </section>`;
}

// ---------- 화면 전환 ----------
// 페이지id → { render, title, nav?, mount?, unmount? }. 팀원 페이지는 registerPage로 추가한다.
const pages = {
  home: { render: home, title: "오늘도 함께" },
  map: { render: map, title: "동물 키우기" },
  menu: { render: menu, title: "식당 메뉴" },
  booking: { render: booking, title: "가게 예약" },
  ai: { render: ai, title: "AI 생활 도우미" },
  messages: { render: messages, title: "채팅", mount() { setPageTopbar("채팅", '', '', _homeBtn()); }, unmount: restoreTopbar },
  settings: { render: settings, title: "앱 설정" },
  search: {
    render: searchPage,
    title: "검색",
    mount() { document.body.classList.add("search-open"); $("#srchInput")?.focus(); },
    unmount() { document.body.classList.remove("search-open"); },
  },
  ...Object.fromEntries(Object.keys(BOARD_KINDS).map((id) => [id, { render: board, title: BOARD_LABELS[id] || "게시판", mount: boardTopbar, unmount: restoreTopbar }])),
};
let mountedPage = null;
function render() {
  nav();
  bottomNav();
  refreshProfile();
  const page = pages[state.page] || pages.home;
  if (mountedPage && mountedPage !== page) mountedPage.unmount?.();
  $("#view").innerHTML = page.render();
  page.mount?.();
  mountedPage = page;
  document.title = `${page.title || "파크톡"} | ParkTalk`;
}
function go(page) {
  window.ParkBoards.leaveDetail();
  if (window.ParkAuth && window.ParkAuth.role() !== "cast") return toast("캐스트 모드에서 이용해 주세요.");
  state.page = pages[page] ? page : "home";
  if (state.page === "map") window.ParkPets.enter();
  $(".sidebar").classList.remove("open");
  render();
  scrollTo(0, 0);
  history.replaceState(null, "", "#" + state.page);
}
// 캐스트 모드를 떠날 때(일반 사용자 모드 전환·로그아웃) 현재 페이지 정리
function leave() {
  mountedPage?.unmount?.();
  mountedPage = null;
}

// ---------- 이벤트 ----------
document.addEventListener("click", (e) => {
  const b = e.target.closest("button,[data-nav]");
  if (!b) return;
  if (b.hasAttribute("data-board-toggle")) { boardMenuOpen = !boardMenuOpen; nav(); return; }
  if (b.dataset.boardSection) { window.ParkBoards.selectKind(b.dataset.boardSection); go("board"); return; }
  if (b.classList.contains("close")) $("#modal").close();
  else if (b.dataset.nav) {
    if (b.tagName === "A") e.preventDefault();
    go(b.dataset.nav);
  }
  else if (b.dataset.menuShift) {
    state.menuDate = window.ParkData.shiftDate(state.menuDate || window.ParkData.todayKey(), Number(b.dataset.menuShift));
    render();
  }
  else if (b.dataset.aiPrompt) askAssistant(b.dataset.aiPrompt);
  else if (b.dataset.chatClear !== undefined) {
    demoChat = [];
    localStorage.removeItem("parktalk-demo-chat");
    render();
  }
  else if (b.id === "writeBtn") window.ParkBoards.write();
  else if (b.dataset.join) {
    const name = b.dataset.join;
    joinedRooms = isJoined(name) ? joinedRooms.filter((room) => room !== name) : [...joinedRooms, name];
    sessionStorage.setItem("parktalk-demo-joined-rooms", JSON.stringify(joinedRooms));
    render();
    toast(isJoined(name) ? "시연 대기방에 참여했어요. 실제 동료와 연결되지는 않습니다." : "시연 대기방 참여를 취소했어요.");
  }
  else if (b.id === "settingsBtn") {
    const me = account();
    modal(
      `<h2>${me.guest ? "게스트 시연" : "캐스트 계정"}</h2>
<p class="muted">현재는 ${esc(me.name)}(으)로 이용 중입니다.</p>
<p class="note">사원증 확인 방식과 에버랜드 DB 연동 가능 여부는 아직 확정되지 않았습니다. 현재 로그인은 시연용입니다.</p>
<button class="outline" type="button" data-auth-action="switch">일반 사용자 모드로 전환</button>
<button class="outline" type="button" data-auth-action="logout">로그아웃</button>`,
    );
  }
  else if (b.id === "messagesBtn") go("messages");
  else if (b.id === "noticesBtn") toast("새 알림이 없어요.");
  else if (b.id === "menuBtn") $(".sidebar").classList.toggle("open");
  else if (b.id === "searchToggleBtn") go("search");
  else if (b.id === "srchClearAll") {
    try { localStorage.removeItem("pk_recent"); } catch(err) {}
    render();
  }
  else if (b.dataset.remove) {
    removeRecentSearch(b.dataset.remove);
    render();
  }
  else if (b.dataset.q) {
    saveRecentSearch(b.dataset.q);
    toast(`"${b.dataset.q}" 검색`);
  }
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "assistantForm") {
    event.preventDefault();
    const question = String(new FormData(event.target).get("question") || "").trim();
    if (!question) return;
    askAssistant(question);
    return;
  }
  if (event.target.id !== "demoChatForm") return;
  event.preventDefault();
  const message = String(new FormData(event.target).get("message") || "").trim();
  if (!message) return;
  demoChat.push(message.slice(0, 200));
  localStorage.setItem("parktalk-demo-chat", JSON.stringify(demoChat));
  render();
  $(".chat-messages")?.scrollTo(0, $(".chat-messages").scrollHeight);
});
$("#search").addEventListener("input", (e) => {
  state.search = e.target.value;
  window.ParkBoards.setQuery(state.search);
  if (state.search && state.page === "home") go("board");
  else render();
});

// ---------- 다른 파일에서 쓰는 공개 함수 ----------
window.parkToast = toast;
window.parkModal = modal;
window.ParkCast = {
  go,
  render,
  leave,
  hasPage: (id) => Boolean(pages[id]),
  registerPage(id, page) {
    if (!/^[a-z][a-z0-9-]*$/.test(id) || typeof page?.render !== "function") throw new Error(`registerPage: 잘못된 페이지 ${id}`);
    pages[id] = page;
    if (!document.querySelector(".app")?.hidden) render();
  },
};
render();
// 관리자가 서버에 저장한 식단·가게·FAQ를 불러와 화면을 다시 그린다. 실패하면 기본값을 그대로 쓴다.
window.ParkData?.load?.().then((loaded) => { if (loaded && !document.querySelector(".app")?.hidden) render(); });
