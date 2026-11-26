/* ParkTalk visitor prototype. Group state stays in this browser; GPS coordinates never do. */
(() => {
  const STORAGE = "parktalk-visitor-group-v1";
  const DEMO_GROUPS = "parktalk-visitor-demo-groups-v1";
  const INVITE = "parktalk-visitor-invite-v1";
  const HELP_PHONE = "031-320-5050";
  const GUIDE_URL = "https://grp.everland.com/files/everland.pdf";
  const zones = { global: "정문 · 글로벌페어", zootopia: "주토피아", american: "아메리칸 어드벤처", magic: "매직랜드" };
  const places = [
    { id: "capybara", name: "카피바라 · 뿌빠타운", zone: "zootopia", number: "206", kind: "동물", detail: "카피바라를 만날 수 있는 뿌빠타운", terms: "카피바라 capybara 뿌빠타운 동물원 동물" },
    { id: "amazon", name: "아마존 스냅", zone: "zootopia", number: "228", kind: "간식", detail: "핫도그 · 츄러스", terms: "핫도그 츄러스 간식 아마존 스냅" },
    { id: "newdel", name: "뉴델 스냅", zone: "american", number: "67", kind: "간식", detail: "핫도그 · 츄러스", terms: "핫도그 츄러스 간식 뉴델 스냅" },
    { id: "merlin", name: "멀린스 스냅", zone: "magic", number: "139", kind: "간식", detail: "핫도그 · 츄러스", terms: "핫도그 츄러스 간식 멀린스 스냅" },
  ];
  const root = () => document.getElementById("visitorApp");
  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[char];
    });
  const readGroup = () => {
    try {
      const group = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (!group || !/^[A-Z0-9]{6}$/.test(group.code)) return null;
      if (group.expiresAt && Date.now() > group.expiresAt) {
        localStorage.removeItem(STORAGE);
        return null;
      }
      return group;
    } catch {
      return null;
    }
  };
  const saveGroup = (group) => {
    if (group) localStorage.setItem(STORAGE, JSON.stringify(group));
    else localStorage.removeItem(STORAGE);
  };
  const demoGroups = () => {
    try {
      const all = JSON.parse(localStorage.getItem(DEMO_GROUPS) || "{}");
      return Object.fromEntries(Object.entries(all).filter(([, item]) => item?.expiresAt > Date.now()));
    } catch { return {}; }
  };
  const saveDemoGroups = (groups) => localStorage.setItem(DEMO_GROUPS, JSON.stringify(groups));
  const midnightTonight = () => { const day = new Date(); day.setHours(24, 0, 0, 0); return day.getTime(); };
  const makeCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(6);
    if (typeof crypto !== "undefined" && crypto.getRandomValues)
      crypto.getRandomValues(bytes);
    else for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(
      "",
    );
  };

  let listener;
  let submitListener;
  let userName = "방문객";
  let view = "home";
  let group = null;
  let gps = null; // Memory only. Never written to localStorage or shown as coordinates.
  let naverMap = null;
  let userMarker = null;
  let closestMarker = null;
  let closestPoint = null;
  let routeMode = false;
  let routePolyline = null;
  let memberMarkers = [];
  let memberMoveTimer = null;
  let mapSheetOpen = false;
  let memberLocations = {}; // name → {lat, lng, ts}
  let memberMarkerMap = {}; // name → naver.maps.Marker (실제 위치 마커)
  let fbDb = null;
  let fbGroupRef = null;
  let naverMapEl = null; // DOM element that naverMap is attached to

  // ===== 에버랜드 집합장소 후보 =====
  // fallback 좌표 보유 → geocoder 성공 시 실제 좌표로 교체됨
  let MEETING_POINTS = [
    { id: 'gate',     name: '정문 광장',            query: '경기도 용인시 처인구 포곡읍 에버랜드로 199', lat: 37.2933, lng: 127.2013 },
    { id: 'global',   name: '글로벌페어 광장',       query: null,  lat: 37.2940, lng: 127.2022 },
    { id: 'american', name: '아메리칸어드벤처 광장',  query: null,  lat: 37.2950, lng: 127.1995 },
    { id: 'magic',    name: '매직랜드 광장',          query: null,  lat: 37.2965, lng: 127.2010 },
    { id: 'zootopia', name: '주토피아 사파리',         query: null,  lat: 37.2978, lng: 127.2050 },
  ];
  let visitorPosts = [];
  let midpointSuggestion = false;
  let notice = "";
  let boardKind = "lost";
  let searchTerm = "";
  let destinationId = "capybara";
  let startZone = "global";

  function toast(message) {
    notice = message;
    render();
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      notice = "";
      render();
    }, 3600);
  }
  const icon = (name) => window.ParkIcons(name);
  function navigation() {
    const links = [
      ["home", "홈", "home"],
      ["board", "게시판", "board"],
      ["people", "일행", "group"],
      ["map", "지도", "map"],
      ["user", "앱 설정", "profile"],
    ];
    return links
      .map(
        ([glyph, label, target]) =>
          `<button type="button" class="pv-nav-item ${view === target || (target === "explore" && view === "route") ? "is-active" : ""}" data-pv-view="${target}" ${view === target || (target === "explore" && view === "route") ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span>
</button>`,
      )
      .join("");
  }
  function header() {
    const SECTION_TITLES = { board: "게시판", group: "일행", create: "일행", join: "일행", map: "지도", explore: "검색", route: "검색", profile: "앱 설정" };
    const BACK_TARGETS = { create: "group", join: "group" };
    const sectionTitle = SECTION_TITLES[view];
    const searchIcon = `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>`;
    const rightIcons = view === "board"
      ? `<div class="pv-header-right">
<button type="button" class="icon-btn" data-pv-view="explore" title="검색" aria-label="검색">${searchIcon}</button>
<button type="button" class="icon-btn" data-pb-write title="글쓰기" aria-label="글쓰기">
<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
</button>
</div>`
      : `<div class="pv-header-right">
<button type="button" class="icon-btn" data-pv-view="explore" title="검색" aria-label="검색">${searchIcon}</button>
<button type="button" class="icon-btn" data-pv-action="notices" title="알림" aria-label="알림 보기">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>
</button>
<button type="button" class="icon-btn pv-menu-btn" data-pv-action="sidebar-toggle" aria-label="메뉴 열기">
<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
</button>
</div>`;
    if (!sectionTitle) {
      return `<header class="pv-header">
<button type="button" class="pv-header-brand" data-pv-view="home" aria-label="파크톡 홈으로 이동">
<svg class="pv-header-brand-icon ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/></svg>
<span class="pv-header-brand-name">파크톡</span>
</button>
${rightIcons}
</header>`;
    }
    const backTarget = BACK_TARGETS[view] || "home";
    return `<header class="pv-header pv-header--section">
<button type="button" class="icon-btn pv-header-back" data-pv-view="${backTarget}" aria-label="뒤로가기">
<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
</button>
<span class="pv-header-title">${sectionTitle}</span>
${rightIcons}
</header>`;
  }
  function title(eyebrow, heading, description) {
    return `<div class="pv-title">
<span class="pv-eyebrow">${eyebrow}</span>
<h1>${heading}</h1>
<p>${description}</p>
</div>`;
  }
  function home() {
    return `<div class="pv-content pv-home">
      ${title("방문객 모드", `${escapeHtml(userName)}님, 반가워요`, "일행과 연결하고 필요한 정보를 찾아보세요.")}
      <section class="pv-missing-banner"><span>미아·보호자 찾기</span><strong>아이와 떨어졌다면<br>즉시 근처 캐스트에게 알려주세요.</strong><a href="tel:0313205050">손님상담실 ${HELP_PHONE} 전화하기</a></section>
      <div class="pv-section-heading">
<h2>소통 · 신고 양식</h2>
<span>BOARD</span>
</div>
      <div class="pv-board-grid" style="grid-template-columns:repeat(2,1fr)">
        <button type="button" data-pv-board="lost">${icon("found")}<strong>분실물·습득물</strong></button>
        <button type="button" data-pv-board="missing">${icon("child")}<strong>미아 찾기</strong></button>
      </div>
      <div class="pv-section-heading">
<h2>일행과 연결하기</h2>
<span>STEP 01</span>
</div>
      <button type="button" class="pv-discover-card" data-pv-view="explore">${icon("search")}<span><strong>카피바라 · 간식 어디 있지?</strong><small>동물과 먹거리를 검색하고 구역 안내 보기</small></span>${icon("arrow")}</button>
      ${
        group
          ? `<div class="pv-current-group">
<span class="pv-badge">진행 중인 시연 그룹</span>
<h3>${escapeHtml(group.name)}</h3>
<p>초대 코드 <strong>${group.code}</strong> · ${group.consent ? "위치 표시 동의함" : "위치 표시 꺼짐"}</p>
<button type="button" class="pv-button" data-pv-view="map">그룹 지도 보기 ${icon("arrow")}</button>
</div>`
          : `<div class="pv-action-grid">
<button type="button" class="pv-action-card" data-pv-view="create">
<span class="pv-action-icon pv-purple">${icon("people")}</span>
<strong style="word-break:keep-all">새 그룹 만들기</strong>${icon("arrow")}</button>
<button type="button" class="pv-action-card" data-pv-view="join">
<span class="pv-action-icon pv-mint">${icon("link")}</span>
<strong style="word-break:keep-all;white-space:nowrap">그룹 참여</strong>${icon("arrow")}</button>
</div>`
      }
      <div class="pv-info-strip">${icon("shield")}<p>
<strong>내 위치는 내가 결정해요.</strong>
<br>위치 확인은 직접 버튼을 누른 뒤에만 시작됩니다.</p>
</div>
    </div>`;
  }
  function create() {
    return `<div class="pv-content pv-form-page">
      ${title("그룹 만들기 · 01", "그룹 이름<br>설정하기", "초대 코드로 같은 그룹에 참여할 수 있어요.")}
      <form id="pv-create-form" class="pv-card pv-form-card">
<label for="pv-group-name">그룹 이름</label>
<input id="pv-group-name" name="groupName" type="text" maxlength="24" minlength="2" autocomplete="off" placeholder="예: 우리 가족, 대학 동기" required>
<p class="pv-field-hint">2~24자로 입력해 주세요.</p>
<p class="pv-field-hint">그룹은 오늘 밤 12시에 자동 종료됩니다.</p>
<button class="pv-button" type="submit">그룹 만들기 ${icon("arrow")}</button>
</form>
    </div>`;
  }
  function join() {
    const code = sessionStorage.getItem(INVITE) || "";
    return `<div class="pv-content pv-form-page">
      ${title("그룹 참여 · 01", "일행의 초대 코드를<br>입력해 주세요", "초대 링크로 왔다면 코드가 채워져 있어요.")}
      <form id="pv-join-form" class="pv-card pv-form-card">
<label for="pv-invite-code">초대 코드</label>
<input id="pv-invite-code" name="inviteCode" type="text" maxlength="6" minlength="6" autocomplete="off" inputmode="text" placeholder="6자리 코드" value="${escapeHtml(code)}" required>
<p class="pv-field-hint">영문 대문자와 숫자 6자리</p>
<button class="pv-button" type="submit">그룹 참여 ${icon("arrow")}</button>
</form>
    </div>`;
  }
  function groupPage() {
    if (!group)
      return `<div class="pv-content">${title("일행 찾기", "일행과 위치공유", "그룹을 만들거나 받은 코드로 참여할 수 있어요.")}<div class="pv-action-stack">
<button type="button" class="pv-action-row" data-pv-view="create">
<span class="pv-action-icon pv-purple">${icon("people")}</span>
<strong>새 그룹 만들기</strong>${icon("arrow")}</button>
<button type="button" class="pv-action-row" data-pv-view="join">
<span class="pv-action-icon pv-mint">${icon("link")}</span>
<strong>초대코드로 그룹 참여</strong>${icon("arrow")}</button>
</div>
</div>`;
    return `<div class="pv-content">${title("나의 일행", escapeHtml(group.name), "파크 안에서 일행을 찾는 시연 그룹이에요.")}
      <div class="pv-card pv-group-detail">
<span class="pv-badge">${group.source === "created" ? "내가 만든 그룹" : "코드로 참여한 그룹"}</span>
<div class="pv-code-line">
<div>
<small>초대 코드</small>
<strong>${group.code}</strong>
</div>
<button type="button" class="pv-icon-button" data-pv-copy="code" aria-label="초대 코드 복사">${icon("link")}</button>
</div>
<p class="pv-group-expiry">오늘 밤 12시에 이 브라우저에서 자동 종료됩니다.</p>
<button type="button" class="pv-button" data-pv-copy="link">시연 초대 링크 복사 ${icon("arrow")}</button>
<p class="pv-field-hint">복사한 링크는 같은 기기에서 화면 흐름을 확인하는 용도예요.</p>
</div>
      <div class="pv-card pv-board-form"><h2>시연 일행</h2><p>${(group.members || [userName]).map((member, index) => `<span class="pv-member-chip pv-member-${index % 4}">${escapeHtml(member.slice(0, 1))} ${escapeHtml(member)}</span>`).join(" ")}</p><form id="pv-member-form"><label>시연 인원 추가<input name="member" maxlength="20" placeholder="일행 닉네임"></label><button class="pv-secondary-button" type="submit">추가</button></form><p>실제 다른 기기의 일행은 서버 연결 후 표시됩니다.</p><button type="button" class="pv-button" data-pv-view="map">일행 지도 보기 ${icon("arrow")}</button></div>
      <div class="pv-section-heading">
<h2>위치 표시 설정</h2>
</div>
<div class="pv-card pv-setting-card">
<div>
<strong>내 위치 표시 동의</strong>
<p>${group.consent ? "동의함 · 기기 위치 확인은 별도" : "꺼짐 · 위치를 확인하지 않아요"}</p>
</div>
<button type="button" class="pv-switch ${group.consent ? "on" : ""}" data-pv-action="consent" role="switch" aria-checked="${group.consent}" aria-label="내 위치 표시 동의">
</button>
</div>
      <button type="button" class="pv-text-button pv-end" data-pv-action="end">그룹 종료하기</button>
    </div>`;
  }
  function consentPage() {
    return `<div class="pv-content pv-form-page">
<button type="button" class="pv-back" data-pv-view="group">${icon("back")} 그룹으로 돌아가기</button>
      ${title("위치 공유 · 02", "내 위치는<br>내가 결정해요", "같은 그룹의 일행에게 위치를 보이게 할지 선택하세요.")}
      <div class="pv-card pv-consent-card">
<div class="pv-consent-icon">${icon("shield")}</div>
<h2>공유 전 확인해 주세요</h2>
<ul>
<li>위치 확인은 직접 버튼을 누를 때만 요청합니다.</li>
<li>현재 시연판은 위치를 다른 사람에게 전송하지 않습니다.</li>
<li>언제든 동의를 취소할 수 있습니다.</li>
</ul>
<label class="pv-check">
<input id="pv-consent-check" type="checkbox"> 위 내용을 확인하고 위치 표시를 선택합니다.</label>
<button type="button" class="pv-button" data-pv-action="confirm-consent">동의하고 지도 보기 ${icon("arrow")}</button>
<button type="button" class="pv-text-button" data-pv-view="map">동의하지 않고 지도 보기</button>
</div>
    </div>`;
  }
  function boardPage() {
    return `<div class="pv-content">${window.ParkBoards.page('visitor', boardKind)}</div>`;
  }
  function explorePage() {
    const query = searchTerm.trim().toLowerCase();
    const wantsAnimal = /카피바라|capybara|뿌빠/.test(query);
    const wantsSnack = /핫도그|츄러스|간식/.test(query);
    const matches = !query ? places : wantsAnimal || wantsSnack
      ? places.filter((place) => (wantsAnimal && place.kind === "동물") || (wantsSnack && place.kind === "간식"))
      : places.filter((place) => `${place.name} ${zones[place.zone]} ${place.terms}`.toLowerCase().includes(query));
    return `<div class="pv-content pv-explore">
      <button type="button" class="pv-back" data-pv-view="home" style="display:inline-flex;align-items:center;gap:4px;margin-bottom:14px">${icon("back")} 홈으로</button>
      ${title("파크 탐색", "어디로 가고 싶나요?", "동물과 간식 매장을 검색해 목적지 구역을 확인해 보세요.")}
      <form id="pv-search-form" class="pv-search-form"><label for="pv-place-query">장소 또는 먹거리 검색</label><div><input id="pv-place-query" name="query" value="${escapeHtml(searchTerm)}" placeholder="카피바라, 핫도그, 츄러스" autocomplete="off"><button type="submit">검색</button></div></form>
      <div class="pv-query-chips"><button type="button" data-pv-query="카피바라">${icon("paw")} 카피바라</button><button type="button" data-pv-query="핫도그">${icon("hotdog")} 핫도그</button><button type="button" data-pv-query="츄러스">${icon("churros")} 츄러스</button></div>
      <div class="pv-section-heading"><h2>${searchTerm ? "검색 결과" : "추천 장소"}</h2><span>${matches.length}곳</span></div>
      ${matches.length ? `<div class="pv-place-list">${matches.map((place) => `<button type="button" class="pv-place-card" data-pv-destination="${place.id}"><span class="pv-place-emoji">${icon(place.kind === "동물" ? "paw" : "food")}</span><span><small>${place.kind} · ${zones[place.zone]} · 공식 지도 ${place.number}번</small><strong>${place.name}</strong><em>${place.detail}</em></span>${icon("arrow")}</button>`).join("")}</div>` : '<div class="pv-empty-note">검색 결과가 없어요. 카피바라, 핫도그 또는 츄러스로 다시 검색해 보세요.</div>'}
      <p class="pv-guide-note">2025년 11월 에버랜드 공식 가이드 기준입니다. 동물 전시와 메뉴·매장 운영은 현장에서 달라질 수 있어요.</p>
      <a class="pv-guide-link" href="${GUIDE_URL}" target="_blank" rel="noopener noreferrer">에버랜드 공식 가이드 지도 보기 ↗</a>
    </div>`;
  }
  function routePage() {
    const place = places.find((item) => item.id === destinationId) || places[0];
    const sameZone = startZone === place.zone;
    return `<div class="pv-content pv-route">
      <button type="button" class="pv-back" data-pv-view="explore">${icon("back")} 검색 결과로 돌아가기</button>
      ${title("목적지 안내", place.name, `${zones[place.zone]} · 공식 가이드 지도 ${place.number}번`)}
      <form id="pv-route-form" class="pv-card pv-route-start"><label for="pv-start-zone">출발 구역 선택</label><select id="pv-start-zone" name="startZone">${Object.entries(zones).map(([id, label]) => `<option value="${id}" ${startZone === id ? "selected" : ""}>${label}</option>`).join("")}</select><button class="pv-button" type="submit">경로 다시 보기 ${icon("arrow")}</button></form>
      <section class="pv-card pv-route-card" aria-label="목적지까지 구역 안내"><div class="pv-route-track"><span class="pv-route-dot">1</span><div><small>출발</small><strong>${zones[startZone]}</strong></div></div><div class="pv-route-track"><span class="pv-route-dot">2</span><div><small>${sameZone ? "구역 내부 이동" : "안내 표지판 따라 이동"}</small><strong>${sameZone ? `${zones[place.zone]} 안에서 시설 번호 찾기` : `${zones[place.zone]} 방향으로 이동`}</strong></div></div><div class="pv-route-track"><span class="pv-route-dot">3</span><div><small>도착</small><strong>${place.name} · ${place.number}번</strong></div></div></section>
      <div class="pv-route-alert">${icon("map")}<p>이 안내는 공식 가이드의 구역과 시설 번호를 연결한 시연입니다. 현재 GPS 위치, 실제 보행로, 거리와 예상 시간은 계산하지 않습니다.</p></div>
      <a class="pv-guide-link" href="${GUIDE_URL}" target="_blank" rel="noopener noreferrer">실제 이동 전 공식 지도 확인하기 ↗</a>
    </div>`;
  }
  function mapPage() {
    if (!group)
      return `<div class="pv-content"><button type="button" class="pv-back" data-pv-view="home" style="display:inline-flex;align-items:center;gap:4px;margin-bottom:14px">${icon("back")} 홈으로</button>${title("일행 지도", "먼저 그룹에 참여해 주세요", "그룹을 만든 뒤 지도를 이용할 수 있어요.")}<button type="button" class="pv-button" data-pv-view="group">일행으로 이동 ${icon("arrow")}</button>
</div>`;

    const members = group.members || [userName];
    const sheetContent = (() => {
      if (routeMode && closestPoint && gps?.lat) {
        const dist = calcDistM(gps.lat, gps.lng, closestPoint.lat, closestPoint.lng);
        const mins = Math.max(1, Math.round(dist / 67));
        return `<div class="pv-route-panel">
<div class="pv-route-dest"><span class="pv-route-icon">📍</span><div><strong>${escapeHtml(closestPoint.name)}</strong><small>도보 약 ${mins}분 · ${dist}m</small></div><button type="button" class="pv-route-close" data-pv-action="route-cancel">✕</button></div>
<ol class="pv-route-steps">
<li class="pv-route-step pv-step-active">${icon("pin")} 현재 위치에서 출발</li>
<li class="pv-route-step">직진 약 ${Math.round(dist * 0.4)}m</li>
<li class="pv-route-step">오른쪽으로 이동 약 ${Math.round(dist * 0.6)}m</li>
<li class="pv-route-step pv-step-dest">📍 ${escapeHtml(closestPoint.name)} 도착</li>
</ol>
<small class="pv-route-note">시연용 경로입니다. 실제 경로와 다를 수 있습니다.</small>
</div>`;
      }
      return `
<div class="pv-sheet-members">
${members.map((member, i) => `<div class="pv-member-row"><span class="pv-member-avatar pv-member-${i % 4}">${escapeHtml(member.slice(0, 1))}</span><div><strong>${escapeHtml(member)}${i === 0 ? " (나)" : ""}</strong><small>${i === 0 ? gps ? "위치 확인됨" : group.consent ? "동의됨 · 확인 전" : "꺼짐" : "시연"}</small></div></div>`).join("")}
</div>
<div class="pv-sheet-actions">
${closestPoint ? `<div class="pv-midpoint-row"><strong>📍 ${escapeHtml(closestPoint.name)}</strong><span>가장 가까운 집합장소</span></div>` : ""}
${closestPoint && gps?.lat ? `<button type="button" class="pv-button pv-wide" data-pv-action="route-start">${icon("pin")} 경로 안내 시작</button>` : `<button type="button" class="pv-secondary-button pv-wide" data-pv-action="midpoint">집합장소 추천 보기</button>`}
${group.consent
  ? `<div class="pv-sheet-small-actions"><button type="button" class="pv-mini-button" data-pv-action="locate">${icon("pin")} 내 위치 확인하기</button><button type="button" class="pv-mini-button pv-mini-muted" data-pv-action="revoke">동의 취소</button></div>`
  : `<button type="button" class="pv-button pv-wide" data-pv-view="consent">위치 표시 동의하기 ${icon("arrow")}</button>`}
</div>`;
    })();

    return `<div class="pv-map-fullpage">
<button type="button" class="pv-map-back" data-pv-view="home" aria-label="뒤로가기">${icon("back")}</button>
<div id="pv-naver-map" class="pv-naver-map-full" aria-label="에버랜드 네이버 지도"></div>
<div class="pv-bottom-sheet${mapSheetOpen ? " pv-sheet-open" : ""}" id="pv-map-bs">
  <button type="button" class="pv-bs-handle-wrap" data-pv-action="sheet-toggle" aria-label="정보 패널 열기/닫기">
    <div class="pv-bs-handle"></div>
    <span class="pv-bs-peek"><strong>${escapeHtml(group.name)}</strong><small>${members.length}명 · ${gps ? "위치 확인됨" : "위치 대기"}</small></span>
  </button>
  <div class="pv-bs-body">${sheetContent}</div>
</div>
</div>`;
  }
  function profilePage() {
    return `<div class="pv-content"><button type="button" class="pv-back" data-pv-view="home" style="display:inline-flex;align-items:center;gap:4px;margin-bottom:14px">${icon("back")} 홈으로</button>${title("앱 설정", `${escapeHtml(userName)}님`, "일반 사용자 모드로 이용 중입니다.")}
      <button type="button" class="pv-card pv-profile-card profile-edit-row" data-profile-edit aria-label="내 프로필 수정">
<span class="pv-profile-avatar">${window.ParkProfiles.avatar(window.ParkAuth.id(),userName)}</span>
<div>
<strong>${escapeHtml(userName)}</strong>
<small>${window.ParkAuth?.accountRole?.() === "cast" ? "캐스트 계정 · 일반 사용자 모드" : "방문객 계정 · 시연 로그인"}</small>
</div>
<span class="profile-edit-hint">수정 ›</span></button>
      <div class="pv-card pv-profile-links">
<div>
<span>내 이용 모드</span>
<strong>일반 사용자</strong>
</div>
<div>
<span>현재 그룹</span>
<strong>${group ? escapeHtml(group.name) : "없음"}</strong>
</div>
<div>
<span>위치 표시</span>
<strong>${group?.consent ? "동의함" : "꺼짐"}</strong>
</div>
</div>
      <button type="button" class="pv-secondary-button pv-wide" data-auth-action="switch">캐스트 모드로 전환</button>
      ${window.ParkAuth?.accountRole?.() === "cast" ? "" : '<p class="pv-profile-note">캐스트 모드는 캐스트 인증을 마친 계정만 이용할 수 있어요.</p>'}
      <button type="button" class="pv-secondary-button pv-wide" data-pv-action="logout">로그아웃</button>
<p class="pv-profile-note">현재 계정과 그룹은 이 브라우저에서만 체험할 수 있습니다.</p>
    </div>`;
  }
  function geocodeMeetingPoints() {
    if (!naver?.maps?.Service?.geocode) return;
    MEETING_POINTS.forEach((pt, i) => {
      if (!pt.query) return;
      naver.maps.Service.geocode({ query: pt.query }, function(status, response) {
        if (status === naver.maps.Service.Status.ERROR) return;
        const addrs = response.v2?.addresses;
        if (!addrs || !addrs.length) return;
        const item = addrs[0];
        const lat = parseFloat(item.y);
        const lng = parseFloat(item.x);
        if (!lat || !lng) return;
        MEETING_POINTS[i] = { ...pt, lat, lng, geocoded: true };
        if (gps?.lat) {
          closestPoint = findClosest(gps.lat, gps.lng);
          if (naverMap && closestPoint) placeClosestMarker(closestPoint.lat, closestPoint.lng);
          render();
        }
      });
    });
  }

  function initNaverMap() {
    const el = document.getElementById('pv-naver-map');
    if (!el) return;
    if (typeof naver === 'undefined' || !naver.maps) { setTimeout(initNaverMap, 200); return; }
    if (naverMap && naverMapEl === el) {
      // 같은 DOM 엘리먼트 — 재초기화 불필요, Firebase만 확인
      if (group?.consent && !fbGroupRef) connectFirebase();
      return;
    }
    naverMap = new naver.maps.Map(el, {
      center: new naver.maps.LatLng(37.2941, 127.2027),
      zoom: 17,
    });
    naverMapEl = el;
    if (gps?.lat) placeUserMarker(gps.lat, gps.lng);
    if (closestPoint) placeClosestMarker(closestPoint.lat, closestPoint.lng);
    initSimMemberMarkers();
    geocodeMeetingPoints();
    connectFirebase();
  }

  function placeUserMarker(lat, lng) {
    if (!naverMap) return;
    if (userMarker) userMarker.setMap(null);
    userMarker = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map: naverMap,
      title: '내 위치',
      icon: { content: `<div class="pv-user-pin">${escapeHtml(userName.slice(0, 1))}</div>`, anchor: new naver.maps.Point(16, 16) },
    });
    naverMap.setCenter(new naver.maps.LatLng(lat, lng));
  }

  function placeClosestMarker(lat, lng) {
    if (!naverMap) return;
    if (closestMarker) closestMarker.setMap(null);
    closestMarker = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map: naverMap,
      title: '추천 집합장소',
      icon: { content: `<div class="pv-closest-pin">📍</div>`, anchor: new naver.maps.Point(12, 36) },
      zIndex: 10,
    });
  }

  function findClosest(lat, lng) {
    if (!MEETING_POINTS.length) return null;
    let best = null, bestDist = Infinity;
    MEETING_POINTS.forEach(p => {
      const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
      if (d < bestDist) { bestDist = d; best = p; }
    });
    return best;
  }

  function calcDistM(lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * 111000;
    const dLng = (lng2 - lng1) * 88000;
    return Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
  }

  // Cloudflare Worker URL — 배포 후 채워넣기
  const DIRECTION_WORKER_URL = 'https://parktalk.pages.dev/directions';

  function drawRouteSimulated(fromLat, fromLng, toLat, toLng) {
    if (routePolyline) routePolyline.setMap(null);
    routePolyline = new naver.maps.Polyline({
      map: naverMap,
      path: [
        new naver.maps.LatLng(fromLat, fromLng),
        new naver.maps.LatLng(fromLat, toLng),
        new naver.maps.LatLng(toLat, toLng),
      ],
      strokeColor: '#2563eb',
      strokeOpacity: 0.85,
      strokeWeight: 5,
      strokeStyle: 'solid',
    });
    const bounds = new naver.maps.LatLngBounds(
      new naver.maps.LatLng(Math.min(fromLat, toLat) - 0.0003, Math.min(fromLng, toLng) - 0.0003),
      new naver.maps.LatLng(Math.max(fromLat, toLat) + 0.0003, Math.max(fromLng, toLng) + 0.0003),
    );
    naverMap.fitBounds(bounds);
  }

  function drawRoute(fromLat, fromLng, toLat, toLng) {
    if (!naverMap) return;
    if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
    if (!DIRECTION_WORKER_URL) { drawRouteSimulated(fromLat, fromLng, toLat, toLng); return; }

    const start = `${fromLng},${fromLat}`;
    const goal  = `${toLng},${toLat}`;
    fetch(`${DIRECTION_WORKER_URL}?start=${start}&goal=${goal}`)
      .then(r => r.json())
      .then(data => {
        if (data.code !== 0) throw new Error(data.message);
        const rawPath = data.route.traoptimal[0].path;
        const path = rawPath.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));
        routePolyline = new naver.maps.Polyline({
          map: naverMap,
          path,
          strokeColor: '#2563eb',
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
        const bounds = new naver.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        naverMap.fitBounds(bounds, { top: 60, right: 20, bottom: 160, left: 20 });
        render();
      })
      .catch(() => drawRouteSimulated(fromLat, fromLng, toLat, toLng));
  }

  function clearMemberMarkers() {
    clearInterval(memberMoveTimer);
    memberMoveTimer = null;
    memberMarkers.forEach(m => m.setMap(null));
    memberMarkers = [];
    Object.values(memberMarkerMap).forEach(m => m.setMap(null));
    memberMarkerMap = {};
  }

  // ── Firebase 실시간 위치 공유 ─────────────────────────────────
  const FB_CONFIG = {
    apiKey: "AIzaSyBY_vmvAWoycxBQlzWQO2FeidnzzO0GU_Q",
    databaseURL: "https://parktalk-23324-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "parktalk-23324",
    appId: "1:622889513:web:797dfec786a5da84eeaa38"
  };

  function initFb() {
    if (fbDb) return true;
    if (typeof firebase === 'undefined') return false;
    try {
      const app = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(FB_CONFIG);
      fbDb = firebase.database(app);
      return true;
    } catch { return false; }
  }

  function connectFirebase() {
    if (!group?.code || !group?.consent) return;
    if (!initFb()) return;
    disconnectFirebase();

    fbGroupRef = fbDb.ref(`groups/${group.code}/members`);
    fbGroupRef.on('value', (snap) => {
      const data = snap.val() || {};
      memberLocations = {};
      for (const [name, loc] of Object.entries(data)) {
        if (name !== userName) memberLocations[name] = loc;
      }
      refreshMemberMarkers();
    });
  }

  function disconnectFirebase() {
    if (fbGroupRef) { fbGroupRef.off(); fbGroupRef = null; }
    memberLocations = {};
  }

  function sendLocationFb(lat, lng) {
    if (!initFb() || !group?.code) return;
    const ref = fbDb.ref(`groups/${group.code}/members/${userName}`);
    ref.set({ lat, lng, ts: Date.now() });
    ref.onDisconnect().remove();
  }

  function removeLocationFb() {
    if (fbDb && group?.code) fbDb.ref(`groups/${group.code}/members/${userName}`).remove();
  }

  function refreshMemberMarkers() {
    if (Object.keys(memberLocations).length > 0) {
      clearInterval(memberMoveTimer);
      memberMoveTimer = null;
      memberMarkers.forEach(m => m.setMap(null));
      memberMarkers = [];
    }
    Object.values(memberMarkerMap).forEach(m => m.setMap(null));
    memberMarkerMap = {};
    for (const [name, loc] of Object.entries(memberLocations)) {
      upsertMemberMarker(name, loc.lat, loc.lng);
    }
  }

  function upsertMemberMarker(name, lat, lng) {
    if (!naverMap) return;
    if (memberMarkerMap[name]) {
      memberMarkerMap[name].setPosition(new naver.maps.LatLng(lat, lng));
    } else {
      const idx = Object.keys(memberMarkerMap).length;
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(lat, lng),
        map: naverMap,
        title: name,
        icon: {
          content: `<div class="pv-member-pin pv-member-${(idx + 1) % 4}">${escapeHtml(name.slice(0, 1))}</div>`,
          anchor: new naver.maps.Point(16, 16),
        },
        zIndex: 5,
      });
      memberMarkerMap[name] = marker;
    }
  }

  function removeMemberMarker(name) {
    if (memberMarkerMap[name]) { memberMarkerMap[name].setMap(null); delete memberMarkerMap[name]; }
  }

  function initSimMemberMarkers() {
    if (!naverMap || !group) return;
    clearMemberMarkers();
    const others = (group.members || []).slice(1); // 본인 제외
    if (!others.length) return;

    // 각 멤버를 에버랜드 내 고정 시작 좌표에 배치
    const BASE = [
      { lat: 37.2955, lng: 127.2010 },
      { lat: 37.2948, lng: 127.2040 },
      { lat: 37.2920, lng: 127.2035 },
      { lat: 37.2965, lng: 127.2025 },
      { lat: 37.2938, lng: 127.1998 },
      { lat: 37.2972, lng: 127.2050 },
      { lat: 37.2928, lng: 127.2008 },
    ];

    others.forEach((name, i) => {
      const base = BASE[i % BASE.length];
      const pos = new naver.maps.LatLng(base.lat, base.lng);
      const marker = new naver.maps.Marker({
        position: pos,
        map: naverMap,
        title: name,
        icon: {
          content: `<div class="pv-member-pin pv-member-${(i + 1) % 4}">${escapeHtml(name.slice(0, 1))}</div>`,
          anchor: new naver.maps.Point(16, 16),
        },
        zIndex: 5,
      });
      marker._base = base;
      memberMarkers.push(marker);
    });

    // 2초마다 각 마커를 ±0.0001도 범위에서 미세하게 이동
    memberMoveTimer = setInterval(() => {
      if (!naverMap) { clearMemberMarkers(); return; }
      memberMarkers.forEach(m => {
        const b = m._base;
        const jitter = 0.00008;
        const lat = b.lat + (Math.random() - 0.5) * jitter;
        const lng = b.lng + (Math.random() - 0.5) * jitter;
        m.setPosition(new naver.maps.LatLng(lat, lng));
      });
    }, 2000);
  }

  function clearMapState() {
    disconnectFirebase();
    if (userMarker) { userMarker.setMap(null); userMarker = null; }
    if (closestMarker) { closestMarker.setMap(null); closestMarker = null; }
    if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
    clearMemberMarkers();
    naverMap = null;
    naverMapEl = null;
    closestPoint = null;
    routeMode = false;
  }

  function render() {
    const target = root();
    if (!target) return;
    const titles = {
      home: "방문객 홈",
      group: "나의 일행",
      board: "방문객 게시판",
      create: "그룹 만들기",
      join: "그룹 참여",
      explore: "파크 탐색",
      route: "목적지 안내",
      consent: "위치 표시 설정",
      map: "일행 지도",
      profile: "앱 설정",
    };
    document.title = `${titles[view] || "방문객 모드"} | ParkTalk`;
    group = readGroup();
    const content =
      {
        home,
        group: groupPage,
        board: boardPage,
        create,
        join,
        explore: explorePage,
        route: routePage,
        consent: consentPage,
        map: mapPage,
        profile: profilePage,
      }[view]?.() || home();
    target.innerHTML = `<div class="pv-shell" data-view="${view}">
<aside class="pv-sidebar">
<div class="pv-sidebar-brand"><button type="button" class="pv-logo-home" data-pv-view="home" aria-label="파크톡 홈으로 이동"><img class="pv-logo" src="assets/parktalk-logo-transparent.png" alt="ParkTalk 파크톡 로고"></button>
<small>방문객 모드</small>
</div>
<nav aria-label="일반 사용자 메뉴">${navigation()}</nav>
<div class="pv-sidebar-foot">
<span class="pv-profile-avatar">${window.ParkProfiles.avatar(window.ParkAuth.id(),userName)}</span>
<div>
<strong>${escapeHtml(userName)}</strong>
<small>일반 사용자</small>
</div>
<button type="button" data-pv-action="logout">로그아웃</button>
</div>
</aside>
<div class="pv-main">${header()}<main class="pv-main-content">${content}</main>
<nav class="pv-bottom-nav" aria-label="일반 사용자 메뉴">${navigation()}</nav>
</div>
</div>${notice ? `<div class="pv-toast" role="status">${escapeHtml(notice)}</div>` : ""}`;
    if (view === 'map' && group) requestAnimationFrame(initNaverMap);
  }
  // 새로고침해도 다시 열 수 있는 화면(다른 화면은 직전 선택 상태가 필요해서 홈으로 돌아간다)
  const RESTORABLE = ["home", "board", "group", "map", "profile", "explore", "create", "join"];
  function setView(next) {
    window.ParkBoards.leaveDetail();
    if (next !== 'map') mapSheetOpen = false;
    view = next;
    render();
    window.scrollTo?.(0, 0);
    history.replaceState(null, "", `#visitor/${RESTORABLE.includes(view) ? view : "home"}`);
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      toast("복사했어요. 현재는 다른 사용자와 연결되지 않는 시연 링크입니다.");
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand?.("copy");
      input.remove();
      toast(
        copied
          ? "복사했어요. 현재는 시연 링크입니다."
          : "복사가 지원되지 않아요. 초대 코드를 직접 전달해 주세요.",
      );
    }
  }
  function click(event) {
    const button = event.target.closest("button");
    if (!button || !root()?.contains(button)) return;
    if (button.dataset.pvView) return setView(button.dataset.pvView);
    if (button.dataset.pvBoard) {
      boardKind = button.dataset.pvBoard;
      return setView("board");
    }
    if (button.dataset.pvQuery) {
      searchTerm = button.dataset.pvQuery;
      return setView("explore");
    }
    if (button.dataset.pvDestination) {
      destinationId = button.dataset.pvDestination;
      return setView("route");
    }
    if (button.dataset.pvCopy) {
      if (!group) return;
      const link = new URL(window.location.href);
      link.searchParams.set("invite", group.code);
      return void copy(
        button.dataset.pvCopy === "code" ? group.code : link.href,
      );
    }
    switch (button.dataset.pvAction) {
      case "consent":
        if (!group) return;
        if (group.consent) {
          removeLocationFb();
          group.consent = false;
          gps = null;
          closestPoint = null;
          clearMapState();
          saveGroup(group);
          toast("위치 표시 동의를 취소했어요.");
        } else setView("consent");
        break;
      case "confirm-consent":
        if (!document.getElementById("pv-consent-check")?.checked)
          return toast("안내를 확인하고 선택해 주세요.");
        if (!group) return;
        group.consent = true;
        saveGroup(group);
        setView("map");
        connectFirebase();
        break;
      case "locate":
        if (!group?.consent) return setView("consent");
        if (!navigator.geolocation)
          return toast("이 브라우저에서는 위치 확인을 지원하지 않아요.");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            gps = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
            placeUserMarker(gps.lat, gps.lng);
            sendLocationFb(gps.lat, gps.lng);
            closestPoint = findClosest(gps.lat, gps.lng);
            if (closestPoint) {
              placeClosestMarker(closestPoint.lat, closestPoint.lng);
              midpointSuggestion = true;
              toast(`위치 확인됨 · 가장 가까운 집합장소: ${closestPoint.name}`);
            } else {
              toast("위치 확인됨 · 그룹원과 위치를 공유해요.");
            }
            render();
          },
          () => toast("기기 위치를 확인하지 못했어요. 브라우저 권한을 확인해 주세요."),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
        break;
      case "sheet-toggle":
        mapSheetOpen = !mapSheetOpen;
        render();
        break;
      case "revoke":
        if (!group) return;
        removeLocationFb();
        group.consent = false;
        gps = null;
        closestPoint = null;
        clearMapState();
        saveGroup(group);
        toast("위치 표시 동의를 취소했어요.");
        break;
      case "end":
        removeLocationFb();
        if (group?.source === "created") {
          const groups = demoGroups();
          delete groups[group.code];
          saveDemoGroups(groups);
          if (fbDb && group?.code) fbDb.ref(`groups/${group.code}`).remove();
        }
        saveGroup(null);
        group = null;
        gps = null;
        closestPoint = null;
        clearMapState();
        setView("group");
        toast("그룹을 종료했어요.");
        break;
      case "midpoint":
        if (gps?.lat) {
          closestPoint = findClosest(gps.lat, gps.lng);
          if (closestPoint) placeClosestMarker(closestPoint.lat, closestPoint.lng);
        }
        midpointSuggestion = true;
        render();
        break;
      case "route-start":
        if (!closestPoint || !gps?.lat) return;
        routeMode = true;
        render();
        requestAnimationFrame(() => drawRoute(gps.lat, gps.lng, closestPoint.lat, closestPoint.lng));
        break;
      case "route-cancel":
        routeMode = false;
        if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
        if (naverMap && gps?.lat) naverMap.setCenter(new naver.maps.LatLng(gps.lat, gps.lng));
        render();
        break;
      case "notices":
        toast("새 알림이 없어요.");
        break;
      case "sidebar-toggle": {
        const sidebar = root()?.querySelector(".pv-sidebar");
        if (sidebar) sidebar.classList.toggle("is-open");
        break;
      }
      case "logout":
        window.ParkAuth?.logout?.();
        break;
    }
  }
  function submit(event) {
    if (!root()?.contains(event.target)) return;
    if (event.target.id === "pv-member-form") {
      event.preventDefault();
      const name = String(new FormData(event.target).get("member") || "").trim();
      if (!name || !group) return;
      group.members = group.members || [userName];
      if (group.members.length >= 8) return toast("시연 인원은 8명까지 추가할 수 있어요.");
      group.members.push(name.slice(0, 20));
      saveGroup(group);
      const groups = demoGroups();
      if (groups[group.code]) { groups[group.code].members = group.members; saveDemoGroups(groups); }
      render();
    } else if (event.target.id === "pv-search-form") {
      event.preventDefault();
      searchTerm = String(new FormData(event.target).get("query") || "").trim().slice(0, 60);
      setView("explore");
    } else if (event.target.id === "pv-route-form") {
      event.preventDefault();
      const selected = String(new FormData(event.target).get("startZone") || "global");
      startZone = zones[selected] ? selected : "global";
      setView("route");
    } else if (event.target.id === "pv-create-form") {
      event.preventDefault();
      const name = String(
        new FormData(event.target).get("groupName") || "",
      ).trim();
      if (name.length < 2 || name.length > 24)
        return toast("그룹 이름을 2~24자로 입력해 주세요.");
      group = {
        name,
        code: makeCode(),
        source: "created",
        consent: false,
        members: [userName],
        expiresAt: midnightTonight(),
      };
      gps = null;
      saveGroup(group);
      saveDemoGroups({ ...demoGroups(), [group.code]: { name, code: group.code, members: [userName], expiresAt: group.expiresAt } });
      if (initFb()) fbDb.ref(`groups/${group.code}/info`).set({ name, members: [userName], expiresAt: group.expiresAt });
      setView("group");
      toast("그룹을 만들었어요. 코드를 일행과 공유하세요.");
    } else if (event.target.id === "pv-join-form") {
      event.preventDefault();
      const code = String(new FormData(event.target).get("inviteCode") || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      if (!/^[A-Z0-9]{6}$/.test(code))
        return toast("영문과 숫자 6자리 코드를 입력해 주세요.");
      const local = demoGroups()[code];
      if (local) {
        group = { name: local.name, code, source: "joined", consent: false, members: [...new Set([...(local.members || []), userName])], expiresAt: local.expiresAt };
        saveDemoGroups({ ...demoGroups(), [code]: { ...local, members: group.members } });
        gps = null; saveGroup(group); sessionStorage.removeItem(INVITE);
        setView("group");
        toast("그룹에 참여했어요!");
      } else if (initFb()) {
        toast("그룹을 찾는 중...");
        fbDb.ref(`groups/${code}/info`).get().then(snap => {
          const fb = snap.val();
          if (!fb) return toast("그룹을 찾을 수 없어요. 코드를 확인해 주세요.");
          group = { name: fb.name, code, source: "joined", consent: false, members: [...new Set([...(fb.members || []), userName])], expiresAt: fb.expiresAt };
          gps = null; saveGroup(group); sessionStorage.removeItem(INVITE);
          setView("group");
          toast("그룹에 참여했어요!");
        }).catch(() => toast("그룹 조회 중 오류가 발생했어요."));
      } else {
        toast("그룹을 찾을 수 없어요. 코드를 확인해 주세요.");
      }
    }
  }
  window.ParkVisitor = {
    mount(user = {}) {
      this.unmount();
      userName = String(user.name || user.nickname || "방문객").slice(0, 30);
      group = readGroup();
      view = RESTORABLE.includes(user.view) ? user.view : "home";
      history.replaceState(null, "", `#visitor/${view}`);
      const code = new URLSearchParams(location.search).get("invite");
      if (code && /^[A-Z0-9]{6}$/i.test(code)) {
        sessionStorage.setItem(INVITE, code.toUpperCase());
        view = "join";
      }
      listener = click;
      submitListener = submit;
      root()?.addEventListener("click", listener);
      root()?.addEventListener("submit", submitListener);
      render();
    },
    unmount() {
      if (listener) root()?.removeEventListener("click", listener);
      if (submitListener) root()?.removeEventListener("submit", submitListener);
      listener = submitListener = null;
      clearTimeout(toast.timer);
      gps = null;
      closestPoint = null;
      clearMapState();
      visitorPosts.forEach((post) => { if (post.photoUrl) URL.revokeObjectURL(post.photoUrl); });
      visitorPosts = [];
      const target = root();
      if (target) target.innerHTML = "";
    },
    updateProfile(name) { userName = String(name).slice(0, 30); render(); },
    clearLocalSession() {
      localStorage.removeItem(STORAGE);
      sessionStorage.removeItem(INVITE);
      group = null;
      gps = null;
      closestPoint = null;
      clearMapState();
    },
  };
})();
