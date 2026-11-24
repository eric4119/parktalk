/* Local profile presentation shared by cast and visitor modes. */
(() => {
  const KEY='parktalk-profiles-v1';
  const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const all=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}};
  const get=id=>all()[id]||null;
  const name=(id,fallback)=>get(id)?.name||fallback||'사용자';
  const photo=src=>/^data:image\/(png|jpeg|webp);base64,/.test(src||'')?src:'';
  const avatar=(id,fallback)=>{const src=photo(get(id)?.photo);return src?`<img src="${src}" alt="" class="profile-image">`:`<span aria-hidden="true">${esc(name(id,fallback).slice(0,1))}</span>`;};
  let draftPhoto='';
  function edit(){
    const id=window.ParkAuth?.id();if(!id)return;
    draftPhoto=photo(get(id)?.photo);
    window.parkModal(`<h2>프로필 수정</h2><p class="pb-hint">두 모드에서 같은 닉네임과 사진을 사용해요.</p><form id="profile-form" class="profile-form"><div class="profile-preview" id="profile-preview">${avatar(id,window.ParkAuth.name())}</div><label class="profile-photo-label">사진 선택<input type="file" id="profile-file" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="profile-remove" data-profile-remove>기본 이미지로 변경</button><p class="pb-hint">PNG·JPG·WebP, 1MB 이하</p><label class="form-field">닉네임<input name="nickname" value="${esc(window.ParkAuth.name())}" minlength="2" maxlength="20" required autocomplete="nickname"></label><p class="profile-error" role="status" id="profile-error"></p><div class="profile-buttons"><button type="button" class="outline" data-profile-cancel>취소</button><button type="submit" class="primary">저장하기</button></div></form>`);
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-profile-edit]'))edit();
    if(e.target.closest('[data-profile-cancel]'))document.querySelector('#modal').close();
    if(e.target.closest('[data-profile-remove]')){draftPhoto='';document.querySelector('#profile-file').value='';document.querySelector('#profile-preview').textContent=window.ParkAuth.name().slice(0,1);}
  });
  document.addEventListener('change',async e=>{
    if(e.target.id!=='profile-file')return;
    const file=e.target.files[0];if(!file)return;
    const form=e.target.closest('form'),error=form.querySelector('#profile-error'),save=form.querySelector('[type=submit]');
    error.textContent='';
    if(file.size>1000000||!['image/png','image/jpeg','image/webp'].includes(file.type)){error.textContent='PNG·JPG·WebP 사진 1MB 이하로 선택해 주세요.';e.target.value='';return;}
    save.disabled=true;
    try{const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});if(form.isConnected){draftPhoto=src;form.querySelector('#profile-preview').innerHTML=`<img class="profile-image" src="${src}" alt="선택한 프로필 사진">`;}}
    catch{error.textContent='사진을 읽지 못했어요. 다시 선택해 주세요.';}finally{save.disabled=false;}
  });
  document.addEventListener('submit',e=>{
    if(e.target.id!=='profile-form')return;e.preventDefault();
    const nickname=String(new FormData(e.target).get('nickname')||'').trim();
    const error=e.target.querySelector('#profile-error');
    if(nickname.length<2||nickname.length>20){error.textContent='닉네임은 공백을 제외해 2~20자로 입력해 주세요.';return;}
    const id=window.ParkAuth.id(),profiles=all();profiles[id]={name:nickname,photo:draftPhoto};
    try{localStorage.setItem(KEY,JSON.stringify(profiles));window.ParkAuth.updateProfile(nickname);document.querySelector('#modal').close();window.parkToast('프로필을 저장했어요.');}
    catch{error.textContent='저장 공간이 부족해요. 사진 크기를 줄여주세요.';}
  });
  window.ParkProfiles={get,name,avatar,edit};
})();
