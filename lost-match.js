/* 분실물 AI 매칭 — 특징 뽑기와 분실물↔습득물 비교 점수.
 * 브라우저(window.ParkLostMatch)와 서버·테스트(require)에서 같이 쓴다. 미아 게시판에는 쓰지 않는다.
 *
 *   extract(text, places)  → { itemCategory, item, colors, brands, zone, place, keywords }  (AI 없이 규칙으로 뽑기)
 *   tagsFor(post, aiTags)  → 저장용 특징(AI가 뽑은 값이 있으면 그걸 우선, 빈 칸은 규칙으로 채움)
 *   score(a, b)            → { score, percent, reasons }
 *   matchesFor(post, posts, limit) → 반대쪽(분실물↔습득물) 열린 글 중 비슷한 순서
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ParkLostMatch = api;
})(typeof self !== "undefined" ? self : this, () => {
  // boards.js의 선택지와 같아야 한다.
  const ZONES = ["정문 · 글로벌페어", "주토피아", "아메리칸 어드벤처", "매직랜드", "유러피언 어드벤처", "기타 구역"];
  const CATEGORIES = ["지갑/카드", "휴대폰/전자기기", "가방/의류", "신발", "유모차/아동용품", "기타 소지품"];

  // [정규식, 표준 이름]
  const COLORS = [
    [/검정|검은|까만|블랙|black/i, "검정"], [/흰|하얀|화이트|white/i, "흰색"], [/빨간|빨강|레드|red/i, "빨강"],
    [/파란|파랑|블루|blue/i, "파랑"], [/남색|네이비|navy/i, "남색"], [/하늘색|스카이/i, "하늘색"],
    [/노란|노랑|옐로|yellow/i, "노랑"], [/초록|녹색|그린|green|카키/i, "초록"], [/회색|그레이|gray|grey/i, "회색"],
    [/분홍|핑크|pink/i, "분홍"], [/보라|퍼플|purple/i, "보라"], [/갈색|브라운|brown/i, "갈색"],
    [/베이지|beige|아이보리/i, "베이지"], [/은색|실버|silver/i, "은색"], [/금색|골드|gold/i, "금색"],
    [/주황|오렌지|orange/i, "주황"], [/민트|mint/i, "민트"], [/투명/i, "투명"],
  ];
  const BRANDS = [
    [/나이키|nike/i, "나이키"], [/아디다스|adidas/i, "아디다스"], [/뉴발란스|new\s*balance/i, "뉴발란스"],
    [/노스페이스|north\s*face/i, "노스페이스"], [/아이폰|에어팟|애플|맥북|아이패드|apple|iphone|airpods|ipad/i, "애플"],
    [/갤럭시|삼성|galaxy|samsung|버즈/i, "삼성"], [/루이비통|louis/i, "루이비통"], [/구찌|gucci/i, "구찌"],
    [/샤넬|chanel/i, "샤넬"], [/프라다|prada/i, "프라다"], [/코치|coach/i, "코치"], [/mlb/i, "MLB"],
    [/디스커버리|discovery/i, "디스커버리"], [/잔스포츠|jansport/i, "잔스포츠"], [/폴로|polo/i, "폴로"],
    [/휠라|fila/i, "휠라"], [/컨버스|converse/i, "컨버스"], [/반스|vans/i, "반스"], [/스투시|stussy/i, "스투시"],
    [/산리오|헬로키티|쿠로미|시나모롤/i, "산리오"], [/디즈니|disney/i, "디즈니"], [/레니|라라|에버랜드\s*굿즈/i, "에버랜드 굿즈"],
    [/카카오|라이언|춘식/i, "카카오프렌즈"], [/샤오미|xiaomi/i, "샤오미"], [/소니|sony/i, "소니"],
    [/푸마|puma/i, "푸마"], [/크록스|crocs/i, "크록스"], [/아식스|asics/i, "아식스"], [/리복|reebok/i, "리복"],
    [/언더\s*아머|under\s*armour/i, "언더아머"], [/데상트|descente/i, "데상트"], [/살로몬|salomon/i, "살로몬"],
    [/호카|hoka/i, "호카"], [/닥터\s*마틴|dr\.?\s*martens/i, "닥터마틴"], [/버켄스탁|birkenstock/i, "버켄스탁"],
    [/유니클로|uniqlo/i, "유니클로"], [/자라|zara/i, "자라"], [/캘빈\s*클라인|calvin/i, "캘빈클라인"], [/코닥|kodak/i, "코닥"],
    [/젠틀\s*몬스터|gentle\s*monster/i, "젠틀몬스터"], [/레이\s*밴|ray\s*-?ban/i, "레이밴"], [/포켓몬|피카츄/i, "포켓몬"],
    [/스타벅스|starbucks/i, "스타벅스"], [/로이체|롤렉스|rolex/i, "롤렉스"],
  ];
  // [정규식, 물건 이름, 분류]
  const ITEMS = [
    [/카드\s*지갑|명함\s*지갑/, "카드지갑", "지갑/카드"], [/지갑/, "지갑", "지갑/카드"],
    [/신분증|주민등록증|면허증|학생증|사원증|교통\s*카드|체크\s*카드|신용\s*카드|카드/, "카드", "지갑/카드"],
    [/에어팟|버즈|이어폰|헤드폰/, "이어폰", "휴대폰/전자기기"], [/보조\s*배터리|충전기|케이블/, "충전기·배터리", "휴대폰/전자기기"],
    [/휴대폰|핸드폰|스마트폰|폰|아이폰|갤럭시/, "휴대폰", "휴대폰/전자기기"], [/카메라|태블릿|아이패드|워치|시계/, "전자기기", "휴대폰/전자기기"],
    [/백팩|배낭|책가방/, "백팩", "가방/의류"], [/크로스백|숄더백|핸드백|토트백|에코백|미니백|힙색|가방|파우치/, "가방", "가방/의류"],
    [/패딩|점퍼|자켓|재킷|코트|후드|가디건|바람막이|외투/, "겉옷", "가방/의류"], [/모자|캡|비니/, "모자", "가방/의류"],
    [/목도리|머플러|장갑|옷/, "의류", "가방/의류"],
    [/신발|운동화|스니커즈|구두|슬리퍼|샌들|크록스|부츠|로퍼|러닝화|축구화|실내화/, "신발", "신발"],
    [/유모차|유아차|웨건|왜건/, "유모차", "유모차/아동용품"], [/젖병|분유|기저귀|쪽쪽이|공갈/, "육아용품", "유모차/아동용품"],
    [/인형|애착|장난감|킥보드/, "인형·장난감", "유모차/아동용품"],
    [/우산|양산/, "우산", "기타 소지품"], [/열쇠|키링|차키|자동차\s*키/, "열쇠", "기타 소지품"],
    [/안경|선글라스/, "안경", "기타 소지품"], [/머리띠|헤어밴드/, "머리띠", "기타 소지품"], [/텀블러|물병|보온병/, "텀블러", "기타 소지품"],
  ];
  const FACILITY_ZONE = { "글로벌페어": "정문 · 글로벌페어", "주토피아": "주토피아", "아메리칸 어드벤처": "아메리칸 어드벤처", "매직랜드": "매직랜드", "유러피언 어드벤처": "유러피언 어드벤처" };
  const ZONE_WORDS = [
    [/정문|입구|매표소|글로벌\s*페어|글로벌페어/, "정문 · 글로벌페어"], [/주토피아|사파리|로스트\s*밸리|판다/, "주토피아"],
    [/아메리칸/, "아메리칸 어드벤처"], [/매직\s*랜드/, "매직랜드"], [/유러피언/, "유러피언 어드벤처"],
  ];
  // 위치를 알려 주는 시설 분류(음식점·상점 해시태그는 메뉴 이름이라 위치 추정에 쓰지 않는다)
  const PLACE_CATS = ["어트랙션", "동물", "공연·퍼레이드", "가든", "편의시설"];
  const STOP = new Set(["잃어버렸어요", "잃어버렸어", "잃어버림", "분실", "습득", "찾아요", "찾습니다", "보관중", "보관", "근처", "주변", "앞", "옆", "에서", "있어요", "했어요", "같아요", "물건", "주인", "찾아주세요"]);

  const compact = (v) => String(v || "").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
  const uniq = (list) => [...new Set(list.filter(Boolean))];
  const pick = (table, text) => uniq(table.filter(([re]) => re.test(text)).map(([, name]) => name));

  function words(text) {
    return uniq(String(text || "").toLowerCase().split(/[^0-9a-z가-힣]+/)
      .map((w) => w.replace(/(으로|에서|에게|까지|부터|이랑|하고|은|는|이|가|을|를|에|의|도|로|와|과|요)$/, ""))
      .filter((w) => w.length >= 2 && !STOP.has(w)));
  }

  // 시설 이름(또는 어트랙션·동물 해시태그)이 글에 나오면 그 시설을 장소로, 시설의 구역을 구역으로 본다.
  function findPlace(text, places = []) {
    const tokens = words(text).map(compact).filter((t) => t.length >= 2);
    const flat = compact(text);
    let best = null;
    for (const p of places) {
      if (!p || !(p.cats || []).some((c) => PLACE_CATS.includes(c))) continue;
      const name = compact(p.name);
      const keys = [name, ...(p.tags || []).flatMap((t) => String(t).split(/[\s()]+/)).map(compact)].filter((k) => k.length >= 3);
      let len = 0;
      for (const k of keys) if (flat.includes(k)) len = Math.max(len, k.length + 2);
      for (const t of tokens) if (t.length >= 3 && name.startsWith(t)) len = Math.max(len, t.length); // '사파리' → 사파리월드
      if (len && (!best || len > best.len)) best = { len, place: p };
    }
    return best?.place || null;
  }

  function extract(text, places = defaultPlaces()) {
    const raw = String(text || "");
    const itemHit = ITEMS.find(([re]) => re.test(raw));
    const facility = findPlace(raw, places);
    const zoneWord = ZONE_WORDS.find(([re]) => re.test(raw));
    const colors = pick(COLORS, raw), brands = pick(BRANDS, raw);
    const known = new Set([...colors, ...brands, itemHit?.[1]].map(compact));
    const describes = (w) => COLORS.some(([re]) => re.test(w)) || BRANDS.some(([re]) => re.test(w));
    return {
      itemCategory: itemHit ? itemHit[2] : "",
      item: itemHit ? itemHit[1] : "",
      colors,
      brands,
      zone: (facility && FACILITY_ZONE[facility.zone]) || (zoneWord ? zoneWord[1] : ""),
      place: facility ? `${facility.name}${/근처|주변|부근/.test(raw) ? " 근처" : ""}` : "",
      keywords: words(raw).filter((w) => !known.has(compact(w)) && !describes(w)).slice(0, 12),
    };
  }

  function defaultPlaces() {
    return (typeof window !== "undefined" && window.ParkPlaces?.state?.items) || [];
  }

  // AI가 "운동화", "스니커즈"처럼 다르게 부른 물건 이름을 사전의 표준 이름("신발")으로 맞춘다.
  function normalizeItem(item) {
    const raw = String(item || "").slice(0, 20);
    const hit = ITEMS.find(([re]) => re.test(raw));
    return hit ? hit[1] : raw;
  }

  // AI가 준 값(있으면)과 규칙으로 뽑은 값을 합친다. 저장할 때 한 번 계산해 둔다.
  function clean(tags = {}) {
    const list = (v, n = 6) => (Array.isArray(v) ? v : String(v || "").split(/[,\s]+/)).map((x) => String(x).trim().slice(0, 20)).filter(Boolean).slice(0, n);
    return {
      itemCategory: CATEGORIES.includes(tags.itemCategory) ? tags.itemCategory : "",
      item: normalizeItem(tags.item),
      colors: list(tags.colors),
      brands: list(tags.brands),
      zone: ZONES.includes(tags.zone) ? tags.zone : "",
      place: String(tags.place || "").slice(0, 60),
      keywords: list(tags.keywords, 12),
      source: tags.source === "ai" ? "ai" : "rule",
    };
  }
  function tagsFor(post = {}, aiTags = null) {
    const rule = extract([post.title, post.body, post.place].filter(Boolean).join(" "));
    const ai = aiTags ? clean(aiTags) : null;
    const merged = clean({
      itemCategory: post.itemCategory || ai?.itemCategory || rule.itemCategory,
      item: ai?.item || rule.item,
      colors: uniq([...(ai?.colors || []), ...rule.colors]),
      brands: uniq([...(ai?.brands || []), ...rule.brands]),
      zone: post.zone || ai?.zone || rule.zone,
      place: post.place || ai?.place || rule.place,
      keywords: uniq([...(ai?.keywords || []), ...rule.keywords]),
      source: ai?.source === "ai" ? "ai" : "rule",
    });
    return merged;
  }

  const bigrams = (w) => { const c = compact(w); const out = []; for (let i = 0; i < c.length - 1; i++) out.push(c.slice(i, i + 2)); return out; };
  function overlap(a, b) {
    const A = new Set(a.flatMap(bigrams)), B = new Set(b.flatMap(bigrams));
    if (!A.size || !B.size) return 0;
    let n = 0; for (const g of A) if (B.has(g)) n++;
    return n / Math.min(A.size, B.size);
  }

  // 두 글이 같은 물건일 가능성. 점수가 높을수록 비슷하다.
  function score(a, b) {
    // 저장된 AI 특징과 지금 글에서 규칙으로 뽑은 특징을 합쳐서 비교한다(사전이 나중에 보강돼도 예전 글에 반영되게).
    const ta = tagsFor(a, a.aiTags), tb = tagsFor(b, b.aiTags);
    const catA = a.itemCategory || ta.itemCategory, catB = b.itemCategory || tb.itemCategory;
    const zoneA = a.zone || ta.zone, zoneB = b.zone || tb.zone;
    let s = 0;
    const reasons = [];
    if (catA && catB) {
      // '기타 소지품'은 분류를 고르기 애매할 때 쓰이므로 다르다고 감점하지 않는다.
      if (catA === catB) { s += 3; reasons.push(`같은 종류(${catA})`); }
      else if (catA !== "기타 소지품" && catB !== "기타 소지품") s -= 3;
    }
    if (ta.item && tb.item) {
      if (ta.item === tb.item) { s += 2; reasons.push(ta.item); } else s -= 2; // 가방 ↔ 신발처럼 물건이 다르면 감점
    }
    const sameColor = ta.colors.filter((c) => tb.colors.includes(c));
    if (sameColor.length) { s += 3; reasons.push(`색상 ${sameColor.join("·")}`); }
    else if (ta.colors.length && tb.colors.length) s -= 2;
    const sameBrand = ta.brands.filter((x) => tb.brands.includes(x));
    if (sameBrand.length) { s += 3; reasons.push(`브랜드 ${sameBrand.join("·")}`); }
    else if (ta.brands.length && tb.brands.length) s -= 1;
    if (zoneA && zoneB && zoneA === zoneB && zoneA !== "기타 구역") { s += 2; reasons.push(`같은 구역(${zoneA})`); }
    const placeA = compact(a.place || ta.place), placeB = compact(b.place || tb.place);
    if (placeA && placeB && (placeA.includes(placeB.slice(0, 4)) || placeB.includes(placeA.slice(0, 4)))) { s += 1; reasons.push("비슷한 장소"); }
    const kw = overlap(ta.keywords, tb.keywords);
    if (kw >= 0.3) { s += Math.round(kw * 3); reasons.push("설명이 비슷함"); }
    // 습득 시각이 분실 시각보다 조금 앞서거나 8시간 안이면 가능성이 높다.
    const lost = a.lostType === "습득물" ? b : a, found = a.lostType === "습득물" ? a : b;
    const tl = Date.parse(lost.eventTime || ""), tf = Date.parse(found.eventTime || "");
    if (Number.isFinite(tl) && Number.isFinite(tf)) {
      const hours = (tf - tl) / 3_600_000;
      if (hours >= -1 && hours <= 8) { s += 1; reasons.push("시간대가 맞음"); }
      else if (hours < -2) s -= 2; // 잃어버리기 전에 주운 물건은 아님
    }
    // 종류만 같고 색·브랜드·물건·설명이 하나도 안 맞으면 근거가 약하다(검색 결과에서 숨김).
    const strong = reasons.some((r) => !r.startsWith("같은 종류") && !r.startsWith("같은 구역") && r !== "시간대가 맞음");
    // 비슷한 정도(%): 한쪽(a)에 적힌 정보로 받을 수 있는 최대 점수 대비 실제 점수
    const possible = Math.max(6, (catA && catA !== "기타 소지품" ? 3 : 0) + (ta.item ? 2 : 0) + (ta.colors.length ? 3 : 0) + (ta.brands.length ? 3 : 0)
      + (zoneA && zoneA !== "기타 구역" ? 2 : 0) + (placeA ? 1 : 0) + (ta.keywords.length ? 2 : 0) + (Number.isFinite(tl) && Number.isFinite(tf) ? 1 : 0));
    return { score: s, percent: Math.max(0, Math.min(99, Math.round((s / possible) * 100))), reasons, strong };
  }

  const MIN_SCORE = 4;
  // 확인 요청으로 생긴 글(claimAuto)은 매칭 후보에서 뺀다(이미 특정 습득물을 가리키고 있으므로).
  function isOpen(p) { return p && p.kind === "lost" && !p.linkedPostId && !p.claimAuto && (p.status || "open") === "open"; }
  function matchesFor(post, posts = [], limit = 3) {
    if (!post || post.kind !== "lost") return [];
    const want = (post.lostType || "분실물") === "습득물" ? "분실물" : "습득물";
    return posts
      .filter((p) => p.id !== post.id && isOpen(p) && (p.lostType || "분실물") === want)
      .map((p) => ({ post: p, ...score(post, p) }))
      .filter((m) => m.score >= MIN_SCORE && m.strong)
      .sort((x, y) => y.score - x.score || (y.post.createdAt || 0) - (x.post.createdAt || 0))
      .slice(0, limit);
  }

  return { ZONES, CATEGORIES, extract, tagsFor, clean, score, matchesFor, findPlace, MIN_SCORE };
});
