const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
require('../park-data.js');
const ParkPlaces = require('../places.js');
const { build } = require('../scripts/build-facilities.cjs');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'facilities.json'), 'utf8'));
ParkPlaces.use(data);
const names = (q, n = 5) => ParkPlaces.search(q, ParkPlaces.state.items, n).map((item) => item.name);

test('facilities.json is up to date with the raw map data and menus', () => {
  const fresh = build();
  assert.equal(fresh.count, data.count);
  assert.ok(fresh.items.filter((item) => item.menu.length).length >= 30);
});

test('food search finds shops that sell it, with prices', () => {
  const [first] = ParkPlaces.search('핫도그', ParkPlaces.state.items, 5);
  assert.ok(first.menu.some(([name, price]) => /핫도그/.test(name) && price > 0), first.name);
  assert.ok(names('떡볶이').length >= 2);
  assert.equal(names('쌀국수')[0], '포메인');
});

test('animals, rides and facilities are found by name, old name or tag', () => {
  assert.equal(names('카피바라 보고 싶어')[0], '뿌빠타운');
  assert.equal(names('티익스프레스')[0], '모니모RUSH'); // T익스프레스의 바뀐 이름
  assert.match(names('판다')[0], /판다/);
  assert.match(names('라면')[0], /라면/);
  assert.ok(names('화장실').length > 0);
  assert.deepEqual(names('qwerty zxcv'), []);
});

test('map links open the official Everland map', () => {
  for (const item of ParkPlaces.state.items.slice(0, 20)) {
    assert.match(ParkPlaces.mapUrl(item), /^https:\/\/www\.everland\.com\/everland\/map/);
  }
});
