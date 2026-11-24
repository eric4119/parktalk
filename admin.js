/* 파크톡 관리자 페이지: 식단·가게·FAQ를 서버(data/admin.json)에 저장한다. */
(() => {
  const TOKEN_KEY = "parktalk-admin-token";
  const root = document.getElementById("adminApp");
  const D = window.ParkData;
  let token = sessionStorage.getItem(TOKEN_KEY) || "";
  let data = null; // { faq, stores, menus, updatedAt }
  let tab = "menus";
  let menuDate = D.todayKey();
  let editing = null; // 수정 중인 항목 id
  let busy = false;
  let official = null; // official-faq.json (공식 안내 원본, 읽기 전용)
  let officialQuery = "";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const weekday = (key) => ["일", "월", "화", "수", "목", "금", "토"][new Date(`${key}T00:00:00Z`).getUTCDay()];

  function toast(message) {
    const el = document.getElementById("adminToast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== "api/admin/login") {
      logoutLocal();
      throw new Error(body.error || "다시 로그인해 주세요.");
    }
    if (!response.ok) {
      const error = new Error(body.error || "요청에 실패했어요.");
      error.status = response.status;
      error.data = body.data;
      throw error;
    }
    return body;
  }

  function logoutLocal() {
    token = "";
    data = null;
    sessionStorage.removeItem(TOKEN_KEY);
    render();
  }

  async function loadData() {
    data = await api("api/admin/data");
    render();
  }

  // 바뀐 부분(section)만 서버에 보낸다. 다른 관리자가 먼저 저장했으면 409로 막힌다.
  async function save(section, items, message) {
    if (busy) return;
    busy = true;
    try {
      data = await api("api/admin/data", { method: "PUT", body: JSON.stringify({ [section]: items, baseUpdatedAt: data.updatedAt }) });
      editing = null;
      render();
      toast(message);
    } catch (error) {
      if (error.status === 409 && error.data) { data = error.data; render(); }
      toast(error.message);
    } finally {
      busy = false;
    }
  }

  // ---------- 화면 ----------
  function loginView() {
    return `<main class="ad-login">
      <form id="adLogin" class="ad-card">
        <h1>파크톡 관리자</h1>
        <p class="ad-muted">식단표, 주변 가게, FAQ를 관리해요.</p>
        <label>관리자 비밀번호<input name="password" type="password" autocomplete="current-password" required autofocus></label>
        <button class="ad-primary" type="submit">로그인</button>
        <p class="ad-hint">비밀번호는 서버의 .env 파일에 있는 ADMIN_PASSWORD 값이에요.</p>
      </form>
    </main>`;
  }

  function shell(content) {
    const tabs = [["menus", "식단"], ["stores", "주변 가게"], ["faq", "FAQ"], ["official", "공식 안내"]];
    return `<header class="ad-header">
      <div><strong>파크톡 관리자</strong><span class="ad-muted">${data.updatedAt ? `마지막 저장 ${new Date(data.updatedAt).toLocaleString("ko-KR")}` : "아직 저장한 적 없음 · 기본값 사용 중"}</span></div>
      <div class="ad-header__actions"><a href="./" target="_blank" rel="noopener">앱 열기</a><button type="button" data-action="logout">로그아웃</button></div>
    </header>
    <nav class="ad-tabs">${tabs.map(([id, label]) => `<button type="button" data-tab="${id}" class="${tab === id ? "active" : ""}">${label}</button>`).join("")}</nav>
    <main class="ad-main">${content}</main>`;
  }

  function menusView() {
    const day = D.menusFor(menuDate, data.menus);
    const editItem = data.menus.find((m) => m.id === editing);
    const restaurants = [...new Set(data.menus.map((m) => m.restaurant))];
    const upcoming = [...new Set(data.menus.map((m) => m.date).filter((d) => d >= D.todayKey()))].slice(0, 14);
    return `<section class="ad-section">
      <div class="ad-row">
        <button type="button" data-action="day" data-shift="-1" aria-label="이전 날짜">◀</button>
        <input type="date" id="menuDate" value="${menuDate}">
        <strong>${weekday(menuDate)}요일${menuDate === D.todayKey() ? " · 오늘" : ""}</strong>
        <button type="button" data-action="day" data-shift="1" aria-label="다음 날짜">▶</button>
        <button type="button" data-action="today">오늘</button>
        <button type="button" data-action="copy-prev">전날 식단 복사</button>
      </div>
      ${upcoming.length ? `<div class="ad-chips">등록된 날짜: ${upcoming.map((d) => `<button type="button" data-goto="${d}" class="${d === menuDate ? "active" : ""}">${d.slice(5)}(${weekday(d)})</button>`).join("")}</div>` : ""}
      <div class="ad-grid">
        <div class="ad-list">
          ${day.length ? day.map((m) => `<article class="ad-card">
            <div class="ad-card__head"><strong>${esc(m.restaurant)}</strong><span class="ad-pill">${esc(m.meal)}</span></div>
            <p>${m.items.map(esc).join(" · ")}</p>
            <div class="ad-actions"><button type="button" data-edit="${m.id}">수정</button><button type="button" class="ad-danger" data-delete-menu="${m.id}">삭제</button></div>
          </article>`).join("") : `<p class="ad-empty">이 날짜에 등록된 식단이 없어요.</p>`}
        </div>
        <form id="menuForm" class="ad-card ad-form">
          <h2>${editItem ? "식단 수정" : "식단 추가"}</h2>
          <label>식당 이름<input name="restaurant" list="restaurantList" maxlength="40" required value="${esc(editItem?.restaurant || restaurants[0] || "")}" placeholder="예: 캐스트하우스 식당"></label>
          <datalist id="restaurantList">${restaurants.map((r) => `<option value="${esc(r)}">`).join("")}</datalist>
          <label>식사<select name="meal">${D.MEALS.map((meal) => `<option ${(editItem?.meal || "중식") === meal ? "selected" : ""}>${meal}</option>`).join("")}</select></label>
          <label>메뉴 <small>한 줄에 하나씩</small><textarea name="items" rows="7" required placeholder="흰쌀밥&#10;김치찌개&#10;계란말이">${esc((editItem?.items || []).join("\n"))}</textarea></label>
          <div class="ad-actions"><button class="ad-primary" type="submit">${editItem ? "수정 저장" : `${menuDate}에 추가`}</button>${editItem ? '<button type="button" data-action="cancel">취소</button>' : ""}</div>
        </form>
      </div>
    </section>`;
  }

  function storesView() {
    const editItem = data.stores.find((s) => s.id === editing);
    return `<section class="ad-section">
      <p class="ad-muted">제휴를 켜면 앱의 '가게 예약' 화면에 '캐스트 제휴' 배지와 혜택이 표시되고, AI 도우미도 제휴 가게로 안내해요. 가게와 확인한 뒤에만 켜 주세요.</p>
      <div class="ad-grid">
        <div class="ad-list">
          ${data.stores.map((s) => `<article class="ad-card ${s.partner ? "ad-card--partner" : ""}">
            <div class="ad-card__head"><strong>${esc(s.name)}</strong><span class="ad-pill">${esc(s.category || "분류 없음")}</span></div>
            <p class="ad-muted">${esc(s.address)}${s.phone ? ` · ${esc(s.phone)}` : ""}</p>
            ${s.note ? `<p>${esc(s.note)}</p>` : ""}
            <p>${s.partner ? `<strong class="ad-partner">캐스트 제휴</strong> ${esc(s.benefit || "혜택 내용 미입력")}` : '<span class="ad-muted">제휴 확인 전</span>'}</p>
            <div class="ad-actions"><button type="button" data-edit="${s.id}">수정</button><button type="button" class="ad-danger" data-delete-store="${s.id}">삭제</button></div>
          </article>`).join("") || '<p class="ad-empty">등록된 가게가 없어요.</p>'}
        </div>
        <form id="storeForm" class="ad-card ad-form">
          <h2>${editItem ? "가게 수정" : "가게 추가"}</h2>
          <label>가게 이름<input name="name" maxlength="60" required value="${esc(editItem?.name)}"></label>
          <label>분류<input name="category" maxlength="30" value="${esc(editItem?.category)}" placeholder="예: 한식·솥밥"></label>
          <label>주소<input name="address" maxlength="120" value="${esc(editItem?.address)}"></label>
          <label>전화번호<input name="phone" maxlength="20" value="${esc(editItem?.phone)}"></label>
          <label>메모<input name="note" maxlength="200" value="${esc(editItem?.note)}" placeholder="주차, 단체석 등"></label>
          <label class="ad-check"><input type="checkbox" name="partner" ${editItem?.partner ? "checked" : ""}> 캐스트 제휴 가게</label>
          <label>제휴 혜택<input name="benefit" maxlength="200" value="${esc(editItem?.benefit)}" placeholder="예: 사원증 제시 시 10% 할인"></label>
          <div class="ad-actions"><button class="ad-primary" type="submit">${editItem ? "수정 저장" : "가게 추가"}</button>${editItem ? '<button type="button" data-action="cancel">취소</button>' : ""}</div>
        </form>
      </div>
    </section>`;
  }

  function faqView() {
    const editItem = data.faq.find((f) => f.id === editing);
    return `<section class="ad-section">
      <p class="ad-muted">AI 도우미는 여기 있는 답변만 사실로 안내해요. 키워드는 AI 서버를 못 쓸 때 FAQ 검색에 쓰여요.</p>
      <div class="ad-grid">
        <div class="ad-list">
          ${data.faq.map((f) => `<article class="ad-card">
            <strong>Q. ${esc(f.question)}</strong>
            <p>${esc(f.answer)}</p>
            ${f.keywords.length ? `<div class="ad-tags">${f.keywords.map((k) => `<span>${esc(k)}</span>`).join("")}</div>` : ""}
            <div class="ad-actions"><button type="button" data-edit="${f.id}">수정</button><button type="button" class="ad-danger" data-delete-faq="${f.id}">삭제</button></div>
          </article>`).join("") || '<p class="ad-empty">등록된 FAQ가 없어요.</p>'}
        </div>
        <form id="faqForm" class="ad-card ad-form">
          <h2>${editItem ? "FAQ 수정" : "FAQ 추가"}</h2>
          <label>질문<input name="question" maxlength="120" required value="${esc(editItem?.question)}"></label>
          <label>키워드 <small>쉼표로 구분</small><input name="keywords" value="${esc((editItem?.keywords || []).join(", "))}" placeholder="예: 주차, 주차장, 차"></label>
          <label>답변<textarea name="answer" rows="7" maxlength="1000" required>${esc(editItem?.answer)}</textarea></label>
          <div class="ad-actions"><button class="ad-primary" type="submit">${editItem ? "수정 저장" : "FAQ 추가"}</button>${editItem ? '<button type="button" data-action="cancel">취소</button>' : ""}</div>
        </form>
      </div>
    </section>`;
  }

  async function loadOfficial() {
    try { official = await fetch("official-faq.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { items: [], categories: [] })); }
    catch { official = { items: [], categories: [] }; }
    render();
  }

  function officialView() {
    if (!official) { loadOfficial(); return '<p class="ad-empty">공식 안내를 불러오는 중…</p>'; }
    const disabled = new Set(data.officialDisabled || []);
    const counts = {};
    official.items.forEach((item) => { counts[item.cat] = (counts[item.cat] || 0) + 1; });
    const enabledCount = official.items.filter((item) => !disabled.has(item.cat)).length;
    const results = officialQuery ? D.searchOfficial(officialQuery, official.items, 5, [...disabled]) : [];
    return `<section class="ad-section">
      <p class="ad-muted">에버랜드 공식 홈페이지의 자주하는 질문·이용 안내 사항·교통정보를 모은 자료예요(${official.fetchedAt ? `${new Date(official.fetchedAt).toLocaleDateString("ko-KR")} 수집` : "수집일 미상"}). AI 도우미는 질문과 관련된 항목만 골라 출처와 기준일을 붙여 답해요. 파크톡과 상관없는 카테고리는 꺼 두세요.</p>
      <div class="ad-grid">
        <div class="ad-card">
          <h2>카테고리 <small class="ad-muted">사용 중 ${enabledCount} / 전체 ${official.items.length}개</small></h2>
          <div class="ad-cats">${official.categories.map((cat) => `<label class="ad-check"><input type="checkbox" data-official-cat="${esc(cat)}" ${disabled.has(cat) ? "" : "checked"}> ${esc(cat)} <span class="ad-muted">${counts[cat] || 0}</span></label>`).join("")}</div>
          <div class="ad-actions"><button class="ad-primary" type="button" data-action="save-official">카테고리 설정 저장</button></div>
        </div>
        <div class="ad-card ad-form">
          <h2>검색 미리보기</h2>
          <p class="ad-hint">손님이 이렇게 물으면 AI에게 어떤 공식 안내가 전달되는지 확인해요.</p>
          <form id="officialSearch" class="ad-row"><input name="q" value="${esc(officialQuery)}" placeholder="예: 반려동물 데려가도 돼?"><button type="submit">검색</button></form>
          ${officialQuery ? (results.length ? results.map((item) => `<article class="ad-card"><div class="ad-card__head"><strong>${esc(item.q)}</strong><span class="ad-pill">${esc(item.cat)}</span></div><p>${esc(item.a)}</p><p class="ad-hint">기준일 ${esc(item.date)} · 점수 ${item.score}</p></article>`).join("") : '<p class="ad-empty">맞는 공식 안내가 없어요. 이런 질문은 FAQ 탭에서 직접 추가해 주세요.</p>') : ""}
          <details class="ad-hint"><summary>최신 내용으로 갱신하는 방법</summary>
            <p>1) 에버랜드 FAQ를 다시 받아 everland-faq.json으로 저장 → 2) 프로젝트 폴더에서 <code>node scripts/build-official.cjs 받은파일경로</code> 실행 → 3) 서버 재시작. 이용 안내·교통 페이지 내용은 official/guide-pages.json에서 고쳐요.</p>
          </details>
        </div>
      </div>
    </section>`;
  }

  function render() {
    if (!token) { root.innerHTML = loginView(); return; }
    if (!data) { root.innerHTML = '<p class="ad-empty">불러오는 중…</p>'; return; }
    root.innerHTML = shell(tab === "menus" ? menusView() : tab === "stores" ? storesView() : tab === "official" ? officialView() : faqView());
  }

  // ---------- 이벤트 ----------
  root.addEventListener("click", (event) => {
    const b = event.target.closest("button");
    if (!b) return;
    if (b.dataset.tab) { tab = b.dataset.tab; editing = null; render(); return; }
    if (b.dataset.goto) { menuDate = b.dataset.goto; editing = null; render(); return; }
    if (b.dataset.edit) { editing = b.dataset.edit; render(); root.querySelector(".ad-form input")?.focus(); return; }
    if (b.dataset.deleteMenu && confirmDelete()) return save("menus", data.menus.filter((m) => m.id !== b.dataset.deleteMenu), "식단을 삭제했어요.");
    if (b.dataset.deleteStore && confirmDelete()) return save("stores", data.stores.filter((s) => s.id !== b.dataset.deleteStore), "가게를 삭제했어요.");
    if (b.dataset.deleteFaq && confirmDelete()) return save("faq", data.faq.filter((f) => f.id !== b.dataset.deleteFaq), "FAQ를 삭제했어요.");
    const action = b.dataset.action;
    if (action === "logout") { api("api/admin/logout", { method: "POST" }).catch(() => {}); logoutLocal(); }
    if (action === "cancel") { editing = null; render(); }
    if (action === "save-official") {
      const off = [...root.querySelectorAll("[data-official-cat]")].filter((box) => !box.checked).map((box) => box.dataset.officialCat);
      save("officialDisabled", off, off.length ? `공식 안내 카테고리 ${off.length}개를 껐어요.` : "공식 안내 카테고리를 모두 켰어요.");
    }
    if (action === "day") { menuDate = D.shiftDate(menuDate, Number(b.dataset.shift)); editing = null; render(); }
    if (action === "today") { menuDate = D.todayKey(); editing = null; render(); }
    if (action === "copy-prev") {
      const prev = D.menusFor(D.shiftDate(menuDate, -1), data.menus);
      if (!prev.length) return toast("전날 등록된 식단이 없어요.");
      const copies = prev.map((m) => ({ ...m, id: newId("menu"), date: menuDate }));
      save("menus", [...data.menus, ...copies], `전날 식단 ${copies.length}개를 복사했어요.`);
    }
  });

  function confirmDelete() {
    return window.confirm("정말 삭제할까요? 앱과 AI 도우미에서 바로 사라져요.");
  }

  root.addEventListener("change", (event) => {
    if (event.target.id === "menuDate" && event.target.value) { menuDate = event.target.value; editing = null; render(); }
  });

  root.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const f = new FormData(form);
    if (form.id === "adLogin") {
      try {
        const result = await api("api/admin/login", { method: "POST", body: JSON.stringify({ password: f.get("password") }) });
        token = result.token;
        sessionStorage.setItem(TOKEN_KEY, token);
        render();
        await loadData();
      } catch (error) { toast(error.message); }
      return;
    }
    if (form.id === "officialSearch") { officialQuery = String(f.get("q") || "").trim(); render(); return; }
    if (form.id === "menuForm") {
      const item = { id: editing || newId("menu"), date: editing ? data.menus.find((m) => m.id === editing)?.date || menuDate : menuDate, restaurant: f.get("restaurant"), meal: f.get("meal"), items: String(f.get("items") || "").split("\n") };
      const menus = editing ? data.menus.map((m) => (m.id === editing ? item : m)) : [...data.menus, item];
      return save("menus", menus, editing ? "식단을 수정했어요." : "식단을 추가했어요.");
    }
    if (form.id === "storeForm") {
      const item = { id: editing || newId("store"), name: f.get("name"), category: f.get("category"), address: f.get("address"), phone: f.get("phone"), note: f.get("note"), partner: f.get("partner") === "on", benefit: f.get("benefit") };
      const stores = editing ? data.stores.map((s) => (s.id === editing ? item : s)) : [...data.stores, item];
      return save("stores", stores, editing ? "가게 정보를 수정했어요." : "가게를 추가했어요.");
    }
    if (form.id === "faqForm") {
      const item = { id: editing || newId("faq"), question: f.get("question"), keywords: f.get("keywords"), answer: f.get("answer") };
      const faq = editing ? data.faq.map((x) => (x.id === editing ? item : x)) : [...data.faq, item];
      return save("faq", faq, editing ? "FAQ를 수정했어요." : "FAQ를 추가했어요.");
    }
  });

  render();
  if (token) loadData().catch((error) => toast(error.message));
})();
