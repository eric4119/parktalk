const $ = (s) => document.querySelector(s);
const categories = [
  "전체",
  "자유게시판",
  "중고거래",
  "부서별 게시판",
  "신규 캐스트",
];
const navGroups = [
  [
    "커뮤니티",
    "home|커뮤니티 홈|home",
    "board|캐스트 게시판|board",
    "tag|중고거래|trade",
    "grid|부서별 게시판|department",
    "personAdd|신규 캐스트|new",
  ],
  [
    "소통",
    "messages|채팅·쪽지|messages",
    "people|랜덤매칭|matching",
  ],
  ["생활", "food|식당 메뉴|menu", "calendar|가게 예약|booking"],
  ["아바타", "map|아바타 맵|map", "bag|꾸미기 상점|shop"],
  ["도움", "sparkles|AI 생활 도우미|ai", "search|습득물 등록|found"],
];
function iosIcon(name) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
    board: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    tag: '<path d="M20.5 12.5 12 21l-9-9V4a1 1 0 0 1 1-1h8l8.5 8.5a1 1 0 0 1 0 1Z"/><circle cx="8" cy="8" r="1.4"/>',
    grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    personAdd: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2M18 8v8M14 12h8"/>',
    messages: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8.4 8.4 0 0 1-3.4-.7L4 20l1.7-4.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8.5 11.5h7"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20"/><path d="M17 5.5a3 3 0 0 1 0 5.8M18 14.3a5 5 0 0 1 3.5 4.7V20"/>',
    food: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M15 3c-2 2-3 5-3 9h5V3M17 3v18"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
    bag: '<rect x="4" y="7" width="16" height="14" rx="2"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
    sparkles: '<path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9zM20 17l.6 1.4L22 19l-1.4.6L20 21l-.6-1.4L18 19l1.4-.6z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.86 1.86-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 1.56V21h-2v-1.04a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.86-1.86.06-.06A1.7 1.7 0 0 0 8.6 15a1.7 1.7 0 0 0-1.56-1H6v-2h1.04a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.88L8.2 9.06 10.06 7.2l.06.06A1.7 1.7 0 0 0 12 7.6a1.7 1.7 0 0 0 1-1.56V5h2v1.04a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.86 1.86-.06.06A1.7 1.7 0 0 0 19.4 11a1.7 1.7 0 0 0 1.56 1H22v2h-1.04A1.7 1.7 0 0 0 19.4 15Z"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.home}</svg>`;
}
const seeds = [
  {
    category: "신규 캐스트",
    title: "첫 출근 전에 준비하면 좋은 것들",
    body: "첫 출근을 앞둔 캐스트를 위한 준비물과 팁을 함께 나눠요.",
    author: "신입 캐스트",
    likes: 24,
    comments: 8,
  },
  {
    category: "자유게시판",
    title: "오늘 하루도 모두 수고했어요!",
    body: "바쁜 하루였지만 함께해서 즐거웠어요. 다들 푹 쉬세요!",
    author: "스마일 캐스트",
    likes: 18,
    comments: 5,
  },
  {
    category: "중고거래",
    title: "기숙사에서 쓰던 책상 판매해요",
    body: "상태 좋은 책상입니다. 관심 있으면 쪽지 주세요.",
    author: "푸른별",
    likes: 7,
    comments: 3,
  },
  {
    category: "Q&A",
    title: "기숙사 생활 팁이 궁금해요",
    body: "처음 들어가는데 알아두면 좋은 팁이 있을까요?",
    author: "새로운 시작",
    likes: 12,
    comments: 6,
  },
  {
    category: "카풀",
    title: "주말 저녁 같이 이동하실 분?",
    body: "시간 맞는 분과 함께 이동하고 싶어요.",
    author: "오늘도 안전",
    likes: 4,
    comments: 2,
  },
];
let posts =
  JSON.parse(localStorage.getItem("parktalk-posts") || "null") || seeds;
let points = Number(localStorage.getItem("parktalk-points") || "120");
let state = { page: "home", filter: "전체", search: "", mapX: 48 };
let demoChat = JSON.parse(localStorage.getItem("parktalk-demo-chat") || "[]");
let assistantTurns = [];
const save = () => localStorage.setItem("parktalk-posts", JSON.stringify(posts));
const attendanceKey = () => `parktalk-attendance:${window.ParkAuth?.id?.() || "demo"}`;
const attendanceHistoryKey = () => `parktalk-attendance-history:${window.ParkAuth?.id?.() || "demo"}`;
const todayKst = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const boardPages = { board: null, trade: "중고거래", department: "부서별 게시판", new: "신규 캐스트" };
const boardRoute = { 자유게시판: "free", 중고거래: "trade", "부서별 게시판": "department", "신규 캐스트": "new" };
const esc = (x) =>
  String(x).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const tagClass = (c) =>
  ({
    "신규 캐스트": "new",
    자유게시판: "free",
    중고거래: "trade",
    "Q&A": "question",
    카풀: "carpool",
  })[c] || "free";
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2600);
}
function modal(html) {
  $("#modalBody").innerHTML = html;
  if (!$("#modal").open) $("#modal").showModal();
}
function nav() {
  const n = $("#nav");
  n.innerHTML = navGroups
    .map(
      (g) =>
        `<div class="nav-group">${g[0]}</div>${g
          .slice(1)
          .map((i) => {
            let [icon, label, id] = i.split("|");
            return `<button class="nav-item ${state.page === id ? "active" : ""}" data-nav="${id}">
<span class="nav-icon">${iosIcon(icon)}</span>${label}</button>`;
          })
          .join("")}`,
    )
    .join("");
}
function bottomNav() {
  const boardPages = ["board", "free", "trade", "department", "carpool", "new", "qa", "praise"];
  const selected = boardPages.includes(state.page) ? "board" : state.page;
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
function filtered() {
  return posts.filter(
    (p) =>
      (state.filter === "전체" || p.category === state.filter) &&
      (!state.search ||
        [p.title, p.body, p.category]
          .join(" ")
          .toLowerCase()
          .includes(state.search.toLowerCase())),
  );
}
function postRow(p, i) {
  return `<div class="post" data-post="${posts.indexOf(p)}">
<span class="tag ${tagClass(p.category)}">${esc(p.category)}</span>
<div class="post-main">
<h3>${esc(p.title)}</h3>
<small>${esc(p.author)} · 방금 전</small>
</div>
<span class="stats">♡ ${p.likes}　▢ ${p.comments}</span>
</div>`;
}
function sideCards() {
  return `<div class="stack right-col">
<section class="card padded menu-card">
<span class="eyebrow">오늘의 식당 메뉴</span>
<div class="menu-food">🍽️</div>
<strong>관리자 등록 메뉴</strong>
<p>메뉴 정보는 관리자가 등록하면 이곳에 표시됩니다.</p>
<button class="outline" style="margin-top:12px" data-nav="menu">자세히 보기</button>
</section>
<section class="card padded">
<h2 class="section-title">랜덤매칭 대기방</h2>
<div class="match-row">
<span class="match-emoji">🎲</span>
<div>
<strong>퇴근 후 보드게임</strong>
<small>20:30 · 2 / 4명</small>
</div>
<button class="outline" data-join="보드게임">참여</button>
</div>
<div class="match-row">
<span class="match-emoji">🍜</span>
<div>
<strong>같이 저녁 먹어요</strong>
<small>21:00 · 3 / 4명</small>
</div>
<button class="outline" data-join="저녁 모임">참여</button>
</div>
</section>
<section class="card avatar-card">
<span class="eyebrow">나만의 캐릭터로 함께</span>
<div class="avatar-scene">👩🏻‍🦰</div>
<p>오늘도 맵에서 동료를 만나요</p>
<button class="primary" data-nav="map">아바타 맵 입장하기</button>
</section>
</div>`;
}
function home() {
  return (
    head(
      "오늘도 함께, 파크톡",
      "캐스트의 하루를 더 즐겁게 이어가요.",
      `<button class="primary" id="writeBtn">＋ 글쓰기</button>`,
    ) +
    `<div class="grid">
<div class="stack">
<div class="quick">
<button data-nav="new">
<span>◫</span>신규 캐스트 가이드</button>
<button data-nav="matching">
<span>♧</span>랜덤매칭 참여</button>
<button data-nav="messages">
<span>▤</span>채팅·쪽지</button>
</div>
<section class="card list-card">
<h2 class="section-title">캐스트들의 이야기</h2>
<div class="tabs">${["전체", "인기", "우리 부서", "질문"].map((t, i) => `<button class="tab ${i === 0 ? "active" : ""}" data-home-tab="${t}">${t}</button>`).join("")}</div>
<div id="homePosts">${posts.filter((post) => categories.includes(post.category)).slice(0, 4).map(postRow).join("")}</div>
<div class="promo">
<span style="font-size:24px">🏪</span>
<div>
<strong>근처 가게 단체 혜택</strong>
<small>캐스트와 함께하는 가게를 둘러보세요.</small>
</div>
<button data-nav="booking">예약 문의 ›</button>
</div>
</section>
</div>${sideCards()}</div>`
  );
}
function board() {
  const category = state.page === "free" ? "자유게시판" : (boardPages[state.page] || null);
  const visible = posts.filter((post) => categories.includes(post.category));
  const list = visible.filter((post) =>
    (!category || post.category === category) &&
    (!state.search || [post.title, post.body, post.category, post.author]
      .join(" ").toLowerCase().includes(state.search.toLowerCase()))
  );
  const chips = [["board", "전체"], ...categories.slice(1).map((name) => [boardRoute[name], name])];
  return head("캐스트 게시판", "동료와 정보와 일상을 나눠요.", `<button class="primary" id="writeBtn">＋ 글쓰기</button>`) +
    `<section class="cast-board-hero">
      <div><span class="cast-feature-kicker">CAST COMMUNITY</span><h2>오늘의 이야기를<br>함께 나눠요</h2><p>자유 · 중고 · 부서별 · 신규 캐스트</p></div>
      <span class="cast-board-hero-art" aria-hidden="true">💬</span>
    </section>
    <nav class="cast-board-chips" aria-label="게시판 종류">${chips.map(([route, label]) =>
      `<button type="button" data-board-route="${route}" class="${(state.page === route || (state.page === "board" && route === "board")) ? "active" : ""}">${label}</button>`
    ).join("")}</nav>
    <section class="cast-board-list"><div class="cast-board-list-head"><strong>${category || "전체 글"}</strong><span>${list.length}개의 글</span></div>
    ${list.length ? list.map((post) => `<button type="button" class="cast-post-card" data-post="${posts.indexOf(post)}">
      <span class="tag ${tagClass(post.category)}">${esc(post.category)}</span>
      <strong>${esc(post.title)}</strong><span class="cast-post-summary">${esc(post.body)}</span>
      <span class="cast-post-meta">${esc(post.author)} <span>♡ ${Number(post.likes) || 0} · 댓글 ${Number(post.comments) || 0}</span></span>
    </button>`).join("") : '<div class="cast-empty">아직 등록된 글이 없어요. 첫 이야기를 남겨보세요.</div>'}</section>`;
}
function matching() {
  return (
    head("랜덤매칭", "시간과 관심사가 맞는 동료를 만나보세요.") +
    `<div class="two-cards">${[
      ["🎲", "퇴근 후 보드게임", "20:30", "2 / 4명"],
      ["🍜", "같이 저녁 먹어요", "21:00", "3 / 4명"],
      ["☕", "쉬는 날 카페 투어", "토요일 14:00", "1 / 4명"],
      ["🚗", "주말 카풀", "일요일 18:00", "2 / 3명"],
    ]
      .map(
        (x) =>
          `<section class="card padded info-card">
<div style="font-size:37px">${x[0]}</div>
<h3>${x[1]}</h3>
<p>${x[2]} · ${x[3]} 참여 중</p>
<button class="outline" data-join="${x[1]}">대기방 참여</button>
</section>`,
      )
      .join("")}</div>
<p class="note" style="margin-top:14px">시연용 대기방입니다. 실제 무작위 연결과 채팅은 서버 기능을 연결한 뒤 제공됩니다.</p>`
  );
}
function map() {
  const today = todayKst();
  const attended = localStorage.getItem(attendanceKey()) === today;
  return (
    head(
      "아바타 맵",
      "픽셀 세상에서 걷고 점프하며 동료를 만나보세요.",
    ) +
    `<section class="cast-map-intro"><div><span class="cast-feature-kicker">AVATAR WORLD</span><strong>나만의 캐릭터로 파크를 걸어봐요</strong><p>걷기와 점프를 체험하고, 이곳에서 오늘의 출석을 남겨요.</p></div><span aria-hidden="true">🎡</span></section>
    <div class="cast-map-shortcuts"><button type="button" data-nav="shop">🧢 <strong>아바타 꾸미기</strong><small>옷과 소품 착용</small></button><button type="button" data-nav="room">🛋️ <strong>내 방 꾸미기</strong><small>벽지와 가구 선택</small></button></div>
    <section class="card pixel-map-card">
      <div class="pixel-map-topline"><span>✦ 파크톡 플레이그라운드</span><span class="pixel-live">1명 접속 중 · 시연 맵</span></div>
      <div class="pixel-map-frame"><canvas id="pixelMap" width="960" height="420" aria-label="파크톡 픽셀 아바타 맵"></canvas></div>
      <div class="pixel-map-controls">
        <span>← → 또는 A D 이동 · 스페이스 / ↑ 점프 · E 대화</span>
        <button class="pixel-control" data-map-control="left" aria-label="왼쪽 이동">←</button>
        <button class="pixel-control" data-map-control="right" aria-label="오른쪽 이동">→</button>
        <button class="pixel-control" data-map-control="jump" aria-label="점프">↑</button>
        <button class="pixel-talk" id="talkNpc">대화 요청</button>
      </div>
    </section>
    <div class="card padded map-attendance"><div><span class="cast-feature-kicker">TODAY'S CHECK-IN</span><strong>아바타 맵 출석</strong><p>매일 이곳에서 출석하면 10P를 받아요.</p></div>${attended ? `<span class="cast-attended">✓ 오늘 출석 완료</span>` : `<button class="primary" id="attendanceBtn">오늘 출석하기</button>`}</div>
    <p class="note pixel-map-note">움직임과 의상은 이 브라우저에서 체험할 수 있습니다. 다른 캐스트와의 동시 접속 및 대화 수락은 서버 연동 후 제공됩니다.</p>`
  );
}
function room() {
  const rooms = JSON.parse(localStorage.getItem("parktalk-demo-rooms") || "{}");
  const me = window.ParkAuth?.name() || "신입 캐스트";
  const own = rooms[me] || { theme: "햇살", item: "소파" };
  const looking = state.roomLookup?.trim();
  const found = looking ? rooms[looking] : null;
  const preview = (owner, room) => `<div class="room-preview room-${room.theme === "민트" ? "mint" : room.theme === "노을" ? "sunset" : room.theme === "라벤더" ? "lavender" : "sunny"}">
    <div class="room-preview-label">${esc(owner)}의 방</div><div class="room-window">☀️</div><div class="room-plant">🪴</div>
    <div class="room-furniture">${room.item === "책상" ? "🪑" : room.item === "침대" ? "🛏️" : "🛋️"}</div><div class="room-floor"></div>
  </div>`;
  return head("방 꾸미기", "벽지와 가구를 고르고 나만의 공간을 만들어요.", `<button class="outline" data-nav="map">아바타 맵으로</button>`) +
    `<section class="card padded room-card"><span class="cast-feature-kicker">MY ROOM</span>${preview(me, own)}
      <form id="roomForm" class="room-form"><label>벽지<select name="theme"><option ${own.theme === "햇살" ? "selected" : ""}>햇살</option><option ${own.theme === "라벤더" ? "selected" : ""}>라벤더</option><option ${own.theme === "민트" ? "selected" : ""}>민트</option><option ${own.theme === "노을" ? "selected" : ""}>노을</option></select></label><label>가구<select name="item"><option ${own.item === "소파" ? "selected" : ""}>소파</option><option ${own.item === "책상" ? "selected" : ""}>책상</option><option ${own.item === "침대" ? "selected" : ""}>침대</option></select></label><button class="primary" type="submit">내 방 저장</button></form>
      <div class="room-share"><strong>친구 방 둘러보기</strong><p>닉네임으로 같은 브라우저에 저장된 방을 찾아볼 수 있어요.</p><form id="roomLookupForm" class="room-form"><label>캐스트 닉네임<input name="nickname" placeholder="닉네임 입력" value="${esc(looking || "")}"></label><button class="outline" type="submit">방 찾기</button></form></div>
      ${looking ? found ? `<div class="room-found"><strong>${esc(looking)}님의 방</strong>${preview(looking, found)}</div>` : '<p class="note">이 브라우저에 저장된 방이 없어요.</p>' : ""}
      <p class="muted">다른 기기의 방을 검색하려면 서버 연결이 필요합니다.</p>
    </section>`;
}
function foundItems() {
  const items = JSON.parse(localStorage.getItem("parktalk-found-items") || "[]");
  return head("습득물 등록", "캐스트가 발견한 물건의 사진을 등록해요.") + `<section class="card padded room-card">
    <p class="note">현재는 이 브라우저의 방문객 분실물 게시판에만 표시됩니다. 실제 접수와 다른 기기 공유는 서버 연동 후 가능합니다.</p>
    <form id="foundItemForm" class="pv-board-form"><label>물건 이름<input name="title" maxlength="60" required></label><label>발견 장소<input name="place" maxlength="80" required></label><label>설명<textarea name="body" maxlength="300" required></textarea></label><label>사진 (1MB 이하)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required></label><button class="primary" type="submit">시연 습득물 등록</button></form>
    <div class="pv-place-list">${items.map((item) => `<article class="pv-board-post"><img src="${/^data:image\/(png|jpeg|webp);base64,/.test(item.photoUrl) ? item.photoUrl : ""}" alt="습득물 사진"><strong>${esc(item.title)}</strong><small>${esc(item.place)}</small><p>${esc(item.body)}</p></article>`).join("")}</div>
  </section>`;
}
function menu() {
  return (
    head("오늘의 식당 메뉴", "관리자가 제공하는 날짜별 메뉴를 확인해요.") +
    `<section class="card padded">
<span class="pill">운영 자료 준비 중</span>
<h2 style="font-size:17px">아직 등록된 메뉴가 없습니다</h2>
<p class="muted">관리자가 식단표를 등록하면 날짜와 식당별로 표시됩니다. 현재 화면에는 임의의 실제 메뉴를 게시하지 않았습니다.</p>
</section>`
  );
}
function booking() {
  return (
    head("가게 예약", "캐스트를 위한 단체 혜택과 예약 문의") +
    `<section class="card padded">
<span class="pill">시연 화면</span>
<h2 style="font-size:17px">제휴 가게를 준비하고 있어요</h2>
<p class="muted">가게 정보와 할인 내용은 관리자가 확인해 등록합니다.</p>
<button class="outline" id="bookingBtn">예약 흐름 체험</button>
</section>`
  );
}
function shop() {
  const wardrobe = ParkWardrobe.get();
  const goods = [
    ["🎩", "보라 모자", 50],
    ["👕", "캐스트 티셔츠", 80],
    ["🎀", "리본 장식", 40],
    ["👓", "둥근 안경", 60],
    ["🧢", "파란 모자", 50],
    ["✨", "반짝 효과", 100],
  ];
  return (
    head(
      "꾸미기 상점",
      "아이템을 교환하고 아바타에게 바로 입혀보세요.",
      `<span class="pill">보유 포인트 ${points} P</span>`,
    ) +
    `<section class="cast-wardrobe-summary"><span class="cast-wardrobe-emoji">🧍</span><div><span class="cast-feature-kicker">MY AVATAR</span><strong>현재 착용한 아이템</strong><p>${Object.values(wardrobe.equipped).length ? Object.values(wardrobe.equipped).map(esc).join(" · ") : "아직 착용한 아이템이 없어요."}</p></div><button class="outline" data-nav="map">맵에서 보기</button></section>
    <div class="item-grid">${goods
      .map(([icon, name, price]) => {
        const owned = wardrobe.owned.includes(name);
        const slot = ParkWardrobe.items[name].slot;
        const equipped = wardrobe.equipped[slot] === name;
        return `<div class="card shop-item">
        <div class="item-emoji">${icon}</div>
        <strong>${name}</strong>
        <small>${owned ? (equipped ? "아바타에 적용 중" : "보유 중") : `${price} P`}</small>
        <button class="outline" data-item="${name}" data-price="${price}" ${equipped ? "disabled" : ""}>
          ${equipped ? "착용 중" : owned ? "착용하기" : "교환하고 착용"}
        </button>
      </div>`;
      })
      .join("")}</div>
    <p class="note" style="margin-top:14px">구매와 착용 상태는 이 브라우저에 저장됩니다. 아바타 맵에서 전신 캐릭터에 적용된 모습을 확인하세요.</p>`
  );
}
function ai() {
  return head("AI 생활 도우미", "캐스트 생활에 관해 질문해 보세요.") + `<section class="card padded chat-card">
    <p class="note">현재는 준비된 정보로 답하는 챗봇 시연입니다. 실제 AI 모델과 관리자 FAQ 연동은 아직 없습니다.</p>
    <div class="chat-messages" aria-label="도우미 대화"><p class="chat-bubble chat-bubble--other">안녕하세요! 식단표, 사원증 인증, 출석, 방 꾸미기에 관해 물어보세요.</p>${assistantTurns.map((turn) => `<p class="chat-bubble chat-bubble--me">${esc(turn.question)}</p><p class="chat-bubble chat-bubble--other">${esc(turn.answer)}</p>`).join("")}</div>
    <form id="assistantForm" class="chat-compose"><input name="question" maxlength="200" aria-label="도우미에게 질문" placeholder="궁금한 내용을 입력해 주세요" required><button class="primary" type="submit">질문</button></form>
  </section>`;
}
function assistantAnswer(question) {
  if (/식단|메뉴|밥/.test(question)) return "식단표는 관리자가 등록하면 메뉴 화면에 표시됩니다. 현재 등록된 메뉴는 없습니다.";
  if (/사원증|인증|로그인/.test(question)) return "캐스트 사원증 인증 방식과 에버랜드 DB 연동 여부는 아직 정해지지 않았습니다.";
  if (/출석/.test(question)) return "아바타 맵에서 오늘 출석하기를 누르세요. 기록은 앱 설정의 내 프로필에서 확인할 수 있습니다.";
  if (/방|꾸미기|아바타/.test(question)) return "아바타 맵에서 방 꾸미기를 열어 벽지와 가구를 선택할 수 있어요.";
  return "아직 준비된 답변이 없어요. 관리자 FAQ와 AI 기능을 연결하면 더 자세히 안내할 수 있습니다.";
}
function messages() {
  return head("채팅", "시연 대화로 화면을 체험해 보세요.") +
    `<section class="card padded chat-card">
      <div class="chat-heading"><span class="chat-avatar">✦</span><div><strong>파크톡 시연 대화</strong><small>이 브라우저에만 표시됩니다</small></div></div>
      <div class="chat-messages" aria-label="시연 대화 내용"><p class="chat-bubble chat-bubble--other">안녕하세요! 여기서 채팅 화면을 체험할 수 있어요.</p>${demoChat.map((message) => `<p class="chat-bubble chat-bubble--me">${esc(message)}</p>`).join("")}</div>
      <form id="demoChatForm" class="chat-compose"><input name="message" maxlength="200" aria-label="시연 메시지" placeholder="메시지를 입력해 보세요" required><button class="primary" type="submit">보내기</button></form>
      <div class="chat-footer"><p class="muted chat-note">실제 캐스트에게 메시지가 전송되지 않습니다.</p>${demoChat.length ? '<button class="chat-clear" type="button" data-chat-clear>시연 대화 지우기</button>' : ""}</div>
    </section>`;
}
function settings() {
  const attendance = localStorage.getItem(attendanceKey());
  const history = JSON.parse(localStorage.getItem(attendanceHistoryKey()) || "[]");
  return head("앱 설정", "내 이용 정보를 확인하고 모드를 변경해요.") +
    `<section class="card padded settings-card"><div class="settings-profile"><span class="mini-avatar">👩🏻‍🦰</span><div><strong>${esc(window.ParkAuth?.name() || "신입 캐스트")}</strong><small>캐스트 모드 · 시연 계정</small></div></div>
      <div class="settings-row"><span>이용 모드</span><strong>캐스트</strong></div>
      <div class="settings-row"><span>사원증 인증</span><strong>기획 중</strong></div>
      <div class="settings-row"><span>최근 출석</span><strong>${attendance ? esc(attendance) : "기록 없음"}</strong></div>
      <div class="settings-row"><span>누적 출석</span><strong>${history.length || (attendance ? 1 : 0)}일</strong></div>
      ${history.length ? `<div class="cast-attendance-history"><strong>출석 기록</strong><div>${history.slice(-5).reverse().map((day) => `<span>✓ ${esc(day)}</span>`).join("")}</div></div>` : ""}
      <p class="note">실제 계정 인증과 다른 사용자와의 채팅은 서버 연동 후 제공됩니다.</p>
      <div class="settings-actions"><button class="outline" type="button" data-auth-action="switch">일반 사용자 모드로 전환</button><button class="outline" type="button" data-auth-action="logout">로그아웃</button></div>
    </section>`;
}
function render() {
  nav();
  bottomNav();
  $("#view").innerHTML =
    state.page === "home"
      ? home()
      : [
            "board",
            "free",
            "trade",
            "department",
            "carpool",
            "new",
            "qa",
            "praise",
          ].includes(state.page)
        ? board()
        : state.page === "matching"
          ? matching()
          : state.page === "map"
            ? map()
            : state.page === "menu"
              ? menu()
              : state.page === "booking"
                ? booking()
                : state.page === "shop"
                  ? shop()
                  : state.page === "ai"
                    ? ai()
                    : state.page === "room"
                      ? room()
                    : state.page === "found"
                      ? foundItems()
                    : state.page === "settings"
                      ? settings()
                    : messages();
  document.title = `${state.page === "home" ? "오늘도 함께" : "파크톡"} | ParkTalk`;
  if (state.page === "map") ParkMap.mount();
  else ParkMap.unmount();
}
function writePost() {
  const chosen = state.page === "free" ? "자유게시판" : boardPages[state.page];
  modal(
    `<h2>새 글쓰기</h2>
<p class="muted">시연 계정의 글은 현재 브라우저에만 저장됩니다.</p>
<label class="form-field">게시판<select id="postCat">${categories
      .slice(1)
      .map((c) => `<option ${chosen === c ? "selected" : ""}>${c}</option>`)
      .join("")}</select>
</label>
<label class="form-field">제목<input id="postTitle" maxlength="80" required>
</label>
<label class="form-field">내용<textarea id="postBody" maxlength="1000" required>
</textarea>
</label>
<button class="primary" id="savePost" type="button">게시하기</button>`,
  );
}
function postDetail(i) {
  let p = posts[i];
  if (!p) return;
  const replies = Array.isArray(p.replies) ? p.replies : [];
  modal(
    `<span class="tag ${tagClass(p.category)}">${esc(p.category)}</span>
<h2 style="margin-top:13px">${esc(p.title)}</h2>
<p class="muted">${esc(p.author)} · 시연 게시글</p>
<p style="font-size:13px;line-height:1.8;margin:20px 0;white-space:pre-wrap">${esc(p.body)}</p>
<button class="outline" id="likeBtn" type="button">♡ 좋아요 ${p.likes}</button> <button class="outline" id="messagePostBtn" type="button">쪽지 보내기</button>
${p.createdAt && p.author === (window.ParkAuth?.name?.() || "신입 캐스트") ? '<button class="cast-delete-post" id="deletePostBtn" type="button">내 글 삭제</button>' : ""}
<div class="cast-comments"><strong>댓글 ${Number(p.comments) || 0}</strong>${replies.map((reply) => `<p><b>${esc(reply.author)}</b><span>${esc(reply.body)}</span></p>`).join("")}</div>
<form id="postCommentForm" data-post-index="${i}" class="cast-comment-form"><input name="comment" maxlength="300" placeholder="댓글을 입력해 주세요" aria-label="댓글 입력" required><button class="primary" type="submit">등록</button></form>`,
  );
  $("#likeBtn").onclick = () => {
    p.likes++;
    save();
    postDetail(i);
    render();
  };
  $("#messagePostBtn").onclick = () =>
    toast("쪽지는 서버 연동 후 사용할 수 있어요.");
  const deleteButton = $("#deletePostBtn");
  if (deleteButton) deleteButton.onclick = () => {
    posts.splice(i, 1);
    save();
    $("#modal").close();
    render();
    toast("내 글을 삭제했어요.");
  };
}
document.addEventListener("click", (e) => {
  let b = e.target.closest("button,[data-post],[data-nav]");
  if (!b) return;
  if (b.classList.contains("close")) $("#modal").close();
  else if (b.dataset.nav) {
    if (b.tagName === "A") e.preventDefault();
    go(b.dataset.nav);
  }
  else if (b.dataset.boardRoute) go(b.dataset.boardRoute);
  else if (b.dataset.aiPrompt) {
    assistantTurns.push({ question: b.dataset.aiPrompt, answer: assistantAnswer(b.dataset.aiPrompt) });
    render();
  }
  else if (b.dataset.chatClear !== undefined) {
    demoChat = [];
    localStorage.removeItem("parktalk-demo-chat");
    render();
  }
  else if (b.id === "writeBtn") writePost();
  else if (b.id === "savePost") {
    let title = $("#postTitle").value.trim(),
      body = $("#postBody").value.trim();
    if (!title || !body) {
      toast("제목과 내용을 입력해 주세요.");
      return;
    }
    posts.unshift({
      category: $("#postCat").value,
      title,
      body,
      author: window.ParkAuth?.name?.() || "신입 캐스트",
      likes: 0,
      comments: 0,
      replies: [],
      createdAt: Date.now(),
    });
    save();
    $("#modal").close();
    render();
    toast("글이 이 브라우저에 저장됐어요.");
  } else if (b.dataset.post !== undefined) postDetail(Number(b.dataset.post));
  else if (b.dataset.join)
    toast("시연 화면입니다. 매칭 서버 연결 후 참여할 수 있어요.");
  else if (b.dataset.item) {
    const name = b.dataset.item;
    const wardrobe = ParkWardrobe.get();
    if (wardrobe.owned.includes(name)) {
      ParkWardrobe.equip(name);
      toast(`${name}을(를) 착용했어요.`);
    } else {
      const price = Number(b.dataset.price);
      if (points < price) {
        toast("포인트가 부족해요.");
        return;
      }
      points -= price;
      localStorage.setItem("parktalk-points", points);
      ParkWardrobe.own(name);
      toast(`${name} 교환 및 착용 완료!`);
    }
    render();
  } else if (b.id === "attendanceBtn") {
    if (state.page !== "map") return;
    let day = todayKst();
    if (localStorage.getItem(attendanceKey()) === day) {
      toast("오늘은 이미 출석했어요.");
      return;
    }
    localStorage.setItem(attendanceKey(), day);
    const history = JSON.parse(localStorage.getItem(attendanceHistoryKey()) || "[]");
    if (!history.includes(day)) localStorage.setItem(attendanceHistoryKey(), JSON.stringify([...history, day]));
    points += 10;
    localStorage.setItem("parktalk-points", points);
    render();
    toast("출석했어요! 앱 설정에서 기록을 확인할 수 있습니다.");
  } else if (b.id === "bookingBtn")
    toast("예약 승인 기능은 서버 연결 후 사용할 수 있어요.");
  else if (b.id === "settingsBtn")
    modal(
      `<h2>캐스트 계정</h2>
<p class="muted">현재는 ${window.ParkAuth?.name() || "체험 계정"}으로 이용 중입니다.</p>
<p class="note">사원증 확인 방식과 에버랜드 DB 연동 가능 여부는 아직 확정되지 않았습니다. 현재 로그인은 시연용입니다.</p>
<button class="outline" type="button" data-auth-action="switch">모드 다시 선택</button>
<button class="outline" type="button" data-auth-action="logout">로그아웃</button>`,
    );
  else if (b.id === "messagesBtn") go("messages");
  else if (b.id === "noticesBtn") toast("새 알림이 없어요.");
  else if (b.id === "menuBtn") $(".sidebar").classList.toggle("open");
  else if (b.dataset.homeTab) {
    document
      .querySelectorAll("[data-home-tab]")
      .forEach((x) => x.classList.toggle("active", x === b));
    let subset =
      b.dataset.homeTab === "질문"
        ? posts.filter((p) => p.category === "Q&A")
        : b.dataset.homeTab === "인기"
          ? [...posts].sort((a, b) => b.likes - a.likes)
          : b.dataset.homeTab === "우리 부서"
            ? posts.filter((p) => p.category === "부서별 게시판")
            : posts;
    $("#homePosts").innerHTML = subset.length
      ? subset.slice(0, 4).map(postRow).join("")
      : '<p class="muted">아직 글이 없어요.</p>';
  } else if (b.dataset.filter) {
    state.filter = b.dataset.filter;
    let ids = {
      자유게시판: "board",
      중고거래: "trade",
      "부서별 게시판": "department",
      카풀: "carpool",
      "신규 캐스트": "new",
      "Q&A": "qa",
    };
    if (ids[state.filter]) go(ids[state.filter]);
    else go("home");
  }
});
document.addEventListener("submit", (event) => {
  if (event.target.id === "postCommentForm") {
    event.preventDefault();
    const index = Number(event.target.dataset.postIndex);
    const post = posts[index];
    const body = String(new FormData(event.target).get("comment") || "").trim().slice(0, 300);
    if (!post || !body) return;
    if (!Array.isArray(post.replies)) post.replies = [];
    post.replies.push({ author: window.ParkAuth?.name?.() || "신입 캐스트", body });
    post.comments = (Number(post.comments) || 0) + 1;
    save();
    postDetail(index);
    render();
    return;
  }
  if (event.target.id === "foundItemForm") {
    event.preventDefault();
    const data = new FormData(event.target);
    const file = data.get("photo");
    if (!(file instanceof File) || !file.size || file.size > 1_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast("PNG·JPG·WebP 사진 1MB 이하로 선택해 주세요.");
    const reader = new FileReader();
    reader.onload = () => {
      const items = JSON.parse(localStorage.getItem("parktalk-found-items") || "[]");
      items.unshift({ title: String(data.get("title") || "").slice(0, 60), place: String(data.get("place") || "").slice(0, 80), body: String(data.get("body") || "").slice(0, 300), photoUrl: String(reader.result) });
      localStorage.setItem("parktalk-found-items", JSON.stringify(items.slice(0, 10)));
      render();
      toast("시연 습득물을 등록했어요.");
    };
    reader.readAsDataURL(file);
    return;
  }
  if (event.target.id === "assistantForm") {
    event.preventDefault();
    const question = String(new FormData(event.target).get("question") || "").trim();
    if (!question) return;
    assistantTurns.push({ question: question.slice(0, 200), answer: assistantAnswer(question) });
    render();
    return;
  }
  if (event.target.id === "roomForm") {
    event.preventDefault();
    const data = new FormData(event.target);
    const rooms = JSON.parse(localStorage.getItem("parktalk-demo-rooms") || "{}");
    rooms[window.ParkAuth?.name() || "신입 캐스트"] = { theme: String(data.get("theme")), item: String(data.get("item")) };
    localStorage.setItem("parktalk-demo-rooms", JSON.stringify(rooms));
    render();
    toast("내 방을 이 브라우저에 저장했어요.");
    return;
  }
  if (event.target.id === "roomLookupForm") {
    event.preventDefault();
    state.roomLookup = String(new FormData(event.target).get("nickname") || "").slice(0, 20);
    render();
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
function go(page) {
  state.page = page;
  state.filter = "전체";
  $(".sidebar").classList.remove("open");
  render();
  scrollTo(0, 0);
  history.replaceState(null, "", "#" + page);
}
$("#search").addEventListener("input", (e) => {
  state.search = e.target.value;
  if (state.search && state.page === "home") go("board");
  else render();
});
window.parkToast = toast;
window.parkModal = modal;
state.page = "home";
render();
