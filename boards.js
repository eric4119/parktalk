/* Shared board data and UI for both modes. Local prototype; server authorization is required for deployment. */
(() => {
  const KEY = 'parktalk-boards-v1';
  const labels = { popular: '인기', free: '자유', trade: '중고 거래', question: '질문', praise: '칭찬', missing: '미아', lost: '분실물', department: '부서별' };
  const shared = ['praise', 'missing', 'lost'];
  const castTabs = ['popular', 'free', 'trade', 'question', ...shared, 'department'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const actor = () => ({ id: window.ParkAuth?.id() || 'guest-demo', name: window.ParkAuth?.name() || '게스트', type: window.ParkAuth?.id() === 'guest-demo' ? '게스트' : window.ParkAuth?.accountRole() === 'cast' ? '캐스트' : '일반 사용자' });
  const allowed = kind => window.ParkAuth?.role() === 'cast' ? Object.keys(labels).includes(kind) : shared.includes(kind);
  const uid = () => crypto.randomUUID();
  let selected = 'popular';
  let query = '';
  let homeKind = 'popular';
  let searchOpen = false;
  let data = read(KEY, null);
  if (!Array.isArray(data)) {
    const kinds = { 자유게시판:'free', 중고거래:'trade', '부서별 게시판':'department', '신규 캐스트':'question', 'Q&A':'question' };
    data = read('parktalk-posts', [{category:'자유게시판', title:'오늘 하루도 모두 수고했어요!', body:'동료들과 오늘의 이야기를 나눠보세요.', author:'시연 캐스트'}, {category:'신규 캐스트', title:'첫 출근 전에 준비하면 좋은 것들', body:'첫 출근 준비물과 궁금한 점을 함께 나눠요.', author:'신입 캐스트'}]).filter(p => kinds[p.category]).map(p => ({
      ...p, id:uid(), kind:kinds[p.category], authorType:'캐스트', authorId:null,
      createdAt:p.createdAt || null, legacyLikes:Number(p.likes)||0, likes:[], legacyComments:Math.max(0,(Number(p.comments)||0)-(p.replies?.length||0)), replies:p.replies||[]
    }));
    data.push(...read('parktalk-found-items', []).map(p => ({...p,id:uid(),kind:'lost',lostType:'습득물',author:'캐스트 등록',authorType:'캐스트',authorId:null,createdAt:null,likes:[],replies:[]})));
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { window.parkToast('저장 공간이 부족해요. 사진 크기를 줄여주세요.'); data = read(KEY, []); return false; } };
  const recent = (post, now=Date.now()) => (post.likes||[]).filter(l => l.at > now-5*60*60*1000 && l.at <= now).length;
  const total = p => (p.legacyLikes||0)+(p.likes?.length||0);
  const comments = p => (p.legacyComments||0)+(p.replies?.length||0);
  const time = at => at ? new Date(at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '이전 시연 글';
  function list(kind, search='') {
    const q=search.trim().toLowerCase();
    return data.filter(p => allowed(p.kind) && (kind==='popular' ? recent(p)>0 : p.kind===kind) && (!q || [p.title,p.body,p.author,p.clothes].join(' ').toLowerCase().includes(q)))
      .sort((a,b) => (kind==='popular' ? recent(b)-recent(a) : 0) || (b.createdAt||0)-(a.createdAt||0) || a.id.localeCompare(b.id));
  }
  function cards(kind) {
    const items=list(kind,query);
    return `<div class="cast-board-list-head"><strong>${labels[kind]} 게시판</strong></div>${kind==='popular'?'<p class="pb-hint">최근 5시간 동안 받은 좋아요 순 · 동률은 최신 글 순</p>':''}${items.length ? items.map(p => `<button class="cast-post-card" data-pb-post="${p.id}"><span class="pb-top"><span class="tag free">${labels[p.kind]}${p.lostType?' · '+escape(p.lostType):''}</span><span class="pb-role">${escape(p.authorType||'캐스트')}</span></span><strong>${escape(p.title)}</strong><span class="cast-post-summary">${escape(p.body||p.clothes)}</span><span class="cast-post-meta"><span>${escape(p.author)} · ${time(p.createdAt)}</span><span>♡ ${total(p)} · 댓글 ${comments(p)}</span></span>${kind==='popular'?`<small class="pb-hint">최근 5시간 좋아요 ${recent(p)}</small>`:''}</button>`).join('') : `<div class="cast-empty">${query?'검색 결과가 없어요.':kind==='popular'?'최근 5시간 동안 좋아요를 받은 글이 없어요.':'아직 글이 없어요. 첫 글을 남겨주세요.'}</div>`}`;
  }
  function page(mode, kind) {
    const tabs=mode==='cast'?castTabs:shared;
    if(kind) selected=kind;
    if(!tabs.includes(selected)) selected=tabs[0];
    return `<section class="pb-page" data-pb-mode="${mode}"><div class="page-head"><div><h1>${mode==='cast'?'캐스트들의 이야기':'함께 나누는 이야기'}</h1><p>${mode==='cast'?'동료의 일상과 파크의 소식을 나눠요.':'캐스트와 방문객이 함께 보는 게시판이에요.'}</p></div><div class="pb-actions"><button class="pb-search-toggle" data-pb-search-toggle aria-label="${searchOpen?'게시글 검색 닫기':'게시글 검색 열기'}" aria-expanded="${searchOpen}" aria-controls="pb-search-panel"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg></button><button class="primary" data-pb-write>＋ 글쓰기</button></div></div><nav class="cast-board-chips" aria-label="게시판 종류">${tabs.map(k=>`<button data-pb-kind="${k}" class="${k===selected?'active':''}" aria-pressed="${k===selected}">${labels[k]}</button>`).join('')}</nav><label class="pb-search" id="pb-search-panel" ${searchOpen?'':'hidden'}><span class="pb-sr-only">게시글 검색</span><input type="search" data-pb-search value="${escape(query)}" placeholder="제목, 내용, 작성자 검색"></label><div id="pb-board-notice">${boardNotice()}</div><div class="cast-board-list" id="pb-list">${cards(selected)}</div></section>`;
  }
  function boardNotice() {
    return selected==='missing' ? '<div class="pv-missing-help"><strong>미아 발생 시 가까운 캐스트에게 먼저 알려주세요.</strong><a href="tel:0313205050">손님상담실 031-320-5050</a></div>' : '';
  }
  function homePosts() {
    const items = list(homeKind).slice(0, 4);
    return items.length ? items.map(p => `<button class="pb-home-post" data-pb-post="${p.id}"><strong>${escape(p.title)}</strong><span class="pb-home-meta"><span>${escape(p.author)} · ${escape(p.authorType || '캐스트')}</span><span>♡ ${total(p)} · 댓글 ${comments(p)}</span></span></button>`).join('') : `<p class="pb-home-empty">${homeKind==='popular'?'최근 5시간 동안 좋아요를 받은 글이 없어요.':'아직 등록된 글이 없어요.'}</p>`;
  }
  function home() {
    return `<section class="card list-card pb-home"><div class="pb-home-heading"><h2 class="section-title">캐스트들의 이야기</h2><button class="pb-more" data-pb-more>더보기 ›</button></div><nav class="cast-board-chips pb-home-tabs" aria-label="홈 게시판 종류">${castTabs.filter(k=>k!=='department').map(k=>`<button data-pb-home-kind="${k}" class="${k===homeKind?'active':''}" aria-pressed="${k===homeKind}">${labels[k]}</button>`).join('')}</nav><div id="pb-home-posts">${homePosts()}</div></section>`;
  }
  function refresh() {
    // Keep the tab strip mounted so its scroll position and keyboard focus stay intact.
    const root=document.querySelector('.pb-page');
    if(root) {
      root.querySelectorAll('[data-pb-kind]').forEach(button => {
        const active=button.dataset.pbKind===selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      root.querySelector('#pb-list').innerHTML=cards(selected);
      root.querySelector('#pb-board-notice').innerHTML=boardNotice();
    }
    const homeRoot=document.querySelector('.pb-home');
    if(homeRoot) {
      homeRoot.querySelectorAll('[data-pb-home-kind]').forEach(button => {
        const active=button.dataset.pbHomeKind===homeKind;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      homeRoot.querySelector('#pb-home-posts').innerHTML=homePosts();
    }
  }
  const safePhoto = src => /^data:image\/(png|jpeg|webp);base64,/.test(src||'') ? src : '';
  function detail(id) {
    const p=data.find(p=>p.id===id);
    if(!p || !allowed(p.kind)) return window.parkToast('이 게시판은 캐스트만 볼 수 있어요.');
    const me=actor();
    window.parkModal(`<span class="tag free">${labels[p.kind]}</span><h2>${escape(p.title)}</h2><p class="pb-hint">${escape(p.author)} · ${escape(p.authorType)} · ${time(p.createdAt)}</p>${safePhoto(p.photoUrl)?`<img class="pb-photo" src="${p.photoUrl}" alt="게시글 첨부 사진">`:''}<p class="pb-body">${escape(p.body||p.clothes)}</p>${p.age?`<p>${escape(p.age)}세 · ${escape(p.gender)}</p>`:''}${p.place?`<p>장소: ${escape(p.place)}</p>`:''}<button class="outline" data-pb-like="${p.id}" aria-pressed="${p.likes.some(l=>l.id===me.id)}">${p.likes.some(l=>l.id===me.id)?'♥':'♡'} 좋아요 ${total(p)}</button>${p.authorId===me.id?` <button class="outline" data-pb-delete="${p.id}">내 글 삭제</button>`:''}<div class="cast-comments"><strong>댓글 ${comments(p)}</strong>${(p.replies||[]).map(r=>`<p><b>${escape(r.author)} · ${escape(r.authorType||'캐스트')}</b><span>${escape(r.body)}</span></p>`).join('')}</div><form data-pb-comment="${p.id}" class="cast-comment-form"><input name="body" maxlength="300" aria-label="댓글 입력" placeholder="댓글을 입력해 주세요" required><button class="primary">등록</button></form>`);
  }
  function fields(kind) {
    return `${kind==='lost'?`<label>글 종류<select name="lostType"><option>분실물</option>${window.ParkAuth?.accountRole()==='cast'?'<option>습득물</option>':''}</select></label>`:''}<label>제목<input name="title" maxlength="80" required></label><label>${kind==='missing'?'인상착의':'내용'}<textarea name="body" maxlength="1000" required></textarea></label>${kind==='missing'?'<label>나이<input name="age" type="number" min="0" max="120" required></label><label>성별<select name="gender"><option>여성</option><option>남성</option><option>확인 불가</option></select></label>':''}${['lost','missing'].includes(kind)?`<label>${kind==='missing'?'마지막으로 본 장소':'분실·발견 장소'}<input name="place" maxlength="80" required></label><label>사진 (1MB 이하)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label>`:''}`;
  }
  function write(kind=selected) {
    const tabs=(window.ParkAuth?.role()==='cast'?castTabs:shared).filter(k=>k!=='popular');
    if(!tabs.includes(kind)) kind=tabs[0];
    window.parkModal(`<h2>새 글쓰기</h2><form id="pb-compose" class="pv-board-form"><label>게시판<select name="kind" data-pb-category>${tabs.map(k=>`<option value="${k}" ${kind===k?'selected':''}>${labels[k]}</option>`).join('')}</select></label><div id="pb-fields">${fields(kind)}</div><p class="pb-hint">${escape(actor().name)} · ${actor().type} 유형으로 표시됩니다. 이 브라우저의 두 모드에 함께 저장됩니다.</p><button class="primary" type="submit">게시하기</button></form>`);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.hasAttribute('data-pb-write')) write();
    if(b.dataset.pbKind){ selected=b.dataset.pbKind; query=''; const input=document.querySelector('[data-pb-search]'); if(input) input.value=''; refresh(); }
    if(b.dataset.pbHomeKind){homeKind=b.dataset.pbHomeKind;refresh();}
    if(b.hasAttribute('data-pb-more')){selected=homeKind;query='';searchOpen=false;go('board');}
    if(b.hasAttribute('data-pb-search-toggle')) {
      searchOpen=!searchOpen;
      const panel=document.querySelector('#pb-search-panel');
      panel.hidden=!searchOpen;
      b.setAttribute('aria-expanded',String(searchOpen));
      b.setAttribute('aria-label',searchOpen?'게시글 검색 닫기':'게시글 검색 열기');
      if(searchOpen) panel.querySelector('input').focus();
      else {query='';panel.querySelector('input').value='';refresh();}
    }
    if(b.dataset.pbOpen){ selected=b.dataset.pbOpen; query=''; go('board'); }
    if(b.dataset.pbPost) detail(b.dataset.pbPost);
    if(b.dataset.pbLike){ const p=data.find(p=>p.id===b.dataset.pbLike); if(!p||!allowed(p.kind)) return; const me=actor(); const i=p.likes.findIndex(l=>l.id===me.id); if(i>=0)p.likes.splice(i,1);else p.likes.push({id:me.id,at:Date.now()}); if(persist()){refresh();detail(p.id);} }
    if(b.dataset.pbDelete){ const p=data.find(p=>p.id===b.dataset.pbDelete); if(!p||!allowed(p.kind)||p.authorId!==actor().id)return; data=data.filter(x=>x.id!==p.id); if(persist()){document.querySelector('#modal').close();refresh();} }
  });
  document.addEventListener('input',e=>{if(e.target.hasAttribute('data-pb-search')){query=e.target.value;document.querySelector('#pb-list').innerHTML=cards(selected);}});
  document.addEventListener('change',e=>{if(e.target.hasAttribute('data-pb-category')) document.querySelector('#pb-fields').innerHTML=fields(e.target.value);});
  document.addEventListener('submit',async e=>{
    const form=e.target;
    if(form.id!=='pb-compose' && !form.dataset.pbComment)return;
    e.preventDefault(); const f=new FormData(form); const me=actor(); const body=String(f.get('body')||'').trim();
    if(!body)return window.parkToast('내용을 입력해 주세요.');
    if(form.dataset.pbComment){const p=data.find(p=>p.id===form.dataset.pbComment);if(!p||!allowed(p.kind))return;p.replies.push({author:me.name,authorType:me.type,authorId:me.id,body:body.slice(0,300),createdAt:Date.now()});if(persist()){refresh();detail(p.id);}return;}
    const kind=f.get('kind'), title=String(f.get('title')||'').trim();if(!title||!allowed(kind)||kind==='popular')return window.parkToast('게시판과 제목을 확인해 주세요.');
    const file=f.get('photo'); let photoUrl='';const submit=form.querySelector('[type=submit]');submit.disabled=true;
    try {
      if(file?.size){if(file.size>1000000 || !['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('PNG·JPG·WebP 사진 1MB 이하로 선택해 주세요.');photoUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('사진을 읽지 못했어요.'));r.readAsDataURL(file);});}
      if(!allowed(kind)||actor().id!==me.id)throw Error('계정이 변경되었어요. 다시 작성해 주세요.');
      data.unshift({id:uid(),kind,title:title.slice(0,80),body:body.slice(0,1000),author:me.name,authorType:me.type,authorId:me.id,createdAt:Date.now(),likes:[],replies:[],photoUrl,age:f.get('age')||'',gender:f.get('gender')||'',place:String(f.get('place')||'').trim(),lostType:kind==='lost'?(f.get('lostType')==='습득물'&&window.ParkAuth?.accountRole()==='cast'?'습득물':'분실물'):''});
      if(persist()){selected=kind;query='';document.querySelector('#modal').close();refresh();window.parkToast('글을 등록했어요.');}
    }catch(error){window.parkToast(error.message);}finally{submit.disabled=false;}
  });
  window.addEventListener('storage',e=>{if(e.key===KEY){data=read(KEY,[]);refresh();}});
  setInterval(()=>{if(selected==='popular'&&document.querySelector('.pb-page'))refresh();},60000);
  window.ParkBoards={page,home,write,recent,list,setQuery:value=>{query=value;searchOpen=Boolean(value);},reset:()=>{selected='popular';query='';}};
})();
