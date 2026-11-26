(() => {
  const KEY='parktalk-pets-v1';
  const species=[['panda','판다','#f8f8f1','#272c30'],['capybara','카피바라','#b98b60','#714f38'],['tiger','호랑이','#eab064','#624833'],['penguin','펭귄','#536777','#263947']];
  const byId=Object.fromEntries(species.map(s=>[s[0],s]));
  const items=[['wallCream','크림 벽지','wall',0],['wallMint','민트 벽지','wall',35],['wallBlue','하늘 벽지','wall',35],['floorOak','오크 바닥','floor',0],['floorIvory','아이보리 바닥','floor',30],['bed','포근한 침대','furniture',0],['plant','화분','furniture',0],['sofa','작은 소파','furniture',65],['lamp','스탠드 조명','furniture',45],['hat','노란 모자','hat',0],['glasses','동그란 안경','glasses',55],['necklace','별 목걸이','necklace',45]];
  const itemMap=Object.fromEntries(items.map(x=>[x[0],x]));
  let tab='room', notice='', selectedSpecies='panda', adoptionSelection=null, selectedPetId=null, visitId=null, attendanceFlash=false, attendanceTimer=null, stateTimer=null, noticeUntil=0, lastNotice='', renameOpen=false, renameError='', adoptionError='';
  const defaultFurniturePositions={bed:{x:0,y:56},plant:{x:81,y:55},sofa:{x:0,y:56},lamp:{x:72,y:44}};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const account=()=>window.ParkAuth?.id?.()||'demo';
  const all=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
  const save=(id,s)=>{syncPet(s);const a=all();a[id]=s;localStorage.setItem(KEY,JSON.stringify(a));};
  const fresh=()=>({animal:null,name:'',points:80,owned:['wallCream','floorOak','bed','plant','hat'],wall:'wallCream',floor:'floorOak',furniture:['bed','plant'],furniturePositions:{},hat:'',glasses:'',necklace:'',hunger:74,mood:80,lastStatusAt:Date.now(),attendance:[],friends:[],requests:[],roomX:52});
  const petFields=['animal','name','hat','glasses','necklace','hunger','mood','lastStatusAt','action','actionUntil','sleepUntil','sleepHours','roomX','level','xp','xpDay','xpActions'];
  const petSnapshot=s=>Object.fromEntries(petFields.map(key=>[key,s[key]]));
  const makePet=(animal,name)=>({adoptedAt:Date.now(),id:`pet-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,animal,name,hat:'',glasses:'',necklace:'',hunger:74,mood:80,lastStatusAt:Date.now(),action:'',actionUntil:0,sleepUntil:0,sleepHours:0,roomX:52,level:1,xp:0,xpDay:'',xpActions:[]});
  const adoptionDate=pet=>{
    const idTime=/^pet-(\d{13})-/.exec(String(pet.id||''));
    const stamp=Number(pet.adoptedAt)||Number(idTime?.[1]);
    return stamp&&Number.isFinite(stamp)?new Date(stamp).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'}):'이전 입양 · 날짜 기록 없음';
  };
  function ensurePets(s){
    if(!Number.isFinite(Number(s.points)))s.points=80;
    if(!Array.isArray(s.pets))s.pets=s.animal?[{id:'pet-first',...petSnapshot(s),level:1,xp:0,xpDay:'',xpActions:[]}]:[];
    if(s.pets.length&&!s.activePetId)s.activePetId=s.pets[0].id;
    const active=s.pets.find(p=>p.id===s.activePetId);
    if(active){for(const key of petFields)if(active[key]!==undefined)s[key]=active[key];s.level=clamp(Number(s.level)||1,1,10);s.xp=Number(s.xp)||0;s.xpActions||=[]}
    return s;
  }
  function syncPet(s){const active=s.pets?.find(p=>p.id===s.activePetId);if(active)Object.assign(active,petSnapshot(s))}
  function activatePet(s,id){syncPet(s);const pet=s.pets.find(p=>p.id===id);if(!pet)return false;applyStatusDecay(pet);s.activePetId=id;for(const key of petFields)if(pet[key]!==undefined)s[key]=pet[key];return true}
  const levelGoal=level=>40+level*10;
  function awardXp(s,action){if((s.level||1)>=10)return 0;const day=localDay();if(s.xpDay!==day){s.xpDay=day;s.xpActions=[]}if(s.xpActions.includes(action))return 0;s.xpActions.push(action);s.xp=(s.xp||0)+({feed:10,play:10,pet:5,sleep:10}[action]||0);let levels=0;while(s.level<10&&s.xp>=levelGoal(s.level)){s.xp-=levelGoal(s.level);s.level++;s.points+=20;levels++}if(s.level>=10)s.xp=0;return levels}
  const DAY_MS=24*60*60*1000;
  function applyStatusDecay(s,now=Date.now()){
    const legacy=Number(s.lastCare),previous=Number(s.lastStatusAt);
    const start=Number.isFinite(previous)&&previous>0?previous:Number.isFinite(legacy)&&legacy>0?legacy:now;
    const days=start<=now?Math.floor((now-start)/DAY_MS):0;
    const hunger=clamp((Number.isFinite(Number(s.hunger))?Number(s.hunger):74)-days*10,30,100);
    const mood=clamp((Number.isFinite(Number(s.mood))?Number(s.mood):80)-days*5,30,100);
    const nextTime=start<=now?start+days*DAY_MS:now;
    const changed=s.hunger!==hunger||s.mood!==mood||s.lastStatusAt!==nextTime;
    s.hunger=hunger;s.mood=mood;s.lastStatusAt=nextTime;
    return changed;
  }
  const mine=()=>{const a=all(),id=account(),s=ensurePets(a[id]||fresh());let changed=applyStatusDecay(s);const now=Date.now();
    if(s.action==='sleep'&&!(s.sleepUntil>now)){s.action='';s.sleepUntil=0;changed=true}
    if(s.action&&s.action!=='sleep'&&!(s.actionUntil>now)){s.action='';s.actionUntil=0;changed=true}
    if(changed&&a[id])save(id,s);return s};
  function scheduleView(s){
    const now=Date.now();
    if(notice!==lastNotice){lastNotice=notice;noticeUntil=notice?now+10000:0}
    if(noticeUntil&&now>=noticeUntil){notice='';lastNotice='';noticeUntil=0}
    clearTimeout(stateTimer);
    const deadlines=[noticeUntil,s.action==='sleep'?s.sleepUntil:s.actionUntil].filter(t=>t>now);
    if(deadlines.length)stateTimer=setTimeout(()=>rerender(),Math.min(...deadlines)-now+20);
  }
  const isSleeping=s=>s.action==='sleep'&&s.sleepUntil>Date.now();
  const wearableTypes=['hat','glasses','necklace'];
  const wornLayers=(s,pose='base')=>wearableTypes.filter(type=>s[type]&&(pose!=='sleep'||type==='necklace')&&pose!=='play')
    .map(type=>`<img class="pet-wear-image pet-wear-${type}" src="assets/pets/${type}-v2.png" alt="" aria-hidden="true">`).join('');
  const setAsideItems=(s,pose)=>wearableTypes.filter(type=>s[type]&&(pose==='play'||type!=='necklace')).map(type=>
    `<img class="pet-set-aside pet-set-aside-${type}" src="assets/pets/${type}-v2.png" alt="" aria-hidden="true">`).join('');
  const pandaOutfits=['', 'hat', 'glasses', 'necklace', 'hat-glasses', 'hat-necklace', 'glasses-necklace', 'hat-glasses-necklace'];
  function pandaArt(s={},pose='base'){
    const outfit=['hat','glasses','necklace'].filter(type=>s[type]).join('-');
    const index=Math.max(0,pandaOutfits.indexOf(outfit));
    const x=(index%4)*100/3;
    const y=index<4?0:100;
    const label=byId.panda?.[1]||'판다';
    return `<span class="pet-art pet-atlas pet-pose-${pose}" role="img" aria-label="${label}" style="background-image:url('assets/pets/panda-worn-${pose}.png');background-position:${x}% ${y}%"></span>`;
  }
  function reactionArt(s){
    const states={feed:'0% 0%',play:'100% 0%',sleep:'0% 100%',pet:'100% 100%'};
    const labels={feed:'배불러하는',play:'놀다 지쳐 쉬는',sleep:'웅크려 자는',pet:'기분 좋아하는'};
    if(!states[s.action])return petArt(s.animal,s);
    if(s.animal==='panda')return pandaArt(s,s.action);
    return `<span class="pet-reaction-art pet-art pet-art-${s.animal} pet-pose-${s.action}" role="img" aria-label="${labels[s.action]} ${byId[s.animal]?.[1]||'동물'}" style="background-image:url('assets/pets/${s.animal}-reactions.png');background-position:${states[s.action]}">${wornLayers(s,s.action)}${['sleep','play'].includes(s.action)?setAsideItems(s,s.action):''}</span>`;
  }

  const localDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  function enter(){if(window.ParkAuth?.role?.()!=='cast')return;const s=mine(),day=localDay();if(s.animal&&!byId[s.animal]){s.animal='panda';save(account(),s)}clearTimeout(attendanceTimer);attendanceFlash=false;if(!s.attendance.includes(day)){s.attendance.push(day);s.points+=20;attendanceFlash=true;notice='오늘 출석 완료 · 20포인트 받았어요';save(account(),s);attendanceTimer=setTimeout(()=>{attendanceFlash=false;if(tab==='room')rerender()},3200)}else notice='';tab='room';visitId=null;adoptionSelection=null;selectedPetId=null;renameOpen=false;}
  function petArt(id, s={}){const a=byId[id]||species[0], pale=a[2],dark=a[3], ears=id==='penguin'||id==='parrot'?'':`<ellipse cx="52" cy="37" rx="14" ry="18" fill="${dark}"/><ellipse cx="108" cy="37" rx="14" ry="18" fill="${dark}"/>`;const markings=id==='panda'?`<ellipse cx="60" cy="70" rx="12" ry="17" fill="${dark}"/><ellipse cx="100" cy="70" rx="12" ry="17" fill="${dark}"/>`:id==='tiger'?`<path d="M63 37l6 19m23-19-6 19M47 63l12 7m54-7-12 7" stroke="${dark}" stroke-width="5" stroke-linecap="round"/>`:id==='zebra'?`<path d="M55 39l10 18m40-18L95 57M45 68l15 10m55-10-15 10" stroke="${dark}" stroke-width="6"/>`:'';
    if(id==='panda')return pandaArt(s);
    if(["capybara","tiger","penguin"].includes(id)) return `<span class="pet-art pet-art-${id}" role="img" aria-label="${a[1]}"><img src="assets/pets/${id}.png" alt="" loading="lazy">${wornLayers(s)}</span>`;
    return `<svg class="pet-figure" viewBox="0 0 160 165" role="img" aria-label="${a[1]}"><ellipse cx="80" cy="154" rx="57" ry="8" fill="#6d5942" opacity=".13"/><ellipse cx="79" cy="117" rx="49" ry="34" fill="${pale}" stroke="${dark}" stroke-width="3"/>${ears}<circle cx="80" cy="73" r="51" fill="${pale}" stroke="${dark}" stroke-width="3"/>${markings}<ellipse class="pet-eye" cx="62" cy="76" rx="4" ry="5" fill="#24313a"/><ellipse class="pet-eye" cx="98" cy="76" rx="4" ry="5" fill="#24313a"/><ellipse cx="80" cy="94" rx="5" ry="4" fill="${dark}"/><path d="M70 103q10 10 20 0" fill="none" stroke="${dark}" stroke-width="2.5" stroke-linecap="round"/><circle cx="49" cy="96" r="6" fill="#ec9ba0" opacity=".45"/><circle cx="111" cy="96" r="6" fill="#ec9ba0" opacity=".45"/>${s.hat?'<path d="M43 36q37-43 74 0Z" fill="#ffd65d" stroke="#9c7631" stroke-width="3"/><path d="M34 37h92" stroke="#9c7631" stroke-width="6" stroke-linecap="round"/>':''}${s.glasses?'<g fill="none" stroke="#564a42" stroke-width="3"><circle cx="61" cy="75" r="13"/><circle cx="99" cy="75" r="13"/><path d="M74 72h12"/></g>':''}${s.necklace?'<path d="M54 113q26 28 52 0" fill="none" stroke="#c28a38" stroke-width="4"/><path d="M80 129l4 7-4 6-4-6Z" fill="#e3ab48"/>':''}</svg>`;
  }
  function room(s,readonly=false,editable=false){
    const sleeping=isSleeping(s),onBed=sleeping&&(s.furniture||[]).includes('bed');
    const bed=s.furniturePositions?.bed||defaultFurniturePositions.bed;
    const sleepStyle=onBed?`left:${clamp(Number(bed.x)||0,0,95)+19}%;top:${clamp(Number(bed.y)||56,35,85)+3}%;width:29%;max-width:125px;`:'';
    const names=s.furniture||[];
    const furniture=names.filter(id=>['bed','plant','sofa','lamp'].includes(id)).map(id=>{
      const saved=s.furniturePositions?.[id]||defaultFurniturePositions[id];
      const x=clamp(Number(saved?.x)||0,0,id==='lamp'?73:95),y=clamp(Number(saved?.y)||0,35,85);
      return `<img class="pet-furn pet-${id}${editable?' pet-furn-editable':''}" data-pet-furniture="${id}" src="assets/pets/${id}.png" alt="${itemMap[id][1]}" draggable="false" style="left:${x}%;top:${y}%;right:auto" ${editable?`tabindex="0" role="button" aria-label="${itemMap[id][1]} 위치 이동"`:''}>`;
    }).join('');
    return `<div class="pet-scene ${s.wall||'wallCream'} ${s.floor||'floorOak'}" role="group" aria-label="${esc(s.name)}의 방"><div class="pet-room"><div class="pet-wall-tint" aria-hidden="true"></div><div class="pet-floor-tint" aria-hidden="true"></div>${furniture}<button class="pet-sprite ${s.action?'pet-reacting':''} ${sleeping?'pet-sleeping':''}" style="${sleepStyle}" type="button" ${readonly?'disabled':`data-pet-action="${sleeping?'wake':'pet'}"`} aria-label="${sleeping?'동물 깨우기':'동물 쓰다듬기'}">${reactionArt(s)}${sleeping?'<span class="pet-sleep-z" aria-hidden="true">z Z</span>':''}<span class="pet-bubble" aria-hidden="true">♥</span></button></div></div>`;
  }
  const heading=(s,title)=>`<div class="pet-page-head"><button class="pet-exit" type="button" data-nav="home" aria-label="홈으로 돌아가기">‹</button><div><span class="pet-eyebrow">동물 친구의 하루</span><h1>${title}</h1></div><div class="pet-wallet"><span class="pet-points">✦ ${s.points} P</span>${s.animal?'<button class="pet-demo-points" type="button" data-pet-action="demo-points">+ 시연 포인트</button>':''}</div></div>`;
  const careIcon=type=>{
    const paths={
      feed:'<path d="M5 18h22l-2.2 7a3 3 0 0 1-2.9 2H10.1a3 3 0 0 1-2.9-2L5 18Z"/><path d="M8 18c.8-2.8 2.9-4.4 5.3-3.5 1.5-2.8 5.9-2.8 7.4 0 2.4-.9 4.5.7 5.3 3.5"/><circle cx="11" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="18.5" cy="9" r="1" fill="currentColor" stroke="none"/>',
      play:'<circle cx="16" cy="16" r="11"/><path d="M6.2 10.9c4.4 1.1 7.2 4 8.3 8.6M19.6 5.8c-1.1 5 1.4 8.1 6.6 9.1M8.5 23.5c3.9-3.1 7.6-3.5 12.8-1.3"/>',
      sleep:'<path d="M4 20v7M28 20v7M4 24h24v-5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v5ZM5 17h8a3 3 0 0 1 3 3v4"/><path d="M22 5h6l-6 6h6"/>',
      pet:'<path d="M18 11.5 13.8 8a3.1 3.1 0 0 1 4.4-4.4L18 4l.2-.4A3.1 3.1 0 0 1 22.6 8L18 11.5Z"/><path d="M3 27v-6c0-1.1.9-2 2-2h7.5l2.1 1.6 5.4-3.4a2.2 2.2 0 0 1 2.8 3.4l-5.7 4.5c-.7.6-1.6.9-2.5.9H8M3 27h5v-8"/>'
    };
    return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[type]||''}</svg>`;
  };
  const shopArt=x=>['hat','glasses','necklace'].includes(x[0])?`<img class="pet-shop-image pet-shop-accessory" src="assets/pets/${x[0]}-v2.png" alt="" loading="lazy">`:['bed','plant','sofa','lamp'].includes(x[0])?`<img class="pet-shop-image" src="assets/pets/${x[0]}.png" alt="" loading="lazy">`:`<span class="pet-shop-swatch ${x[0]}" aria-hidden="true">${['wall','floor'].includes(x[2])?'':x[2]==='glasses'?'◎':x[2]==='necklace'?'✦':'⌒'}</span>`;
  const tabs=active=>`<div class="pet-tabs"><button type="button" data-pet-tab="room" class="${active==='room'?'active':''}">내 방</button><button type="button" data-pet-tab="customize" class="${active==='customize'?'active':''}">꾸미기</button><button type="button" data-pet-tab="shop" class="${active==='shop'?'active':''}">상점</button><button type="button" data-pet-tab="friends" class="${active==='friends'?'active':''}">친구 방</button></div>`;
  function render(){const s=mine();scheduleView(s);if(!s.animal)return `${heading(s,'동물 친구 만나기')}<p class="pet-intro">첫 동물 친구를 고르고 이름을 지어주세요. 나중에 다른 동물도 입양할 수 있어요.</p><div class="pet-picks">${species.map(a=>`<button type="button" data-pet-species="${a[0]}" class="pet-pick ${adoptionSelection===a[0]?'active':''}">${petArt(a[0])}<strong>${a[1]}</strong></button>`).join('')}</div>${adoptionSelection?`<form id="pet-adopt-form" class="pet-adopt"><label>친구의 이름<input name="name" maxlength="12" placeholder="이름을 입력해 주세요" required></label><button class="primary" type="submit">${byId[selectedSpecies][1]} 입양하기</button></form>`:''}<p class="pet-footnote">첫 입양과 이름 짓기는 무료예요. 새 동물을 입양하거나 이름을 다시 지을 때는 시연 포인트를 사용해요.</p>`;
    if(visitId){const friend=all()[visitId];if(!friend?.animal){visitId=null}else return `${heading(s,'친구의 방')}<button class="pet-back" data-pet-action="back">‹ 내 방으로</button><p class="pet-intro">${esc(friend.name)}의 방을 구경하고 있어요.</p>${room(friend,true)}<p class="pet-footnote">친구의 방은 구경만 할 수 있어요.</p>`}
    let content='';
    if(tab==='room') content=`<div class="pet-room-stage">${room(s)}<div class="pet-stage-top"><span class="pet-stage-name">${esc(s.name)} <small>${byId[s.animal]?.[1]||'동물 친구'} · Lv.${s.level||1}</small></span>${attendanceFlash?'<span class="pet-stage-attend" role="status">✓ 오늘 출석 완료 · +20P</span>':''}</div><div class="pet-stage-side"><button type="button" data-pet-tab="shop" aria-label="상점으로 이동"><span class="pet-stage-symbol"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13h22l-2-7H7l-2 7Z"/><path d="M5 13c0 3 4 4 5 1 1 3 5 3 6 0 1 3 5 3 6 0 1 3 5 2 5-1M7 16v11h18V16M12 27v-8h8v8"/></svg></span><small>상점</small></button><button type="button" data-pet-tab="customize" aria-label="꾸미기로 이동"><span class="pet-stage-symbol">✿</span><small>꾸미기</small></button><button type="button" data-pet-tab="friends" aria-label="친구 방으로 이동"><span class="pet-stage-symbol"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="16" cy="10" r="5"/><path d="M5 27c0-5.8 4.6-9.5 11-9.5S27 21.2 27 27H5Z"/></svg></span><small>친구 방</small></button><button type="button" data-pet-tab="choose" aria-label="내 동물 목록으로 이동"><span class="pet-stage-symbol"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="12" r="4"/><circle cx="23" cy="13" r="3"/><path d="M3 27c0-5 3-8 8-8s8 3 8 8H3Zm16-7c5-1 9 2 10 7h-6"/></svg></span><small>내 동물</small></button></div><div class="pet-stage-care"><button data-pet-action="feed"><span class="pet-care-icon">${careIcon('feed')}</span>먹이</button><button data-pet-action="play"><span class="pet-care-icon">${careIcon('play')}</span>놀기</button><button data-pet-action="${isSleeping(s)?'wake':'sleep'}"><span class="pet-care-icon">☾</span>${isSleeping(s)?'깨우기':'재우기'}</button><button data-pet-action="pet"><span class="pet-care-icon">${careIcon('pet')}</span>쓰다듬기</button></div></div><div class="pet-status-floor"><div class="pet-status"><div><span>포만감</span><b>${s.hunger}%</b><i style="--value:${s.hunger}%"></i></div><div><span>기분</span><b>${s.mood}%</b><i style="--value:${s.mood}%"></i></div></div><div class="pet-level-progress"><span>Lv.${s.level||1}${s.level>=10?' · 최고 레벨':` · 다음 레벨까지 ${levelGoal(s.level||1)-(s.xp||0)} XP`}</span><i style="--value:${s.level>=10?100:Math.round((s.xp||0)/levelGoal(s.level||1)*100)}%"></i></div></div>`;
    if(tab==='customize')content=`<div class="pet-section-title"><h2>내 방 꾸미기</h2><p>가구를 손가락으로 끌어 옮겨요. 위치는 자동 저장됩니다.</p></div>${room(s,false,true)}<div class="pet-custom-group"><h3>벽지</h3><div>${items.filter(x=>x[2]==='wall'&&s.owned.includes(x[0])).map(x=>`<button data-pet-equip="${x[0]}" class="${s.wall===x[0]?'active':''}">${x[1]}</button>`).join('')}</div><h3>바닥</h3><div>${items.filter(x=>x[2]==='floor'&&s.owned.includes(x[0])).map(x=>`<button data-pet-equip="${x[0]}" class="${s.floor===x[0]?'active':''}">${x[1]}</button>`).join('')}</div><h3>가구 · 눌러서 놓거나 보관</h3><div>${items.filter(x=>x[2]==='furniture'&&s.owned.includes(x[0])).map(x=>`<button data-pet-equip="${x[0]}" class="${s.furniture.includes(x[0])?'active':''}">${x[1]}</button>`).join('')}</div><h3>동물 액세서리</h3><div>${items.filter(x=>['hat','glasses','necklace'].includes(x[2])&&s.owned.includes(x[0])).map(x=>`<button data-pet-equip="${x[0]}" class="${s[x[2]]===x[0]?'active':''}"><img src="assets/pets/${x[0]}-v2.png" alt="">${x[1]}</button>`).join('')}</div></div>`;
    if(tab==='choose'){
      const selectedPet=s.pets?.find(p=>p.id===selectedPetId);
      content=`<div class="pet-section-title"><h2>내 동물 친구들</h2><p>한 번에 한 친구가 방에서 지내요. 새 친구 입양에는 100P가 필요해요.</p></div>
        <div class="pet-picks pet-change-picks">${species.map(a=>{
          const pet=s.pets?.find(p=>p.animal===a[0]);
          const picked=pet?.id===selectedPetId||!pet&&adoptionSelection===a[0];
          return `<button type="button" ${pet?`data-pet-select="${esc(pet.id)}"`:`data-pet-species="${a[0]}"`} class="pet-pick ${pet?.id===s.activePetId?'pet-current':''} ${picked?'pet-selected':''} ${!pet&&picked?'active':''}" aria-pressed="${!!picked}">${petArt(a[0],pet||{})}<strong>${pet?esc(pet.name):a[1]}</strong><small>${pet?`Lv.${pet.level||1} · ${pet.id===s.activePetId?'방에 있음':'보유 중'}`:'새 친구 입양'}</small></button>`;
        }).join('')}</div>
        ${adoptionSelection?`<form id="pet-new-form" class="pet-new-form"><strong>${byId[selectedSpecies]?.[1]||'동물'} 입양하기</strong><p>보유하지 않은 동물을 고르면 이름을 지을 수 있어요.</p><label for="pet-new-name">새 친구 이름</label><input id="pet-new-name" name="name" maxlength="12" placeholder="이름을 입력해 주세요" required><small>${adoptionError?esc(adoptionError):'입양 비용 100P · 최대 4마리'}</small><button type="submit" class="primary" ${s.points<100?'disabled':''}>${byId[selectedSpecies]?.[1]||'동물'} 입양 · 100P</button></form>`:''}
        ${selectedPet?`<section class="pet-selected-info" aria-label="${esc(selectedPet.name)} 정보"><h3>${esc(selectedPet.name)}</h3><dl><div><dt>입양일</dt><dd>${adoptionDate(selectedPet)}</dd></div><div><dt>레벨</dt><dd>Lv.${selectedPet.level||1} / 10</dd></div></dl><div class="pet-selected-actions"><button type="button" data-pet-action="rename" aria-expanded="${renameOpen}" aria-controls="pet-rename-form">이름 변경</button>${selectedPet.id!==s.activePetId?`<button type="button" data-pet-activate="${esc(selectedPet.id)}">이 동물과 지내기</button>`:''}</div></section>`:''}
        ${selectedPet&&renameOpen?`<form id="pet-rename-form" class="pet-rename-form"><div class="pet-rename-heading"><strong>새 이름 짓기</strong><span>변경 시 30P가 사용돼요</span></div><label for="pet-rename-input">동물 이름</label><input id="pet-rename-input" name="name" maxlength="12" value="${esc(selectedPet.name)}" autocomplete="off" required aria-describedby="pet-rename-help${renameError?' pet-rename-error':''}"><p id="pet-rename-help" class="pet-rename-help">1~12자로 입력해 주세요.</p>${renameError?`<p id="pet-rename-error" class="pet-rename-error" role="alert">${esc(renameError)}</p>`:''}<div class="pet-rename-actions"><button type="button" data-pet-action="cancel-rename">취소</button><button type="submit">30P로 변경</button></div></form>`:''}`;
    }
    if(tab==='shop')content=`<div class="pet-section-title"><h2>꾸미기 상점</h2><p>출석 포인트로 아이템을 골라요. 실제 결제는 없어요.</p></div><div class="pet-shop-grid">${items.filter(x=>x[3]>0||['bed','plant','hat'].includes(x[0])).map(x=>`<div class="pet-shop-card"><span class="pet-shop-graphic ${x[2]}">${shopArt(x)}</span><strong>${x[1]}</strong><small>${x[2]==='furniture'?'가구':x[2]==='wall'?'벽지':x[2]==='floor'?'바닥':'액세서리'}</small><button ${s.owned.includes(x[0])&&['hat','glasses','necklace'].includes(x[2])?`data-pet-equip="${x[0]}"`:`data-pet-buy="${x[0]}"`} ${s.owned.includes(x[0])&&!['hat','glasses','necklace'].includes(x[2])?'disabled':''}>${s.owned.includes(x[0])&&['hat','glasses','necklace'].includes(x[2])?(s[x[2]]===x[0]?'벗기':'착용하기'):s.owned.includes(x[0])?'보유 중':`${x[3]} P`}</button></div>`).join('')}</div><p class="pet-footnote">일부 유료 아이템은 실제 결제 기능이 준비된 뒤 추가됩니다.</p>`;
    if(tab==='friends'){const users=all();content=`<div class="pet-section-title"><h2>친구의 방</h2><p>같은 브라우저의 시연 계정끼리 친구 요청과 수락을 체험할 수 있어요.</p></div><div class="pet-friends">${Object.entries(users).filter(([id,x])=>id!==account()&&x.animal).map(([id,x])=>`<div class="pet-friend"><span>${petArt(x.animal)}</span><strong>${esc(x.name)}</strong>${s.friends.includes(id)?`<button data-pet-visit="${esc(id)}">방 구경</button>`:x.requests?.includes(account())?'<small>수락 대기 중</small>':`<button data-pet-request="${esc(id)}">친구 요청</button>`}</div>`).join('')||'<p class="pet-footnote">아직 이 브라우저에서 입양한 다른 계정이 없어요.</p>'}${(s.requests||[]).map(id=>`<div class="pet-request">친구 요청이 도착했어요 <button data-pet-accept="${esc(id)}">수락</button></div>`).join('')}</div>`}
    return `${tab==='choose'?heading(s,'내 동물').replace('data-nav="home" aria-label="홈으로 돌아가기"','data-pet-tab="room" aria-label="동물 방으로 돌아가기"'):heading(s,'동물 친구의 방')}${tab==='room'||tab==='choose'?'':tabs(tab)}${notice && !(tab==='room'&&notice.startsWith('오늘 출석 완료'))?`<p class="pet-notice" role="status">${esc(notice)}</p>`:''}<div class="pet-content">${content}</div>`;
  }
  const rerender=()=>{if(document.querySelector('#view .pet-page'))document.querySelector('#view').innerHTML=`<div class="pet-page">${render()}</div>`};
  function act(type){const s=mine();if(!s.animal)return; if(type==='demo-points'){s.points=Math.min(9999,s.points+200);notice='시연 포인트 200P를 받았어요';save(account(),s);rerender();return} if(type==='back'){visitId=null;tab='room';notice='';rerender();return}if(type==='change'){adoptionSelection=null;selectedPetId=null;renameOpen=false;tab='choose';notice='';rerender();window.scrollTo(0,0);return}
    if(type==='rename'){renameOpen=!renameOpen;adoptionSelection=null;renameError='';rerender();if(renameOpen)document.querySelector('#pet-rename-input')?.focus();return}
    if(type==='cancel-rename'){renameOpen=false;renameError='';rerender();return}
    if(type==='wake'){s.action='';s.sleepUntil=0;s.actionUntil=0;notice='잘 잤어요! 다시 함께 놀아요.';lastNotice='';save(account(),s);rerender();return}
    if(!['feed','play','pet','sleep'].includes(type))return;
    if(isSleeping(s)){notice='지금은 자고 있어요. 깨우기를 눌러주세요.';lastNotice='';rerender();return}
    s.action=type;s.actionUntil=Date.now()+10000;
    if(type==='sleep'){const hours=[1,3,5][Math.floor(Math.random()*3)];s.sleepUntil=Date.now()+hours*3600000;s.actionUntil=0;s.sleepHours=hours}
    lastNotice='';if(type==='feed')s.hunger=Math.min(100,s.hunger+18);if(type==='play'||type==='pet')s.mood=Math.min(100,s.mood+(type==='play'?14:5));if(type==='sleep'){s.mood=Math.min(100,s.mood+9);s.hunger=Math.min(100,s.hunger+4)}s.roomX=52;const levels=awardXp(s,type);notice=levels?`${s.name}가 Lv.${s.level}이 되었어요! 보상 ${levels*20}P를 받았어요.`:({feed:'다 먹었어요! 배가 든든해요.',play:'신나게 놀았더니 조금 지쳤어요!',pet:'쓰다듬으니 좋아해요!',sleep:`${s.sleepHours}시간 동안 포근하게 잘게요. 언제든 깨워주세요.`})[type];save(account(),s);rerender();}
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!document.querySelector('#view .pet-page'))return;if(b.dataset.petSelect){selectedPetId=b.dataset.petSelect;adoptionSelection=null;renameOpen=false;renameError='';rerender()}else if(b.dataset.petActivate){const s=mine();if(activatePet(s,b.dataset.petActivate)){save(account(),s);tab='room';selectedPetId=null;notice=`${s.name}와 함께해요`;rerender();window.scrollTo(0,0)}}else if(b.dataset.petSpecies){selectedSpecies=b.dataset.petSpecies;adoptionSelection=selectedSpecies;selectedPetId=null;renameOpen=false;adoptionError='';rerender()}else if(b.dataset.petTab){tab=b.dataset.petTab;if(tab==='choose'){adoptionSelection=null;selectedPetId=null;renameOpen=false;adoptionError=''}notice='';rerender();window.scrollTo(0,0)}else if(b.dataset.petAction)act(b.dataset.petAction);else if(b.dataset.petEquip){const s=mine(),item=itemMap[b.dataset.petEquip];if(!item||!s.owned.includes(item[0]))return;if(item[2]==='wall'||item[2]==='floor')s[item[2]]=item[0];else if(item[2]==='furniture')s.furniture=s.furniture.includes(item[0])?s.furniture.filter(x=>x!==item[0]):[...s.furniture,item[0]];else s[item[2]]=s[item[2]]===item[0]?'':item[0];save(account(),s);rerender()}else if(b.dataset.petBuy){const s=mine(),item=itemMap[b.dataset.petBuy];if(!item||s.owned.includes(item[0]))return;if(s.points<item[3])return window.parkToast('포인트가 부족해요.');s.points-=item[3];s.owned.push(item[0]);notice=`${item[1]} 구매 완료`;save(account(),s);rerender()}else if(b.dataset.petRequest){const users=all(),target=users[b.dataset.petRequest];if(!target)return;target.requests=[...new Set([...(target.requests||[]),account()])];save(b.dataset.petRequest,target);notice='친구 요청을 보냈어요';rerender()}else if(b.dataset.petAccept){const users=all(),s=mine(),other=users[b.dataset.petAccept];if(!other)return;s.requests=(s.requests||[]).filter(x=>x!==b.dataset.petAccept);s.friends=[...new Set([...s.friends,b.dataset.petAccept])];other.friends=[...new Set([...(other.friends||[]),account()])];save(account(),s);save(b.dataset.petAccept,other);notice='친구가 되었어요';rerender()}else if(b.dataset.petVisit){const s=mine();if(!s.friends.includes(b.dataset.petVisit))return;visitId=b.dataset.petVisit;rerender()}});
  function moveFurniture(el,clientX,clientY,offsetX,offsetY){
    const scene=el.closest('.pet-scene');if(!scene)return;
    const bounds=scene.getBoundingClientRect(),item=el.getBoundingClientRect();
    const x=clamp((clientX-offsetX-bounds.left)/bounds.width*100,0,100-item.width/bounds.width*100);
    const y=clamp((clientY-offsetY-bounds.top)/bounds.height*100,38,95-item.height/bounds.height*100);
    el.style.left=`${x.toFixed(1)}%`;el.style.top=`${y.toFixed(1)}%`;
  }
  function saveFurniturePosition(el){
    const id=el.dataset.petFurniture;if(!itemMap[id])return;
    const s=mine();s.furniturePositions||={};
    s.furniturePositions[id]={x:Number.parseFloat(el.style.left),y:Number.parseFloat(el.style.top)};
    save(account(),s);
  }
  document.addEventListener('pointerdown',e=>{
    if(tab!=='customize')return;
    const el=e.target.closest?.('.pet-furn-editable');
    if(!el||!el.closest('#view .pet-page'))return;
    e.preventDefault();
    const rect=el.getBoundingClientRect(),offsetX=e.clientX-rect.left,offsetY=e.clientY-rect.top;
    const pointerId=e.pointerId;el.classList.add('dragging');el.setPointerCapture?.(pointerId);
    const onMove=event=>{if(event.pointerId===pointerId)moveFurniture(el,event.clientX,event.clientY,offsetX,offsetY)};
    const onEnd=event=>{
      if(event.pointerId!==pointerId)return;
      document.removeEventListener('pointermove',onMove);
      document.removeEventListener('pointerup',onEnd);
      document.removeEventListener('pointercancel',onEnd);
      el.classList.remove('dragging');saveFurniturePosition(el);
    };
    document.addEventListener('pointermove',onMove);
    document.addEventListener('pointerup',onEnd);
    document.addEventListener('pointercancel',onEnd);
  });
  document.addEventListener('keydown',e=>{
    const el=e.target.closest?.('.pet-furn-editable');
    if(tab!=='customize'||!el||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();const step=e.shiftKey?5:2;
    const scene=el.closest('.pet-scene'),bounds=scene.getBoundingClientRect(),item=el.getBoundingClientRect();
    const x=Number.parseFloat(el.style.left),y=Number.parseFloat(el.style.top);
    el.style.left=`${clamp(x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),0,100-item.width/bounds.width*100).toFixed(1)}%`;
    el.style.top=`${clamp(y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0),38,95-item.height/bounds.height*100).toFixed(1)}%`;
    saveFurniturePosition(el);
  });
  document.addEventListener('submit',e=>{if(e.target.id==='pet-new-form'){e.preventDefault();const s=mine(),name=String(new FormData(e.target).get('name')||'').trim();adoptionError=!name||name.length>12?'이름은 1~12자로 입력해 주세요.':s.pets.some(p=>p.animal===selectedSpecies)?'이미 함께 지내는 동물이에요.':s.points<100?'포인트가 부족해요.':'';if(adoptionError){const hint=e.target.querySelector('small');if(hint)hint.textContent=adoptionError;return}const pet=makePet(selectedSpecies,name);s.pets.push(pet);activatePet(s,pet.id);s.points-=100;save(account(),s);tab='room';notice=`${name}와 함께하게 됐어요!`;rerender();window.scrollTo(0,0);return}if(e.target.id==='pet-rename-form'){e.preventDefault();const s=mine(),pet=s.pets?.find(p=>p.id===selectedPetId),name=String(new FormData(e.target).get('name')||'').trim();if(!pet)return;renameError=!name||name.length>12?'이름은 1~12자로 입력해 주세요.':name===pet.name?'현재 이름과 같아요.':s.points<30?'포인트가 부족해요.':'';if(renameError){const error=e.target.querySelector('#pet-rename-error');if(error)error.textContent=renameError;else{const p=document.createElement('p');p.id='pet-rename-error';p.className='pet-rename-error';p.setAttribute('role','alert');p.textContent=renameError;e.target.querySelector('.pet-rename-help')?.after(p)}return}pet.name=name;if(pet.id===s.activePetId)s.name=name;s.points-=30;renameOpen=false;notice='이름을 바꿨어요';save(account(),s);rerender();return}if(e.target.id!=='pet-adopt-form')return;e.preventDefault();const name=String(new FormData(e.target).get('name')||'').trim();if(!name||name.length>12)return;const s=mine();if(s.animal)return;const pet=makePet(selectedSpecies,name);s.pets=[pet];s.activePetId=pet.id;Object.assign(s,petSnapshot(pet));save(account(),s);enter();rerender();window.scrollTo(0,0)});
  window.ParkPets={render:()=>`<div class="pet-page">${render()}</div>`,enter};
})();
