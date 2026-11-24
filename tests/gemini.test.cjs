const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// 실제 Gemini 대신 같은 형식으로 응답하는 가짜 서버를 띄워 요청 형식과 응답 처리를 확인한다.
test('Gemini request uses systemInstruction, model role, API key header, and returns sources', async () => {
  let received = null;
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      received = { url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(body) };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: '생각 중', thought: true }, { text: '자유 게시판 글에 따르면 아침이 한가해요.\n[[USED: p1]]' }] } }] }));
    });
  });
  await new Promise((r) => fake.listen(0, r));
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1beta`;
  delete process.env.AI_PROVIDER;
  const { server } = require('../server.js');
  await new Promise((r) => server.listen(0, r));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/assistant`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: '세탁실 한가한 시간',
        role: 'cast',
        history: [{ question: '안녕', answer: '안녕하세요' }],
        posts: [{ id: 'p1', board: '자유 게시판', title: '세탁실 팁', body: '언제 비나요', replies: [] }],
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.answer, '자유 게시판 글에 따르면 아침이 한가해요.');
    assert.deepEqual(body.usedPostIds, ['p1']);
    assert.equal(received.url, '/v1beta/models/gemini-3.1-flash-lite:generateContent');
    assert.equal(received.key, 'test-key');
    assert.match(received.body.systemInstruction.parts[0].text, /파크톡/);
    assert.deepEqual(received.body.contents.map((c) => c.role), ['user', 'model', 'user']);
    assert.match(received.body.contents[2].parts[0].text, /<board_posts>[\s\S]*세탁실 팁/);
  } finally {
    server.close();
    fake.close();
  }
});
