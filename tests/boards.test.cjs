const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const now = Date.now();
function setup(entries, legacy) {
  const values = new Map();
  if(entries) values.set('parktalk-boards-v1',JSON.stringify(entries));
  if(legacy) values.set('parktalk-posts',JSON.stringify(legacy));
  let role='cast';
  const window={ParkAuth:{role:()=>role,accountRole:()=>role,id:()=> 'guest-demo',name:()=> '게스트'},addEventListener(){}};
  const context={window,localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},document:{addEventListener(){}},crypto:{randomUUID},setInterval(){},Date,console};
  vm.runInNewContext(fs.readFileSync('boards.js','utf8'),context);
  return {api:window.ParkBoards,setRole:r=>role=r};
}
function post(id,kind,at,likes) {return {id,kind,title:id,author:'작성자',body:'내용',createdAt:at,likes:likes.map(at=>({id:randomUUID(),at})),replies:[]};}
test('popular uses likes in last five hours, not lifetime totals; ties use newest post',()=>{
 const a=post('a','free',now-100,[now-1000,now-2000]);a.legacyLikes=999;
 const b=post('b','praise',now,[now-1000,now-2000]);
 const c=post('c','lost',now,[now-6*3600000]);c.legacyLikes=10000;
 const {api}=setup([a,b,c]);
 assert.equal(api.list('popular').map(p=>p.id).join(','),'b,a');
 assert.equal(api.recent(a,now+6*3600000),0);
});
test('visitor cannot list cast posts, even when querying popular or a cast category',()=>{
 const {api,setRole}=setup([post('cast','free',now,[now-100]),post('shared','praise',now,[now-100])]);
 setRole('visitor');
 assert.equal(api.list('free').length,0);
 assert.equal(api.list('popular').map(p=>p.id).join(','),'shared');
 assert.equal(api.list('praise').length,1);
 setRole('cast');assert.equal(api.list('praise')[0].id,'shared');
});
test('legacy counts remain visible but have no fabricated recent timestamps',()=>{
 const {api}=setup(null,[{category:'Q&A',title:'이전 질문',likes:24,comments:3}]);
 const p=api.list('question')[0];
 assert.equal(p.legacyLikes,24);assert.equal(p.legacyComments,3);
 assert.equal(api.list('popular').length,0);
});
test('visitor page exposes only shared boards and no inline composer',()=>{
 const {api,setRole}=setup([]);setRole('visitor');
 const html=api.page('visitor','free');
 assert.match(html,/data-pb-kind="praise"/);assert.match(html,/data-pb-write/);
 assert.doesNotMatch(html,/data-pb-kind="free"|data-pb-kind="department"|<form/);
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
