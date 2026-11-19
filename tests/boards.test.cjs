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
