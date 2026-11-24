const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(profiles){
 const window={};
 vm.runInNewContext(fs.readFileSync('profiles.js','utf8'),{window,document:{addEventListener(){}},localStorage:{getItem:()=>JSON.stringify(profiles)}});
 return window.ParkProfiles;
}
test('profiles are resolved by account id and retain author fallback for older posts',()=>{
 const api=setup({a:{name:'새 닉네임',photo:''},b:{name:'다른 사용자',photo:''}});
 assert.equal(api.name('a','이전 이름'),'새 닉네임');assert.equal(api.name('b','이전 이름'),'다른 사용자');assert.equal(api.name(null,'이전 작성자'),'이전 작성자');
});
test('profile presentation escapes names and rejects non-image URLs',()=>{
 const api=setup({a:{name:'<사용자>',photo:'javascript:alert(1)'}});
 assert.doesNotMatch(api.avatar('a',''),/javascript:|<사용자>/);assert.match(api.avatar('a',''),/&lt;/);
});
