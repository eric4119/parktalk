/* ParkTalk 운영 데이터: FAQ, 주변 가게, 식단 연동 상태.
 * 브라우저(window.ParkData)와 server.js(require)에서 같은 파일을 함께 쓴다.
 * 관리자 화면이 생기면 이 기본값 위에 관리자가 등록한 내용을 덮어쓰는 구조로 확장한다. */
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.ParkData = data;
})(typeof self !== "undefined" ? self : this, function () {
  // 앱 이용과 관련해 코드와 문서로 확인된 내용만 넣는다. 에버랜드 내부 규정처럼 확인되지 않은 내용은 넣지 않는다.
  const faq = [
    {
      id: "mode-switch",
      question: "캐스트 모드와 일반 사용자 모드는 어떻게 바꾸나요?",
      keywords: ["모드", "전환", "바꾸", "일반 사용자", "방문객 모드", "캐스트 모드"],
      answer: "캐스트 계정은 앱 설정에서 '일반 사용자 모드로 전환' 버튼을 눌러 방문객처럼 파크톡을 이용할 수 있고, 같은 방법으로 다시 캐스트 모드로 돌아올 수 있어요. 일반 회원 계정은 캐스트 인증을 마쳐야 캐스트 모드에 들어갈 수 있습니다.",
    },
    {
      id: "cast-verification",
      question: "캐스트 인증(사원증 인증)은 어떻게 하나요?",
      keywords: ["사원증", "인증", "캐스트 인증", "직원 인증"],
      answer: "사원증 인증 방식과 에버랜드 시스템 연동 여부는 아직 정해지지 않았어요. 인증 기능이 열리면 앱 설정에서 신청할 수 있도록 안내할 예정입니다.",
    },
    {
      id: "login-data",
      question: "로그인 정보와 글은 어디에 저장되나요?",
      keywords: ["로그인", "계정", "비밀번호", "저장", "데이터", "회원가입"],
      answer: "현재는 시연판이라 아이디·닉네임·이용 유형과 게시글이 이 브라우저에만 저장돼요. 비밀번호는 저장하거나 검증하지 않으니 실제 비밀번호를 쓰지 마세요. 다른 기기와 공유하려면 서버 연동이 필요합니다.",
    },
    {
      id: "board-scope",
      question: "방문객도 캐스트 게시판을 볼 수 있나요?",
      keywords: ["게시판", "공개", "방문객", "자유", "중고", "부서", "볼 수"],
      answer: "칭찬·미아·분실물 게시판은 캐스트와 방문객이 함께 봐요. 자유·중고 거래·질문·부서별 게시판은 캐스트 모드에서만 보입니다. 캐스트가 일반 사용자 모드로 글을 써도 작성자는 캐스트로 표시돼요.",
    },
    {
      id: "popular",
      question: "인기 게시판은 어떤 기준으로 정렬되나요?",
      keywords: ["인기", "정렬", "좋아요", "순위"],
      answer: "최근 5시간 동안 받은 좋아요 수가 많은 순서예요. 좋아요 수가 같으면 최신 글이 먼저 나오고, 최근 5시간 안에 좋아요가 없는 글은 인기 목록에서 빠집니다.",
    },
    {
      id: "missing-child",
      question: "미아가 발생하면 어떻게 하나요?",
      keywords: ["미아", "아이", "잃어버", "보호자", "길 잃"],
      answer: "가장 먼저 가까운 근무자(캐스트)에게 알려 주세요. 파크가 실외라 방송을 해도 못 듣는 경우가 많아서, 근무자를 통해 신고하는 게 가장 빠르다고 에버랜드 공식 FAQ에서 안내하고 있어요. 파크톡 미아 게시판은 보조 수단이라 신고를 대신하지 않습니다.",
    },
    {
      id: "lost-found",
      question: "분실물·습득물은 어떻게 등록하나요?",
      keywords: ["분실", "습득", "잃어버린 물건", "물건", "분실물"],
      answer: "게시판의 분실물 탭에서 글쓰기를 누르면 돼요. 일반 사용자는 분실물만, 캐스트는 분실물과 습득물을 모두 등록할 수 있어요. 사진은 PNG·JPG·WebP 1MB 이하만 올릴 수 있습니다.",
    },
    {
      id: "menu",
      question: "오늘 캐스트 식당 메뉴는 어디서 보나요?",
      keywords: ["식단", "메뉴", "식당", "밥", "점심", "저녁", "조식"],
      answer: "캐스트 식당 메뉴는 공개된 연동 API가 없어서 자동으로 불러올 수 없어요. 관리자가 식단표를 등록하면 '식당 메뉴' 화면에 날짜별로 표시됩니다.",
    },
    {
      id: "stores",
      question: "근처 제휴 가게는 어디서 보나요?",
      keywords: ["제휴", "가게", "맛집", "할인", "예약", "근처", "주변"],
      answer: "'가게 예약' 화면에서 에버랜드 주변 가게 목록을 볼 수 있어요. 지금 목록은 공개 자료로 모은 주변 가게이고, 캐스트 제휴 여부와 할인 내용은 관리자가 확인한 뒤 표시됩니다.",
    },
    {
      id: "location",
      question: "일행 위치 공유는 안전한가요?",
      keywords: ["위치", "일행", "gps", "지도", "공유"],
      answer: "위치 표시는 동의한 경우에만 켜지고 언제든 끌 수 있어요. 현재 시연판은 기기 위치 권한만 확인하고 좌표를 저장하거나 다른 사람에게 보내지 않습니다.",
    },
    {
      id: "animal",
      question: "동물 키우기는 언제 열리나요?",
      keywords: ["동물 키우기", "동물 친구", "키우기", "아바타"],
      answer: "동물 친구를 고르고 돌보는 기능은 기획 중이에요. 화면은 미리 볼 수 있고, 방식이 정해지면 추가됩니다.",
    },
  ];

  // 공개 자료(식신·맘맘 장소 정보)로 위치가 확인된 에버랜드 주변 가게.
  // partner: 캐스트 제휴가 확인되면 관리자가 true와 혜택(benefit)을 채운다. 확인 전에는 false.
  const stores = [
    { id: "pohue", name: "포후에 에버랜드직영점", category: "베트남 음식·쌀국수", address: "경기 용인시 처인구 포곡읍 에버랜드로 74 1층", phone: "0507-1463-1675", note: "쌀국수·볶음 쌀국수, 넓은 주차장", partner: false, benefit: "" },
    { id: "sotnaeeum", name: "솥내음 용인에버랜드점", category: "한식·솥밥", address: "경기 용인시 처인구 포곡읍 에버랜드로 100 1층", phone: "070-4290-1210", note: "솥밥 전문, 점심 특선, 전용 주차장", partner: false, benefit: "" },
    { id: "everga", name: "에버가참숯구이", category: "한식·돼지갈비", address: "경기 용인시 처인구 포곡읍 성산로 650", phone: "0507-1342-0006", note: "참숯 갈비, 넓은 좌석으로 단체 이용 편리", partner: false, benefit: "" },
    { id: "gangkyung", name: "강경불고기 에버랜드점", category: "한식·불고기", address: "경기 용인시 처인구 포곡읍 옥현로65번길 269 에버스카이", phone: "", note: "놀이방, 전용 주차장", partner: false, benefit: "" },
    { id: "rosemary", name: "라마다용인호텔 로즈마리 레스토랑", category: "호텔 레스토랑", address: "경기 용인시 처인구 포곡읍 마성로 420 라마다호텔 2층", phone: "", note: "만차 시 에버랜드 제4주차장 이용(도보 약 5분)", partner: false, benefit: "" },
    { id: "kkumegreen", name: "꿈에그린정육식당", category: "셀프 정육식당", address: "경기 용인시 처인구 포곡읍 삼계리", phone: "", note: "한우·돼지고기 셀프 정육식당(정확한 번지는 확인 필요)", partner: false, benefit: "" },
  ];

  // 식단 연동 상태. 공개 API가 확인되지 않아 관리자 등록 방식으로 운영한다.
  const menuSource = {
    mode: "admin",
    apiAvailable: false,
    reason: "캐스트 식당 식단을 외부에 공개하는 API를 찾지 못했습니다(에버랜드 공식 앱, 공공데이터포털 모두 해당 없음). 사내 급식 앱의 비공개 통신을 가져오는 방식은 이용약관 위반 소지가 있어 쓰지 않습니다.",
  };

  // 현재 앱이 쓰는 데이터. 서버(관리자가 저장한 내용)를 불러오면 apply()로 덮어쓴다.
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const defaults = { faq: clone(faq), stores: clone(stores), menus: [] };
  const data = { faq, stores, menus: [], restaurants: [], officialDisabled: [], menuSource, updatedAt: null };

  const MEALS = ["조식", "중식", "석식", "간식"];
  const text = (value, max) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  const longText = (value, max) => String(value ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, max);
  const list = (value, maxItems, maxLength) => (Array.isArray(value) ? value : String(value ?? "").split(/[,\n]/))
    .map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems);
  const makeId = (prefix, index) => `${prefix}-${Date.now().toString(36)}-${index}`;
  const safeId = (value, prefix, index) => (/^[a-zA-Z0-9_-]{1,64}$/.test(String(value || "")) ? String(value) : makeId(prefix, index));

  // 관리자 입력 검증. 서버 저장 전과 테스트에서 같은 규칙을 쓴다. 잘못된 항목은 버리고 길이는 자른다.
  function sanitizeAdminData(input = {}) {
    const result = {};
    if (Array.isArray(input.faq)) {
      result.faq = input.faq.slice(0, 100).map((item, i) => ({
        id: safeId(item?.id, "faq", i),
        question: text(item?.question, 120),
        keywords: list(item?.keywords, 15, 20),
        answer: longText(item?.answer, 1000),
      })).filter((item) => item.question && item.answer);
    }
    if (Array.isArray(input.stores)) {
      result.stores = input.stores.slice(0, 100).map((item, i) => {
        const partner = item?.partner === true;
        return {
          id: safeId(item?.id, "store", i),
          name: text(item?.name, 60),
          category: text(item?.category, 30),
          address: text(item?.address, 120),
          phone: text(item?.phone, 20).replace(/[^0-9+\- ]/g, ""),
          note: text(item?.note, 200),
          partner,
          benefit: partner ? text(item?.benefit, 200) : "",
        };
      }).filter((item) => item.name);
    }
    if (Array.isArray(input.officialDisabled)) {
      // 관리자가 끈 공식 안내 카테고리 이름 목록
      result.officialDisabled = [...new Set(list(input.officialDisabled, 30, 30))];
    }
    if (Array.isArray(input.menus)) {
      result.menus = input.menus.slice(0, 600).map((item, i) => ({
        id: safeId(item?.id, "menu", i),
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(item?.date || "")) ? String(item.date) : "",
        restaurant: text(item?.restaurant, 40),
        meal: MEALS.includes(item?.meal) ? item.meal : "중식",
        course: text(item?.course, 20), // 코너: 한식·누들·인터·테이크아웃 등
        kcal: text(item?.kcal, 40),
        plus: text(item?.plus, 100), // 추가 제공(Plus) 메뉴
        items: list(item?.items, 20, 100),
      })).filter((item) => item.date && item.restaurant && item.items.length)
        .sort((a, b) => a.date.localeCompare(b.date) || MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal) || a.restaurant.localeCompare(b.restaurant));
    }
    if (Array.isArray(input.restaurants)) {
      // 식당별 운영시간·안내 문구(원산지·알레르기 등)
      result.restaurants = input.restaurants.slice(0, 10).map((item) => ({
        name: text(item?.name, 40),
        hours: list(item?.hours, 6, 120),
        notes: (Array.isArray(item?.notes) ? item.notes : []).map((note) => longText(note, 700)).filter(Boolean).slice(0, 8),
      })).filter((item) => item.name);
    }
    return result;
  }

  // 관리자가 저장한 값이 있으면 그것을, 없으면 기본값을 쓴다.
  // seed: 저장소에 함께 올라가는 기본 식단(cast-menu.json). 관리자가 저장한 식단이 있으면 그걸 쓴다.
  function merge(saved = {}, seed = {}) {
    return {
      faq: saved.faq || clone(defaults.faq),
      stores: saved.stores || clone(defaults.stores),
      // 기본 식단(cast-menu.json)과 관리자가 저장한 식단을 합친다. 같은 식당·같은 날짜는 관리자가 저장한 쪽을 쓴다.
      menus: mergeMenus(seed.menus || [], saved.menus || [])
        .sort((a, b) => a.date.localeCompare(b.date) || MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal) || a.restaurant.localeCompare(b.restaurant)),
      restaurants: (saved.restaurants || []).reduce((list, item) => mergeRestaurants(list, item), seed.restaurants || []),
      officialDisabled: saved.officialDisabled || [],
      updatedAt: saved.updatedAt || null,
    };
  }

  function apply(remote = {}) {
    const clean = sanitizeAdminData(remote);
    data.faq = clean.faq || clone(defaults.faq);
    data.stores = clean.stores || clone(defaults.stores);
    data.menus = clean.menus || [];
    data.restaurants = clean.restaurants || [];
    data.officialDisabled = clean.officialDisabled || [];
    data.updatedAt = remote.updatedAt || null;
    return data;
  }

  // 브라우저에서 서버 데이터를 불러온다.
  // Cloudflare Pages 배포에서는 /api/park-data가 빈 객체 {}만 돌려주므로, 식단이 없으면 기본 식단 파일(cast-menu.json)을 채운다.
  async function load() {
    let remote = null;
    try {
      const response = await fetch("api/park-data", { cache: "no-store" });
      if (response.ok && (response.headers.get("content-type") || "").includes("json")) remote = await response.json();
    } catch { /* 서버 없음 */ }
    remote = remote && typeof remote === "object" ? remote : {};
    if (!Array.isArray(remote.menus) || !remote.menus.length) {
      try {
        const response = await fetch("cast-menu.json");
        if (response.ok) {
          const seed = await response.json();
          remote = { ...remote, menus: seed.menus, restaurants: remote.restaurants || seed.restaurants };
        }
      } catch { /* 기본 식단도 없으면 빈 식단 */ }
    }
    apply(remote);
    return true;
  }

  // ---- 사원식당 식단표(웰스토리 주간 식단표 텍스트) 읽기 ----
  // 날짜 줄 "11/16 (월)", 코너 줄 "중식 한식 (842kcal)", 그 아래 메뉴 줄, "Plus: ..." 줄, 맨 아래 안내 문구를 읽는다.
  function guessYear(month, day, today = new Date()) {
    const base = new Date(`${todayKey(today)}T00:00:00Z`);
    const year = base.getUTCFullYear();
    return [year - 1, year, year + 1]
      .map((y) => ({ y, diff: Math.abs(Date.UTC(y, month - 1, day) - base.getTime()) }))
      .sort((a, b) => a.diff - b.diff)[0].y;
  }
  function parseCastMenu(raw, options = {}) {
    const lines = String(raw || "").split(/\r?\n/).map((line) => line.trim());
    const titleLine = lines.find((line) => /식단/.test(line) && /식당/.test(line)) || "";
    const restaurant = text(options.restaurant || titleLine.replace(/주간\s*식단표.*$/, "").replace(/식단표.*$/, ""), 40) || "사원식당";
    const hours = lines.filter((line) => /^\[(조식|중식|석식)\]/.test(line)).map((line) => line.replace(/^\[(조식|중식|석식)\]\s*/, "$1 "));
    const menus = [];
    const notes = [];
    let date = "", current = null, inNotes = false;
    const flush = () => { if (current && current.items.length) menus.push(current); current = null; };
    for (const line of lines) {
      if (!line) continue;
      if (/^안내 문구/.test(line)) { flush(); inNotes = true; continue; }
      if (inNotes) { notes.push(line); continue; }
      const day = line.match(/^(\d{1,2})\/(\d{1,2})\s*\(([월화수목금토일])\)/);
      if (day) {
        flush();
        const month = Number(day[1]), dd = Number(day[2]);
        const year = options.year || guessYear(month, dd, options.today);
        date = `${year}-${String(month).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
        continue;
      }
      const course = line.match(/^(조식|중식|석식)\s+(.+?)\s*(?:\(([^)]*)\))?\s*$/);
      if (course && date) {
        flush();
        current = { date, restaurant, meal: course[1], course: course[2].trim(), kcal: (course[3] || "").replace(/\/kcal/g, "kcal"), plus: "", items: [] };
        continue;
      }
      if (!current) continue;
      const plus = line.match(/^plus\s*[:：]\s*(.+)$/i);
      if (plus) { current.plus = plus[1].trim(); continue; }
      current.items.push(line);
    }
    flush();
    // 안내 문구는 "제목:" 줄과 그 아래 문단을 한 항목으로 묶는다.
    const grouped = [];
    for (const note of notes) {
      if (grouped.length && /[:：]$/.test(grouped[grouped.length - 1])) grouped[grouped.length - 1] += ` ${note}`;
      else grouped.push(note);
    }
    const clean = sanitizeAdminData({ menus: menus.map((menu, i) => ({ ...menu, id: `menu-${menu.date}-${i}` })), restaurants: [{ name: restaurant, hours, notes: grouped }] });
    return { restaurant: clean.restaurants[0], menus: clean.menus, dates: [...new Set(clean.menus.map((m) => m.date))] };
  }
  // 새 식단표를 기존 식단에 합친다. 같은 식당·같은 날짜는 새 식단으로 바꾼다.
  function mergeMenus(existing = [], incoming = []) {
    const replaced = new Set(incoming.map((m) => `${m.restaurant}|${m.date}`));
    return [...existing.filter((m) => !replaced.has(`${m.restaurant}|${m.date}`)), ...incoming];
  }
  function mergeRestaurants(existing = [], incoming) {
    if (!incoming) return existing;
    return [...existing.filter((r) => r.name !== incoming.name), incoming];
  }

  // 날짜는 한국 시간 기준 YYYY-MM-DD.
  function todayKey(now = new Date()) {
    return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
  function shiftDate(key, days) {
    const date = new Date(`${key}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
  function menusFor(dateKey, menus = data.menus) {
    return menus.filter((menu) => menu.date === dateKey);
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  // 키워드 기반 FAQ 검색. AI 서버를 못 쓸 때의 대체 답변과 AI 프롬프트 후보 선정에 함께 쓴다.
  function scoreFaq(question) {
    const q = normalize(question);
    if (!q) return [];
    return data.faq
      .map((item) => {
        let score = 0;
        for (const keyword of item.keywords) if (q.includes(normalize(keyword))) score += 2;
        for (const word of q.split(" ")) if (word.length >= 2 && normalize(item.question).includes(word)) score += 1;
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
  }
  function searchFaq(question, limit = 3) {
    return scoreFaq(question).slice(0, limit).map((entry) => entry.item);
  }

  // ---- 에버랜드 공식 안내 검색 ----
  const PARTICLES = /(으로|에서|에게|한테|까지|부터|이랑|하고|이에요|예요|은|는|이|가|을|를|에|의|도|로|와|과|요|야|나|좀|면|해|돼)$/;
  const GENERIC = new Set(["어떻게", "어디", "어디서", "뭐야", "무엇", "알려줘", "알려주세요", "궁금", "궁금해", "있어", "있나", "있나요", "있어요", "하나요", "해요", "되나요", "어떤", "누가", "언제", "왜", "에버랜드", "가능", "가능한가", "가능한가요", "수", "있는", "하는", "파는", "팔아", "파는곳", "판매", "위치", "보고", "먹고", "가고", "싶어", "싶은데", "싶다", "보고싶어", "먹고싶어", "가고싶어", "찾아", "찾고", "있는지", "있는곳", "근처"]);
  function stems(textValue) {
    return [...new Set(String(textValue || "").toLowerCase().split(/[^0-9a-z가-힣]+/).map((word) => {
      let stem = word;
      for (let i = 0; i < 2; i++) {
        const next = stem.replace(PARTICLES, "");
        if (next.length < 2) break; // '라면'→'라'처럼 단어가 망가지면 조사를 떼지 않는다
        stem = next;
      }
      return stem;
    }).filter((stem) => stem.length >= 2 && !GENERIC.has(stem)))];
  }
  // 같은 뜻의 다른 표현을 질문에 덧붙인다(강아지 → 반려동물·애완견 등).
  const SYNONYMS = [
    [/강아지|반려견|애완견|애완동물|고양이|펫/, "반려동물 애완견"],
    [/(^|\s)비(\s|가|가요|오|와|올|내)|우천|장마|폭우/, "비 오는 우천"],
    [/담배|흡연|전자담배/, "흡연 금연"],
    [/지하철|전철|기흥|에버라인/, "지하철 에버라인 기흥역"],
    [/셔틀/, "셔틀버스"],
    [/(^|\s)짐|캐리어|사물함|락커|보관/, "물품보관함"],
    [/유모차/, "유아차"],
    [/킥보드|전동/, "전동 킥보드 이동 수단"],
    [/잃어버|분실|두고/, "분실물 잃어버렸습니다"],
    [/다쳤|아파|아프|상비약|의무실|병원|약국/, "의무실"],
    [/충전|배터리/, "보조배터리 충전"],
    [/헤어졌|길\s*잃|일행.*못\s*찾/, "일행과 헤어졌어요"],
    [/운영\s*시간|몇\s*시까지|폐장|개장|오픈\s*시간/, "운영시간"],
    [/돗자리|텐트|그늘막/, "돗자리 그늘막 텐트"],
    [/빌려|빌릴|대여/, "대여"],
    [/반말|욕설|불친절|불만/, "근무자 불만"],
    [/드론|버너|코스프레/, "드론 버너 코스프레"],
  ];
  function expand(question) {
    const extra = SYNONYMS.filter(([pattern]) => pattern.test(question)).map(([, words]) => words);
    return [question, ...extra].join(" ");
  }
  const compact = (value) => String(value || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
  function bigrams(word) {
    const grams = [];
    for (let i = 0; i < word.length - 1; i++) grams.push(word.slice(i, i + 2));
    return grams;
  }
  // 질문과 관련된 공식 안내를 고른다. 관리자가 끈 카테고리는 제외한다.
  // 점수: 단어가 질문 제목에 있으면 3점, 답변에 있으면 1점 + 띄어쓰기가 달라도 잡히도록 두 글자 조각(bigram) 일치 점수
  function searchOfficial(question, items = [], limit = 4, disabled = data.officialDisabled) {
    const words = stems(expand(question));
    if (!words.length) return [];
    const grams = [...new Set(words.flatMap(bigrams))];
    const off = new Set(disabled || []);
    return items.filter((item) => !off.has(item.cat)).map((item) => {
      const q = item.q.toLowerCase(), a = item.a.toLowerCase();
      const cq = compact(item.q), ca = compact(item.a);
      let score = 0, hits = 0;
      for (const word of words) {
        let hit = false;
        if (q.includes(word) || cq.includes(word)) { score += 3; hit = true; }
        else if (a.includes(word) || ca.includes(word)) { score += 1; hit = true; }
        if (hit) hits++;
      }
      const gramHits = grams.filter((gram) => cq.includes(gram)).length;
      score += grams.length ? (gramHits / grams.length) * 4 : 0;
      return { item, score: Math.round(score * 10) / 10, hits };
    }).filter((x) => x.score >= 4 && x.hits >= 1)
      .sort((x, y) => y.score - x.score || y.hits - x.hits)
      .slice(0, limit)
      .map((x) => ({ ...x.item, score: x.score }));
  }
  function officialSource(item) {
    return { type: "official", id: item.id, board: `에버랜드 공식 ${item.cat}`, title: item.q, url: item.url, date: item.date };
  }

  // 게시글 출처 표시용 요약: 어떤 게시판의 어떤 글인지.
  function sourceOf(post) {
    return { id: post.id, board: post.board, title: post.title };
  }

  // AI 없이 답할 때: FAQ가 확실히 맞으면 FAQ, 아니면 게시판 글을 출처와 함께 보여준다.
  // AI 없이 답할 때 우선순위: 파크톡 FAQ(확실히 맞을 때) → 에버랜드 공식 안내 → 게시판 글
  function localAnswer(question, posts = [], official = []) {
    const [best] = scoreFaq(question);
    // 파크톡 FAQ는 키워드가 맞았을 때(2점 이상)만 쓴다. 질문 단어 하나 겹친 정도로는 엉뚱한 답이 나온다.
    // 공식 안내가 훨씬 정확히 맞으면(8점 이상) 키워드 하나만 맞은 파크톡 FAQ보다 우선한다.
    const strongFaq = best && best.score >= 2 && !(official[0]?.score >= 8 && best.score <= 2);
    if (strongFaq && best.item.id === "menu") {
      const today = menusFor(todayKey());
      if (today.length) {
        const lines = today.map((m) => `${m.restaurant} ${m.meal}: ${m.items.join(", ")}`).join(" / ");
        return { answer: `오늘 등록된 식단이에요. ${lines}`, source: "faq", faqId: "menu", sources: [] };
      }
    }
    if (strongFaq) {
      return { answer: best.item.answer, source: "faq", faqId: best.item.id, sources: posts.slice(0, 2).map(sourceOf) };
    }
    if (official.length && official[0].score >= 5.5) {
      const top = official[0];
      return {
        answer: `에버랜드 공식 안내(${top.date} 기준)에 따르면: ${top.a}`,
        source: "official",
        faqId: null,
        sources: [officialSource(top), ...posts.slice(0, 1).map(sourceOf)],
      };
    }
    if (posts.length) {
      const post = posts[0];
      const reply = (post.replies || []).filter((r) => r.body).slice(-1)[0];
      const excerpt = reply
        ? `댓글에서 ${reply.author || "다른 사용자"}님이 "${reply.body.slice(0, 120)}"라고 답했어요.`
        : `글 내용: "${post.body.slice(0, 120)}${post.body.length > 120 ? "…" : ""}"`;
      return {
        answer: `${post.board}의 '${post.title}' 글에 관련 내용이 있어요. ${excerpt} 게시판 글은 사용자가 쓴 내용이라 정확하지 않을 수 있어요.`,
        source: "board",
        faqId: null,
        sources: posts.map(sourceOf),
      };
    }
    return { answer: "아직 준비된 답변이 없어요. 관리자에게 문의해 주시면 FAQ에 추가할게요.", source: "faq", faqId: null, sources: [] };
  }

  return Object.assign(data, { defaults, MEALS, sanitizeAdminData, merge, apply, load, todayKey, shiftDate, menusFor, parseCastMenu, mergeMenus, mergeRestaurants, searchFaq, searchOfficial, officialSource, localAnswer, text: { stems, expand, compact, bigrams } });
});
