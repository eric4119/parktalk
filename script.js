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
    "personAdd|신규 캐스트 Q&A|new",
  ],
  [
    "소통",
    "messages|채팅·쪽지|messages",
    "people|랜덤매칭|matching",
  ],
  ["생활", "food|식당 메뉴|menu", "calendar|가게 예약|booking"],
  ["동물 친구", "sparkles|동물 키우기|map"],
  ["도움", "sparkles|AI 생활 도우미|ai", "search|분실물·습득물|lost"],
];
const iosIcon = (name) => window.ParkIcons(name);
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
let state = { page: "home", filter: "전체", search: "", mapX: 48 };
let demoChat = JSON.parse(localStorage.getItem("parktalk-demo-chat") || "[]");
let assistantTurns = [];
let joinedRooms = JSON.parse(sessionStorage.getItem("parktalk-demo-joined-rooms") || "[]");
const isJoined = (name) => joinedRooms.includes(name);
const save = () => localStorage.setItem("parktalk-posts", JSON.stringify(posts));
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
  const boardPages = ["board", "free", "trade", "department", "carpool", "new", "qa", "praise", "missing", "lost"];
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
<span class="stats">${iosIcon("heart")} ${p.likes}　${iosIcon("messages")} ${p.comments}</span>
</div>`;
}
function sideCards() {
  return `<div class="stack right-col">
<section class="card padded menu-card">
<span class="eyebrow">오늘의 식당 메뉴</span>
<div class="menu-food">${iosIcon("meal")}</div>
<strong>관리자 등록 메뉴</strong>
<p>메뉴 정보는 관리자가 등록하면 이곳에 표시됩니다.</p>
<button class="outline" style="margin-top:12px" data-nav="menu">자세히 보기</button>
</section>
<section class="card padded">
<h2 class="section-title">랜덤매칭 대기방</h2>
<div class="match-row">
<span class="match-emoji">${iosIcon("dice")}</span>
<div>
<strong>퇴근 후 보드게임</strong>
<small>20:30 · ${2 + Number(isJoined("퇴근 후 보드게임"))} / 4명</small>
</div>
<button class="outline" data-join="퇴근 후 보드게임">${isJoined("퇴근 후 보드게임") ? "참여 취소" : "참여"}</button>
</div>
<div class="match-row">
<span class="match-emoji">${iosIcon("food")}</span>
<div>
<strong>같이 저녁 먹어요</strong>
<small>21:00 · ${3 + Number(isJoined("같이 저녁 먹어요"))} / 4명</small>
</div>
<button class="outline" data-join="같이 저녁 먹어요">${isJoined("같이 저녁 먹어요") ? "참여 취소" : "참여"}</button>
</div>
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
<span class="quick-icon">${iosIcon("board")}</span>신규 캐스트 Q&A</button>
<button data-nav="matching">
<span class="quick-icon">${iosIcon("people")}</span>랜덤매칭 참여</button>
<button data-nav="messages">
<span class="quick-icon">${iosIcon("messages")}</span>채팅·쪽지</button>
</div>
${window.ParkBoards.home()}
<button class="pb-benefit" data-nav="booking"><span class="promo-icon">${iosIcon("store")}</span><span><strong>근처 가게 단체 혜택</strong><small>제휴 혜택과 예약 문의</small></span><span>›</span></button>
</div>${sideCards()}</div>`
  );
}
function board() {
  const kinds = { free:'free', trade:'trade', department:'department', new:'question', qa:'question', praise:'praise', missing:'missing', lost:'lost' };
  return window.ParkBoards.page('cast', kinds[state.page]);
}
function matching() {
  return (
    head("랜덤매칭", "시간과 관심사가 맞는 동료를 만나보세요.") +
    `<div class="two-cards">${[
      ["dice", "퇴근 후 보드게임", "20:30", "2 / 4명"],
      ["food", "같이 저녁 먹어요", "21:00", "3 / 4명"],
      ["coffee", "쉬는 날 카페 투어", "토요일 14:00", "1 / 4명"],
      ["car", "주말 카풀", "일요일 18:00", "2 / 3명"],
    ]
      .map(
        (x) =>
          `<section class="card padded info-card">
<div class="match-card-icon">${iosIcon(x[0])}</div>
<h3>${x[1]}</h3>
<p>${x[2]} · ${Number(x[3].split("/")[0].trim()) + Number(isJoined(x[1]))} / ${x[3].split("/")[1].trim()} 참여 중</p>
<button class="outline" data-join="${x[1]}">${isJoined(x[1]) ? "참여 취소" : "시연 참여"}</button>
</section>`,
      )
      .join("")}</div>
<p class="note" style="margin-top:14px">시연용 대기방입니다. 실제 무작위 연결과 채팅은 서버 기능을 연결한 뒤 제공됩니다.</p>`
  );
}
function map() {
  return head("동물 키우기", "함께할 동물 친구를 만나는 공간을 준비하고 있어요.") +
    `<section class="card padded animal-coming-soon">
      <div class="animal-coming-soon__mark" aria-hidden="true">${iosIcon("paw")}</div>
      <span class="pill">기획 중</span>
      <h2>어떤 동물 친구와 함께할까요?</h2>
      <p>동물 선택과 돌보기 방식은 정해진 뒤 이 화면에 추가됩니다.</p>
    </section>`;
}
function foundItems() { return window.ParkBoards.page('cast', 'lost'); }
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
<button class="outline" type="button" disabled>예약 기능 준비 중</button>
</section>`
  );
}
function ai() {
  return head("AI 생활 도우미", "캐스트 생활에 관해 질문해 보세요.") + `<section class="card padded chat-card">
    <p class="note">현재는 준비된 정보로 답하는 챗봇 시연입니다. 실제 AI 모델과 관리자 FAQ 연동은 아직 없습니다.</p>
    <div class="chat-messages" aria-label="도우미 대화"><p class="chat-bubble chat-bubble--other">안녕하세요! 식단표와 사원증 인증에 관해 물어보세요.</p>${assistantTurns.map((turn) => `<p class="chat-bubble chat-bubble--me">${esc(turn.question)}</p><p class="chat-bubble chat-bubble--other">${esc(turn.answer)}</p>`).join("")}</div>
    <form id="assistantForm" class="chat-compose"><input name="question" maxlength="200" aria-label="도우미에게 질문" placeholder="궁금한 내용을 입력해 주세요" required><button class="primary" type="submit">질문</button></form>
  </section>`;
}
function assistantAnswer(question) {
  if (/식단|메뉴|밥/.test(question)) return "식단표는 관리자가 등록하면 메뉴 화면에 표시됩니다. 현재 등록된 메뉴는 없습니다.";
  if (/사원증|인증|로그인/.test(question)) return "캐스트 사원증 인증 방식과 에버랜드 DB 연동 여부는 아직 정해지지 않았습니다.";
  if (/동물|키우기/.test(question)) return "동물 친구를 고르고 키우는 기능은 기획 중입니다. 화면은 미리 볼 수 있어요.";
  return "아직 준비된 답변이 없어요. 관리자 FAQ와 AI 기능을 연결하면 더 자세히 안내할 수 있습니다.";
}
function messages() {
  return head("채팅", "시연 대화로 화면을 체험해 보세요.") +
    `<section class="card padded chat-card">
      <div class="chat-heading"><span class="chat-avatar">${iosIcon("messages")}</span><div><strong>파크톡 시연 대화</strong><small>이 브라우저에만 표시됩니다</small></div></div>
      <div class="chat-messages" aria-label="시연 대화 내용"><p class="chat-bubble chat-bubble--other">안녕하세요! 여기서 채팅 화면을 체험할 수 있어요.</p>${demoChat.map((message) => `<p class="chat-bubble chat-bubble--me">${esc(message)}</p>`).join("")}</div>
      <form id="demoChatForm" class="chat-compose"><input name="message" maxlength="200" aria-label="시연 메시지" placeholder="메시지를 입력해 보세요" required><button class="primary" type="submit">보내기</button></form>
      <div class="chat-footer"><p class="muted chat-note">실제 캐스트에게 메시지가 전송되지 않습니다.</p>${demoChat.length ? '<button class="chat-clear" type="button" data-chat-clear>시연 대화 지우기</button>' : ""}</div>
    </section>`;
}
function settings() {
  return head("앱 설정", "내 이용 정보를 확인하고 모드를 변경해요.") +
    `<section class="card padded settings-card"><div class="settings-profile"><span class="mini-avatar">${iosIcon("user")}</span><div><strong>${esc(window.ParkAuth?.name() || "신입 캐스트")}</strong><small>캐스트 모드 · 시연 계정</small></div></div>
      <div class="settings-row"><span>이용 모드</span><strong>캐스트</strong></div>
      <div class="settings-row"><span>사원증 인증</span><strong>기획 중</strong></div>
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
            "praise", "missing", "lost",
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
                  : state.page === "ai"
                    ? ai()
                        : state.page === "found"
                      ? foundItems()
                    : state.page === "settings"
                      ? settings()
                    : messages();
  document.title = `${state.page === "home" ? "오늘도 함께" : "파크톡"} | ParkTalk`;
}
function writePost() { window.ParkBoards.write(); }
function postDetail(i) {
  if (window.ParkAuth?.role() !== "cast") return;
  let p = posts[i];
  if (!p) return;
  const replies = Array.isArray(p.replies) ? p.replies : [];
  modal(
    `<span class="tag ${tagClass(p.category)}">${esc(p.category)}</span>
<h2 style="margin-top:13px">${esc(p.title)}</h2>
<p class="muted">${esc(p.author)} · 시연 게시글</p>
<p style="font-size:13px;line-height:1.8;margin:20px 0;white-space:pre-wrap">${esc(p.body)}</p>
<button class="outline" id="likeBtn" type="button">${iosIcon("heart")} 좋아요 ${p.likes}</button> <button class="outline" type="button" disabled>쪽지 기능 준비 중</button>
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
  else if (b.dataset.join) {
    const name = b.dataset.join;
    joinedRooms = isJoined(name) ? joinedRooms.filter((room) => room !== name) : [...joinedRooms, name];
    sessionStorage.setItem("parktalk-demo-joined-rooms", JSON.stringify(joinedRooms));
    render();
    toast(isJoined(name) ? "시연 대기방에 참여했어요. 실제 동료와 연결되지는 않습니다." : "시연 대기방 참여를 취소했어요.");
  }
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
  if (window.ParkAuth && window.ParkAuth.role() !== "cast") return toast("캐스트 모드에서 이용해 주세요.");
  state.page = page;
  state.filter = "전체";
  $(".sidebar").classList.remove("open");
  render();
  scrollTo(0, 0);
  history.replaceState(null, "", "#" + page);
}
$("#search").addEventListener("input", (e) => {
  state.search = e.target.value;
  window.ParkBoards.setQuery(state.search);
  if (state.search && state.page === "home") go("board");
  else render();
});
window.parkToast = toast;
window.parkModal = modal;
state.page = "home";
render();
