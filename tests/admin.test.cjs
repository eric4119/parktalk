const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parktalk-admin-'));
process.env.PARKTALK_DATA_DIR = dataDir;
process.env.ADMIN_PASSWORD = 'pw-1234';
delete process.env.GEMINI_API_KEY;
const ParkData = require('../park-data.js');
const { server, systemPrompt, isPrivatePath } = require('../server.js');

let base;
test.before(() => new Promise((resolve) => server.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); })));
test.after(() => { server.close(); fs.rmSync(dataDir, { recursive: true, force: true }); });

const json = (method, body, token) => ({ method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body && JSON.stringify(body) });

test('private files such as .env and saved admin data are never served', async () => {
  for (const p of ['/.env', '/.env.example', '/data/admin.json', '/server.js', '/tests/admin.test.cjs', '/%2eenv']) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
  assert.equal((await fetch(base + '/admin.html')).status, 200);
  assert.ok(isPrivatePath('.git/config'));
  assert.ok(!isPrivatePath('index.html'));
});

test('wrong password and missing token are rejected', async () => {
  assert.equal((await fetch(base + '/api/admin/login', json('POST', { password: 'nope' }))).status, 401);
  assert.equal((await fetch(base + '/api/admin/data')).status, 401);
  assert.equal((await fetch(base + '/api/admin/data', json('PUT', { menus: [] }, 'fake'))).status, 401);
});

test('admin saves menus, partner store and FAQ; app data and AI prompt reflect them', async () => {
  const login = await (await fetch(base + '/api/admin/login', json('POST', { password: 'pw-1234' }))).json();
  assert.ok(login.token);
  const current = await (await fetch(base + '/api/admin/data', json('GET', null, login.token))).json();
  const today = ParkData.todayKey();
  let res = await fetch(base + '/api/admin/data', json('PUT', {
    baseUpdatedAt: current.updatedAt,
    menus: [{ date: today, restaurant: '캐스트하우스 식당', meal: '중식', items: ['김치찌개', '<script>x</script>'] }],
  }, login.token));
  assert.equal(res.status, 200);
  const afterMenu = await res.json();
  const stores = afterMenu.stores.map((s, i) => (i === 0 ? { ...s, partner: true, benefit: '사원증 제시 시 10% 할인' } : s));
  res = await fetch(base + '/api/admin/data', json('PUT', { baseUpdatedAt: afterMenu.updatedAt, stores }, login.token));
  const afterStore = await res.json();
  res = await fetch(base + '/api/admin/data', json('PUT', { baseUpdatedAt: afterStore.updatedAt, faq: [...afterStore.faq, { question: '셔틀버스는 어디서 타요?', keywords: '셔틀, 버스', answer: '정문 셔틀 정류장에서 타요.' }] }, login.token));
  assert.equal(res.status, 200);

  // 공개 API(앱이 읽는 값)
  const pub = await (await fetch(base + '/api/park-data')).json();
  assert.equal(pub.menus[0].restaurant, '캐스트하우스 식당');
  assert.equal(pub.stores[0].partner, true);
  assert.deepEqual(pub.faq.at(-1).keywords, ['셔틀', '버스']);
  // 파일에 저장됨
  assert.ok(JSON.parse(fs.readFileSync(path.join(dataDir, 'admin.json'), 'utf8')).updatedAt);
  // AI 프롬프트에 반영
  const prompt = systemPrompt('cast');
  assert.match(prompt, /캐스트하우스 식당 중식: 김치찌개/);
  assert.match(prompt, /캐스트 제휴: 사원증 제시 시 10% 할인/);
  assert.match(prompt, /셔틀버스는 어디서 타요/);
});

test('stale save is refused instead of overwriting another admin', async () => {
  const login = await (await fetch(base + '/api/admin/login', json('POST', { password: 'pw-1234' }))).json();
  const res = await fetch(base + '/api/admin/data', json('PUT', { baseUpdatedAt: '2000-01-01T00:00:00.000Z', menus: [] }, login.token));
  assert.equal(res.status, 409);
  const pub = await (await fetch(base + '/api/park-data')).json();
  assert.equal(pub.menus.length, 1);
});

test('login is throttled after repeated wrong passwords', async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await fetch(base + '/api/admin/login', json('POST', { password: 'wrong' }));
  assert.equal(last.status, 429);
});
