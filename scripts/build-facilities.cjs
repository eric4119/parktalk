#!/usr/bin/env node
/* 에버랜드 공식 지도 시설 데이터(official/facilities.raw.json)를 앱·서버가 쓰는 facilities.json으로 변환한다.
 * 사용법: node scripts/build-facilities.cjs [새로 받은 원본 경로]
 *   - 경로를 주면 official/facilities.raw.json으로 복사한 뒤 변환한다.
 *   - official/facility-menus.json(시설 상세의 대표 메뉴·가격)이 있으면 음식점에 메뉴를 붙인다. */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const rawPath = path.join(root, "official", "facilities.raw.json");
const outPath = path.join(root, "facilities.json");
const menuPath = path.join(root, "official", "facility-menus.json");
const MAP_URL = "https://www.everland.com/everland/map";

const ZONES = { "01": "글로벌페어", "02": "아메리칸 어드벤처", "03": "매직랜드", "05": "유러피언 어드벤처", "06": "주토피아", "12": "파크 곳곳", "99": "파크 곳곳" };
const CATS = { "01": "어트랙션", "02": "공연·퍼레이드", "03": "동물", "04": "음식점", "05": "편의시설", "06": "상점", "07": "가든" };

const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();
const time = (value) => (/^\d{4}$/.test(value || "") ? `${value.slice(0, 2)}:${value.slice(2)}` : "");

function readMenus() {
  try { return JSON.parse(fs.readFileSync(menuPath, "utf8")); } catch { return { menus: {} }; }
}

function build(rawFile = rawPath) {
  const raw = JSON.parse(fs.readFileSync(rawFile, "utf8"));
  const menuData = readMenus();
  const byId = new Map();
  for (const item of raw.items || []) {
    const cat = CATS[item.cat] || "기타";
    const existing = byId.get(item.id);
    if (existing) { // 같은 시설이 어트랙션·동물처럼 두 분류에 함께 있는 경우 하나로 합친다
      if (!existing.cats.includes(cat)) existing.cats.push(cat);
      continue;
    }
    const tags = [...new Set(clean(item.keywords).split(/[#,]/).map((tag) => tag.trim()).filter(Boolean))];
    byId.set(item.id, {
      id: item.id,
      name: clean(item.name),
      cats: [cat],
      zone: ZONES[item.zone] || "파크 곳곳",
      desc: clean(item.desc).slice(0, 300),
      tags,
      open: time(item.open),
      close: time(item.close),
      lastOrder: time(item.lastOrder),
      useCond: clean(item.useCond),
      // 대표 메뉴 [이름, 가격(원)]
      menu: (menuData.menus?.[item.id] || []).map(([name, price]) => [clean(name), Number(price) || 0]).filter(([name]) => name),
      loc: (item.loc || []).filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng)).map((l) => [Math.round(l.lat * 1e6) / 1e6, Math.round(l.lng * 1e6) / 1e6]),
    });
  }
  const items = [...byId.values()];
  return {
    source: "에버랜드 공식 홈페이지 지도",
    url: MAP_URL,
    fetchedAt: raw.fetchedAt || null,
    menuFetchedAt: menuData.fetchedAt || null,
    count: items.length,
    items,
  };
}

if (require.main === module) {
  const input = process.argv[2];
  if (input) fs.copyFileSync(path.resolve(input), rawPath);
  const result = build();
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`facilities.json: 시설 ${result.count}개 (${result.fetchedAt} 수집), 메뉴 있는 곳 ${result.items.filter((i) => i.menu.length).length}개`);
}

module.exports = { build, ZONES, CATS };
