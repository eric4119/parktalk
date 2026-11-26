const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ParkData = require('../park-data.js');

const raw = fs.readFileSync(path.join(__dirname, '..', 'official', 'cast-menu', '2026-11-16.txt'), 'utf8');

test('weekly Welstory menu text is parsed into dated courses', () => {
  const parsed = ParkData.parseCastMenu(raw, { today: new Date('2026-11-25T12:00:00+09:00') });
  assert.equal(parsed.restaurant.name, '파크1,2 (정*동문) 사원식당');
  assert.equal(parsed.dates.length, 7);
  assert.equal(parsed.dates[0], '2026-11-16');
  assert.ok(parsed.restaurant.hours.some((h) => h.startsWith('석식')));
  assert.ok(parsed.restaurant.notes.length > 0);
  const inter = parsed.menus.find((m) => m.date === '2026-11-16' && m.meal === '중식' && m.course === '인터');
  assert.equal(inter.kcal, '1,135kcal');
  assert.ok(inter.plus.length > 0);
  assert.ok(inter.items.length >= 3);
  assert.ok(parsed.menus.some((m) => m.course === '테이크아웃'));
});

test('year is guessed from the closest date (December menu read in January)', () => {
  const parsed = ParkData.parseCastMenu('식당 식단표\n12/29 (화)\n중식 한식 (800kcal)\n밥', { today: new Date('2027-01-02T12:00:00+09:00') });
  assert.equal(parsed.dates[0], '2026-12-29');
});

test('importing a new week replaces only the same restaurant and dates', () => {
  const parsed = ParkData.parseCastMenu(raw, { year: 2026 });
  const old = [
    { id: 'a', date: '2026-11-16', restaurant: parsed.restaurant.name, meal: '중식', items: ['옛 메뉴'] },
    { id: 'b', date: '2026-11-16', restaurant: '다른 식당', meal: '중식', items: ['유지'] },
    { id: 'c', date: '2026-11-09', restaurant: parsed.restaurant.name, meal: '중식', items: ['지난주'] },
  ];
  const merged = ParkData.mergeMenus(old, parsed.menus);
  assert.ok(!merged.some((m) => m.id === 'a'));
  assert.ok(merged.some((m) => m.id === 'b') && merged.some((m) => m.id === 'c'));
});

test('server serves the seed menu and hides raw menu files', async () => {
  const { server } = require('../server.js');
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    const data = await (await fetch(`http://127.0.0.1:${port}/api/park-data`)).json();
    assert.ok(data.menus.some((m) => m.date === '2026-11-16' && m.course));
    assert.ok(data.restaurants.length >= 1);
    assert.equal((await fetch(`http://127.0.0.1:${port}/official/cast-menu/2026-11-16.txt`)).status, 404);
    assert.equal((await fetch(`http://127.0.0.1:${port}/cast-menu.json`)).status, 200);
  } finally {
    server.close();
  }
});

test('static deploy: empty /api/park-data still shows the seed menu', async () => {
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cast-menu.json'), 'utf8'));
  const original = global.fetch;
  global.fetch = async (url) => {
    const body = String(url).includes('api/park-data') ? {} : seed;
    return { ok: true, headers: { get: () => 'application/json' }, json: async () => body };
  };
  try {
    await ParkData.load();
    assert.ok(ParkData.menus.some((m) => m.date === '2026-11-16'));
    assert.ok(ParkData.restaurants.length >= 1);
    assert.ok(ParkData.faq.length > 0);
  } finally {
    global.fetch = original;
    ParkData.apply({});
  }
});

test('an older admin.json with an empty menu list does not hide the seed menu', () => {
  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cast-menu.json'), 'utf8'));
  const merged = ParkData.merge({ faq: [], stores: [], menus: [] }, seed);
  assert.ok(merged.menus.length > 0);
  assert.ok(merged.restaurants.length > 0);
  // 관리자가 다른 날짜를 저장해 둬도 기본 식단은 같이 보인다
  const own = ParkData.merge({ menus: [{ id: 'x', date: '2026-11-24', restaurant: '식당', meal: '중식', items: ['밥'] }] }, seed);
  assert.equal(own.menus.length, seed.menus.length + 1);
  // 같은 식당·같은 날짜는 관리자가 저장한 식단이 이긴다
  const name = seed.menus[0].restaurant;
  const replaced = ParkData.merge({ menus: [{ id: 'y', date: '2026-11-16', restaurant: name, meal: '중식', items: ['바뀐 메뉴'] }] }, seed);
  assert.deepEqual(replaced.menus.filter((m) => m.date === '2026-11-16').map((m) => m.items[0]), ['바뀐 메뉴']);
});
