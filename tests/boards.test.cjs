const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const now = Date.now();

function setup(entries, legacy) {
  const values = new Map();
  if (entries) values.set('parktalk-boards-v1', JSON.stringify(entries));
  if (legacy) values.set('parktalk-posts', JSON.stringify(legacy));
  let role = 'cast';
  let accountRole = 'cast';
  let userId = 'guest-demo';
  let lastModal = '';
  const window = {
    ParkAuth: {
      role: () => role,
      accountRole: () => accountRole,
      id: () => userId,
      name: () => '게스트',
    },
    parkModal: (html) => {
      lastModal = html;
    },
    parkToast: () => {},
    addEventListener() {},
  };
  const context = {
    window,
    localStorage: { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v) },
    document: { addEventListener() {}, querySelector: () => null },
    crypto: { randomUUID },
    setInterval() {},
    Date,
    console,
  };
  vm.runInNewContext(fs.readFileSync('boards.js', 'utf8'), context);
  return {
    api: window.ParkBoards,
    getModal: () => lastModal,
    setRole: (r, acc = r, id = 'guest-demo') => {
      role = r;
      accountRole = acc;
      userId = id;
    },
  };
}

function post(id, kind, at, likes, extra = {}) {
  return {
    id,
    kind,
    title: id,
    author: '작성자',
    body: '내용',
    createdAt: at,
    likes: likes.map((t) => ({ id: randomUUID(), at: t })),
    replies: [],
    ...extra,
  };
}

test('popular uses likes in last five hours, not lifetime totals; ties use newest post', () => {
  const a = post('a', 'free', now - 100, [now - 1000, now - 2000]);
  a.legacyLikes = 999;
  const b = post('b', 'praise', now, [now - 1000, now - 2000]);
  const c = post('c', 'lost', now, [now - 6 * 3600000]);
  c.legacyLikes = 10000;
  const { api } = setup([a, b, c]);
  assert.equal(api.list('popular').map((p) => p.id).join(','), 'b,a');
  assert.equal(api.recent(a, now + 6 * 3600000), 0);
});

test('visitor cannot list cast posts, even when querying popular or a cast category', () => {
  const { api, setRole } = setup([
    post('cast', 'free', now, [now - 100]),
    post('shared', 'praise', now, [now - 100]),
  ]);
  setRole('visitor');
  assert.equal(api.list('free').length, 0);
  assert.equal(api.list('popular').map((p) => p.id).join(','), 'shared');
  assert.equal(api.list('praise').length, 1);
  setRole('cast');
  assert.equal(api.list('praise')[0].id, 'shared');
});

test('legacy counts remain visible but have no fabricated recent timestamps', () => {
  const { api } = setup(null, [{ category: 'Q&A', title: '이전 질문', likes: 24, comments: 3 }]);
  const p = api.list('question')[0];
  assert.equal(p.legacyLikes, 24);
  assert.equal(p.legacyComments, 3);
  assert.equal(api.list('popular').length, 0);
});

test('visitor page exposes only shared boards and no inline composer', () => {
  const { api, setRole } = setup([]);
  setRole('visitor');
  const html = api.page('visitor', 'free');
  assert.match(html, /data-pb-kind="praise"/);
  assert.match(html, /data-pb-write/);
  assert.doesNotMatch(html, /data-pb-kind="free"|data-pb-kind="department"|<form/);
});

test('compose modal separates writable boards and lost/found forms by active mode', () => {
  const { api, setRole, getModal } = setup([]);
  setRole('cast');
  api.write('praise');
  assert.doesNotMatch(getModal(), /<option value="praise"/);
  assert.doesNotMatch(getModal(), /<option value="missing"/);
  assert.match(getModal(), /<option value="free" selected>/);

  api.write('lost');
  assert.match(getModal(), /value="습득물"/);
  assert.match(getModal(), /현재 보관 장소/);

  setRole('visitor');
  api.write('lost');
  assert.match(getModal(), /value="분실물"/);
  assert.doesNotMatch(getModal(), /현재 보관 장소/);
});

test('cast links found item to visitor lost item and displays storage location', () => {
  const lostItem = post('lost-1', 'lost', now - 500, [], {
    lostType: '분실물',
    itemCategory: '지갑/카드',
    zone: '주토피아',
    place: '사파리월드 입구',
    status: 'open',
  });
  const foundItem = post('found-1', 'lost', now, [], {
    lostType: '습득물',
    itemCategory: '지갑/카드',
    zone: '주토피아',
    place: '사파리월드 출구',
    storageLocation: '정문 손님상담실',
    status: 'open',
  });
  const { api, setRole, getModal } = setup([lostItem, foundItem]);
  assert.equal(api.linkPosts('found-1', 'lost-1'), true);

  setRole('visitor', 'visitor', 'v-1');
  api.detail('lost-1');
  assert.match(getModal(), /정문 손님상담실/);
  assert.match(getModal(), /습득물 연결 완료/);

  setRole('cast', 'cast', 'c-1');
  assert.equal(api.resolvePost('found-1'), true);
  assert.equal(api.list('lost').every((item) => item.status === 'resolved'), true);
});

test('resolved missing child post masks photo and guardian contact', () => {
  const missingPost = post('miss-1', 'missing', now, [], {
    childName: '민준이',
    age: '6',
    gender: '남성',
    zone: '매직랜드',
    place: '회전목마 앞',
    guardianContact: '010-9876-5432',
    photoUrl: 'data:image/png;base64,iVBORw0KGgo=',
    status: 'open',
  });
  const { api, setRole, getModal } = setup([missingPost]);
  setRole('visitor', 'visitor', 'v-1');
  api.detail('miss-1');
  assert.match(getModal(), /010-9876-5432/);
  assert.match(getModal(), /pb-photo/);

  api.resolvePost('miss-1');
  api.detail('miss-1');
  assert.doesNotMatch(getModal(), /010-9876-5432/);
  assert.doesNotMatch(getModal(), /<img class="pb-photo"/);
  assert.match(getModal(), /비공개 처리되었습니다/);
});
test('assistant search finds posts by title, body and comments, labels the board, and hides cast boards from visitors',()=>{
 const dorm=post('dorm','free',now-10,[]);dorm.title='기숙사 생활 팁 있나요';dorm.body='처음 들어가요';dorm.replies=[{author:'선배',body:'세탁실은 아침에 비어 있어요',createdAt:now}];
 const lost=post('lost','lost',now,[]);lost.title='우산 분실했어요';lost.body='정문 근처에서 파란 우산';
 const {api,setRole}=setup([dorm,lost]);
 const found=api.search('기숙사 세탁실 언제 비어?');
 assert.equal(found[0].id,'dorm');assert.equal(found[0].board,'자유 게시판');assert.match(found[0].replies[0].body,/세탁실/);
 assert.equal(api.search('파란 우산 분실')[0].board,'분실물 게시판');
 assert.equal(api.search('어떻게 해요?').length,0);
 setRole('visitor');
 assert.equal(api.search('기숙사 세탁실').length,0);
 assert.equal(api.search('파란 우산 분실').length,1);
});
