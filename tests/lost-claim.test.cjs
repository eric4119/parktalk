const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');

// boards.js를 가짜 브라우저에서 돌려 '내 물건 같아요' 확인 요청 → 캐스트 확인 후 연결 흐름을 확인한다.
function setup(entries) {
  const values = new Map([['parktalk-boards-v1', JSON.stringify(entries)]]);
  let role = 'visitor', userId = 'v1', toast = '';
  const window = {
    ParkAuth: { role: () => role, accountRole: () => role, id: () => userId, name: () => '방문객' },
    parkModal() {}, parkToast: (m) => { toast = m; }, addEventListener() {},
  };
  const context = {
    window,
    localStorage: { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v) },
    document: { addEventListener() {}, querySelector: () => null },
    history: { pushState() {}, replaceState() {} },
    location: { href: '' },
    crypto: { randomUUID }, setInterval() {}, Date, console,
  };
  vm.runInNewContext(fs.readFileSync('boards.js', 'utf8'), context);
  return {
    api: window.ParkBoards,
    saved: () => JSON.parse(values.get('parktalk-boards-v1')),
    as: (r, id) => { role = r; userId = id; },
    toast: () => toast,
  };
}
const found = {
  id: 'f1', kind: 'lost', lostType: '습득물', title: '[습득] 검정 나이키 백팩 보관중', body: '검정 백팩', author: '캐스트', authorId: 'c1', authorType: '캐스트',
  createdAt: Date.now(), likes: [], replies: [], status: 'open', linkedPostId: null, itemCategory: '가방/의류', zone: '주토피아', storageLocation: '정문 손님상담실',
};

test('visitor claim creates a pending request without linking', () => {
  const b = setup([found]);
  b.as('visitor', 'v1');
  const claim = b.api.requestClaim('f1', { note: '안에 파란 필통이 있어요' });
  assert.ok(claim);
  const posts = b.saved();
  const request = posts.find((p) => p.claimFor === 'f1');
  assert.equal(request.lostType, '분실물');
  assert.equal(request.authorId, 'v1');
  assert.equal(request.claimNote, '안에 파란 필통이 있어요');
  assert.equal(posts.find((p) => p.id === 'f1').linkedPostId, null); // 아직 연결 안 됨
  // 같은 사람이 두 번 요청하면 막는다
  assert.equal(b.api.requestClaim('f1', { note: '다시' }), null);
});

test('only cast can confirm a claim, which links the two posts', () => {
  const b = setup([found]);
  b.as('visitor', 'v1');
  const claim = b.api.requestClaim('f1', { note: '필통' });
  assert.equal(b.api.confirmClaim('f1', claim.id), false); // 방문객은 확정 불가
  b.as('cast', 'c1');
  assert.equal(b.api.confirmClaim('f1', claim.id), true);
  const posts = b.saved();
  assert.equal(posts.find((p) => p.id === 'f1').linkedPostId, claim.id);
  assert.equal(posts.find((p) => p.id === claim.id).status, 'matched');
});

test('cast cannot send claims, and resolved found items cannot be claimed', () => {
  const b = setup([{ ...found, status: 'resolved' }]);
  b.as('cast', 'c1');
  assert.equal(b.api.requestClaim('f1', {}), null);
  b.as('visitor', 'v1');
  assert.equal(b.api.requestClaim('f1', {}), null);
});

test('confirming one claim closes the other pending claims on the same item', () => {
  const b = setup([found]);
  b.as('visitor', 'v1');
  const first = b.api.requestClaim('f1', { note: '필통' });
  b.as('visitor', 'v2');
  const second = b.api.requestClaim('f1', { note: '지갑' });
  b.as('cast', 'c1');
  assert.equal(b.api.confirmClaim('f1', first.id, { stay: true }), true);
  const posts = b.saved();
  assert.equal(posts.find((p) => p.id === second.id).claimStatus, 'closed');
  assert.equal(b.api.confirmClaim('f1', second.id), false); // 마감된 요청은 다시 연결 불가
});

test('cast can reject with a reason; visitor can cancel only a pending claim', () => {
  const b = setup([found]);
  b.as('visitor', 'v1');
  const claim = b.api.requestClaim('f1', { note: '필통' });
  assert.equal(b.api.rejectClaim(claim.id, '안 맞아요'), false); // 방문객은 반려 불가
  b.as('cast', 'c1');
  assert.equal(b.api.rejectClaim(claim.id, '가방 안 물건이 달라요'), true);
  let mine = b.saved().find((p) => p.id === claim.id);
  assert.equal(mine.claimStatus, 'rejected');
  assert.equal(mine.claimReason, '가방 안 물건이 달라요');
  b.as('visitor', 'v1');
  assert.equal(b.api.cancelClaim(claim.id), false); // 이미 처리된 요청은 취소 불가
  // 반려 뒤에는 다시 요청할 수 있고, 대기 중일 때는 취소하면 요청 글이 사라진다
  const again = b.api.requestClaim('f1', { note: '다시' });
  assert.ok(again);
  assert.equal(b.api.cancelClaim(again.id), true);
  assert.equal(b.saved().some((p) => p.id === again.id), false);
});

test('auto-created claim posts are hidden from the board list', () => {
  const b = setup([found]);
  b.as('visitor', 'v1');
  b.api.requestClaim('f1', { note: '필통' });
  assert.deepEqual([...b.api.list('lost').map((p) => p.id)], ['f1']);
});
