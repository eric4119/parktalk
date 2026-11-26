(() => {
  const SESSION_KEY = "parktalk-demo-session";
  const ACCOUNT_KEY = "parktalk-demo-accounts-v2";
  const LOGO_SRC = "assets/parktalk-logo-transparent.png";
  const SVG_PERSON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a7 7 0 0 1 14 0v2"/></svg>`;
  const SVG_AT = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>`;
  const SVG_LOCK = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const SVG_EYE = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const SVG_EYE_OFF = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  const authRoot = document.getElementById("authApp");
  const castRoot = document.querySelector(".app");
  const visitorRoot = document.getElementById("visitorApp");
  let session = readSession();
  let formMode = "login";
  const startHash = decodeURIComponent(location.hash.slice(1));

  function readSession() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      if (!saved || !["cast", "visitor"].includes(saved.role)) return null;
      return { ...saved, accountRole: saved.accountRole || saved.role };
    } catch { return null; }
  }
  function accounts() {
    try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "{}"); }
    catch { return {}; }
  }
  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }
  function visible(view) {
    authRoot.hidden = view !== "auth";
    castRoot.hidden = view !== "cast";
    visitorRoot.hidden = view !== "visitor";
    const switchBtn = document.getElementById("castModeSwitch");
    if (switchBtn) switchBtn.hidden = view === "auth" || !session || session.accountRole !== "cast";
  }
  function hero() {
    return `
      <div class="auth-hero__copy">
        <img class="auth-hero__logo" src="${LOGO_SRC}" alt="ParkTalk 파크톡 로고">
      </div>`;
  }
  function playParkTalkIntro() {
    if (document.querySelector(".pt-intro-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "pt-intro-overlay";
    overlay.innerHTML = `
      <p class="pt-intro-typing" aria-label="파크에서 만나는 우리의 하루">
        <span id="pt-intro-text"></span><span class="pt-intro-cursor" id="pt-intro-cursor"></span>
      </p>
      <div class="pt-intro-logo-wrap">
        <img class="pt-intro-logo" src="${LOGO_SRC}" alt="ParkTalk 파크톡 로고">
      </div>
      <span class="pt-intro-skip">화면을 터치하면 바로 이동합니다</span>
    `;

    document.body.appendChild(overlay);

    const textEl = overlay.querySelector("#pt-intro-text");
    const cursorEl = overlay.querySelector("#pt-intro-cursor");
    const fullText = "파크에서 만나는\n우리의 하루";
    let index = 0;
    let finished = false;
    let logoTimer = null;
    let closeTimer = null;

    const closeIntro = () => {
      if (finished) return;
      finished = true;
      clearInterval(typingTimer);
      clearTimeout(logoTimer);
      clearTimeout(closeTimer);
      overlay.classList.add("is-leaving");
      authRoot.querySelector("input")?.focus();
      setTimeout(() => overlay.remove(), 560);
    };

    overlay.addEventListener("click", closeIntro);

    const typingTimer = setInterval(() => {
      if (index < fullText.length) {
        const ch = fullText[index++];
        textEl.innerHTML += ch === "\n" ? "<br>" : ch;
      } else {
        clearInterval(typingTimer);
        cursorEl.classList.add("is-done");
        logoTimer = setTimeout(() => {
          overlay.classList.add("show-logo");
        }, 200);
        closeTimer = setTimeout(closeIntro, 1550);
      }
    }, 75);
  }
  function form(mode = "login", options = {}) {
    formMode = mode;
    visible("auth");
    const signup = mode === "signup";
    document.title = `${signup ? "회원가입" : "로그인"} | ParkTalk`;
    authRoot.innerHTML = `<div class="auth-layout">
      ${hero()}
      <main class="auth-panel">
        <h2>${signup ? "파크톡 회원가입" : "파크톡 로그인"}</h2>
        <p class="auth-lead">${signup ? "회원가입할 때 이용 유형을 선택해 주세요." : "아이디와 비밀번호로 시작해요."}</p>
        <form id="parkAuthForm" class="auth-form" novalidate>
          ${signup ? `<div class="auth-input-wrap"><span class="auth-input-icon">${SVG_AT}</span><input name="nickname" type="text" minlength="2" maxlength="20" placeholder="사용할 닉네임" required></div>` : ""}
          <div class="auth-input-wrap"><span class="auth-input-icon">${SVG_PERSON}</span><input name="userId" type="text" minlength="3" maxlength="30" autocomplete="username" placeholder="아이디 입력" required></div>
          <div class="auth-input-wrap has-toggle"><span class="auth-input-icon">${SVG_LOCK}</span><input name="password" type="password" minlength="4" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="비밀번호 입력" required><button class="auth-pw-toggle" type="button" data-auth-action="toggle-pw" aria-label="비밀번호 보기">${SVG_EYE}</button></div>
          ${signup ? `<div class="auth-input-wrap"><span class="auth-input-icon">${SVG_LOCK}</span><input name="confirm" type="password" minlength="4" autocomplete="new-password" placeholder="비밀번호 확인" required></div><fieldset class="auth-role-field"><legend>이용 유형</legend><label><input type="radio" name="role" value="visitor" checked> 일반 사용자</label><label><input type="radio" name="role" value="cast"> 캐스트</label></fieldset><div class="auth-info"><strong>캐스트 인증 안내</strong><span>사원증 인증 방식은 아직 기획 중입니다. 캐스트 계정은 일반 사용자 모드로도 전환할 수 있어요.</span></div>` : ""}
          <button class="auth-submit" type="submit">${signup ? "회원가입 체험하기" : "로그인하기"}<span aria-hidden="true">→</span></button>
        </form>
        ${signup ? "" : '<button type="button" class="auth-guest" data-auth-action="guest">로그인 없이 시연하기 <span aria-hidden="true">↗</span></button>'}
        ${signup ? "" : '<p class="auth-signup-link">계정이 없으신가요? <button type="button" data-auth-action="mode" data-mode="signup">회원가입</button></p>'}
      </main>
    </div>`;
    window.scrollTo(0, 0);
    if (options.intro && mode === "login") {
      playParkTalkIntro();
    } else {
      authRoot.querySelector("input")?.focus();
    }
  }
  function enter(next, restore = false) {
    session = { name: (window.ParkProfiles?.name(next.id, next.name) || next.name).slice(0, 20), role: next.role, accountRole: next.accountRole, id: next.id };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const dialog = document.getElementById("modal");
    if (dialog?.open) dialog.close();
    if (session.role === "visitor") {
      window.ParkCast?.leave();
      visible("visitor");
      const view = restore && startHash.startsWith("visitor/") ? startHash.slice("visitor/".length) : undefined;
      window.ParkVisitor.mount({ name: session.name, view });
    } else {
      window.ParkVisitor?.unmount();
      visible("cast");
      window.ParkCast.go(restore && window.ParkCast.hasPage(startHash) ? startHash : "home");
    }
    window.scrollTo(0, 0);
  }
  function updateProfile(name) {
    if (!session) return;
    const known = accounts();
    if (known[session.id]) { known[session.id].name = name; localStorage.setItem(ACCOUNT_KEY, JSON.stringify(known)); }
    session.name = name;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (session.role === "visitor") window.ParkVisitor.updateProfile(name);
    else window.ParkCast.render();
  }
  function logout() {
    const dialog = document.getElementById("modal");
    if (dialog?.open) dialog.close();
    document.querySelector(".sidebar")?.classList.remove("open");
    sessionStorage.removeItem(SESSION_KEY);
    session = null;
    window.ParkCast?.leave();
    window.ParkVisitor?.unmount();
    window.ParkVisitor?.clearLocalSession();
    history.replaceState(null, "", location.pathname);
    form("login");
  }
  function castVerificationNotice() {
    const html = `<h2>캐스트 인증이 필요해요</h2>
      <p class="muted">캐스트 모드는 에버랜드 캐스트 전용 공간이라 캐스트 인증을 마친 계정만 들어갈 수 있어요.</p>
      <p class="note">사원증 인증 방식은 아직 준비 중입니다. 인증이 열리면 앱 설정에서 신청할 수 있어요. 지금은 일반 사용자 모드를 그대로 이용해 주세요.</p>
      <button class="outline" type="button" data-auth-action="close-notice">확인</button>`;
    if (window.parkModal) window.parkModal(html);
    else window.parkToast?.("캐스트 모드는 캐스트 인증을 마친 계정만 이용할 수 있어요.");
  }
  function switchRole() {
    if (!session) return;
    if (session.accountRole !== "cast") return castVerificationNotice();
    enter({ ...session, role: session.role === "cast" ? "visitor" : "cast" });
  }
  authRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-action]");
    if (button?.dataset.authAction === "mode") form(button.dataset.mode);
    if (button?.dataset.authAction === "guest") enter({ id: "guest-demo", name: "시연 캐스트", role: "cast", accountRole: "cast" });
    if (button?.dataset.authAction === "toggle-pw") {
      const input = button.closest(".auth-input-wrap")?.querySelector("input");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.innerHTML = show ? SVG_EYE_OFF : SVG_EYE;
      button.setAttribute("aria-label", show ? "비밀번호 숨기기" : "비밀번호 보기");
    }
  });
  authRoot.addEventListener("submit", (event) => {
    if (event.target.id !== "parkAuthForm") return;
    event.preventDefault();
    const data = new FormData(event.target);
    const id = String(data.get("userId") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    if (id.length < 3 || password.length < 4) return window.parkToast?.("아이디 3자 이상, 체험용 비밀번호 4자 이상을 입력해 주세요.");
    if (formMode === "signup") {
      const name = String(data.get("nickname") || "").trim();
      const role = data.get("role") === "cast" ? "cast" : "visitor";
      if (name.length < 2 || password !== data.get("confirm")) return window.parkToast?.("닉네임과 비밀번호 확인을 다시 확인해 주세요.");
      const known = accounts();
      if (known[id]) return window.parkToast?.("이미 사용한 시연 아이디입니다. 로그인해 주세요.");
      known[id] = { name: name.slice(0, 20), role };
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(known));
      enter({ id, name, role, accountRole: role });
    } else {
      const account = accounts()[id];
      if (!account) return window.parkToast?.("등록된 시연 아이디가 없어요. 회원가입 화면에서 먼저 만들어 주세요.");
      enter({ id, name: account.name, role: account.role, accountRole: account.role });
    }
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-action]");
    if (!button || authRoot.contains(button)) return;
    if (button.dataset.authAction === "logout") logout();
    if (button.dataset.authAction === "switch") switchRole();
    if (button.dataset.authAction === "close-notice") document.getElementById("modal")?.close();
  });
  window.ParkAuth = { updateProfile, role: () => session?.role || null, accountRole: () => session?.accountRole || null, name: () => session?.name || null, id: () => session?.id || null, canSwitch: () => session?.accountRole === "cast", logout, switchRole };
  window.parkToast = window.parkToast || ((message) => alert(escapeText(message)));
  if (session) enter(session, true); else form("login", { intro: true });
})();
