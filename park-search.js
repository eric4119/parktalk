/* 통합 검색: 한 번 입력하면 장소(에버랜드 공식 지도 + 대표 메뉴·가격), 이용 안내(공식 FAQ), 게시판 글을 함께 찾는다.
 * 캐스트 모드(script.js의 search 페이지)와 일반 사용자 모드(visitor.js의 explore 화면)가 같은 화면을 쓴다.
 * 필요: park-data.js, places.js. 게시판 검색은 boards.js가 있으면 같이 한다(그 모드에서 볼 수 있는 글만).
 *
 *   ParkSearch.page(mode, { back, popular, shortcuts })  → 검색 화면 HTML (mode: "cast" | "visitor")
 *     shortcuts: [{ pattern: /식단/, label, desc, attr: 'data-nav="menu"' }] — 검색어가 맞으면 앱 화면 바로가기를 맨 위에 보여 준다
 *   ParkSearch.focus(mode)                    → 화면을 그린 뒤 검색칸에 커서 두기
 */
(() => {
  const LIMIT = { places: 10, placesShown: 5, guide: 2, official: 3, posts: 3 };
  const RECENT_KEY = "pk_recent"; // 캐스트 검색 화면이 쓰던 최근 검색어 저장소를 그대로 쓴다
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const cut = (value, n) => { const s = String(value || "").replace(/\s+/g, " ").trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };
  const won = (n) => (n ? `${Number(n).toLocaleString("ko-KR")}원` : "");
  const icon = (name) => (window.ParkIcons ? window.ParkIcons(name) : "");

  const queries = { cast: "", visitor: "" };
  const options = { cast: {}, visitor: {} };

  // ---- 데이터: 시설 + 공식 안내. 처음 필요할 때 한 번만 받는다. ----
  let official = null;
  let loading = null;
  async function loadOfficial() {
    if (official) return official;
    try {
      const response = await fetch("official-faq.json");
      official = response.ok ? (await response.json()).items || [] : [];
    } catch { official = []; }
    return official;
  }
  function ready() {
    if (!loading) {
      loading = Promise.all([loadOfficial(), window.ParkPlaces.load()]).then(() => {
        if (window.ParkPlaces.state.failed) loading = null; // 장소 파일을 못 받았으면 다음에 다시 시도
        for (const mode of Object.keys(queries)) refresh(mode);
      });
    }
    return loading;
  }
  const isReady = () => Boolean(official && (window.ParkPlaces.state.loaded || window.ParkPlaces.state.failed));

  function run(query) {
    const q = String(query || "").trim();
    if (!q) return { guide: [], places: [], official: [], posts: [] };
    return {
      guide: window.ParkData.searchFaq(q, LIMIT.guide), // 파크톡 안내(관리자 페이지 'FAQ'에서 관리)
      places: window.ParkPlaces.search(q, window.ParkPlaces.state.items, LIMIT.places),
      official: window.ParkData.searchOfficial(q, official || [], LIMIT.official),
      posts: window.ParkBoards?.search?.(q, LIMIT.posts) || [],
    };
  }

  // ---- 최근 검색어(이 브라우저에만 저장) ----
  function recent() {
    try { return (JSON.parse(localStorage.getItem(RECENT_KEY)) || []).filter((x) => typeof x === "string").slice(0, 10); }
    catch { return []; }
  }
  function saveRecent(list) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10))); } catch { /* 저장 못 해도 검색은 된다 */ }
  }
  function remember(query) {
    const q = String(query || "").trim().slice(0, 40);
    if (q) saveRecent([q, ...recent().filter((x) => x !== q)]);
  }

  // ---- 결과 카드 ----
  // 검색어와 맞는 메뉴를 앞에 보여 준다("핫도그" 검색 → 그 가게의 핫도그 가격이 먼저).
  function menuLine(item, query) {
    const menu = item.menu || [];
    if (!menu.length) return "";
    const terms = window.ParkData.text.stems(query).map(window.ParkData.text.compact).filter(Boolean);
    const hit = (name) => terms.some((t) => window.ParkData.text.compact(name).includes(t));
    const sorted = [...menu.filter(([name]) => hit(name)), ...menu.filter(([name]) => !hit(name))].slice(0, 3);
    return `<ul class="ps-menu">${sorted.map(([name, price]) => `<li class="${hit(name) ? "is-hit" : ""}"><span>${esc(name)}</span><b>${esc(won(price))}</b></li>`).join("")}</ul>`;
  }
  function placeCard(item, query) {
    const P = window.ParkPlaces;
    const hours = P.hours(item);
    const where = item.loc.length > 1 ? `파크 안 ${item.loc.length}곳` : item.zone;
    const menu = menuLine(item, query);
    return `<article class="ps-card ps-place">
      <div class="ps-place__top"><span class="ps-pill">${esc(item.cats.join(" · "))}</span><span class="ps-zone">${esc(where)}</span></div>
      <h3>${esc(item.name)}</h3>
      <p class="ps-meta">${hours ? `운영 ${esc(hours)}` : "운영시간 정보 없음"}${item.useCond ? ` · ${esc(cut(item.useCond, 40))}` : ""}</p>
      ${menu || (item.tags.length ? `<p class="ps-tags">${item.tags.slice(0, 5).map((tag) => `#${esc(tag)}`).join(" ")}</p>` : item.desc ? `<p class="ps-desc">${esc(cut(item.desc, 70))}</p>` : "")}
      <div class="ps-actions"><a class="ps-button" href="${esc(P.mapUrl(item))}" target="_blank" rel="noopener">${item.loc.length > 1 ? "공식 지도에서 보기" : "지도에서 위치 보기"}</a></div>
    </article>`;
  }
  function officialCard(item) {
    const link = /^https:\/\/(www\.|reservation\.)?everland\.com\//.test(item.url || "") ? item.url : "https://www.everland.com/cscenter/faq-list";
    return `<details class="ps-card ps-official">
      <summary><span class="ps-pill">${esc(item.cat)}</span><strong>${esc(item.q)}</strong></summary>
      <p>${esc(item.a)}</p>
      <a class="ps-link" href="${esc(link)}" target="_blank" rel="noopener">에버랜드 공식 안내에서 보기 ↗</a>
    </details>`;
  }
  function guideCard(item) {
    return `<details class="ps-card ps-official ps-guide">
      <summary><span class="ps-pill">파크톡 안내</span><strong>${esc(item.question)}</strong></summary>
      <p>${esc(item.answer)}</p>
    </details>`;
  }
  function postCard(post) {
    const replies = (post.replies || []).length;
    return `<button type="button" class="ps-card ps-post" data-pb-post="${esc(post.id)}">
      <span class="ps-pill">${esc(post.board)}</span>
      <strong>${esc(post.title)}</strong>
      ${post.body ? `<span class="ps-desc">${esc(cut(post.body, 60))}</span>` : ""}
      ${replies ? `<small class="ps-meta">댓글 ${replies}개</small>` : ""}
    </button>`;
  }
  const section = (name, count, body) => `<section class="ps-section"><div class="ps-section__head"><h2>${name}</h2><span>${count}</span></div>${body}</section>`;

  // 앱 안의 화면 바로가기(예: 캐스트 모드에서 "식단" → 식당 메뉴 화면)
  function shortcuts(mode, q) {
    const list = (options[mode].shortcuts || []).filter((item) => item.pattern.test(q));
    return list.length ? section("바로가기", `${list.length}개`, `<div class="ps-list">${list.map((item) => `<button type="button" class="ps-card ps-shortcut" ${item.attr}><strong>${esc(item.label)}</strong><span class="ps-desc">${esc(item.desc)}</span></button>`).join("")}</div>`) : "";
  }

  function results(q, mode) {
    if (!isReady()) { ready(); return '<p class="ps-note">검색 데이터를 불러오는 중이에요…</p>'; }
    const r = run(q);
    const quick = shortcuts(mode, q);
    const warn = window.ParkPlaces.state.failed ? '<p class="ps-empty">장소 정보(facilities.json)를 불러오지 못해서 장소는 빼고 검색했어요. 잠시 후 다시 검색해 보세요.</p>' : "";
    const total = r.guide.length + r.places.length + r.official.length + r.posts.length;
    if (!total && quick) return warn + quick;
    if (!total) return warn + `<div class="ps-empty"><p>'${esc(q)}'와(과) 관련된 장소·안내·글을 찾지 못했어요.</p><p class="ps-meta">다른 이름이나 더 짧은 단어로 검색해 보세요.</p></div>`;
    const cutAt = r.places.length > LIMIT.placesShown + 1 ? LIMIT.placesShown : r.places.length; // 숨길 게 1곳뿐이면 다 보여준다
    const shown = r.places.slice(0, cutAt), more = r.places.slice(cutAt);
    const date = (window.ParkPlaces.state.fetchedAt || "").slice(0, 10);
    return `${warn}${quick}<p class="ps-summary">'${esc(q)}' 검색 결과 ${total}건</p>
      ${r.guide.length ? section("파크톡 안내", `${r.guide.length}건`, `<div class="ps-list">${r.guide.map(guideCard).join("")}</div>`) : ""}
      ${r.places.length ? section("장소", `${r.places.length}곳`, `<div class="ps-list">${shown.map((item) => placeCard(item, q)).join("")}</div>
        ${more.length ? `<details class="ps-more"><summary>장소 ${more.length}곳 더 보기</summary><div class="ps-list">${more.map((item) => placeCard(item, q)).join("")}</div></details>` : ""}
        <p class="ps-note">에버랜드 공식 지도 정보(${esc(date)} 기준)예요. 운영시간·메뉴·가격은 현장 상황에 따라 달라질 수 있어요.</p>`) : ""}
      ${r.official.length ? section("이용 안내", `${r.official.length}건`, `<div class="ps-list">${r.official.map(officialCard).join("")}</div>`) : ""}
      ${r.posts.length ? section("게시판", `${r.posts.length}건`, `<div class="ps-list">${r.posts.map(postCard).join("")}</div>`) : ""}`;
  }

  // 검색어가 없을 때: 최근 검색어 + (캐스트만) 인기 검색어
  function idle(mode) {
    const words = recent();
    const popular = options[mode].popular || [];
    return `${words.length ? `<section class="srch-section">
      <div class="srch-head"><span class="eyebrow">최근 검색어</span><button type="button" class="srch-clear-all" data-ps-clear="${mode}">전체삭제</button></div>
      <div class="srch-chips">${words.map((q) => `<span class="srch-chip" data-ps-query="${esc(q)}" data-ps-mode="${mode}">${esc(q)}<button type="button" class="srch-remove" data-ps-remove="${esc(q)}" data-ps-mode="${mode}" aria-label="${esc(q)} 삭제">×</button></span>`).join("")}</div>
    </section>` : ""}
    ${popular.length ? `<section class="srch-section">
      <div class="srch-head"><span class="eyebrow">인기 검색어</span></div>
      <div class="srch-chips">${popular.map((q) => `<button type="button" class="srch-chip srch-chip--hot" data-ps-query="${esc(q)}" data-ps-mode="${mode}">${esc(q)}</button>`).join("")}</div>
    </section>` : ""}
    <p class="srch-hint">음식·가게, 놀이기구, 동물, 편의시설, 이용 규정, 게시판 글을 한 번에 찾아요.</p>`;
  }
  const body = (mode) => (queries[mode].trim() ? `<div class="ps-results">${results(queries[mode].trim(), mode)}</div>` : idle(mode));

  function page(mode, opts = {}) {
    options[mode] = opts;
    if (!isReady() || window.ParkPlaces.state.failed) ready();
    return `<div class="srch-wrap ps-page ps-page--${mode}">
      <div class="srch-bar">
        <button type="button" class="srch-back" ${opts.back || ""} aria-label="뒤로">${icon("back")}</button>
        <form class="search-wrap srch-input-wrap" data-ps-form="${mode}" role="search">
          <span>${icon("search")}</span>
          <input id="psInput-${mode}" data-ps-input="${mode}" type="search" enterkeyhint="search" value="${esc(queries[mode])}" placeholder="음식, 놀이기구, 동물, 이용 안내 검색" autocomplete="off" aria-label="통합 검색" />
        </form>
      </div>
      <div class="ps-body" id="psBody-${mode}">${body(mode)}</div>
    </div>`;
  }
  // 입력할 때마다 화면 전체가 아니라 결과 부분만 다시 그려서 검색칸의 커서·키보드가 유지되게 한다.
  function refresh(mode) {
    const box = document.getElementById(`psBody-${mode}`);
    if (box) box.innerHTML = body(mode);
  }
  function setQuery(mode, q) {
    queries[mode] = q;
    const input = document.getElementById(`psInput-${mode}`);
    if (input && input.value !== q) input.value = q;
    refresh(mode);
  }
  function focus(mode) {
    const input = document.getElementById(`psInput-${mode}`);
    if (input && !queries[mode]) input.focus({ preventScroll: true });
  }

  document.addEventListener("input", (event) => {
    const mode = event.target.dataset?.psInput;
    if (mode) { queries[mode] = event.target.value; refresh(mode); }
  });
  document.addEventListener("submit", (event) => {
    const mode = event.target.dataset?.psForm;
    if (!mode) return;
    event.preventDefault();
    remember(queries[mode]);
    document.getElementById(`psInput-${mode}`)?.blur(); // 모바일 키보드를 내려 결과가 보이게
  });
  document.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-ps-remove]");
    if (remove) {
      event.stopPropagation();
      saveRecent(recent().filter((x) => x !== remove.dataset.psRemove));
      return refresh(remove.dataset.psMode);
    }
    const clear = event.target.closest("[data-ps-clear]");
    if (clear) { saveRecent([]); return refresh(clear.dataset.psClear); }
    const chip = event.target.closest("[data-ps-query]");
    if (chip) { remember(chip.dataset.psQuery); setQuery(chip.dataset.psMode, chip.dataset.psQuery); }
  });

  window.ParkSearch = { page, focus, setQuery, run, ready, isReady, remember, recent, loadOfficial };
})();
