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
    { id: "amazon", name: "아마존 스낵", zone: "zootopia", number: "228", kind: "간식", detail: "핫도그 · 츄러스", terms: "핫도그 츄러스 간식 아마존 스낵" },
    { id: "newdel", name: "뉴델 스낵", zone: "american", number: "67", kind: "간식", detail: "핫도그 · 츄러스", terms: "핫도그 츄러스 간식 뉴델 스낵" },
    { id: "merlin", name: "멀린스 스낵", zone: "magic", number: "139", kind: "간식", detail: "핫도그 · 츄러스", terms: "핫도그 츄러스 간식 멀린스 스낵" },
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
  let midpointSuggestion = false;
  let notice = "";
  let boardKind = "praise";
  let visitorPosts = [];
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
    return `<header class="pv-header">
<div>
<button type="button" class="pv-logo-home" data-pv-view="home" aria-label="파크톡 홈으로 이동"><img class="pv-logo" src="assets/parktalk-logo-transparent.png" alt="ParkTalk 파크톡 로고"></button>
<span class="pv-role">VISITOR</span>
</div>
<button type="button" class="pv-profile-shortcut" data-pv-view="profile" aria-label="앱 설정 열기">${escapeHtml(userName.slice(0, 1))}</button>
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
<strong>새 그룹 만들기</strong>
<small>일행을 초대하고 시작하기</small>${icon("arrow")}</button>
<button type="button" class="pv-action-card" data-pv-view="join">
<span class="pv-action-icon pv-mint">${icon("link")}</span>
<strong>초대 코드로 참여</strong>
<small>일행이 보낸 코드 입력하기</small>${icon("arrow")}</button>
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
<button type="button" class="pv-back" data-pv-view="group">${icon("back")} 일행으로 돌아가기</button>
      ${title("그룹 만들기 · 01", "오늘 함께할<br>일행의 이름을 지어주세요", "초대 코드로 같은 그룹에 참여할 수 있어요.")}
      <form id="pv-create-form" class="pv-card pv-form-card">
<label for="pv-group-name">그룹 이름</label>
<input id="pv-group-name" name="groupName" type="text" maxlength="24" minlength="2" autocomplete="off" placeholder="예: 우리 가족, 대학 동기" required>
<p class="pv-field-hint">2~24자로 입력해 주세요.</p>
<p class="pv-field-hint">그룹은 오늘 밤 12시에 자동 종료됩니다.</p>
<button class="pv-button" type="submit">시연 그룹 만들기 ${icon("arrow")}</button>
</form>
      <div class="pv-privacy-callout">${icon("shield")}<p>그룹은 오늘 밤 12시에 이 브라우저에서 자동 종료돼요. 실제 사용자 초대와 위치 교환은 서버 연동 후 제공됩니다.</p>
</div>
    </div>`;
  }
  function join() {
    const code = sessionStorage.getItem(INVITE) || "";
    return `<div class="pv-content pv-form-page">
<button type="button" class="pv-back" data-pv-view="group">${icon("back")} 일행으로 돌아가기</button>
      ${title("그룹 참여 · 01", "일행의 초대 코드를<br>입력해 주세요", "초대 링크로 왔다면 코드가 채워져 있어요.")}
      <form id="pv-join-form" class="pv-card pv-form-card">
<label for="pv-invite-code">초대 코드</label>
<input id="pv-invite-code" name="inviteCode" type="text" maxlength="6" minlength="6" autocomplete="off" inputmode="text" placeholder="6자리 코드" value="${escapeHtml(code)}" required>
<p class="pv-field-hint">영문 대문자와 숫자 6자리</p>
<button class="pv-button" type="submit">시연 그룹에 참여 ${icon("arrow")}</button>
</form>
      <div class="pv-privacy-callout">${icon("shield")}<p>이 브라우저에서 만든 시연 그룹의 코드만 확인할 수 있어요. 다른 기기의 일행과 연결하려면 서버가 필요합니다.</p>
</div>
    </div>`;
  }
  function groupPage() {
    if (!group)
      return `<div class="pv-content">${title("일행 찾기", "일행과 연결해 보세요", "그룹을 만들거나 받은 코드로 참여할 수 있어요.")}<div class="pv-action-grid pv-group-actions">
<button type="button" class="pv-action-card" data-pv-view="create">
<span class="pv-action-icon pv-purple">${icon("people")}</span>
<strong>새 그룹 만들기</strong>
<small>시연 그룹 시작하기</small>${icon("arrow")}</button>
<button type="button" class="pv-action-card" data-pv-view="join">
<span class="pv-action-icon pv-mint">${icon("link")}</span>
<strong>초대 코드로 참여</strong>
<small>6자리 코드 입력하기</small>${icon("arrow")}</button>
</div>
<div class="pv-empty-note">초대 링크나 코드는 실제 여러 사용자와 연결되지 않는 시연 기능입니다.</div>
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
      return `<div class="pv-content">${title("일행 지도", "먼저 그룹에 참여해 주세요", "그룹을 만든 뒤 지도를 이용할 수 있어요.")}<button type="button" class="pv-button" data-pv-view="group">일행으로 이동 ${icon("arrow")}</button>
</div>`;
    return `<div class="pv-map-page">
<div class="pv-map-heading">
<div>
<span class="pv-eyebrow">${escapeHtml(group.name)}</span>
<h1>일행 찾기</h1>
</div>
<span class="pv-map-demo">시연 지도</span>
</div>
      <div class="pv-schematic-map" role="img" aria-label="에버랜드 일행 지도 자리 표시자. 실제 위치와 연결되지 않은 시연 지도">
<div class="pv-map-green pv-map-green-a">
</div>
<div class="pv-map-green pv-map-green-b">
</div>
<div class="pv-map-green pv-map-green-c">
</div>
<div class="pv-map-walk pv-map-walk-a">
</div>
<div class="pv-map-walk pv-map-walk-b">
</div>
<span class="pv-map-poi pv-map-poi-a">모임 장소</span>
<span class="pv-map-poi pv-map-poi-b">중앙광장</span>${(group.members || [userName]).map((member, index) => `<span class="pv-sim-pin pv-sim-pin-${index % 4} pv-member-${index % 4}" aria-label="${escapeHtml(member)} 시연 표시">${escapeHtml(member.slice(0, 1))}</span>`).join("")}${midpointSuggestion ? `<span class="pv-midpoint-pin">${icon("pin")} 집합장소 예시</span>` : ""}<div class="pv-map-watermark">실제 공원 지도가 아닌 시연 배경</div>
</div>
      <div class="pv-map-sheet">
<div class="pv-sheet-handle">
</div>
<div class="pv-map-sheet-head">
<div>
<strong>일행 위치</strong>
<p>그룹 코드 ${group.code}</p>
</div>
<span>${(group.members || [userName]).length}명 · 시연</span>
</div>
${(group.members || [userName]).map((member, index) => `<div class="pv-member-row"><span class="pv-member-avatar pv-member-${index % 4}">${escapeHtml(member.slice(0, 1))}</span><div><strong>${escapeHtml(member)}${index === 0 ? " (나)" : ""}</strong><small>${index === 0 ? gps ? "기기 위치 권한 확인됨 · 좌표 저장 안 함" : group.consent ? "동의됨 · 위치 확인 전" : "위치 표시 꺼짐" : "시연 인원 · 실제 위치 연결 전"}</small></div></div>`).join("")}
<div class="pv-midpoint"><strong>집합장소 예시 · 시연</strong><p>${midpointSuggestion ? "중앙광장 — 모두가 알기 쉬운 만남 장소 예시입니다." : "버튼을 눌러 집합장소 예시를 확인하세요."}</p><button type="button" class="pv-secondary-button" data-pv-action="midpoint">집합장소 추천 보기</button><small>현재는 일행 좌표로 중간 지점을 계산하지 않습니다.</small></div>
<p class="pv-map-limitation">다른 일행의 실시간 위치는 서버·지도 연동 후 표시됩니다.</p>${
      group.consent
        ? `<button type="button" class="pv-button" data-pv-action="locate">${icon("pin")} 내 기기 위치 확인하기</button>
<button type="button" class="pv-secondary-button" data-pv-action="revoke">위치 표시 동의 취소</button>`
        : `<button type="button" class="pv-button" data-pv-view="consent">위치 표시 동의하기 ${icon("arrow")}</button>`
    }</div>
    </div>`;
  }
  function profilePage() {
    return `<div class="pv-content">${title("앱 설정", `${escapeHtml(userName)}님`, "일반 사용자 모드로 이용 중입니다.")}
      <div class="pv-card pv-profile-card">
<span class="pv-profile-avatar">${escapeHtml(userName.slice(0, 1))}</span>
<div>
<strong>${escapeHtml(userName)}</strong>
<small>${window.ParkAuth?.accountRole?.() === "cast" ? "캐스트 계정 · 일반 사용자 모드" : "방문객 계정 · 시연 로그인"}</small>
</div>
</div>
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
    target.innerHTML = `<div class="pv-shell">
<aside class="pv-sidebar">
<div class="pv-sidebar-brand"><button type="button" class="pv-logo-home" data-pv-view="home" aria-label="파크톡 홈으로 이동"><img class="pv-logo" src="assets/parktalk-logo-transparent.png" alt="ParkTalk 파크톡 로고"></button>
<small>방문객 모드</small>
</div>
<nav aria-label="일반 사용자 메뉴">${navigation()}</nav>
<div class="pv-sidebar-foot">
<span class="pv-profile-avatar">${escapeHtml(userName.slice(0, 1))}</span>
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
  }
  // 새로고침해도 다시 열 수 있는 화면(다른 화면은 직전 선택 상태가 필요해서 홈으로 돌아간다)
  const RESTORABLE = ["home", "board", "group", "map", "profile", "explore", "create", "join"];
  function setView(next) {
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
    if (button.dataset.pvBoard) { boardKind = button.dataset.pvBoard; return setView("board"); }
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
          group.consent = false;
          gps = null;
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
        break;
      case "locate":
        if (!group?.consent) return setView("consent");
        if (!navigator.geolocation)
          return toast("이 브라우저에서는 위치 확인을 지원하지 않아요.");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            gps = { accuracy: position.coords.accuracy };
            toast(
              "기기 위치 권한을 확인했어요. 좌표는 저장하거나 전송하지 않습니다.",
            );
          },
          () =>
            toast(
              "기기 위치를 확인하지 못했어요. 브라우저 권한을 확인해 주세요.",
            ),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
        );
        break;
      case "revoke":
        if (!group) return;
        group.consent = false;
        gps = null;
        saveGroup(group);
        toast("위치 표시 동의를 취소했어요.");
        break;
      case "end":
        if (group?.source === "created") {
          const groups = demoGroups();
          delete groups[group.code];
          saveDemoGroups(groups);
        }
        saveGroup(null);
        group = null;
        gps = null;
        setView("group");
        toast("그룹을 종료했어요.");
        break;
      case "midpoint":
        midpointSuggestion = true;
        render();
        break;
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
    } else if (event.target.id === "pv-board-form") {
      event.preventDefault();
      const data = new FormData(event.target);
      const photo = data.get("photo");
      if (photo instanceof File && photo.size > 3_000_000) return toast("사진은 3MB 이하로 선택해 주세요.");
      const post = { kind: boardKind, title: String(data.get("title") || ""), body: String(data.get("body") || ""), age: String(data.get("age") || ""), gender: String(data.get("gender") || ""), clothes: String(data.get("clothes") || ""), place: String(data.get("place") || ""), photoUrl: photo instanceof File && photo.size ? URL.createObjectURL(photo) : "" };
      visitorPosts.unshift(post);
      render();
      toast("게시글 화면에 표시했어요. 실제 접수나 공유는 되지 않습니다.");
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
      setView("group");
      toast(
        "시연 그룹을 만들었어요. 실제 일행 연결은 서버 구현 후 가능합니다.",
      );
    } else if (event.target.id === "pv-join-form") {
      event.preventDefault();
      const code = String(new FormData(event.target).get("inviteCode") || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      if (!/^[A-Z0-9]{6}$/.test(code))
        return toast("영문과 숫자 6자리 코드를 입력해 주세요.");
      const matchingGroup = demoGroups()[code];
      if (!matchingGroup)
        return toast("이 브라우저에서 만든 시연 그룹을 찾지 못했어요. 다른 기기의 코드는 서버 연결 후 사용할 수 있습니다.");
      group = {
        name: matchingGroup.name,
        code,
        source: "joined",
        consent: false,
        members: [...new Set([...(matchingGroup.members || []), userName])],
        expiresAt: matchingGroup.expiresAt,
      };
      saveDemoGroups({ ...demoGroups(), [code]: { ...matchingGroup, members: group.members } });
      gps = null;
      saveGroup(group);
      sessionStorage.removeItem(INVITE);
      setView("group");
      toast(
        "코드 화면을 체험 중입니다. 다른 사용자와 실제 연결되지는 않았어요.",
      );
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
      visitorPosts.forEach((post) => { if (post.photoUrl) URL.revokeObjectURL(post.photoUrl); });
      visitorPosts = [];
      const target = root();
      if (target) target.innerHTML = "";
    },
    clearLocalSession() {
      localStorage.removeItem(STORAGE);
      sessionStorage.removeItem(INVITE);
      group = null;
      gps = null;
    },
  };
})();
