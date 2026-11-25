const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { clean, build } = require('../scripts/build-official.cjs');
const ParkData = require('../park-data.js');

test('converter fixes link-only answers, removes internal memos, and drops empty items', () => {
  const linkOnly = clean({ id: 'a', cat: 'Comprehensive usage information', q: '에버랜드 운영시간은?', a: '_blank">https://www.everland.com/everland/information/dailypark?alarm=true', date: '2026.10.30' });
  assert.equal(linkOnly.cat, '종합이용안내');
  assert.equal(linkOnly.url, 'https://www.everland.com/everland/information/dailypark?alarm=true');
  assert.match(linkOnly.a, /실시간으로 확인/);
  assert.equal(clean({ id: 'b', cat: 'Caribbean Bay', q: '휴장 기간은?', a: '* 매년 운영상황에 따라 달라질 수 있으므로, 확인 가능한 URL 주소 입력 필요', date: '' }), null);
  assert.equal(clean({ id: 'c', cat: 'App usage', q: '앱은?', a: '에버랜드"를 검색하면 됩니다.', date: '' }).a, '"에버랜드"를 검색하면 됩니다.');
  assert.doesNotMatch(clean({ id: 'd', cat: 'x', q: '흡연구역?', a: '흡연구역은 아래 링크에서 확인하실 수 있습니다. ☞ 바로가기', date: '' }).a, /☞|아래 링크/);
  const built = build();
  assert.ok(built.count > 400);
  assert.ok(built.items.every((item) => item.q && item.a && item.url.startsWith('https://')));
});

test('search finds official answers despite spacing and synonyms, and respects disabled categories', () => {
  const items = build().items;
  const top = (q, off = []) => ParkData.searchOfficial(q, items, 1, off)[0]?.id;
  assert.equal(top('전동킥보드 가져가도 되나요'), 'guide-electric-mobility');
  assert.equal(top('강아지 데려가도 돼?'), 'guide-pets');
  assert.equal(top('담배 어디서 펴'), 'guide-smoking');
  assert.equal(top('주차장 꽉 차면 어디'), 'guide-parking');
  assert.notEqual(top('전동킥보드 가져가도 되나요', ['이용 안내 사항']), 'guide-electric-mobility');
  // AI 없이 답할 때: 공식 안내를 기준일과 함께 인용하고 출처를 붙인다
  const answer = ParkData.localAnswer('물품보관함 얼마야', [], ParkData.searchOfficial('물품보관함 얼마야', items, 3));
  assert.equal(answer.source, 'official');
  assert.match(answer.answer, /공식 안내\(2026\.10\.30 기준\)/);
  assert.equal(answer.sources[0].type, 'official');
  // 파크톡 고유 질문은 계속 파크톡 FAQ가 답한다
  assert.equal(ParkData.localAnswer('사원증 인증 어떻게 해', [], ParkData.searchOfficial('사원증 인증 어떻게 해', items, 3)).faqId, 'cast-verification');
});

test('AI request carries only relevant official items and the response names the ones used', async () => {
  let received = null;
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      received = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: '에버랜드 공식 안내에 따르면 반려동물은 안내견만 들어갈 수 있어요.\n[[USED: guide-pets]]' }] } }] }));
    });
  });
  await new Promise((r) => fake.listen(0, r));
  process.env.GEMINI_API_KEY = 'k';
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1beta`;
  process.env.PARKTALK_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'pk-off-'));
  const { server } = require('../server.js');
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(`${base}/api/assistant`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: '강아지 데려가도 돼?', role: 'visitor' }) });
    const body = await res.json();
    const sent = received.contents.at(-1).parts[0].text;
    assert.match(sent, /<official_info>[\s\S]*guide-pets/);
    assert.ok((sent.match(/\[id: /g) || []).length <= 5, 'at most 5 official items are sent');
    assert.equal(body.usedOfficial.length, 1);
    assert.equal(body.usedOfficial[0].id, 'guide-pets');
    assert.equal(body.usedOfficial[0].type, 'official');
    assert.match(body.usedOfficial[0].url, /^https:\/\/www\.everland\.com\//);
    // 원본·스크립트 폴더는 내보내지 않고, 앱이 쓰는 정리본만 공개한다
    assert.equal((await fetch(`${base}/official/everland-faq.raw.json`)).status, 404);
    assert.equal((await fetch(`${base}/scripts/build-official.cjs`)).status, 404);
    assert.equal((await fetch(`${base}/official-faq.json`)).status, 200);
  } finally {
    server.close();
    fake.close();
  }
});

test('pet questions reach the official pet rule, not the in-app animal-raising FAQ', () => {
  const items = build().items;
  const q = '반려동물 데려와도 돼?';
  const answer = ParkData.localAnswer(q, [], ParkData.searchOfficial(q, items, 3));
  assert.equal(answer.source, 'official');
  assert.match(answer.answer, /안내견/);
  assert.equal(ParkData.localAnswer('동물 키우기 언제 열려?').faqId, 'animal');
});
