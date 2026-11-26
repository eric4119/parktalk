const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const M = require('../lost-match.js');
const places = require('../facilities.json').items;

test('rule extraction finds item, colour, brand and zone from one sentence', () => {
  const t = M.extract('검은 나이키 백팩 사파리 근처에서 잃어버렸어요', places);
  assert.equal(t.itemCategory, '가방/의류');
  assert.equal(t.item, '백팩');
  assert.deepEqual(t.colors, ['검정']);
  assert.deepEqual(t.brands, ['나이키']);
  assert.equal(t.zone, '주토피아');
  const phone = M.extract('티익스프레스 대기줄에서 흰색 케이스 아이폰', places);
  assert.equal(phone.itemCategory, '휴대폰/전자기기');
  assert.deepEqual(phone.brands, ['애플']);
  assert.ok(phone.zone, '옛 이름 티익스프레스로도 구역을 찾는다');
});

const lost = { id: 'l1', kind: 'lost', lostType: '분실물', status: 'open', title: '검은 나이키 백팩 잃어버렸어요', body: '사파리 근처에서 검정 나이키 백팩', itemCategory: '가방/의류', zone: '주토피아', place: '사파리월드 근처', eventTime: '2026-11-26T13:00' };
const same = { id: 'f1', kind: 'lost', lostType: '습득물', status: 'open', title: '[습득] 검정 백팩', body: '나이키 로고 있는 검정 백팩, 사파리 출구 벤치', itemCategory: '가방/의류', zone: '주토피아', place: '사파리월드 출구', eventTime: '2026-11-26T14:10' };
const otherColor = { id: 'f2', kind: 'lost', lostType: '습득물', status: 'open', title: '[습득] 빨간 크로스백', body: '빨강 크로스백', itemCategory: '가방/의류', zone: '매직랜드', place: '회전목마', eventTime: '2026-11-26T14:00' };
const phone = { id: 'f3', kind: 'lost', lostType: '습득물', status: 'open', title: '[습득] 흰색 아이폰', body: '흰색 케이스', itemCategory: '휴대폰/전자기기', zone: '주토피아', place: '판다월드', eventTime: '2026-11-26T14:00' };

test('matching ranks the same backpack first and skips different items', () => {
  const matches = M.matchesFor(lost, [lost, same, otherColor, phone]);
  assert.deepEqual(matches.map((m) => m.post.id), ['f1']);
  assert.ok(matches[0].percent >= 80);
  assert.ok(matches[0].reasons.some((r) => r.includes('나이키')));
  // 반대쪽에서 봐도(습득물 → 분실물) 같은 결과
  assert.deepEqual(M.matchesFor(same, [lost, same]).map((m) => m.post.id), ['l1']);
});

test('linked, resolved and same-type posts are not suggested', () => {
  const linked = { ...same, id: 'f4', linkedPostId: 'x', status: 'matched' };
  const anotherLost = { ...lost, id: 'l2' };
  assert.deepEqual(M.matchesFor(lost, [linked, anotherLost]), []);
  // 잃어버리기 한참 전에 주운 물건은 점수가 깎인다
  const early = { ...same, id: 'f5', eventTime: '2026-11-26T09:00' };
  assert.ok(M.score(lost, early).score < M.score(lost, same).score);
});

test('AI tags saved with a post take priority, rule fills the gaps', () => {
  const tags = M.tagsFor({ title: '가방 분실', body: '', itemCategory: '가방/의류' }, { colors: ['남색'], brands: ['MLB'], item: '백팩', source: 'ai', zone: '없는 구역' });
  assert.deepEqual(tags.colors, ['남색']);
  assert.deepEqual(tags.brands, ['MLB']);
  assert.equal(tags.zone, ''); // 선택지에 없는 구역은 버린다
  assert.equal(tags.source, 'ai');
});

test('/api/lost-extract sends the photo to Gemini and returns cleaned fields', async () => {
  let received = null;
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      received = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: '검정 나이키 백팩 분실', body: '검정 나이키 백팩이에요.', itemCategory: '가방/의류', item: '백팩', colors: ['검정'], brands: ['나이키'], zone: '주토피아', place: '사파리월드 근처', keywords: ['로고'] }) }] } }] }));
    });
  });
  await new Promise((r) => fake.listen(0, r));
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1beta`;
  delete process.env.AI_PROVIDER;
  delete require.cache[require.resolve('../server.js')];
  const { server } = require('../server.js');
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}/api/lost-extract`;
  try {
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '사파리 근처 검은 가방', image: tinyPng }) });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.source, 'ai');
    assert.equal(body.tags.zone, '주토피아');
    assert.equal(body.title, '검정 나이키 백팩 분실');
    const parts = received.contents[0].parts;
    assert.equal(parts[0].inline_data.mime_type, 'image/png');
    assert.equal(received.generationConfig.responseMimeType, 'application/json');
    assert.match(received.systemInstruction.parts[0].text, /주토피아/);
    // 사진만 올렸으면 AI가 장소를 짐작해도 비운다
    const photoOnly = await (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '', image: tinyPng }) })).json();
    assert.equal(photoOnly.tags.zone, '');
    assert.equal(photoOnly.tags.place, '');
    assert.equal(photoOnly.tags.itemCategory, '가방/의류');
    // 설명도 사진도 없으면 거절
    assert.equal((await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
  } finally {
    server.close();
    fake.close();
  }
});

test('/api/lost-compare sends my photo and candidate photos and keeps only known ids', async () => {
  let received = null;
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      received = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ results: [{ id: 'f1', likelihood: 'high', reason: '같은 위치에 키링이 있어요' }, { id: 'zzz', likelihood: 'high', reason: '모르는 후보' }, { id: 'f2', likelihood: 'maybe' }] }) }] } }] }));
    });
  });
  await new Promise((r) => fake.listen(0, r));
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1beta`;
  delete require.cache[require.resolve('../server.js')];
  const { server } = require('../server.js');
  await new Promise((r) => server.listen(0, r));
  const img = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/lost-compare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: img, candidates: [{ id: 'f1', title: '검정 백팩', image: img }, { id: 'f2', title: '빨간 가방', image: img }] }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(body.results, [{ id: 'f1', likelihood: 'high', reason: '같은 위치에 키링이 있어요' }]);
    const images = received.contents[0].parts.filter((p) => p.inline_data);
    assert.equal(images.length, 3); // 내 사진 + 후보 2장
  } finally {
    server.close();
    fake.close();
  }
});

test('"푸마 신발" finds the Puma sneakers, not a red bag of the same category', () => {
  const shoe = { id: 's', kind: 'lost', lostType: '습득물', status: 'open', title: '[습득] 빨간색 푸마 운동화', body: '스웨이드 스피드캣', itemCategory: '기타 소지품', zone: '정문 · 글로벌페어', aiTags: { item: '운동화', colors: ['빨강'], brands: ['푸마'], source: 'ai' } };
  const bag = { id: 'b', kind: 'lost', lostType: '습득물', status: 'open', title: '[습득] 빨간색 더플백', body: '빨간 더플백', itemCategory: '가방/의류', zone: '정문 · 글로벌페어' };
  const probe = (q) => ({ kind: 'lost', lostType: '분실물', title: q, body: '', aiTags: M.clean({ ...M.extract(q), source: 'rule' }) });
  const puma = probe('푸마 신발');
  assert.equal(puma.aiTags.itemCategory, '신발');
  assert.deepEqual(puma.aiTags.brands, ['푸마']);
  assert.ok(M.score(puma, shoe).score > M.score(puma, bag).score);
  assert.equal(M.score(puma, bag).strong, false); // 근거 없는 결과는 숨김 대상
  // 반대로 빨간 가방을 찾을 때 빨간 운동화는 물건이 달라 낮게
  const redBag = probe('빨간 가방');
  assert.ok(M.score(redBag, bag).score >= 3 && M.score(redBag, shoe).score < 3);
});

test('Gemini 503 (busy) is retried automatically', async () => {
  let calls = 0;
  const fake = http.createServer((req, res) => {
    req.on('data', () => {});
    req.on('end', () => {
      calls++;
      if (calls === 1) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{"error":{"code":503,"status":"UNAVAILABLE"}}'); return; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ itemCategory: '신발', item: '운동화', brands: ['푸마'], colors: [], keywords: [] }) }] } }] }));
    });
  });
  await new Promise((r) => fake.listen(0, r));
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1beta`;
  delete require.cache[require.resolve('../server.js')];
  const { server } = require('../server.js');
  await new Promise((r) => server.listen(0, r));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/lost-extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '푸마 신발' }) });
    const body = await res.json();
    assert.equal(body.source, 'ai');
    assert.equal(calls, 2);
  } finally {
    server.close();
    fake.close();
  }
});
