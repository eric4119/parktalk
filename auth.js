(() => {
  const SESSION_KEY = "parktalk-demo-session";
  const authRoot = document.getElementById("authApp");
  const castRoot = document.querySelector(".app");
  const visitorRoot = document.getElementById("visitorApp");
  let session = readSession();
  let selectedRole = null;
  let formMode = "login";

  function readSession() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      return parsed && ["cast", "visitor"].includes(parsed.role) ? parsed : null;
    } catch {
      return null;
    }
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
      <div class="auth-hero__top"><span class="auth-logo-mark">✦</span><strong>ParkTalk</strong><span class="auth-hero__badge">파크에서 함께</span></div>
      <div class="auth-hero__art" aria-hidden="true"><div class="auth-sun"></div><div class="auth-cloud auth-cloud--one"></div><div class="auth-cloud auth-cloud--two"></div><div class="auth-hill auth-hill--back"></div><div class="auth-hill auth-hill--front"></div><div class="auth-wheel">✺</div><div class="auth-people">●　●　●</div></div>
      <div class="auth-hero__copy"><span class="auth-kicker">WELCOME TO PARKTALK</span><h1>파크에서 만나는<br>우리의 하루</h1><p>일행과 다시 만나고, 동료와 이야기를 나누는 공간.</p></div>
      <div class="auth-hero__foot">두 가지 모드 · 하나의 파크톡</div>
    </div>`;
  }

  function chooser() {
    selectedRole = null;
    visible("auth");
    document.title = "이용 모드 선택 | ParkTalk";
    authRoot.innerHTML = `<div class="auth-layout">${hero()}<main class="auth-panel">
      <div class="auth-panel__inner"><span class="auth-panel__eyebrow">시작하기</span><h2>어떤 방식으로 이용할까요?</h2><p class="auth-lead">원하는 모드를 선택해 파크톡을 시작해 보세요.</p>
      <button class="role-card role-card--visitor" type="button" data-auth-action="choose" data-role="visitor"><span class="role-card__icon" aria-hidden="true">⌖</span><span class="role-card__body"><small>방문객 모드</small><strong>일행 찾기</strong><span>그룹을 만들고 파크 안에서 일행의 위치를 확인해요.</span></span><span class="role-card__arrow" aria-hidden="true">→</span></button>
      <button class="role-card role-card--cast" type="button" data-auth-action="choose" data-role="cast"><span class="role-card__icon" aria-hidden="true">✦</span><span class="role-card__body"><small>캐스트 모드</small><strong>캐스트 커뮤니티</strong><span>게시판, 생활 정보와 아바타 맵에서 소통해요.</span></span><span class="role-card__arrow" aria-hidden="true">→</span></button>
      <div class="auth-panel__note">캐스트 사원증 인증 방식은 아직 기획 중입니다. 이 사이트의 로그인은 시연용이며 실제 계정을 만들거나 비밀번호를 저장하지 않습니다.</div>
      </div></main></div>`;
    window.scrollTo(0, 0);
  }

  function form(role, mode) {
    selectedRole = role;
    formMode = mode;
    visible("auth");
    const isCast = role === "cast";
    const label = isCast ? "캐스트" : "방문객";
    const isSignup = mode === "signup";
    document.title = `${label} ${isSignup ? "회원가입" : "로그인"} | ParkTalk`;
    authRoot.innerHTML = `<div class="auth-layout">${hero()}<main class="auth-panel"><div class="auth-panel__inner">
      <button class="auth-back" type="button" data-auth-action="back">← 이용 모드 다시 선택</button>
      <span class="auth-panel__eyebrow">${isCast ? "CAST MODE" : "VISITOR MODE"}</span>
      <h2>${label} ${isSignup ? "회원가입" : "로그인"}</h2>
      <p class="auth-lead">${isCast ? "캐스트를 위한 정보와 동료를 만나보세요." : "일행과 연결하고, 파크에서 다시 만나요."}</p>
      <div class="auth-tabs" role="tablist" aria-label="로그인 또는 회원가입"><button type="button" class="${!isSignup ? "active" : ""}" data-auth-action="mode" data-mode="login" role="tab" aria-selected="${!isSignup}">로그인</button><button type="button" class="${isSignup ? "active" : ""}" data-auth-action="mode" data-mode="signup" role="tab" aria-selected="${isSignup}">회원가입</button></div>
      <form id="parkAuthForm" class="auth-form" novalidate>
        ${isSignup ? `<label>닉네임<input name="nickname" type="text" minlength="2" maxlength="20" autocomplete="nickname" placeholder="사용할 닉네임" required></label>` : ""}
        <label>이메일<input name="email" type="email" autocomplete="email" placeholder="name@example.com" required></label>
        <label>체험용 비밀번호<input name="password" type="password" minlength="4" autocomplete="${isSignup ? "new-password" : "current-password"}" placeholder="4자 이상 입력" required></label>
        ${isSignup ? `<label>체험용 비밀번호 확인<input name="confirm" type="password" minlength="4" autocomplete="new-password" placeholder="비밀번호를 다시 입력" required></label>` : ""}
        ${isCast ? `<div class="auth-info"><strong>캐스트 인증 안내</strong><span>실제 사원증 확인 및 에버랜드 DB 연동 여부는 미정입니다. 현재는 인증 없이 화면을 체험합니다.</span></div>` : `<div class="auth-info auth-info--visitor"><strong>방문객 이용 안내</strong><span>로그인 후 초대 코드 또는 링크로 일행 그룹에 참여할 수 있습니다.</span></div>`}
        <button class="auth-submit" type="submit">${isSignup ? "회원가입 화면 체험하기" : "로그인 화면 체험하기"}<span aria-hidden="true">→</span></button>
      </form>
      <p class="auth-demo-disclaimer">시연 화면입니다. 실제 비밀번호를 입력하지 마세요. 입력한 비밀번호는 전송하거나 저장하지 않습니다.</p>
      <button class="auth-quick" type="button" data-auth-action="demo">입력 없이 ${label} 모드 둘러보기</button>
    </div></main></div>`;
    authRoot.querySelector("input")?.focus();
    window.scrollTo(0, 0);
  }

  function enter(role, name = "체험 사용자") {
    session = { role, name: String(name).slice(0, 20) };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (role === "visitor") {
      visible("visitor");
      window.ParkVisitor.mount({ name: session.name });
      history.replaceState(null, "", "#visitor");
    } else {
      window.ParkVisitor?.unmount();
      visible("cast");
      document.querySelectorAll(".top-name, .side-bottom strong").forEach((el) => {
        el.textContent = session.name;
      });
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
    chooser();
  }

  authRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-action]");
    if (!button) return;
    const action = button.dataset.authAction;
    if (action === "choose") form(button.dataset.role, "login");
    if (action === "back") chooser();
    if (action === "mode") form(selectedRole, button.dataset.mode);
    if (action === "demo") enter(selectedRole, selectedRole === "cast" ? "신입 캐스트" : "방문객");
  });

  authRoot.addEventListener("submit", (event) => {
    if (event.target.id !== "parkAuthForm") return;
    event.preventDefault();
    const data = new FormData(event.target);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (!email.includes("@") || password.length < 4) {
      window.parkToast?.("이메일과 4자 이상의 체험용 비밀번호를 입력해 주세요.");
      return;
    }
    if (formMode === "signup" && password !== data.get("confirm")) {
      window.parkToast?.("비밀번호 확인이 일치하지 않아요.");
      return;
    }
    const nickname = formMode === "signup" ? String(data.get("nickname") || "").trim() : email.split("@")[0];
    if (nickname.length < 2) {
      window.parkToast?.("닉네임을 2자 이상 입력해 주세요.");
      return;
    }
    enter(selectedRole, nickname);
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-action]");
    if (!button || authRoot.contains(button)) return;
    if (button.dataset.authAction === "logout" || button.dataset.authAction === "switch") logout();
  });

  window.ParkAuth = {
    role: () => session?.role || null,
    name: () => session?.name || null,
    logout,
    switchRole: logout,
  };
  window.parkToast = window.parkToast || ((message) => alert(escapeText(message)));

  if (session) enter(session.role, session.name);
  else chooser();
})();
