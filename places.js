/* 에버랜드 시설 검색(카피바라·츄러스·화장실처럼 키워드로 시설 찾기).
 * 데이터: facilities.json (scripts/build-facilities.cjs가 에버랜드 공식 지도 데이터로 생성)
 * 브라우저: window.ParkPlaces / 서버: require("./places.js") — park-data.js가 먼저 로드되어 있어야 한다. */
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports ? require("./park-data.js") : root.ParkData);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ParkPlaces = api;
})(typeof self !== "undefined" ? self : this, function (ParkData) {
  const { stems, expand, compact, bigrams } = ParkData.text;
  const MAP_URL = "https://www.everland.com/everland/map";
  const state = { items: [], fetchedAt: null, loaded: false, loading: null };

  // 시설 검색 전용 비슷한 말(파크톡 FAQ 검색의 동의어에 더해 쓴다)
  const PLACE_SYNONYMS = [
    [/간식|군것질|디저트/, "스낵 츄러스 핫도그 아이스크림"],
    [/배고|밥|식사|점심|저녁|먹을/, "음식점 레스토랑 한식"],
    [/커피|카페|라떼|음료/, "카페 커피"],
    [/기념품|굿즈|선물|인형|머리띠/, "상점 기프트 샵"],
    [/스릴|무서운|빠른|짜릿/, "스릴 롤러코스터 코스터"],
    [/롤코|롤러/, "롤러코스터 코스터"],
    [/아기|유아|애기|어린이|키즈/, "어린이 유아"],
    [/수유|기저귀|분유/, "베이비 서비스"],
    [/짐|물품|사물함|락커/, "보관함"],
    [/화장실|변기|토일렛/, "화장실"],
    [/담배|흡연/, "흡연구역"],
    [/아파|다쳤|약|병원/, "의무실"],
    [/충전|배터리/, "휴대폰충전기"],
    [/유모차|유아차|휠체어|웨건|왜건/, "유아차 왜건 휠체어 대여"],
    [/현금|atm|돈\s*뽑/i, "현금인출기"],
    [/미아|잃어버|분실/, "미아 분실물 찾기"],
    [/퍼레이드|공연|쇼|콘서트|행사|축제|이벤트|불꽃/, "퍼레이드 공연"],
    [/곤돌라|케이블카|리프트/, "곤돌라 리프트 스카이크루즈 스카이웨이"],
    [/물개|바다사자|물범/, "바다사자 물개 물범"],
    [/원숭이/, "원숭이 알버트"],
    [/기린|코끼리|사자|호랑이|곰|얼룩말|하마/, "사파리 사바나"],
    [/탈만|타는|놀이기구|탈것|라이드/, "어트랙션"],
    [/라면|컵라면/, "라면"],
    [/햄버거|버거/, "햄버거"],
  ];
  function words(query) {
    const extra = PLACE_SYNONYMS.filter(([pattern]) => pattern.test(query)).map(([, add]) => add);
    return stems(expand([query, ...extra].join(" ")));
  }

  // 점수: 이름 5, 키워드 해시태그 4, 분류 3, 구역 2, 설명 1 + 이름·태그의 두 글자 조각 일치 비율
  function search(query, items = state.items, limit = 8) {
    const terms = words(query);
    if (!terms.length) return [];
    const typed = new Set(stems(query)); // 사용자가 직접 쓴 단어(동의어로 덧붙인 단어보다 설명 일치에 점수를 더 준다)
    const grams = [...new Set(terms.flatMap(bigrams))];
    return items.map((item) => {
      const name = compact(item.name), tags = compact(item.tags.join(" ")), menu = compact((item.menu || []).map((m) => m[0]).join(" ")), cats = compact(item.cats.join(" ")), zone = compact(item.zone), desc = compact(item.desc);
      let score = 0, hits = 0;
      for (const term of terms) {
        const t = compact(term);
        if (!t) continue;
        let hit = true;
        if (name.includes(t)) score += 5;
        else if (menu.includes(t)) score += 4.5; // 대표 메뉴에 있으면 실제로 파는 곳이라 해시태그보다 위
        else if (tags.includes(t)) score += 4;
        else if (cats.includes(t)) score += 4; // "공연", "동물"처럼 분류 이름으로 찾으면 그 분류를 보여 준다
        else if (zone.includes(t)) score += 2;
        else if (desc.includes(t)) score += typed.has(term) ? 3 : 1;
        else hit = false;
        if (hit) hits++;
      }
      const head = name + tags;
      score += grams.length ? (grams.filter((g) => head.includes(g)).length / grams.length) * 3 : 0;
      return { item, score: Math.round(score * 10) / 10, hits };
    }).filter((x) => x.hits > 0 && x.score >= 4)
      .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
      .slice(0, limit)
      .map((x) => ({ ...x.item, score: x.score }));
  }

  function hours(item) {
    if (item.open && item.close) return `${item.open}~${item.close}${item.lastOrder ? ` (주문 마감 ${item.lastOrder})` : ""}`;
    if (item.close) return `~${item.close}`;
    return "";
  }
  // 위치가 한 곳이면 에버랜드 공식 지도를 그 시설 위치로 열고, 여러 곳(화장실 등)이면 공식 지도 첫 화면으로 보낸다.
  function mapUrl(item) {
    if (item.loc?.length === 1) {
      const [lat, lng] = item.loc[0];
      return `${MAP_URL}?lat=${lat}&lng=${lng}&fcl=Y`;
    }
    return MAP_URL;
  }
  function source(item) {
    return { type: "place", id: item.id, board: "에버랜드 공식 지도", title: item.name, url: MAP_URL, date: state.fetchedAt ? state.fetchedAt.slice(0, 10).replace(/-/g, ".") : "" };
  }
  function summary(item) {
    const where = item.loc?.length > 1 ? `파크 안 ${item.loc.length}곳` : item.zone;
    return `${item.name} (${item.cats.join("·")} · ${where}${hours(item) ? ` · ${hours(item)}` : ""})`;
  }

  // 브라우저: facilities.json을 한 번만 불러온다. 다 불러오면 parkplaces:ready 이벤트를 보낸다.
  function load() {
    if (state.loaded) return Promise.resolve(state.items);
    if (state.loading) return state.loading;
    state.loading = fetch("facilities.json")
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((data) => {
        // 파일을 못 받았으면 failed로 표시하고, 다음 검색 때 다시 받아 본다.
        state.failed = !data || !Array.isArray(data.items);
        state.items = state.failed ? [] : data.items;
        state.fetchedAt = data?.fetchedAt || null;
        state.loaded = true;
        if (state.failed) { state.loaded = false; state.loading = null; }
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("parkplaces:ready"));
        return state.items;
      });
    return state.loading;
  }
  function use(data) { // 서버·테스트에서 데이터를 직접 넣을 때
    state.items = data.items || [];
    state.fetchedAt = data.fetchedAt || null;
    state.loaded = true;
    return api;
  }

  const api = { state, load, use, search, hours, mapUrl, source, summary, MAP_URL };
  return api;
});
