const $ = (s) => document.querySelector(s);
const categories = [
  "전체",
  "자유게시판",
  "중고거래",
  "부서별 게시판",
  "카풀",
  "신규 캐스트",
  "Q&A",
];
const navGroups = [
  [
    "커뮤니티",
    "⌂|커뮤니티 홈|home",
    "▤|자유게시판|board",
    "♧|중고거래|trade",
    "♧|부서별 게시판|department",
    "♧|카풀|carpool",
    "♙|신규 캐스트|new",
    "ⓘ|Q&A|qa",
  ],
  [
    "소통",
    "▢|채팅·쪽지|messages",
    "♧|랜덤매칭|matching",
    "♡|칭찬게시판|praise",
  ],
  ["생활", "♜|식당 메뉴|menu", "▣|가게 예약|booking"],
  ["아바타", "♙|아바타 맵|map", "✧|꾸미기 상점|shop"],
  ["도움", "✦|AI 생활 도우미|ai"],
];
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
const save = () => localStorage.setItem("parktalk-posts", JSON.stringify(posts));
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
  $("#modal").showModal();
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
<span class="nav-icon">${icon}</span>${label}</button>`;
          })
          .join("")}`,
    )
    .join("");
}
function bottomNav() {
  const icons = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
    board: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    messages: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5 8.4 8.4 0 0 1-3.4-.7L4 20l1.7-4.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8.5 11.5h7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.86 1.86-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 1.56V21h-2v-1.04a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.86-1.86.06-.06A1.7 1.7 0 0 0 8.6 15a1.7 1.7 0 0 0-1.56-1H6v-2h1.04a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.88L8.2 9.06 10.06 7.2l.06.06A1.7 1.7 0 0 0 12 7.6a1.7 1.7 0 0 0 1-1.56V5h2v1.04a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.86 1.86-.06.06A1.7 1.7 0 0 0 19.4 11a1.7 1.7 0 0 0 1.56 1H22v2h-1.04A1.7 1.7 0 0 0 19.4 15Z"/>',
  };
  const boardPages = ["board", "trade", "department", "carpool", "new", "qa", "praise"];
  const selected = boardPages.includes(state.page) ? "board" : state.page;
  $("#castBottomNav").innerHTML = [
    ["home", "홈"], ["board", "게시판"], ["messages", "채팅"], ["settings", "앱 설정"],
  ].map(([id, label]) => `<button type="button" data-nav="${id}" class="cast-bottom-tab ${selected === id ? "active" : ""}" ${selected === id ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[id]}</svg><span>${label}</span></button>`).join("");
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
<section class="card praise">
<span class="heart">💜</span>
<div>
<span class="eyebrow">오늘의 칭찬</span>
<h2>길 안내를 도와준 캐스트님, 감사합니다!</h2>
</div>
<span class="counter">3 / 10</span>
</section>
<div class="quick">
<button id="attendanceBtn">
<span>✦</span>오늘 출석하기</button>
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
<div id="homePosts">${posts.slice(0, 4).map(postRow).join("")}</div>
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
  let title =
    {
      board: "자유게시판",
      trade: "중고거래",
      department: "부서별 게시판",
      carpool: "카풀",
      new: "신규 캐스트",
      qa: "Q&A",
      praise: "칭찬게시판",
    }[state.page] || "게시판";
  let cat = {
    board: "자유게시판",
    trade: "중고거래",
    department: "부서별 게시판",
    carpool: "카풀",
    new: "신규 캐스트",
    qa: "Q&A",
    praise: "칭찬게시판",
  }[state.page];
  let list = posts.filter(
    (p) =>
      p.category === cat && (!state.search || p.title.includes(state.search)),
  );
  return (
    head(
      title,
      "경험과 정보를 나누는 캐스트 공간",
      `<button class="primary" id="writeBtn">＋ 글쓰기</button>`,
    ) +
    `<section class="card list-card">
<div class="filter-row">${categories.map((c) => `<button class="filter ${c === cat ? "active" : ""}" data-filter="${c}">${c}</button>`).join("")}</div>${
      list.length
        ? list
            .map(
              (p) => `<article class="big-post" data-post="${posts.indexOf(p)}">
<span class="tag ${tagClass(p.category)}">${esc(p.category)}</span>
<h3>${esc(p.title)}</h3>
<p>${esc(p.body)}</p>
<small>${esc(p.author)} · ♡ ${p.likes} · 댓글 ${p.comments}</small>
</article>`,
            )
            .join("")
        : '<p class="muted">아직 등록된 글이 없어요. 첫 이야기를 남겨보세요.</p>'
    }</section>`
  );
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
  return (
    head(
      "아바타 맵",
      "픽셀 세상에서 걷고 점프하며 동료를 만나보세요.",
      `<button class="outline" data-nav="shop">꾸미기 상점</button>`,
    ) +
    `<section class="card pixel-map-card">
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
    <p class="note pixel-map-note">움직임과 의상은 이 브라우저에서 체험할 수 있습니다. 다른 캐스트와의 동시 접속 및 대화 수락은 서버 연동 후 제공됩니다.</p>`
  );
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
    `<div class="item-grid">${goods
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
  return (
    head("AI 생활 도우미", "캐스트 생활에 관한 궁금증을 찾아보세요.") +
    `<section class="card padded">
<p class="note">FAQ 자료는 관리자가 등록할 예정입니다. 아래는 화면 흐름을 보여주는 예시 질문이며 AI 답변은 연결되지 않았습니다.</p>${[
      "사원증 인증은 어떻게 하나요?",
      "식단표는 어디서 확인하나요?",
      "동료와 대화하려면 어떻게 하나요?",
    ]
      .map(
        (q) => `<div class="faq">
<strong>${q}</strong>
<p>${q.includes("인증") ? "실제 사원증을 통한 인증을 기획 중이며, 구체적인 방식과 DB 연동 여부는 아직 정해지지 않았습니다." : q.includes("식단") ? "관리자가 등록한 메뉴가 식당 메뉴 화면에 표시됩니다." : "맵에서 상대를 선택해 요청하고, 상대가 수락한 뒤 대화를 시작합니다."}</p>
</div>`,
      )
      .join("")}</section>`
  );
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
  return head("앱 설정", "내 이용 정보를 확인하고 모드를 변경해요.") +
    `<section class="card padded settings-card"><div class="settings-profile"><span class="mini-avatar">👩🏻‍🦰</span><div><strong>${esc(window.ParkAuth?.name() || "신입 캐스트")}</strong><small>캐스트 모드 · 시연 계정</small></div></div>
      <div class="settings-row"><span>이용 모드</span><strong>캐스트</strong></div>
      <div class="settings-row"><span>사원증 인증</span><strong>기획 중</strong></div>
      <p class="note">실제 계정 인증과 다른 사용자와의 채팅은 서버 연동 후 제공됩니다.</p>
      <div class="settings-actions"><button class="outline" type="button" data-auth-action="switch">이용 모드 다시 선택</button><button class="outline" type="button" data-auth-action="logout">로그아웃</button></div>
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
                    : state.page === "settings"
                      ? settings()
                    : messages();
  document.title = `${state.page === "home" ? "오늘도 함께" : "파크톡"} | ParkTalk`;
  if (state.page === "map") ParkMap.mount();
  else ParkMap.unmount();
}
function writePost() {
  modal(
    `<h2>새 글쓰기</h2>
<p class="muted">시연 계정의 글은 현재 브라우저에만 저장됩니다.</p>
<label class="form-field">게시판<select id="postCat">${categories
      .slice(1)
      .map(
        (c) =>
          `<option ${state.page === { 자유게시판: "board", 중고거래: "trade", 카풀: "carpool", "신규 캐스트": "new", "Q&A": "qa" }[c] ? "selected" : ""}>${c}</option>`,
      )
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
  modal(
    `<span class="tag ${tagClass(p.category)}">${esc(p.category)}</span>
<h2 style="margin-top:13px">${esc(p.title)}</h2>
<p class="muted">${esc(p.author)} · 시연 게시글</p>
<p style="font-size:13px;line-height:1.8;margin:20px 0">${esc(p.body)}</p>
<button class="outline" id="likeBtn" type="button">♡ 좋아요 ${p.likes}</button> <button class="outline" id="messagePostBtn" type="button">쪽지 보내기</button>`,
  );
  $("#likeBtn").onclick = () => {
    p.likes++;
    save();
    postDetail(i);
    render();
  };
  $("#messagePostBtn").onclick = () =>
    toast("쪽지는 서버 연동 후 사용할 수 있어요.");
}
document.addEventListener("click", (e) => {
  let b = e.target.closest("button,[data-post]");
  if (!b) return;
  if (b.dataset.nav) go(b.dataset.nav);
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
      author: "신입 캐스트",
      likes: 0,
      comments: 0,
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
    let day = new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Seoul",
    });
    if (localStorage.getItem("parktalk-attendance") === day) {
      toast("오늘은 이미 출석했어요.");
      return;
    }
    localStorage.setItem("parktalk-attendance", day);
    points += 10;
    localStorage.setItem("parktalk-points", points);
    toast("출석 완료! 10P를 받았어요.");
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
