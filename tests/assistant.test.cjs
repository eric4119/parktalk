const test = require('node:test');
const assert = require('node:assert/strict');
const ParkData = require('../park-data.js');

test('FAQ search answers common questions from local data', () => {
  assert.equal(ParkData.localAnswer('오늘 식당 메뉴 뭐야?').faqId, 'menu');
  assert.equal(ParkData.localAnswer('사원증 인증 어떻게 해요').faqId, 'cast-verification');
  assert.equal(ParkData.localAnswer('아이를 잃어버렸어요 미아').faqId, 'missing-child');
  assert.equal(ParkData.localAnswer('근처 제휴 가게 있어?').faqId, 'stores');
});

test('unknown question gets a safe fallback, not an invented answer', () => {
  const result = ParkData.localAnswer('qwerty zxcv');
  assert.equal(result.faqId, null);
  assert.match(result.answer, /준비된 답변이 없어요/);
});

test('stores are not marked as cast partners until an admin confirms them', () => {
  assert.ok(ParkData.stores.length > 0);
  for (const store of ParkData.stores) {
    assert.ok(store.name && store.address);
    if (!store.partner) assert.equal(store.benefit, '');
  }
});

test('assistant endpoint falls back when no API key is set', async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const { server, systemPrompt } = require('../server.js');
  assert.match(systemPrompt('cast'), /캐스트 제휴: 확인 전/);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/assistant`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: '메뉴' }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).fallback, true);
  } finally {
    server.close();
  }
});

test('without AI, a board post answers with its board and title as the source', () => {
  const posts = [{ id: 'p1', board: '자유 게시판', title: '기숙사 세탁실 팁', body: '세탁실 언제 비나요', replies: [{ author: '선배', body: '아침 7시 전에 비어 있어요' }] }];
  const result = ParkData.localAnswer('기숙사 세탁실 비는 시간', posts);
  assert.equal(result.source, 'board');
  assert.match(result.answer, /자유 게시판의 '기숙사 세탁실 팁'/);
  assert.deepEqual(result.sources, [{ id: 'p1', board: '자유 게시판', title: '기숙사 세탁실 팁' }]);
});

test('FAQ still wins over board posts when it matches clearly', () => {
  const result = ParkData.localAnswer('사원증 인증 방법', [{ id: 'p2', board: '질문 게시판', title: '사원증', body: '', replies: [] }]);
  assert.equal(result.faqId, 'cast-verification');
  assert.equal(result.sources[0].board, '질문 게시판');
});

test('server keeps only source ids it actually sent and caps post size', () => {
  const { splitUsed, cleanPosts } = require('../server.js');
  const posts = cleanPosts([{ id: 'a', title: 't', body: 'x'.repeat(1000), board: '자유 게시판' }, { id: 1, title: 'bad' }]);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].body.length, 400);
  const { answer, usedPostIds } = splitUsed('자유 게시판 글에 따르면 그래요.\n[[USED: a, fake]]', posts);
  assert.equal(answer, '자유 게시판 글에 따르면 그래요.');
  assert.deepEqual(usedPostIds, ['a']);
});
