/* 분실물 AI 화면 부분 — boards.js의 분실물 게시판에서만 쓴다(미아 게시판은 AI를 쓰지 않는다).
 *   ParkLostAI.formBox(isFound)          → 글쓰기 양식 맨 위 'AI로 채우기' 칸
 *   ParkLostAI.tags(form, post)          → 저장할 때 붙일 특징(AI가 채운 값 + 규칙으로 뽑은 값)
 *   ParkLostAI.panel(post, posts, me, isCast) → 글 상세의 "이거 혹시 당신 물건?" / "AI 추천 연결 후보"
 *   ParkLostAI.banner(posts, me, isCast) → 분실물 게시판 목록 위 알림
 *   ParkLostAI.afterSave(post, posts, isCast) → 글 등록 직후 안내 문구(비슷한 글 수)
 */
(() => {
  const M = window.ParkLostMatch;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  window.ParkPlaces?.load?.(); // 시설 이름 → 구역 추정에 쓴다

  function formBox(isFound) {
    return `<div class="lost-ai">
      <div class="lost-ai__head"><strong>AI로 양식 채우기</strong><small>사진이나 설명 중 하나만 있어도 돼요</small></div>
      <label class="lost-ai__photo">사진 (1MB 이하, 게시글 사진으로도 올라가요)<input type="file" accept="image/png,image/jpeg,image/webp" data-lost-ai-photo></label>
      <label class="lost-ai__photo">설명 (선택) · 어디서, 어떤 물건인지 한 줄로 쓰면 장소·구역까지 채워져요
        <textarea class="lost-ai__text" maxlength="300" rows="2" placeholder="${isFound ? "여기에 입력 — 예: 사파리 출구 벤치에서 검정 나이키 백팩 주움" : "여기에 입력 — 예: 검은 나이키 백팩, 사파리 근처에서 잃어버렸어요"}"></textarea>
      </label>
      <div class="lost-ai__actions"><button type="button" class="outline" data-lost-ai-fill>AI로 채우기</button><span class="lost-ai__status" aria-live="polite"></span></div>
      <input type="hidden" name="aiTags" value="">
    </div>`;
  }

  const readFile = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(Error("사진을 읽지 못했어요."));
    r.readAsDataURL(file);
  });

  async function fill(button) {
    const form = button.closest("form");
    const box = button.closest(".lost-ai");
    const status = box.querySelector(".lost-ai__status");
    const text = box.querySelector(".lost-ai__text").value.trim();
    const file = form.querySelector('input[name="photo"]')?.files?.[0];
    const lostType = form.querySelector('input[name="lostType"]')?.value || "분실물";
    if (!text && !file) { status.textContent = "설명을 적거나 아래에서 사진을 골라 주세요."; return; }
    if (file && (file.size > 1_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      status.textContent = "사진은 PNG·JPG·WebP 1MB 이하만 분석할 수 있어요.";
      return;
    }
    button.disabled = true;
    status.textContent = file ? "AI가 사진과 설명을 보고 있어요…" : "AI가 설명을 정리하고 있어요…";
    let result = null;
    try {
      const response = await fetch("api/lost-extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, lostType, image: file ? await readFile(file) : "" }),
      });
      const body = response.ok ? await response.json() : null;
      if (body?.tags) result = body;
      else if (body?.error) status.textContent = body.error;
    } catch { /* 서버가 없으면 아래 규칙으로 */ }
    if (!result) {
      // 서버(server.js) 없이 열었을 때: 규칙으로만 뽑는다(사진 분석은 안 됨).
      result = { source: "rule", tags: M.clean({ ...M.extract(text), source: "rule" }), title: "", body: "", note: file ? "서버 없이 열려 있어 사진은 분석하지 못했어요." : "" };
    }
    apply(form, result, text, lostType);
    button.disabled = false;
    const t = result.tags;
    const parts = [...new Set([t.itemCategory, t.item, ...t.colors, ...t.brands, t.zone, t.place].filter(Boolean))];
    status.innerHTML = `${result.source === "ai" ? "AI가" : "자동으로"} 채웠어요${parts.length ? `: ${parts.map(esc).join(" · ")}` : ""}. 맞는지 확인해 주세요.${result.note ? `<br><small>${esc(result.note)}</small>` : ""}`;
  }

  // 비어 있거나 전에 AI가 채운 칸만 바꾼다(사용자가 직접 쓴 내용은 덮지 않는다).
  // 선택 상자는 항상 첫 값이 들어 있으므로, 사용자가 직접 고른 적이 없으면 바꾼다.
  function setField(el, value) {
    if (!el || !value) return;
    if (el.tagName === "SELECT") {
      if (el.dataset.userSet || ![...el.options].some((o) => o.value === value)) return;
    } else if (el.value && !el.dataset.aiFilled) return;
    el.value = value;
    el.dataset.aiFilled = "1";
  }
  function apply(form, result, text, lostType) {
    const t = result.tags;
    const q = (name) => form.querySelector(`[name="${name}"]`);
    setField(q("itemCategory"), t.itemCategory);
    setField(q("zone"), t.zone);
    setField(q("place"), t.place);
    const label = [...t.colors.slice(0, 1), ...t.brands.slice(0, 1), t.item].filter(Boolean).join(" ");
    const title = result.title || (label ? (lostType === "습득물" ? `[습득] ${label} 보관중` : `${label} 분실`) : "");
    setField(q("title"), title);
    setField(q("body"), result.body || text);
    q("aiTags").value = JSON.stringify(t);
  }

  // 저장할 글의 특징: 양식 값 + AI가 채운 값 + 규칙으로 뽑은 값
  function tags(form, post) {
    let ai = null;
    try { ai = JSON.parse(form.get ? form.get("aiTags") || "null" : "null"); } catch { ai = null; }
    return M.tagsFor(post, ai);
  }

  const safePhoto = (url) => /^data:image\/(png|jpeg|webp);base64,/.test(String(url || ""));
  const isOpenPost = (p) => p && p.kind === "lost" && !p.linkedPostId && (p.status || "open") === "open";
  // 확인 대기 중인 요청: 습득물을 가리키고(claimFor), 아직 처리(연결·반려·마감) 전
  const isPending = (c) => Boolean(c && c.claimFor && !c.claimStatus && !c.linkedPostId);
  const claimsFor = (found, posts) => posts.filter((p) => p.claimFor === found.id && isPending(p));
  // 요청 하나의 처리 현황
  const CLAIM_STATES = {
    pending: { label: "확인 대기", tone: "wait" },
    matched: { label: "연결됨", tone: "ok" },
    resolved: { label: "인계 완료", tone: "done" },
    rejected: { label: "반려", tone: "no" },
    closed: { label: "마감", tone: "off" },
  };
  function claimState(c, posts) {
    if (c.claimStatus === "rejected") return "rejected";
    if (c.claimStatus === "closed") return "closed";
    const found = posts.find((p) => p.id === c.claimFor);
    if (c.linkedPostId && c.linkedPostId === c.claimFor) return (c.status === "resolved" || found?.status === "resolved") ? "resolved" : "matched";
    if (!found || found.linkedPostId || (found.status || "open") !== "open") return "closed"; // 다른 분에게 연결됐거나 습득물이 정리됨
    return "pending";
  }
  const fmtTime = (t) => {
    if (!t) return "";
    const d = new Date(t);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const badge = (state) => `<span class="claim-badge claim-badge--${CLAIM_STATES[state].tone}">${CLAIM_STATES[state].label}</span>`;
  const thumb = (p) => (safePhoto(p?.photoUrl) ? `<img class="lost-find__thumb" src="${p.photoUrl}" alt="">` : '<span class="lost-find__thumb lost-find__thumb--none">사진 없음</span>');

  // 방문객 '내 신청'에서 아직 안 본 상태 변화(연결됨·반려 등)를 표시하기 위한 기록(이 브라우저에만 저장)
  const SEEN_KEY = "parktalk-claims-seen";
  const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { return {}; } };
  function myClaims(posts, me) {
    return posts.filter((p) => p.kind === "lost" && p.claimFor && p.authorId === me?.id)
      .sort((a, b) => (b.claimAt || b.createdAt || 0) - (a.claimAt || a.createdAt || 0));
  }
  function unseenClaims(posts, me) {
    const seen = readSeen();
    return myClaims(posts, me).filter((c) => { const st = claimState(c, posts); return st !== "pending" && seen[c.id] !== st; });
  }
  function markSeen(posts, me) {
    const seen = readSeen();
    for (const c of myClaims(posts, me)) seen[c.id] = claimState(c, posts);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* 표시만 못 할 뿐 */ }
  }

  function card(m, { showLink, sourceId }) {
    const p = m.post;
    return `<div class="lost-ai-match">
      <div class="lost-ai-match__top"><strong>${esc(p.title)}</strong><span class="lost-ai-match__pct">${m.percent}%</span></div>
      <p class="lost-ai-match__meta">${esc([p.itemCategory, p.zone, p.place].filter(Boolean).join(" · "))}${p.lostType === "습득물" && p.storageLocation ? ` · 보관: ${esc(p.storageLocation)}` : ""}</p>
      <div class="lost-ai-match__why">${m.reasons.map((r) => `<span>${esc(r)}</span>`).join("")}</div>
      <div class="pb-link-actions">
        <button type="button" class="outline" data-pb-post="${esc(p.id)}">글 보기</button>
        ${showLink ? `<button type="button" class="primary" data-lost-ai-link="${esc(sourceId)}" data-lost-ai-target="${esc(p.id)}">이 글과 연결</button>` : ""}
      </div>
    </div>`;
  }

  // 습득물 상세 — 캐스트: 방문객 확인 요청 목록(확인 후 연결) / 방문객: '내 물건 같아요'
  function claimSection(found, posts, me, isCast) {
    const claims = claimsFor(found, posts);
    if (isCast) {
      if (!claims.length) return "";
      return `<section class="lost-ai-panel lost-claims">
        <div class="lost-ai-panel__head"><strong>방문객 확인 요청 ${claims.length}건</strong><small>본인 확인(주인만 아는 특징·신분증) 후 연결해 주세요</small></div>
        ${claims.map((c) => {
          const m = M.score(c, found);
          return `<div class="lost-ai-match">
            <div class="lost-ai-match__top"><strong>${esc(c.author)} 님</strong><span class="lost-ai-match__pct">${m.percent}%</span></div>
            ${c.claimNote ? `<p class="lost-ai-match__meta">주인만 아는 특징: ${esc(c.claimNote)}</p>` : ""}
            <div class="pb-link-actions">
              <button type="button" class="outline" data-pb-post="${esc(c.id)}">요청 글 보기</button>
              <button type="button" class="primary" data-lost-claim-ok="${esc(found.id)}" data-lost-claim-lost="${esc(c.id)}">확인 후 연결</button>
            </div>
          </div>`;
        }).join("")}
      </section>`;
    }
    const mineClaim = claims.find((c) => c.authorId === me?.id);
    const myRejected = posts.find((c) => c.claimFor === found.id && c.authorId === me?.id && c.claimStatus === "rejected");
    if (!mineClaim && myRejected) {
      return `<section class="lost-ai-panel"><div class="lost-ai-panel__head"><strong>확인 요청이 반려됐어요</strong><small>${esc(myRejected.claimReason || "캐스트가 확인한 결과 주인이 아닌 것으로 보여요.")}</small></div>
        <div class="pb-link-actions"><button type="button" class="outline" data-lost-claim="${esc(found.id)}">다시 요청하기</button></div></section>`;
    }
    if (mineClaim) {
      return `<section class="lost-ai-panel"><div class="lost-ai-panel__head"><strong>확인 요청을 보냈어요</strong><small>캐스트가 본인 확인 후 연결하면 보관 장소가 안내돼요. 찾으러 갈 때 신분증을 챙겨 주세요.</small></div></section>`;
    }
    return `<section class="lost-ai-panel">
      <div class="lost-ai-panel__head"><strong>내 물건인 것 같나요?</strong><small>확인 요청을 보내면 캐스트가 본인 확인 후 연결해 드려요</small></div>
      <div class="pb-link-actions"><button type="button" class="primary" data-lost-claim="${esc(found.id)}">내 물건 같아요 (확인 요청)</button></div>
    </section>`;
  }

  function panel(post, posts, me, isCast) {
    if (!post || post.kind !== "lost" || post.linkedPostId || (post.status || "open") !== "open") return "";
    const mine = post.authorId === me?.id;
    const isLost = (post.lostType || "분실물") === "분실물";
    if (!isLost) {
      const claims = claimSection(post, posts, me, isCast);
      if (!isCast) return claims; // 방문객이 습득물을 볼 때는 확인 요청만
      return claims + matchPanel(post, posts, true, false);
    }
    if (!isCast && !mine) return "";
    if (!isCast && post.claimFor) {
      const found = posts.find((p) => p.id === post.claimFor);
      const st = claimState(post, posts);
      return `<section class="lost-ai-panel"><div class="lost-ai-panel__head"><strong>확인 요청 ${badge(st)}</strong><small>${st === "rejected" ? esc(post.claimReason || "주인이 아닌 것으로 확인됐어요.") : "처리 현황은 분실물 게시판의 '내 신청'에서 모아 볼 수 있어요."}</small></div>
        <div class="pb-link-actions">${found ? `<button type="button" class="outline" data-pb-post="${esc(found.id)}">요청한 습득물 보기</button>` : ""}<button type="button" class="outline" data-lost-mine-open>내 신청 보기</button></div></section>`;
    }
    return matchPanel(post, posts, isCast, true);
  }
  function matchPanel(post, posts, isCast, isLost) {
    const matches = M.matchesFor(post, posts, 3);
    const title = isCast ? `AI 추천 연결 후보 (${isLost ? "습득물" : "분실물"})` : "이거 혹시 당신 물건?";
    const empty = isCast
      ? `<p class="pb-hint">아직 비슷한 ${isLost ? "습득물" : "분실물"}이 없어요.</p>`
      : '<p class="pb-hint">아직 비슷한 습득물이 없어요. 캐스트가 비슷한 물건을 등록하면 여기와 게시판 목록에 바로 알려 드려요.</p>';
    return `<section class="lost-ai-panel">
      <div class="lost-ai-panel__head"><strong>${title}</strong><small>종류·색·브랜드·구역·시간을 비교했어요</small></div>
      ${matches.length ? matches.map((m) => card(m, { showLink: isCast, sourceId: post.id })).join("") : empty}
    </section>`;
  }

  function banner(posts, me, isCast) {
    const open = posts.filter(isOpenPost);
    if (isCast) {
      const claims = posts.filter((p) => isPending(p) && posts.some((f) => f.id === p.claimFor && isOpenPost(f)));
      if (claims.length) {
        return `<button type="button" class="lost-ai-banner" data-lost-requests-open><strong>방문객 확인 요청 ${claims.length}건이 기다리고 있어요</strong><span>'습득 요청'에서 본인 확인 후 연결하거나 반려해 주세요</span></button>`;
      }
      const pairs = open.filter((p) => (p.lostType || "분실물") === "분실물").map((p) => ({ p, m: M.matchesFor(p, posts, 1)[0] })).filter((x) => x.m);
      if (!pairs.length) return "";
      const top = pairs.sort((a, b) => b.m.score - a.m.score)[0];
      return `<button type="button" class="lost-ai-banner" data-pb-post="${esc(top.p.id)}"><strong>AI가 연결할 만한 분실물 ${pairs.length}건을 찾았어요</strong><span>가장 비슷한 건: ${esc(top.p.title)} ↔ ${esc(top.m.post.title)} (${top.m.percent}%)</span></button>`;
    }
    const news = unseenClaims(posts, me);
    if (news.length) {
      const st = claimState(news[0], posts);
      const msg = st === "matched" ? "내 신청이 연결됐어요! 보관 장소를 확인해 주세요" : st === "resolved" ? "물건 인계가 완료됐어요" : st === "rejected" ? "확인 요청이 반려됐어요" : "신청한 습득물이 다른 분에게 연결됐어요";
      return `<button type="button" class="lost-ai-banner" data-lost-mine-open><strong>${msg}</strong><span>'내 신청'에서 처리 현황 보기 · 새 소식 ${news.length}건</span></button>`;
    }
    const mine = open.filter((p) => p.authorId === me?.id && (p.lostType || "분실물") === "분실물" && !p.claimFor)
      .map((p) => ({ p, m: M.matchesFor(p, posts, 1)[0] })).filter((x) => x.m);
    if (!mine.length) return "";
    const top = mine[0];
    return `<button type="button" class="lost-ai-banner" data-pb-post="${esc(top.p.id)}"><strong>이거 혹시 당신 물건? 비슷한 습득물이 있어요</strong><span>내 글 '${esc(top.p.title)}'과 ${top.m.percent}% 비슷한 '${esc(top.m.post.title)}'</span></button>`;
  }

  function afterSave(post, posts, isCast) {
    if (!post || post.kind !== "lost") return "";
    const n = M.matchesFor(post, posts, 3).length;
    if (!n) return "";
    return isCast ? `비슷한 분실물 ${n}건을 찾았어요. 아래에서 확인해 연결해 주세요.` : `비슷한 습득물 ${n}건이 있어요. 아래에서 확인해 보세요.`;
  }

  // ---- 습득물에서 찾기(글·사진 검색) ----
  // 글을 쓰지 않고도 쌓여 있는 습득물을 글자·사진·종류·구역·날짜로 찾는다.
  const EMPTY_FIND = () => ({ text: "", cat: "", zone: "", date: "", photo: "", file: null, tags: null, searched: false, loading: "", visual: {}, note: "" });
  const find = EMPTY_FIND();
  let searchSeq = 0; // 초기화 뒤에 늦게 도착한 AI 응답은 버린다
  let lastCtx = { posts: [], me: null, isCast: false };

  // 사진을 긴 변 512px JPEG로 줄인다(AI에 보내는 양과 무료 사용량을 줄이기 위해).
  function shrink(src, max = 512) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => resolve("");
      img.src = src;
    });
  }

  function findResults(posts) {
    const found = posts.filter((p) => isOpenPost(p) && p.lostType === "습득물")
      .filter((p) => !find.cat || p.itemCategory === find.cat)
      .filter((p) => !find.zone || p.zone === find.zone)
      .filter((p) => {
        if (!find.date) return true;
        const t = Date.parse(p.eventTime || "") || p.createdAt || 0;
        return t >= Date.parse(`${find.date}T00:00`);
      });
    const text = find.text.trim();
    const hasQuery = Boolean(text || find.tags);
    if (!hasQuery) return found.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 10).map((post) => ({ post, score: 0, percent: 0, reasons: [] }));
    const probe = { kind: "lost", lostType: "분실물", title: text, body: "", itemCategory: find.cat || find.tags?.itemCategory || "", zone: find.zone || "", aiTags: find.tags || M.clean({ ...M.extract(text), source: "rule" }) };
    // 검색어 단어 + AI가 뽑은 키워드·물건 이름이 글에 그대로 들어 있으면 점수를 더한다.
    const words = [...new Set([...text.toLowerCase().split(/\s+/), ...(find.tags?.keywords || []), find.tags?.item || ""]
      .map((w) => String(w).toLowerCase().trim()).filter((w) => w.length >= 2))];
    return found.map((post) => {
      const m = M.score(probe, post);
      const hay = `${post.title} ${post.body} ${post.place}`.toLowerCase();
      const hit = words.filter((w) => hay.includes(w)).length;
      const score = m.score + hit;
      const reasons = hit ? [...m.reasons, "검색어 포함"] : m.reasons;
      const visual = find.visual[post.id];
      // 종류만 같고 다른 근거가 없는 약한 결과는 숨긴다(사진 비교에서 비슷하다고 한 건 남긴다).
      const strong = m.strong || hit > 0 || (visual && visual.likelihood !== "low");
      return { post, score, strong, percent: Math.min(99, m.percent + hit * 5), reasons };
    }).filter((r) => r.strong && r.score >= 3)
      .sort((a, b) => (find.visual[b.post.id]?.rank ?? 0) - (find.visual[a.post.id]?.rank ?? 0) || b.score - a.score)
      .slice(0, 10);
  }

  const LIKELY = { high: { label: "같은 물건일 가능성 높음", rank: 3 }, medium: { label: "비슷함", rank: 2 }, low: { label: "다른 물건 같음", rank: 0 } };
  function resultsHtml() {
    const { posts, me, isCast } = lastCtx;
    if (find.loading) return `<p class="ps-note lost-find__loading">${esc(find.loading)}</p>`;
    if (!find.searched) {
      const count = posts.filter((p) => isOpenPost(p) && p.lostType === "습득물").length;
      return `<p class="lost-find__empty">보관 중인 습득물 ${count}건에서 찾아요. 검색어를 입력하거나 사진을 올려 보세요.</p>`;
    }
    const list = findResults(posts);
    const tags = find.tags;
    const summary = tags ? [...new Set([tags.itemCategory, tags.item, ...tags.colors, ...tags.brands].filter(Boolean))] : [];
    const head = `${summary.length ? `<p class="lost-find__summary">${find.photo ? "사진에서" : "검색어에서"} 찾은 특징: ${summary.map(esc).join(" · ")}</p>` : ""}${find.note ? `<p class="ps-note">${esc(find.note)}</p>` : ""}`;
    const myClaims = new Set(posts.filter((p) => p.claimFor && p.authorId === me?.id && isOpenPost(p)).map((p) => p.claimFor));
    const report = isCast ? "" : `<div class="lost-find__report"><span>찾는 물건이 없나요?</span><button type="button" class="outline" data-lost-find-report>분실물 신고하기 (검색 내용 그대로)</button></div>`;
    if (!list.length) return `${head}<p class="pb-hint">조건에 맞는 습득물이 아직 없어요.</p>${report}`;
    return `${head}<div class="lost-find__list">${list.map((r) => {
      const p = r.post, v = find.visual[p.id];
      return `<div class="lost-ai-match lost-find__item">
        ${safePhoto(p.photoUrl) ? `<img class="lost-find__thumb" src="${p.photoUrl}" alt="">` : '<span class="lost-find__thumb lost-find__thumb--none">사진 없음</span>'}
        <div class="lost-find__body">
          <div class="lost-ai-match__top"><strong>${esc(p.title)}</strong>${r.percent ? `<span class="lost-ai-match__pct">${r.percent}%</span>` : ""}</div>
          <p class="lost-ai-match__meta">${esc([p.itemCategory, p.zone, p.place].filter(Boolean).join(" · "))}${p.storageLocation ? ` · 보관: ${esc(p.storageLocation)}` : ""}</p>
          ${v ? `<p class="lost-find__visual lost-find__visual--${esc(v.likelihood)}">AI 사진 비교: ${esc(LIKELY[v.likelihood]?.label || "")}${v.reason ? ` — ${esc(v.reason)}` : ""}</p>` : ""}
          ${r.reasons.length ? `<div class="lost-ai-match__why">${r.reasons.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
          <div class="pb-link-actions">
            <button type="button" class="outline" data-pb-post="${esc(p.id)}">글 보기</button>
            ${isCast ? "" : myClaims.has(p.id) ? '<span class="pb-hint">확인 요청함</span>' : `<button type="button" class="primary" data-lost-claim="${esc(p.id)}">내 물건 같아요</button>`}
          </div>
        </div>
      </div>`;
    }).join("")}</div>${report}`;
  }

  function searchPanel(posts, me, isCast) {
    lastCtx = { posts, me, isCast };
    const opts = (list, value, all) => `<option value="">${all}</option>${list.map((x) => `<option value="${esc(x)}" ${x === value ? "selected" : ""}>${esc(x)}</option>`).join("")}`;
    return `<section class="lost-find" data-lost-find-root>
      <p class="lost-find__intro">${isCast ? "글자나 사진으로 등록된 습득물을 찾아요." : "글을 쓰기 전에, 이미 들어온 습득물부터 글자나 사진으로 찾아보세요."}</p>
      <form class="lost-find__form" data-lost-find>
        <div class="lost-find__row"><input name="q" maxlength="60" value="${esc(find.text)}" placeholder="예: 검정 나이키 백팩" aria-label="습득물 검색어"><button type="submit" class="primary">검색</button></div>
        <div class="lost-find__row lost-find__photo-row">
          <label class="outline lost-find__photo-btn">${find.photo ? "사진 바꾸기" : "사진으로 찾기"}<input type="file" accept="image/png,image/jpeg,image/webp" data-lost-find-photo hidden></label>
          ${find.photo ? `<img class="lost-find__thumb lost-find__thumb--small" src="${find.photo}" alt="검색할 사진"><button type="button" class="ps-link" data-lost-find-clear-photo>사진 빼기</button>` : '<small class="ps-meta">사진만 올려도 검색돼요</small>'}
        </div>
        <div class="lost-find__row lost-find__filters">
          <select name="cat" aria-label="물품 종류">${opts(M.CATEGORIES, find.cat, "종류 전체")}</select>
          <select name="zone" aria-label="구역">${opts(M.ZONES, find.zone, "구역 전체")}</select>
          <input name="date" type="date" value="${esc(find.date)}" aria-label="이날 이후 습득">
        </div>
      </form>
      <div class="lost-find__results" data-lost-find-results>${resultsHtml()}</div>
    </section>`;
  }
  // 결과만 다시 그린다(검색칸 입력이 끊기지 않게). 화면에 보이는 패널을 고른다.
  function drawResults() {
    const boxes = [...document.querySelectorAll("[data-lost-find-results]")];
    const box = boxes.find((b) => b.offsetParent !== null) || boxes[0];
    if (box) box.innerHTML = resultsHtml();
  }
  function redrawPanel() {
    const roots = [...document.querySelectorAll("[data-lost-find-root]")];
    const root = roots.find((r) => r.offsetParent !== null) || roots[0];
    if (root) root.outerHTML = searchPanel(lastCtx.posts, lastCtx.me, lastCtx.isCast);
  }

  async function runFind(form) {
    const seq = ++searchSeq;
    const f = new FormData(form);
    find.text = String(f.get("q") || "").trim().slice(0, 60);
    find.cat = String(f.get("cat") || "");
    find.zone = String(f.get("zone") || "");
    find.date = String(f.get("date") || "");
    find.searched = true;
    find.note = "";
    find.visual = {};
    // 사진이나 검색어를 AI에 보내 특징(종류·물건·색·브랜드·키워드)을 뽑는다.
    // "푸마 신발"처럼 사전에 없는 브랜드나 "신발=운동화" 같은 비슷한 말도 AI가 이해한다.
    // AI를 못 쓰면(키 없음·서버 없음) 규칙 사전으로 뽑는다.
    find.tags = null;
    if (find.photo || find.text) {
      find.loading = find.photo ? "AI가 사진을 보고 있어요…" : "AI가 검색어를 이해하고 있어요…";
      drawResults();
      try {
        const res = await fetch("api/lost-extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: find.text, lostType: "분실물", image: find.photo || "" }) });
        const body = res.ok ? await res.json() : null;
        find.tags = body?.tags || null;
        if (body?.note && find.photo) find.note = body.note;
      } catch { /* 서버 없음 */ }
      if (seq !== searchSeq) return; // 그 사이 초기화·새 검색을 했다
      if (!find.tags) {
        if (find.photo) find.note = "사진을 분석하지 못해 검색어로만 찾았어요.";
        find.tags = find.text ? M.clean({ ...M.extract(find.text), source: "rule" }) : null;
      }
    }
    find.loading = "";
    drawResults();
    if (find.photo) compareVisually(seq);
  }

  // 상위 후보 중 사진이 있는 습득물 4개까지를 내 사진과 직접 비교한다(같은 물건인지, 근거는 무엇인지).
  async function compareVisually(seq) {
    const candidates = findResults(lastCtx.posts).filter((r) => safePhoto(r.post.photoUrl)).slice(0, 4);
    if (!candidates.length) return;
    const images = await Promise.all(candidates.map((r) => shrink(r.post.photoUrl)));
    try {
      const res = await fetch("api/lost-compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: find.photo, candidates: candidates.map((r, i) => ({ id: r.post.id, title: r.post.title, image: images[i] })).filter((c) => c.image) }),
      });
      if (!res.ok || seq !== searchSeq) return; // AI 키가 없거나 그 사이 초기화했으면 건너뛴다
      const body = await res.json();
      for (const item of body.results || []) {
        if (LIKELY[item.likelihood]) find.visual[item.id] = { likelihood: item.likelihood, reason: String(item.reason || "").slice(0, 120), rank: LIKELY[item.likelihood].rank };
      }
      drawResults();
    } catch { /* 사진 비교 실패는 조용히 넘긴다 */ }
  }

  // ---- 습득물 찾기 화면(게시판 위에 덮는 전체 화면) ----
  // 분실물 게시판 제목 줄 오른쪽 '습득물 찾기' 버튼으로 연다. ← 는 닫기(검색 초기화), 오른쪽 위 '초기화'는 검색만 비우기.
  // 분실물 게시판 제목 줄 오른쪽 버튼: 습득물 찾기 + (방문객) 내 신청 / (캐스트) 습득 요청
  function findButton(posts, me, isCast) {
    lastCtx = { posts, me, isCast };
    const icon = (name) => (window.ParkIcons ? window.ParkIcons(name) : "");
    const second = isCast
      ? (() => { const n = posts.filter((p) => isPending(p) && posts.some((f) => f.id === p.claimFor && isOpenPost(f))).length;
          return `<button type="button" class="lost-find-open" data-lost-requests-open><span>습득 요청</span>${n ? `<b class="lost-count">${n}</b>` : ""}</button>`; })()
      : (() => { const n = unseenClaims(posts, me).length, total = myClaims(posts, me).length;
          return total ? `<button type="button" class="lost-find-open" data-lost-mine-open><span>내 신청</span>${n ? '<b class="lost-dot" aria-label="새 소식"></b>' : ""}</button>` : ""; })();
    return `<div class="lost-head-actions"><button type="button" class="lost-find-open" data-lost-find-open>${icon("search")}<span>습득물 찾기</span></button>${second}</div>`;
  }

  // ---- 전체 화면 시트(습득물 찾기 / 내 신청 / 습득 요청) ----
  // ← 는 닫기. 습득물 찾기는 닫을 때 검색을 초기화하고, 오른쪽 위 '초기화'로 검색만 비울 수도 있다.
  let sheet = null;
  let sheetKind = "";
  let requestTab = "pending";
  const SHEET_TITLES = { find: "습득물 찾기", mine: "내 신청", requests: "습득 요청" };
  function sheetBody(kind) {
    const posts = window.ParkBoards?.lostPosts?.() || lastCtx.posts;
    lastCtx = { ...lastCtx, posts, me: lastCtx.me || { id: window.ParkAuth?.id?.() }, isCast: window.ParkAuth?.role ? window.ParkAuth.role() === "cast" : lastCtx.isCast };
    if (kind === "find") return searchPanel(lastCtx.posts, lastCtx.me, lastCtx.isCast);
    if (kind === "mine") return mineView(lastCtx.posts, lastCtx.me);
    return requestsView(lastCtx.posts);
  }
  function openSheet(kind) {
    closeSheet(false);
    sheetKind = kind;
    sheet = document.createElement("div");
    sheet.className = "lost-find-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", SHEET_TITLES[kind]);
    const back = window.ParkIcons ? window.ParkIcons("back") : "←";
    sheet.innerHTML = `<div class="lost-find-sheet__bar">
        <button type="button" class="srch-back" data-lost-sheet-close aria-label="게시판으로 돌아가기">${back}</button>
        <strong>${SHEET_TITLES[kind]}</strong>
        ${kind === "find" ? '<button type="button" class="lost-find-sheet__reset" data-lost-find-reset>초기화</button>' : "<span></span>"}
      </div>
      <div class="lost-find-sheet__body" data-lost-sheet-body>${sheetBody(kind)}</div>`;
    document.body.append(sheet);
    document.addEventListener("keydown", onSheetKey);
    if (kind === "find" && !find.searched) sheet.querySelector('[name="q"]')?.focus({ preventScroll: true });
    if (kind === "mine") { markSeen(lastCtx.posts, lastCtx.me); window.ParkBoards?.refresh?.(); }
  }
  function refreshSheet() {
    if (!sheet || sheetKind === "find") return;
    const body = sheet.querySelector("[data-lost-sheet-body]");
    if (body) body.innerHTML = sheetBody(sheetKind);
  }
  // reset: 습득물 찾기를 닫을 때 검색 초기화 여부('글 보기'·확인 요청·신고하기로 잠깐 나갈 때는 남겨 둔다)
  function closeSheet(reset = true) {
    const wasFind = sheetKind === "find";
    sheet?.remove();
    sheet = null;
    sheetKind = "";
    document.removeEventListener("keydown", onSheetKey);
    if (reset && wasFind) resetFind(false);
  }
  const openFind = () => openSheet("find");
  const closeFind = (reset = true) => closeSheet(reset);
  function onSheetKey(event) { if (event.key === "Escape" && !document.querySelector("#modal[open]")) closeSheet(true); }
  function resetFind(redraw = true) {
    searchSeq++;
    Object.assign(find, EMPTY_FIND());
    if (redraw) redrawPanel();
  }

  // 방문객: 내가 보낸 확인 요청과 처리 현황
  function mineView(posts, me) {
    const list = myClaims(posts, me);
    if (!list.length) return `<div class="lost-find"><p class="lost-find__empty">아직 보낸 확인 요청이 없어요.<br>'습득물 찾기'에서 내 물건 같은 습득물에 '내 물건 같아요'를 눌러 보세요.</p></div>`;
    const counts = list.reduce((acc, c) => { const st = claimState(c, posts); acc[st] = (acc[st] || 0) + 1; return acc; }, {});
    return `<div class="lost-find">
      <p class="lost-find__intro">${Object.entries(counts).map(([st, n]) => `${CLAIM_STATES[st].label} ${n}건`).join(" · ")}</p>
      ${list.map((c) => {
        const found = posts.find((p) => p.id === c.claimFor);
        const st = claimState(c, posts);
        const guide = {
          pending: "캐스트가 본인 확인 중이에요. 결과가 나오면 여기와 게시판에 알려 드려요.",
          matched: `내 물건으로 확인됐어요. <b>${esc(found?.storageLocation || "정문 손님상담실")}</b>에서 신분증을 보여 주고 찾아가세요.`,
          resolved: "물건을 돌려받았어요.",
          rejected: esc(c.claimReason || "캐스트가 확인한 결과 주인이 아닌 것으로 보여요."),
          closed: "이 습득물은 다른 분의 물건으로 확인됐거나 정리됐어요.",
        }[st];
        return `<article class="claim-card claim-card--${CLAIM_STATES[st].tone}">
          ${thumb(found)}
          <div class="claim-card__body">
            <div class="claim-card__top"><strong>${esc(found?.title || c.title)}</strong>${badge(st)}</div>
            <p class="lost-ai-match__meta">신청 ${esc(fmtTime(c.claimAt || c.createdAt))}${c.claimDecidedAt ? ` · 처리 ${esc(fmtTime(c.claimDecidedAt))}` : ""}</p>
            ${c.claimNote ? `<p class="claim-card__note">내가 적은 특징: ${esc(c.claimNote)}</p>` : ""}
            <p class="claim-card__guide">${guide}</p>
            <div class="pb-link-actions">
              ${found ? `<button type="button" class="outline" data-pb-post="${esc(found.id)}">습득물 보기</button>` : ""}
              ${st === "pending" ? `<button type="button" class="outline" data-lost-claim-cancel="${esc(c.id)}">신청 취소</button>` : ""}
              ${st === "rejected" && found && isOpenPost(found) ? `<button type="button" class="outline" data-lost-claim="${esc(found.id)}">다시 요청</button>` : ""}
            </div>
          </div>
        </article>`;
      }).join("")}
    </div>`;
  }

  // 캐스트: 방문객 확인 요청을 습득물별로 모아 보기 + 처리 기록
  function requestsView(posts) {
    const claims = posts.filter((p) => p.kind === "lost" && p.claimFor);
    const pending = claims.filter((c) => claimState(c, posts) === "pending");
    const done = claims.filter((c) => claimState(c, posts) !== "pending").sort((a, b) => (b.claimDecidedAt || b.claimAt || 0) - (a.claimDecidedAt || a.claimAt || 0));
    const tabs = `<div class="pb-subfilters claim-tabs" role="group" aria-label="습득 요청 구분">
      <button type="button" class="pb-subchip ${requestTab === "pending" ? "active" : ""}" data-lost-request-tab="pending">대기 ${pending.length}</button>
      <button type="button" class="pb-subchip ${requestTab === "done" ? "active" : ""}" data-lost-request-tab="done">처리 기록 ${done.length}</button>
    </div>`;
    if (requestTab === "done") {
      return `<div class="lost-find">${tabs}${done.length ? done.map((c) => {
        const found = posts.find((p) => p.id === c.claimFor);
        const st = claimState(c, posts);
        return `<article class="claim-card claim-card--${CLAIM_STATES[st].tone}">${thumb(found)}<div class="claim-card__body">
          <div class="claim-card__top"><strong>${esc(found?.title || c.title)}</strong>${badge(st)}</div>
          <p class="lost-ai-match__meta">${esc(c.author)} 님 · 신청 ${esc(fmtTime(c.claimAt || c.createdAt))}${c.claimDecidedAt ? ` · 처리 ${esc(fmtTime(c.claimDecidedAt))}` : ""}</p>
          ${st === "rejected" && c.claimReason ? `<p class="claim-card__note">반려 사유: ${esc(c.claimReason)}</p>` : ""}
          <div class="pb-link-actions">${found ? `<button type="button" class="outline" data-pb-post="${esc(found.id)}">습득물 보기</button>` : ""}${st === "matched" && found ? `<button type="button" class="primary" data-lost-resolve="${esc(found.id)}">인계 완료 처리</button>` : ""}</div>
        </div></article>`;
      }).join("") : '<p class="lost-find__empty">아직 처리한 요청이 없어요.</p>'}</div>`;
    }
    if (!pending.length) return `<div class="lost-find">${tabs}<p class="lost-find__empty">기다리는 확인 요청이 없어요.</p></div>`;
    // 습득물별로 묶는다(한 물건에 여러 명이 신청할 수 있음)
    const groups = new Map();
    for (const c of pending) groups.set(c.claimFor, [...(groups.get(c.claimFor) || []), c]);
    return `<div class="lost-find">${tabs}
      <p class="lost-find__intro">주인만 아는 특징과 신분증으로 본인을 확인한 뒤 연결해 주세요. 한 명을 연결하면 같은 물건의 다른 요청은 자동으로 마감돼요.</p>
      ${[...groups.entries()].map(([foundId, list]) => {
        const found = posts.find((p) => p.id === foundId);
        return `<section class="claim-group">
          <div class="claim-group__head">${thumb(found)}<div><strong>${esc(found?.title || "습득물")}</strong>
            <p class="lost-ai-match__meta">${esc([found?.itemCategory, found?.zone].filter(Boolean).join(" · "))}${found?.storageLocation ? ` · 보관: ${esc(found.storageLocation)}` : ""}</p>
            <button type="button" class="ps-link" data-pb-post="${esc(foundId)}">습득물 글 보기</button></div></div>
          ${list.map((c) => {
            const m = found ? M.score(c, found) : { percent: 0 };
            return `<div class="claim-row">
              <div class="claim-card__top"><strong>${esc(c.author)} 님</strong><span class="lost-ai-match__pct">AI ${m.percent}%</span></div>
              <p class="lost-ai-match__meta">신청 ${esc(fmtTime(c.claimAt || c.createdAt))}</p>
              ${c.claimNote ? `<p class="claim-card__note">주인만 아는 특징: ${esc(c.claimNote)}</p>` : '<p class="claim-card__note">적은 특징 없음</p>'}
              <div class="pb-link-actions">
                <button type="button" class="primary" data-lost-claim-ok="${esc(foundId)}" data-lost-claim-lost="${esc(c.id)}">확인 후 연결</button>
                <button type="button" class="outline" data-lost-claim-reject="${esc(c.id)}">반려</button>
              </div>
            </div>`;
          }).join("")}
        </section>`;
      }).join("")}
    </div>`;
  }

  function openReject(lostId) {
    window.parkModal?.(`<form class="lost-claim-form" data-lost-reject-form="${esc(lostId)}">
      <h2>확인 요청 반려</h2>
      <p class="pb-hint">방문객의 '내 신청'에 사유가 보여요. 개인정보는 적지 마세요.</p>
      <label>반려 사유 (선택)<input name="reason" maxlength="120" placeholder="예: 가방 안 물건이 설명과 달라요"></label>
      <div class="pb-link-actions"><button type="submit" class="primary">반려하기</button></div>
    </form>`);
  }

  // '내 물건 같아요' → 주인만 아는 특징을 적고 확인 요청
  function openClaim(foundId) {
    const posts = window.ParkBoards?.lostPosts?.() || lastCtx.posts;
    const myId = window.ParkAuth?.id?.() || lastCtx.me?.id;
    const found = posts.find((p) => p.id === foundId);
    if (!found) return;
    const myLost = posts.filter((p) => isOpenPost(p) && p.lostType === "분실물" && p.authorId === myId && !p.claimFor);
    window.parkModal?.(`<form class="lost-claim-form" data-lost-claim-form="${esc(foundId)}">
      <h2>확인 요청 보내기</h2>
      <p class="pb-hint">'${esc(found.title)}'이(가) 내 물건이라면, 주인만 아는 특징을 적어 주세요. 캐스트가 확인한 뒤 연결하고 보관 장소를 알려 드려요.</p>
      <label>주인만 아는 특징<textarea name="note" maxlength="300" required placeholder="예: 가방 안에 파란 필통과 에버랜드 연간회원 카드가 있어요"></textarea></label>
      ${myLost.length ? `<label>내 분실물 글과 묶기<select name="lostId"><option value="">새 요청으로 보내기</option>${myLost.map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join("")}</select></label>` : ""}
      <div class="pb-link-actions"><button type="submit" class="primary">확인 요청 보내기</button></div>
    </form>`);
  }

  // 검색해도 없으면 검색 내용(글자·사진·특징)을 그대로 분실물 신고 양식에 채운다.
  function reportFromSearch() {
    const t = find.tags || M.clean({ ...M.extract(find.text), source: "rule" });
    const label = [...t.colors.slice(0, 1), ...t.brands.slice(0, 1), t.item].filter(Boolean).join(" ");
    window.ParkBoards?.write?.("lost", {
      title: label ? `${label} 분실` : find.text,
      body: find.text,
      itemCategory: find.cat || t.itemCategory,
      zone: find.zone || t.zone,
      place: t.place,
    });
    const form = document.querySelector("#modal form") || document.querySelector(".lost-ai")?.closest("form");
    if (!form) return;
    const hidden = form.querySelector('input[name="aiTags"]');
    if (hidden) hidden.value = JSON.stringify(t);
    const text = form.querySelector(".lost-ai__text");
    if (text) text.value = find.text;
    if (find.file && typeof DataTransfer !== "undefined") {
      for (const input of form.querySelectorAll('input[name="photo"], [data-lost-ai-photo]')) {
        const dt = new DataTransfer();
        dt.items.add(find.file);
        input.files = dt.files;
      }
    }
  }

  document.addEventListener("submit", (event) => {
    if (event.target.matches?.("[data-lost-find]")) { event.preventDefault(); runFind(event.target); return; }
    const rejectForm = event.target.closest?.("[data-lost-reject-form]");
    if (rejectForm) {
      event.preventDefault();
      const reason = String(new FormData(rejectForm).get("reason") || "").trim();
      document.querySelector("#modal")?.close();
      if (window.ParkBoards?.rejectClaim?.(rejectForm.dataset.lostRejectForm, reason)) refreshSheet();
      return;
    }
    const claimForm = event.target.closest?.("[data-lost-claim-form]");
    if (claimForm) {
      event.preventDefault();
      const f = new FormData(claimForm);
      document.querySelector("#modal")?.close();
      // 확인 요청을 보내면 열려 있던 화면을 닫고 습득물 글(요청 상태)을 보여 준다. 찾기 결과는 남아 있다.
      closeSheet(false);
      window.ParkBoards?.requestClaim?.(claimForm.dataset.lostClaimForm, { note: String(f.get("note") || "").trim(), lostId: String(f.get("lostId") || "") });
    }
  });
  document.addEventListener("change", async (event) => {
    if (event.target.matches?.("[data-lost-find-photo]")) {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8_000_000) { window.parkToast?.("PNG·JPG·WebP 사진(8MB 이하)을 골라 주세요."); return; }
      find.file = file.size <= 1_000_000 ? file : null; // 1MB 이하만 신고 글 사진으로 넘길 수 있다
      find.photo = await shrink(await readFile(file));
      find.tags = null;
      // 다시 그리기 전에 지금 입력칸 값(비어 있어도)을 기억해 둔다.
      const typed = event.target.closest("form")?.querySelector('[name="q"]')?.value ?? find.text;
      redrawPanel();
      const fresh = [...document.querySelectorAll("[data-lost-find]")].find((x) => x.offsetParent !== null);
      if (fresh) fresh.querySelector('[name="q"]').value = typed;
      if (fresh) runFind(fresh);
      return;
    }
    if (event.target.closest?.("[data-lost-find]") && event.target.tagName === "SELECT") { runFind(event.target.closest("form")); return; }
    if (event.target.closest?.("[data-lost-find]") && event.target.type === "date") { runFind(event.target.closest("form")); return; }
    // AI 칸에서 고른 사진을 양식 아래쪽 '사진' 칸에도 넣어, 분석한 사진이 그대로 게시글에 첨부되게 한다.
    if (event.target.matches?.("[data-lost-ai-photo]")) {
      const target = event.target.closest("form")?.querySelector('input[name="photo"]');
      const file = event.target.files?.[0];
      if (target && file && typeof DataTransfer !== "undefined") {
        const dt = new DataTransfer();
        dt.items.add(file);
        target.files = dt.files;
      }
      return;
    }
    if (event.isTrusted && event.target.tagName === "SELECT" && event.target.closest("form")?.querySelector(".lost-ai")) event.target.dataset.userSet = "1";
  });
  document.addEventListener("click", (event) => {
    const fillButton = event.target.closest("[data-lost-ai-fill]");
    if (fillButton) { event.preventDefault(); fill(fillButton); return; }
    if (event.target.closest("[data-lost-find-open]")) { openSheet("find"); return; }
    if (event.target.closest("[data-lost-mine-open]")) { openSheet("mine"); return; }
    if (event.target.closest("[data-lost-requests-open]")) { openSheet("requests"); return; }
    if (event.target.closest("[data-lost-sheet-close]")) { closeSheet(true); return; }
    const tab = event.target.closest("[data-lost-request-tab]");
    if (tab) { requestTab = tab.dataset.lostRequestTab; refreshSheet(); return; }
    const cancel = event.target.closest("[data-lost-claim-cancel]");
    if (cancel) { if (window.ParkBoards?.cancelClaim?.(cancel.dataset.lostClaimCancel)) refreshSheet(); return; }
    const rejectBtn = event.target.closest("[data-lost-claim-reject]");
    if (rejectBtn) { openReject(rejectBtn.dataset.lostClaimReject); return; }
    const resolveBtn = event.target.closest("[data-lost-resolve]");
    if (resolveBtn) { if (window.ParkBoards?.resolveLost?.(resolveBtn.dataset.lostResolve)) { window.parkToast?.("인계 완료로 처리했어요."); refreshSheet(); } return; }
    if (event.target.closest("[data-lost-find-reset]")) { resetFind(true); sheet?.querySelector('[name="q"]')?.focus(); return; }
    // 찾기 화면에서 글을 열면 화면을 닫고(결과는 남김) 게시판의 글 상세로 간다.
    if (sheet && event.target.closest("[data-pb-post]") && sheet.contains(event.target)) closeSheet(false);
    const claim = event.target.closest("[data-lost-claim]");
    if (claim) { openClaim(claim.dataset.lostClaim); return; }
    const ok = event.target.closest("[data-lost-claim-ok]");
    if (ok) {
      // 습득 요청 화면에서 누르면 화면에 남아 목록만 갱신, 글 상세에서 누르면 그 글을 다시 보여 준다.
      const inSheet = Boolean(sheet && sheet.contains(ok));
      if (window.ParkBoards?.confirmClaim?.(ok.dataset.lostClaimOk, ok.dataset.lostClaimLost, { stay: inSheet }) && inSheet) refreshSheet();
      return;
    }
    if (event.target.closest("[data-lost-find-report]")) { closeSheet(false); reportFromSearch(); return; }
    if (event.target.closest("[data-lost-find-clear-photo]")) {
      find.photo = ""; find.file = null; find.tags = null; find.visual = {};
      redrawPanel();
      return;
    }
    // 캐스트 'AI 추천 연결 후보'의 '이 글과 연결' → 기존 연결 기능(boards.js의 선택 상자 + 연결 버튼)을 그대로 쓴다.
    const linkButton = event.target.closest("[data-lost-ai-link]");
    if (linkButton) {
      // 같은 화면(이 버튼이 있는 상세 화면) 안의 선택 상자와 연결 버튼을 쓴다.
      const scope = linkButton.closest(".pb-detail-page") || document;
      const select = scope.querySelector("#pb-link-select");
      const go = scope.querySelector(`[data-pb-link="${CSS.escape(linkButton.dataset.lostAiLink)}"]`);
      if (!select || !go || ![...select.options].some((o) => o.value === linkButton.dataset.lostAiTarget)) {
        window.parkToast?.("연결할 수 없는 글이에요. 새로고침 후 다시 시도해 주세요.");
        return;
      }
      select.value = linkButton.dataset.lostAiTarget;
      go.click();
    }
  });

  window.ParkLostAI = { formBox, tags, panel, banner, afterSave, fill, searchPanel, findButton, openFind, closeFind, _find: find };
})();
