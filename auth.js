(() => {
  const SESSION_KEY = "parktalk-demo-session";
  const ACCOUNT_KEY = "parktalk-demo-accounts-v2";
  const authRoot = document.getElementById("authApp");
  const castRoot = document.querySelector(".app");
  const visitorRoot = document.getElementById("visitorApp");
  let session = readSession();
  let formMode = "login";

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
  }
  function hero() {
    return `<div class="auth-hero">
      <div class="auth-hero__top"><span class="auth-logo-frame"><img class="auth-logo" src="assets/parktalk-logo.png" alt="ParkTalk 파크톡 로고"></span><span class="auth-hero__badge">파크에서 함께</span></div>
      <div class="auth-hero__art" aria-hidden="true"><div class="auth-sun"></div><div class="auth-cloud auth-cloud--one"></div><div class="auth-cloud auth-cloud--two"></div><div class="auth-hill auth-hill--back"></div><div class="auth-hill auth-hill--front"></div><div class="auth-wheel">✺</div></div>
      <div class="auth-hero__copy"><span class="auth-kicker">WELCOME TO PARKTALK</span><h1>파크에서 만나는<br>우리의 하루</h1><p>일행과 다시 만나고, 동료와 이야기를 나누는 공간.</p></div>
      <div class="auth-hero__foot">두 가지 모드 · 하나의 파크톡</div>
    </div>`;
  }
  function form(mode = "login") {
    formMode = mode;
    visible("auth");
    const signup = mode === "signup";
    document.title = `${signup ? "회원가입" : "로그인"} | ParkTalk`;
    authRoot.innerHTML = `<div class="auth-layout">${hero()}<main class="auth-panel"><div class="auth-panel__inner">
      <span class="auth-panel__eyebrow">PARKTALK ACCOUNT</span>
      <h2>${signup ? "파크톡 회원가입" : "파크톡 로그인"}</h2>
      <p class="auth-lead">${signup ? "회원가입할 때 이용 유형을 선택해 주세요." : "아이디와 비밀번호로 시작해요."}</p>
      <div class="auth-tabs" role="tablist" aria-label="로그인 또는 회원가입"><button type="button" class="${signup ? "" : "active"}" data-auth-action="mode" data-mode="login" role="tab" aria-selected="${!signup}">로그인</button><button type="button" class="${signup ? "active" : ""}" data-auth-action="mode" data-mode="signup" role="tab" aria-selected="${signup}">회원가입</button></div>
      <form id="parkAuthForm" class="auth-form" novalidate>
        ${signup ? `<label>닉네임<input name="nickname" type="text" minlength="2" maxlength="20" placeholder="사용할 닉네임" required></label>` : ""}
        <label>아이디<input name="userId" type="text" minlength="3" maxlength="30" autocomplete="username" placeholder="아이디 입력" required></label>
        <label>비밀번호<input name="password" type="password" minlength="4" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="4자 이상 입력" required></label>
        ${signup ? `<label>비밀번호 확인<input name="confirm" type="password" minlength="4" autocomplete="new-password" placeholder="다시 입력" required></label><fieldset class="auth-role-field"><legend>이용 유형</legend><label><input type="radio" name="role" value="visitor" checked> 일반 사용자</label><label><input type="radio" name="role" value="cast"> 캐스트</label></fieldset><div class="auth-info"><strong>캐스트 인증 안내</strong><span>사원증 인증 방식은 아직 기획 중입니다. 캐스트 계정은 일반 사용자 모드로도 전환할 수 있어요.</span></div>` : ""}
        <button class="auth-submit" type="submit">${signup ? "회원가입 체험하기" : "로그인하기"}<span aria-hidden="true">→</span></button>
      </form>
      ${signup ? "" : '<button type="button" class="auth-guest" data-auth-action="guest">로그인 없이 시연하기 <span aria-hidden="true">↗</span></button>'}
      <p class="auth-demo-disclaimer">시연용 계정입니다. 아이디·닉네임·이용 유형만 이 브라우저에 저장하고 비밀번호는 저장하거나 검증하지 않습니다. 실제 비밀번호를 입력하지 마세요.</p>
    </div></main></div>`;
    authRoot.querySelector("input")?.focus();
    window.scrollTo(0, 0);
  }
  function enter(next) {
    session = { name: next.name.slice(0, 20), role: next.role, accountRole: next.accountRole, id: next.id };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const dialog = document.getElementById("modal");
    if (dialog?.open) dialog.close();
    if (session.role === "visitor") {
      visible("visitor");
      window.ParkMap?.unmount();
      window.ParkVisitor.mount({ name: session.name });
      history.replaceState(null, "", "#visitor");
    } else {
      window.ParkVisitor?.unmount();
      visible("cast");
      document.querySelectorAll(".top-name, .side-bottom strong").forEach((el) => { el.textContent = session.name; });
      go("home");
    }
    window.scrollTo(0, 0);
  }
  function logout() {
    const dialog = document.getElementById("modal");
    if (dialog?.open) dialog.close();
    document.querySelector(".sidebar")?.classList.remove("open");
    sessionStorage.removeItem(SESSION_KEY);
    session = null;
    window.ParkVisitor?.unmount();
    window.ParkVisitor?.clearLocalSession();
    window.ParkMap?.unmount();
    history.replaceState(null, "", location.pathname);
    form("login");
  }
  function switchRole() {
    if (session?.accountRole !== "cast") return;
    enter({ ...session, role: session.role === "cast" ? "visitor" : "cast" });
  }
  authRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-action]");
    if (button?.dataset.authAction === "mode") form(button.dataset.mode);
    if (button?.dataset.authAction === "guest") enter({ id: "guest-demo", name: "시연 캐스트", role: "cast", accountRole: "cast" });
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
  });
  window.ParkAuth = { role: () => session?.role || null, accountRole: () => session?.accountRole || null, name: () => session?.name || null, id: () => session?.id || null, logout, switchRole };
  window.parkToast = window.parkToast || ((message) => alert(escapeText(message)));
  if (session) enter(session); else form("login");
})();
