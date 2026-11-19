/* ParkTalk visitor prototype. Group state stays in this browser; GPS coordinates never do. */
(() => {
  const STORAGE = "parktalk-visitor-group-v1";
  const INVITE = "parktalk-visitor-invite-v1";
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
  let notice = "";

  function toast(message) {
    notice = message;
    render();
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      notice = "";
      render();
    }, 3600);
  }
  function icon(name) {
    const paths = {
      home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
      people:
        '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M17 6a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1"/>',
      map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      shield:
        '<path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
      arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
      spark:
        '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/>',
      back: '<path d="M19 12H5m6 6-6-6 6-6"/>',
      link: '<path d="M10 13a5 5 0 0 0 7 .2l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7-.2l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  }
  function navigation() {
    const links = [
      ["home", "홈", "home"],
      ["people", "일행", "group"],
      ["map", "지도", "map"],
      ["user", "앱 설정", "profile"],
    ];
    return links
      .map(
        ([glyph, label, target]) =>
          `<button type="button" class="pv-nav-item ${view === target ? "is-active" : ""}" data-pv-view="${target}" ${view === target ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span>
</button>`,
      )
      .join("");
  }
  function header() {
    return `<header class="pv-header">
<div>
<span class="pv-wordmark">ParkTalk</span>
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
      ${title("에버랜드에서 함께", `${escapeHtml(userName)}님,<br>오늘은 누구와 함께 왔나요?`, "일행을 만들고 서로를 더 쉽게 찾아보세요.")}
      <section class="pv-hero" aria-label="일행 찾기 안내">
        <div class="pv-hero-sun">
</div>
<div class="pv-hero-cloud">
</div>
<div class="pv-hero-path">
</div>
        <div class="pv-hero-pin pv-hero-pin-a">${icon("pin")}</div>
<div class="pv-hero-pin pv-hero-pin-b">${icon("pin")}</div>
        <div class="pv-hero-content">
<span>우리, 다시 만날 시간</span>
<strong>파크 안에서<br>일행을 찾아보세요</strong>
<p>서로 동의한 경우에만 위치를 확인할 수 있어요.</p>
</div>
      </section>
      <div class="pv-section-heading">
<h2>일행과 연결하기</h2>
<span>STEP 01</span>
</div>
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
<label for="pv-duration">그룹 유지 시간</label>
<select id="pv-duration" name="duration">
<option value="2">2시간</option>
<option value="4" selected>4시간</option>
<option value="8">8시간</option>
</select>
<button class="pv-button" type="submit">시연 그룹 만들기 ${icon("arrow")}</button>
</form>
      <div class="pv-privacy-callout">${icon("shield")}<p>그룹은 설정한 시간이 지나면 이 브라우저에서 자동 종료돼요. 실제 사용자 초대와 위치 교환은 서버 연동 후 제공됩니다.</p>
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
      <div class="pv-privacy-callout">${icon("shield")}<p>현재는 브라우저 단독 시연입니다. 다른 기기의 그룹 존재 여부는 확인할 수 없고, 실제 일행과 연결되지는 않아요.</p>
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
<p class="pv-group-expiry">${new Date(group.expiresAt).toLocaleString("ko-KR", { hour: "numeric", minute: "2-digit" })}에 이 브라우저에서 자동 종료됩니다.</p>
<button type="button" class="pv-button" data-pv-copy="link">시연 초대 링크 복사 ${icon("arrow")}</button>
<p class="pv-field-hint">복사한 링크는 같은 기기에서 화면 흐름을 확인하는 용도예요.</p>
</div>
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
<span class="pv-map-poi pv-map-poi-b">중앙광장</span>${gps ? `<span class="pv-own-pin" aria-label="내 위치 권한 허용됨">${icon("pin")}</span>` : ""}<div class="pv-map-watermark">실제 공원 지도가 아닌 시연 배경</div>
</div>
      <div class="pv-map-sheet">
<div class="pv-sheet-handle">
</div>
<div class="pv-map-sheet-head">
<div>
<strong>일행 위치</strong>
<p>그룹 코드 ${group.code}</p>
</div>
<span>1명 · 이 브라우저</span>
</div>
<div class="pv-member-row">
<span class="pv-member-avatar">${escapeHtml(userName.slice(0, 1))}</span>
<div>
<strong>${escapeHtml(userName)} (나)</strong>
<small>${gps ? "기기 위치 권한 확인됨 · 좌표 저장 안 함" : group.consent ? "동의됨 · 위치 확인 전" : "위치 표시 꺼짐"}</small>
</div>
</div>
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
<small>방문객 계정 · 시연 로그인</small>
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
      <button type="button" class="pv-secondary-button pv-wide" data-auth-action="switch">이용 모드 다시 선택</button>
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
      create: "그룹 만들기",
      join: "그룹 참여",
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
        create,
        join,
        consent: consentPage,
        map: mapPage,
        profile: profilePage,
      }[view]?.() || home();
    target.innerHTML = `<div class="pv-shell">
<aside class="pv-sidebar">
<div class="pv-sidebar-brand">${icon("spark")}<strong>ParkTalk</strong>
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
  function setView(next) {
    view = next;
    render();
    window.scrollTo?.(0, 0);
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
        saveGroup(null);
        group = null;
        gps = null;
        setView("group");
        toast("그룹을 종료했어요.");
        break;
      case "logout":
        window.ParkAuth?.logout?.();
        break;
    }
  }
  function submit(event) {
    if (!root()?.contains(event.target)) return;
    if (event.target.id === "pv-create-form") {
      event.preventDefault();
      const name = String(
        new FormData(event.target).get("groupName") || "",
      ).trim();
      if (name.length < 2 || name.length > 24)
        return toast("그룹 이름을 2~24자로 입력해 주세요.");
      const hours = Number(new FormData(event.target).get("duration"));
      group = {
        name,
        code: makeCode(),
        source: "created",
        consent: false,
        expiresAt: Date.now() + (hours || 4) * 3600000,
      };
      gps = null;
      saveGroup(group);
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
      group = {
        name: "초대받은 시연 그룹",
        code,
        source: "joined",
        consent: false,
        expiresAt: Date.now() + 4 * 3600000,
      };
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
      view = "home";
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
