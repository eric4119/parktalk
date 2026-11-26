// 웰스토리 주간 식단표 텍스트 → cast-menu.json(정적 배포에서도 보이는 기본 식단)
// 사용법: node scripts/import-menu.cjs official/cast-menu/2026-11-16.txt [더 많은 파일...]
const fs = require("fs");
const path = require("path");
const ParkData = require("../park-data.js");
const out = path.join(__dirname, "..", "cast-menu.json");
let seed = { menus: [], restaurants: [] };
try { seed = JSON.parse(fs.readFileSync(out, "utf8")); } catch {}
for (const file of process.argv.slice(2)) {
  const parsed = ParkData.parseCastMenu(fs.readFileSync(file, "utf8"));
  seed.menus = ParkData.mergeMenus(seed.menus, parsed.menus);
  seed.restaurants = ParkData.mergeRestaurants(seed.restaurants, parsed.restaurant);
  console.log(`${file}: ${parsed.restaurant.name} ${parsed.dates[0]}~${parsed.dates.at(-1)} ${parsed.menus.length}개 코너`);
}
seed.menus.sort((a, b) => a.date.localeCompare(b.date) || ParkData.MEALS.indexOf(a.meal) - ParkData.MEALS.indexOf(b.meal));
fs.writeFileSync(out, `${JSON.stringify({ updatedAt: new Date().toISOString(), ...seed }, null, 2)}\n`);
