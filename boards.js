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
  let detailContext = null;
  const DETAIL_KEY='parktalk-detail-route';
  const detailRoute=()=>{try{return JSON.parse(sessionStorage.getItem(DETAIL_KEY)||'null');}catch{return null;}};
  const saveDetailRoute=route=>{try{if(route)sessionStorage.setItem(DETAIL_KEY,JSON.stringify(route));else sessionStorage.removeItem(DETAIL_KEY);}catch{}};
  const initialPostRoute = (typeof history !== 'undefined' ? history.state : null) || detailRoute();
  let initialPostId = typeof location !== 'undefined' ? location.hash.match(/^#post\/([a-zA-Z0-9-]+)$/)?.[1] || initialPostRoute?.parkPost : null;
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
  const authorName = p => window.ParkProfiles?.name(p.authorId,p.author) || p.author;
  const avatar = p => window.ParkProfiles?.avatar(p.authorId,p.author) || escape((p.author||'사용자').slice(0,1));
  const total = p => (p.legacyLikes||0)+(p.likes?.length||0);
  const comments = p => (p.legacyComments||0)+(p.replies?.length||0);
  const time = at => at ? new Date(at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '이전 시연 글';
  function list(kind, search='') {
    const q=search.trim().toLowerCase();
    return data.filter(p => allowed(p.kind) && (kind==='popular' ? recent(p)>0 : p.kind===kind) && (!q || [p.title,p.body,authorName(p),p.clothes].join(' ').toLowerCase().includes(q)))
      .sort((a,b) => (kind==='popular' ? recent(b)-recent(a) : 0) || (b.createdAt||0)-(a.createdAt||0) || a.id.localeCompare(b.id));
  }
  function cards(kind) {
    const items=list(kind,query);
    return `<div class="cast-board-list-head"><strong>${labels[kind]} 게시판</strong></div>${kind==='popular'?'<p class="pb-hint">최근 5시간 동안 받은 좋아요 순 · 동률은 최신 글 순</p>':''}${items.length ? items.map(p => `<button class="cast-post-card" data-pb-post="${p.id}"><span class="pb-top"><span class="tag free">${labels[p.kind]}${p.lostType?' · '+escape(p.lostType):''}</span><span class="pb-role">${escape(p.authorType||'캐스트')}</span></span><strong>${escape(p.title)}</strong><span class="cast-post-summary">${escape(p.body||p.clothes)}</span><span class="cast-post-meta"><span>${escape(authorName(p))} · ${time(p.createdAt)}</span><span>♡ ${total(p)} · 댓글 ${comments(p)}</span></span>${kind==='popular'?`<small class="pb-hint">최근 5시간 좋아요 ${recent(p)}</small>`:''}</button>`).join('') : `<div class="cast-empty">${query?'검색 결과가 없어요.':kind==='popular'?'최근 5시간 동안 좋아요를 받은 글이 없어요.':'아직 글이 없어요. 첫 글을 남겨주세요.'}</div>`}`;
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
    return items.length ? items.map(p => `<button class="pb-home-post" data-pb-post="${p.id}"><strong>${escape(p.title)}</strong><span class="pb-home-meta"><span>${escape(authorName(p))} · ${escape(p.authorType || '캐스트')}</span><span>♡ ${total(p)} · 댓글 ${comments(p)}</span></span></button>`).join('') : `<p class="pb-home-empty">${homeKind==='popular'?'최근 5시간 동안 좋아요를 받은 글이 없어요.':'아직 등록된 글이 없어요.'}</p>`;
  }
  function home() {
    return `<section class="card list-card pb-home"><div class="pb-home-heading"><h2 class="section-title">캐스트들의 이야기</h2><button class="pb-more" data-pb-more>더보기 ›</button></div><nav class="cast-board-chips pb-home-tabs" aria-label="홈 게시판 종류">${castTabs.filter(k=>k!=='department').map(k=>`<button data-pb-home-kind="${k}" class="${k===homeKind?'active':''}" aria-pressed="${k===homeKind}">${labels[k]}</button>`).join('')}</nav><div id="pb-home-posts">${homePosts()}</div></section>`;
  }
  function refresh() {
    if(detailContext){paintDetail();return;}
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
    document.querySelectorAll('[data-board-section]').forEach(button=>button.classList.toggle('active',Boolean(root)&&button.dataset.boardSection===selected));
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
  function detailMarkup(p) {
    const me=actor();
    return `<article class="pb-detail pb-detail-page" data-detail-id="${p.id}">
      <header class="pb-detail-toolbar">
        <button type="button" class="pb-detail-back" data-pb-back aria-label="게시글 목록으로 돌아가기"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button>
        <span class="pb-detail-board-name">${labels[p.kind]}${p.kind==='trade'?'':' 게시판'}</span>
        <span aria-hidden="true"></span>
      </header>
      <div class="pb-detail-author">
        <span class="pb-author-avatar">${avatar(p)}</span>
        <div class="pb-detail-author-info"><strong>${escape(authorName(p))}<span class="pb-role">${escape(p.authorType)}</span></strong><time${p.createdAt?` datetime="${new Date(p.createdAt).toISOString()}"`:''}>${time(p.createdAt)}</time></div>
        ${p.authorId===me.id?`<button class="pb-delete" data-pb-delete="${p.id}">삭제</button>`:''}
      </div>
      ${p.lostType && p.lostType!==labels[p.kind]?`<div class="pb-detail-category"><span class="pb-role">${escape(p.lostType)}</span></div>`:''}
      <h1 tabindex="-1">${escape(p.title)}</h1>
      <div class="pb-detail-content"><p class="pb-body">${escape(p.body||p.clothes)}</p>${safePhoto(p.photoUrl)?`<img class="pb-photo" src="${p.photoUrl}" alt="게시글 첨부 사진">`:''}${p.age?`<p class="pb-detail-info">나이·성별 <strong>${escape(p.age)}세 · ${escape(p.gender)}</strong></p>`:''}${p.place?`<p class="pb-detail-info">장소 <strong>${escape(p.place)}</strong></p>`:''}</div><div class="pb-detail-reactions"><button class="pb-like" data-pb-like="${p.id}" aria-pressed="${p.likes.some(l=>l.id===me.id)}">${window.ParkIcons('heart')}<span>좋아요</span><b>${total(p)}</b></button><span class="pb-comment-count">${window.ParkIcons('messages')} 댓글 ${comments(p)}</span></div><section class="pb-comments"><h3>댓글 <span>${comments(p)}</span></h3>${p.replies.length?p.replies.map(r=>`<div class="pb-comment"><span class="pb-author-avatar">${avatar(r)}</span><div><strong>${escape(authorName(r))}<span class="pb-role">${escape(r.authorType||'캐스트')}</span></strong><p>${escape(r.body)}</p><time>${time(r.createdAt)}</time></div></div>`).join(''):`<p class="pb-comment-empty">아직 댓글이 없어요.<br>첫 이야기를 남겨보세요.</p>`}</section><form data-pb-comment="${p.id}" class="pb-comment-compose pb-comment-compact"><label class="pb-sr-only" for="pb-comment-text">댓글 입력</label><input id="pb-comment-text" name="body" maxlength="300" placeholder="댓글을 남겨주세요" autocomplete="off" required><button class="primary" type="submit">등록</button></form></article>`;
  }
  function paintDetail() {
    if(!detailContext)return;
    const {id,root}=detailContext;
    const post=data.find(p=>p.id===id);
    if(!post || !allowed(post.kind)){restoreDetail();window.parkToast('게시글이 삭제되었거나 접근할 수 없어요.');return;}
    const input=root.querySelector('#pb-comment-text');
    const draft=input?.value||'';
    const focusLike=Boolean(document.activeElement?.dataset.pbLike);
    const y=window.scrollY;
    root.innerHTML=detailMarkup(post);
    root.querySelector('#pb-comment-text').value=draft;
    if(focusLike)root.querySelector('[data-pb-like]').focus({preventScroll:true});
    window.scrollTo(0,y);
  }
  function detail(id, push=true) {
    const post=data.find(p=>p.id===id);
    if(!post || !allowed(post.kind))return window.parkToast('게시글이 없거나 접근할 수 없어요.');
    if(detailContext){paintDetail();return;}
    const mode=window.ParkAuth.role();
    const root=document.querySelector(mode==='cast'?'#view':'#visitorApp .pv-main-content');
    if(!root)return;
    const sourceUrl=location.hash.startsWith('#post/')?(mode==='cast'?'#home':'#visitor'):location.hash;
    const saved=document.createDocumentFragment();
    const y=window.scrollY;
    while(root.firstChild)saved.appendChild(root.firstChild);
    detailContext={id,mode,root,saved,y,title:document.title,url:sourceUrl};
    saveDetailRoute({parkPost:id,mode,accountId:window.ParkAuth.id(),sourceUrl,sourceKind:selected});
    root.innerHTML=detailMarkup(post);
    if(push)history.pushState({parkPost:id,mode,hasBack:true,sourceUrl,sourceKind:selected},'',`#post/${id}`);
    document.title=`${post.title} | ParkTalk`;
    window.scrollTo(0,0);
    root.querySelector('h1').focus({preventScroll:true});
  }
  function restoreDetail(replace=false) {
    if(!detailContext)return;
    const context=detailContext;
    detailContext=null;
    saveDetailRoute(null);
    context.root.replaceChildren(context.saved);
    document.title=context.title;
    if(replace)history.replaceState(null,'',context.url||location.pathname);
    refresh();
    window.scrollTo(0,context.y);
  }
  function backFromDetail() {
    if(history.state?.parkPost && history.state.hasBack)history.back();
    else restoreDetail(true);
  }
  function leaveDetail() {
    if(!detailContext)return;
    history.replaceState(null,'',detailContext.url||location.pathname);
    saveDetailRoute(null);
    detailContext=null;
  }
  window.addEventListener('popstate',()=>{
    const route=history.state;
    if(route?.parkPost){
      if(detailContext)restoreDetail();
      if(route.mode!==window.ParkAuth?.role()){history.replaceState(null,'',location.pathname);return;}
      detail(route.parkPost,false);
    }else restoreDetail();
  });
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
    if(b.hasAttribute('data-pb-back')){backFromDetail();return;}
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
    if(b.dataset.pbLike){ const p=data.find(p=>p.id===b.dataset.pbLike); if(!p||!allowed(p.kind)) return; const me=actor(); const i=p.likes.findIndex(l=>l.id===me.id); if(i>=0)p.likes.splice(i,1);else p.likes.push({id:me.id,at:Date.now()}); if(persist()){refresh();} }
    if(b.dataset.pbDelete){ const p=data.find(p=>p.id===b.dataset.pbDelete); if(!p||!allowed(p.kind)||p.authorId!==actor().id)return; data=data.filter(x=>x.id!==p.id); if(persist()){restoreDetail(true);window.parkToast('글을 삭제했어요.');} }
  });
  document.addEventListener('input',e=>{if(e.target.hasAttribute('data-pb-search')){query=e.target.value;document.querySelector('#pb-list').innerHTML=cards(selected);}});
  document.addEventListener('change',e=>{if(e.target.hasAttribute('data-pb-category')) document.querySelector('#pb-fields').innerHTML=fields(e.target.value);});
  document.addEventListener('submit',async e=>{
    const form=e.target;
    if(form.id!=='pb-compose' && !form.dataset.pbComment)return;
    e.preventDefault(); const f=new FormData(form); const me=actor(); const body=String(f.get('body')||'').trim();
    if(!body)return window.parkToast('내용을 입력해 주세요.');
    if(form.dataset.pbComment){const p=data.find(p=>p.id===form.dataset.pbComment);if(!p||!allowed(p.kind))return;p.replies.push({author:me.name,authorType:me.type,authorId:me.id,body:body.slice(0,300),createdAt:Date.now()});if(persist()){form.querySelector('[name=body]').value='';refresh();}return;}
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
  window.ParkBoards={page,home,write,recent,list,leaveDetail,resumeDetail:()=>{
    if(!initialPostId)return;
    const id=initialPostId;initialPostId=null;
    if(initialPostRoute?.accountId && initialPostRoute.accountId!==window.ParkAuth.id()){saveDetailRoute(null);return;}
    const post=data.find(p=>p.id===id);
    if(!post||!allowed(post.kind)){window.parkToast('게시글이 없거나 접근할 수 없어요.');return;}
    selected=initialPostRoute?.sourceKind || post.kind;
    if(window.ParkAuth.role()==='visitor')window.ParkVisitor.openBoard(selected);
    else if(initialPostRoute?.sourceUrl!=='#home')go('board');
    detail(id,false);
    history.replaceState({parkPost:id,mode:window.ParkAuth.role(),hasBack:false},'',`#post/${id}`);
  },currentKind:()=>selected,selectKind:kind=>{selected=kind;query='';searchOpen=false;},setQuery:value=>{query=value;searchOpen=Boolean(value);},reset:()=>{selected='popular';query='';}};
})();
