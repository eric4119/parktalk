/* Shared board data and UI for both modes. Local prototype; server authorization is required for deployment. */
(() => {
  const KEY = 'parktalk-boards-v1';
  const labels = {
    popular: '인기',
    free: '자유',
    trade: '중고 거래',
    question: '질문',
    praise: '칭찬',
    missing: '미아',
    lost: '분실물',
    department: '부서별',
  };
  const shared = ['praise', 'missing', 'lost'];
  const castTabs = ['popular', 'free', 'trade', 'question', ...shared, 'department'];
  const castWriteTabs = ['free', 'trade', 'question', 'lost', 'department'];
  const visitorWriteTabs = ['praise', 'missing', 'lost'];
  const ZONES = [
    '정문 · 글로벌페어',
    '주토피아',
    '아메리칸 어드벤처',
    '매직랜드',
    '유러피언 어드벤처',
    '기타 구역',
  ];
  const ITEM_CATEGORIES = [
    '지갑/카드',
    '휴대폰/전자기기',
    '가방/의류',
    '유모차/아동용품',
    '기타 소지품',
  ];

  const escape = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };
  const isCastMode = () => window.ParkAuth?.role() === 'cast';
  const actor = () => ({
    id: window.ParkAuth?.id() || 'guest-demo',
    name: window.ParkAuth?.name() || '게스트',
    type:
      window.ParkAuth?.id() === 'guest-demo'
        ? '게스트'
        : isCastMode()
          ? '캐스트'
          : '일반 사용자',
  });
  const allowed = (kind) =>
    isCastMode()
      ? Object.keys(labels).includes(kind)
      : shared.includes(kind);
  const writableTabs = () => (isCastMode() ? castWriteTabs : visitorWriteTabs);
  const canWrite = (kind) => writableTabs().includes(kind);
  const uid = () => crypto.randomUUID();
  const getStatus = (post) => post?.status || 'open';

  let selected = 'popular';
  let query = '';
  let homeKind = 'popular';
  let searchOpen = false;
  let lostFilter = 'all';
  let quickLinkTargetId = null;

  let data = read(KEY, null);
  if (!Array.isArray(data)) {
    const kinds = {
      자유게시판: 'free',
      중고거래: 'trade',
      '부서별 게시판': 'department',
      '신규 캐스트': 'question',
      'Q&A': 'question',
    };
    data = read('parktalk-posts', [
      {
        category: '자유게시판',
        title: '오늘 하루도 모두 수고했어요!',
        body: '동료들과 오늘의 이야기를 나눠보세요.',
        author: '시연 캐스트',
      },
      {
        category: '신규 캐스트',
        title: '첫 출근 전에 준비하면 좋은 것들',
        body: '첫 출근 준비물과 궁금한 점을 함께 나눠요.',
        author: '신입 캐스트',
      },
    ])
      .filter((p) => kinds[p.category])
      .map((p) => ({
        ...p,
        id: uid(),
        kind: kinds[p.category],
        authorType: '캐스트',
        authorId: null,
        createdAt: p.createdAt || null,
        legacyLikes: Number(p.likes) || 0,
        likes: [],
        legacyComments: Math.max(0, (Number(p.comments) || 0) - (p.replies?.length || 0)),
        replies: p.replies || [],
      }));

    data.push(
      ...read('parktalk-found-items', []).map((p) => ({
        ...p,
        id: uid(),
        kind: 'lost',
        lostType: '습득물',
        itemCategory: p.itemCategory || '기타 소지품',
        zone: p.zone || '정문 · 글로벌페어',
        storageLocation: p.storageLocation || '정문 손님상담실',
        status: 'open',
        linkedPostId: null,
        author: '캐스트 등록',
        authorType: '캐스트',
        authorId: null,
        createdAt: null,
        likes: [],
        replies: [],
      })),
    );
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      window.parkToast?.('저장 공간이 부족해요. 사진 크기를 줄여주세요.');
      data = read(KEY, []);
      return false;
    }
  };

  const recent = (post, now = Date.now()) =>
    (post.likes || []).filter((l) => l.at > now - 5 * 60 * 60 * 1000 && l.at <= now).length;
  const total = (p) => (p.legacyLikes || 0) + (p.likes?.length || 0);
  const comments = (p) => (p.legacyComments || 0) + (p.replies?.length || 0);
  const time = (at) =>
    at
      ? new Date(at).toLocaleString('ko-KR', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '이전 시연 글';
  const formatEventTime = (raw) => {
    if (!raw) return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return escape(raw);
    return parsed.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const maskContact = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length >= 8) {
      return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
    }
    return '비공개 처리됨';
  };

  function statusBadge(p) {
    const st = getStatus(p);
    if (p.kind === 'lost') {
      if (st === 'resolved') return '<span class="pb-status pb-status--done">인계 완료</span>';
      if (st === 'matched') return '<span class="pb-status pb-status--matched">습득물 연결됨</span>';
      return `<span class="pb-status pb-status--open">${p.lostType === '습득물' ? '보관중' : '찾는중'}</span>`;
    }
    if (p.kind === 'missing') {
      return st === 'resolved'
        ? '<span class="pb-status pb-status--done">인계 완료</span>'
        : '<span class="pb-status pb-status--urgent">긴급 · 찾는중</span>';
    }
    return '';
  }

  function list(kind, search = '') {
    const q = search.trim().toLowerCase();
    return data
      .filter(
        (p) =>
          allowed(p.kind) &&
          (kind === 'popular' ? recent(p) > 0 : p.kind === kind) &&
          (!q ||
            [
              p.title,
              p.body,
              p.clothes,
              p.author,
              p.praiseTarget,
              p.zone,
              p.place,
              p.itemCategory,
              p.storageLocation,
              p.childName,
            ]
              .join(' ')
              .toLowerCase()
              .includes(q)),
      )
      .sort((a, b) => {
        if (kind === 'popular') {
          return recent(b) - recent(a) || (b.createdAt || 0) - (a.createdAt || 0) || a.id.localeCompare(b.id);
        }
        if (kind === 'missing') {
          const openDiff = Number(getStatus(a) === 'resolved') - Number(getStatus(b) === 'resolved');
          if (openDiff !== 0) return openDiff;
        }
        return (b.createdAt || 0) - (a.createdAt || 0) || a.id.localeCompare(b.id);
      });
  }

  function cards(kind) {
    let items = list(kind, query);
    if (kind === 'lost' && lostFilter !== 'all') {
      items = items.filter((p) => {
        if (lostFilter === 'resolved') return getStatus(p) === 'resolved';
        if (lostFilter === '습득물') return p.lostType === '습득물' && getStatus(p) !== 'resolved';
        return (p.lostType || '분실물') === '분실물' && getStatus(p) !== 'resolved';
      });
    }

    const subFilterBar =
      kind === 'lost'
        ? `<div class="pb-subfilters" role="group" aria-label="분실물·습득물 구분">${[
            ['all', '전체'],
            ['분실물', '분실물 신고'],
            ['습득물', '캐스트 습득물'],
            ['resolved', '인계 완료'],
          ]
            .map(
              ([val, text]) =>
                `<button type="button" class="pb-subchip ${lostFilter === val ? 'active' : ''}" data-pb-lost-filter="${val}">${text}</button>`,
            )
            .join('')}</div>`
        : '';

    return `<div class="cast-board-list-head"><strong>${labels[kind]} 게시판</strong></div>${
      kind === 'popular'
        ? '<p class="pb-hint">최근 5시간 동안 받은 좋아요 순 · 동률은 최신 글 순</p>'
        : ''
    }${subFilterBar}${
      items.length
        ? items
            .map((p) => {
              const extraMeta =
                p.kind === 'praise' && p.praiseTarget
                  ? `<span class="pb-card-tag">칭찬 대상: ${escape(p.praiseTarget)}${p.zone ? ' · ' + escape(p.zone) : ''}</span>`
                  : p.kind === 'lost'
                    ? `<span class="pb-card-tag">${escape(p.itemCategory || '소지품')} · ${escape(p.zone || p.place || '구역 미지정')}${
                        p.lostType === '습득물' && p.storageLocation ? ' · 보관: ' + escape(p.storageLocation) : ''
                      }</span>`
                    : p.kind === 'missing'
                      ? `<span class="pb-card-tag">${p.childName ? escape(p.childName) + ' · ' : ''}${
                          p.age ? escape(p.age) + '세 · ' : ''
                        }${escape(p.zone || p.place || '')}</span>`
                      : '';
              return `<button type="button" class="cast-post-card" data-pb-post="${p.id}">
                <span class="pb-top">
                  <span class="pb-badges">
                    <span class="tag free">${labels[p.kind]}${p.lostType ? ' · ' + escape(p.lostType) : ''}</span>
                    ${statusBadge(p)}
                  </span>
                  <span class="pb-role">${escape(p.authorType || '캐스트')}</span>
                </span>
                <strong>${escape(p.title)}</strong>
                ${extraMeta}
                <span class="cast-post-summary">${escape(p.body || p.clothes)}</span>
                <span class="cast-post-meta">
                  <span>${escape(p.author)} · ${time(p.createdAt)}</span>
                  <span>♡ ${total(p)} · 댓글 ${comments(p)}</span>
                </span>
                ${kind === 'popular' ? `<small class="pb-hint">최근 5시간 좋아요 ${recent(p)}</small>` : ''}
              </button>`;
            })
            .join('')
        : `<div class="cast-empty">${
            query
              ? '검색 결과가 없어요.'
              : kind === 'popular'
                ? '최근 5시간 동안 좋아요를 받은 글이 없어요.'
                : '아직 글이 없어요. 첫 글을 남겨주세요.'
          }</div>`
    }`;
  }

  function page(mode, kind) {
    const tabs = mode === 'cast' ? castTabs : shared;
    if (kind) selected = kind;
    if (!tabs.includes(selected)) selected = tabs[0];
    return `<section class="pb-page" data-pb-mode="${mode}">
      <div class="page-head">
        <div>
          <h1>${mode === 'cast' ? '캐스트들의 이야기' : '함께 나누는 이야기'}</h1>
          <p>${mode === 'cast' ? '동료의 일상과 파크의 소식을 나눠요.' : '캐스트와 방문객이 함께 보는 게시판이에요.'}</p>
        </div>
        <div class="pb-actions">
          <button type="button" class="pb-search-toggle" data-pb-search-toggle aria-label="${
            searchOpen ? '게시글 검색 닫기' : '게시글 검색 열기'
          }" aria-expanded="${searchOpen}" aria-controls="pb-search-panel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
          </button>
          <button type="button" class="primary" data-pb-write>＋ 글쓰기</button>
        </div>
      </div>
      <nav class="cast-board-chips" aria-label="게시판 종류">${tabs
        .map(
          (k) =>
            `<button type="button" data-pb-kind="${k}" class="${k === selected ? 'active' : ''}" aria-pressed="${
              k === selected
            }">${labels[k]}</button>`,
        )
        .join('')}</nav>
      <label class="pb-search" id="pb-search-panel" ${searchOpen ? '' : 'hidden'}>
        <span class="pb-sr-only">게시글 검색</span>
        <input type="search" data-pb-search value="${escape(query)}" placeholder="제목, 내용, 물품, 구역, 작성자 검색">
      </label>
      <div id="pb-board-notice">${boardNotice()}</div>
      <div class="cast-board-list" id="pb-list">${cards(selected)}</div>
    </section>`;
  }

  function boardNotice() {
    if (selected === 'missing') {
      return '<div class="pv-missing-help"><strong>미아 발생 시 가까운 캐스트에게 먼저 알려주세요.</strong><a href="tel:0313205050">손님상담실 031-320-5050</a></div>';
    }
    if (selected === 'lost') {
      return '<div class="pv-missing-help"><strong>분실물 신고와 캐스트 습득물이 연결되면 보관 장소가 안내됩니다.</strong><span>습득물 문의: 정문 손님상담실</span></div>';
    }
    return '';
  }

  function homePosts() {
    const items = list(homeKind).slice(0, 4);
    return items.length
      ? items
          .map(
            (p) =>
              `<button type="button" class="pb-home-post" data-pb-post="${p.id}"><strong>${escape(
                p.title,
              )}</strong><span class="pb-home-meta"><span>${escape(p.author)} · ${escape(
                p.authorType || '캐스트',
              )}</span><span>♡ ${total(p)} · 댓글 ${comments(p)}</span></span></button>`,
          )
          .join('')
      : `<p class="pb-home-empty">${
          homeKind === 'popular' ? '최근 5시간 동안 좋아요를 받은 글이 없어요.' : '아직 등록된 글이 없어요.'
        }</p>`;
  }

  function home() {
    return `<section class="card list-card pb-home">
      <div class="pb-home-heading">
        <h2 class="section-title">캐스트들의 이야기</h2>
        <button type="button" class="pb-more" data-pb-more>더보기 ›</button>
      </div>
      <nav class="cast-board-chips pb-home-tabs" aria-label="홈 게시판 종류">${castTabs
        .filter((k) => k !== 'department')
        .map(
          (k) =>
            `<button type="button" data-pb-home-kind="${k}" class="${k === homeKind ? 'active' : ''}" aria-pressed="${
              k === homeKind
            }">${labels[k]}</button>`,
        )
        .join('')}</nav>
      <div id="pb-home-posts">${homePosts()}</div>
    </section>`;
  }

  function refresh() {
    const root = document.querySelector('.pb-page');
    if (root) {
      root.querySelectorAll('[data-pb-kind]').forEach((button) => {
        const active = button.dataset.pbKind === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      root.querySelector('#pb-list').innerHTML = cards(selected);
      root.querySelector('#pb-board-notice').innerHTML = boardNotice();
    }
    const homeRoot = document.querySelector('.pb-home');
    if (homeRoot) {
      homeRoot.querySelectorAll('[data-pb-home-kind]').forEach((button) => {
        const active = button.dataset.pbHomeKind === homeKind;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      homeRoot.querySelector('#pb-home-posts').innerHTML = homePosts();
    }
  }

  const safePhoto = (src) => (/^data:image\/(png|jpeg|webp);base64,/.test(src || '') ? src : '');

  function linkPosts(sourceId, targetId) {
    const a = data.find((x) => x.id === sourceId);
    const b = data.find((x) => x.id === targetId);
    if (!a || !b || a.kind !== 'lost' || b.kind !== 'lost' || a.id === b.id) return false;
    a.linkedPostId = b.id;
    b.linkedPostId = a.id;
    a.status = 'matched';
    b.status = 'matched';
    return persist();
  }

  function unlinkPost(postId) {
    const a = data.find((x) => x.id === postId);
    if (!a) return false;
    const b = a.linkedPostId ? data.find((x) => x.id === a.linkedPostId) : null;
    a.linkedPostId = null;
    if (a.status === 'matched') a.status = 'open';
    if (b) {
      b.linkedPostId = null;
      if (b.status === 'matched') b.status = 'open';
    }
    return persist();
  }

  function resolvePost(postId) {
    const p = data.find((x) => x.id === postId);
    if (!p) return false;
    p.status = 'resolved';
    if (p.linkedPostId) {
      const linked = data.find((x) => x.id === p.linkedPostId);
      if (linked) linked.status = 'resolved';
    }
    return persist();
  }

  function renderStructuredMeta(p) {
    const st = getStatus(p);
    if (p.kind === 'praise') {
      return `<div class="pb-meta-box">
        ${p.praiseTarget ? `<div><span>칭찬 대상</span><strong>${escape(p.praiseTarget)}</strong></div>` : ''}
        ${p.zone ? `<div><span>근무 구역</span><strong>${escape(p.zone)}</strong></div>` : ''}
        ${p.visitDate ? `<div><span>방문 일자</span><strong>${escape(p.visitDate)}</strong></div>` : ''}
      </div>`;
    }
    if (p.kind === 'lost') {
      const isFound = p.lostType === '습득물';
      return `<div class="pb-meta-box">
        <div><span>구분</span><strong>${isFound ? '캐스트 습득물' : '방문객 분실물'}</strong></div>
        <div><span>진행 상태</span><strong>${st === 'resolved' ? '인계 완료' : st === 'matched' ? '습득물 연결됨' : '접수중'}</strong></div>
        ${p.itemCategory ? `<div><span>물품 종류</span><strong>${escape(p.itemCategory)}</strong></div>` : ''}
        ${p.zone || p.place ? `<div><span>구역 · 장소</span><strong>${escape([p.zone, p.place].filter(Boolean).join(' · '))}</strong></div>` : ''}
        ${p.eventTime ? `<div><span>${isFound ? '습득 시각' : '분실 추정 시각'}</span><strong>${formatEventTime(p.eventTime)}</strong></div>` : ''}
        ${isFound && p.storageLocation ? `<div><span>현재 보관 장소</span><strong>${escape(p.storageLocation)}</strong></div>` : ''}
      </div>`;
    }
    if (p.kind === 'missing') {
      const masked = st === 'resolved';
      return `<div class="pb-meta-box">
        <div><span>진행 상태</span><strong>${masked ? '보호자 인계 완료' : '긴급 · 찾는중'}</strong></div>
        ${p.childName ? `<div><span>이름/호칭</span><strong>${escape(p.childName)}</strong></div>` : ''}
        ${p.age || p.gender ? `<div><span>나이 · 성별</span><strong>${escape([p.age ? p.age + '세' : '', p.gender].filter(Boolean).join(' · '))}</strong></div>` : ''}
        ${p.zone || p.place ? `<div><span>마지막 목격 장소</span><strong>${escape([p.zone, p.place].filter(Boolean).join(' · '))}</strong></div>` : ''}
        ${p.eventTime ? `<div><span>마지막 목격 시각</span><strong>${formatEventTime(p.eventTime)}</strong></div>` : ''}
        ${p.guardianContact ? `<div><span>보호자 연락처</span><strong>${masked ? maskContact(p.guardianContact) : escape(p.guardianContact)}</strong></div>` : ''}
      </div>`;
    }
    return '';
  }

  function renderLostLinkSection(p, me) {
    if (p.kind !== 'lost') return '';
    const st = getStatus(p);
    const isCast = isCastMode();
    const isFound = p.lostType === '습득물';
    const linked = p.linkedPostId ? data.find((x) => x.id === p.linkedPostId) : null;

    if (linked) {
      const foundPost = isFound ? p : linked;
      return `<div class="pb-link-box">
        <span class="pb-link-eyebrow">${st === 'resolved' ? '인계 완료된 연결 건' : '캐스트 습득물 연결 완료'}</span>
        <strong>${escape(linked.title)}</strong>
        <p>${escape(linked.lostType || '분실물')} · ${escape([linked.zone, linked.place].filter(Boolean).join(' · '))}</p>
        ${
          foundPost.storageLocation
            ? `<p class="pb-storage-highlight">현재 보관 장소: <strong>${escape(foundPost.storageLocation)}</strong></p>`
            : ''
        }
        <div class="pb-link-actions">
          <button type="button" class="outline" data-pb-post="${linked.id}">연결된 게시글 보기</button>
          ${
            isCast && st !== 'resolved'
              ? `<button type="button" class="primary" data-pb-resolve="${p.id}">인계 완료 처리</button>
                 <button type="button" class="outline" data-pb-unlink="${p.id}">연결 해제</button>`
              : ''
          }
        </div>
      </div>`;
    }

    if (st === 'resolved') {
      return '<div class="pb-link-box"><span class="pb-link-eyebrow">처리 완료</span><strong>인계가 완료된 게시글입니다.</strong></div>';
    }

    if (isCast) {
      const targetType = isFound ? '분실물' : '습득물';
      const candidates = data
        .filter(
          (x) =>
            x.kind === 'lost' &&
            x.id !== p.id &&
            !x.linkedPostId &&
            getStatus(x) === 'open' &&
            (x.lostType || '분실물') === targetType,
        )
        .sort((a, b) => {
          const scoreA = Number(a.itemCategory === p.itemCategory) + Number(a.zone === p.zone);
          const scoreB = Number(b.itemCategory === p.itemCategory) + Number(b.zone === p.zone);
          return scoreB - scoreA || (b.createdAt || 0) - (a.createdAt || 0);
        });

      return `<div class="pb-link-panel">
        <strong>캐스트 ${targetType} 연결</strong>
        <p class="pb-hint">${
          isFound
            ? '이 습득물과 일치하는 방문객 분실물 신고글을 연결해 안내할 수 있어요.'
            : '캐스트가 등록한 습득물과 연결하면 방문객에게 보관 장소가 즉시 표시됩니다.'
        }</p>
        ${
          candidates.length
            ? `<select id="pb-link-select" aria-label="연결할 ${targetType} 선택">${candidates
                .map((c) => {
                  const matchedTag =
                    (c.itemCategory && c.itemCategory === p.itemCategory) || (c.zone && c.zone === p.zone)
                      ? '[추천] '
                      : '';
                  return `<option value="${c.id}">${matchedTag}${escape(c.title)} (${escape(
                    c.zone || c.place || '구역 미지정',
                  )})</option>`;
                })
                .join('')}</select>
               <div class="pb-link-actions">
                 <button type="button" class="primary" data-pb-link="${p.id}">선택한 ${targetType}과 연결하기</button>
                 ${
                   !isFound
                     ? `<button type="button" class="outline" data-pb-quick-found="${p.id}">＋ 새 습득물 등록 후 바로 연결</button>`
                     : ''
                 }
               </div>`
            : `<p class="pb-hint">현재 연결 가능한 open 상태의 ${targetType} 글이 없습니다.</p>
               ${
                 !isFound
                   ? `<button type="button" class="primary" data-pb-quick-found="${p.id}">＋ 새 습득물 등록 후 바로 연결</button>`
                   : ''
               }`
        }
      </div>`;
    }

    if (isFound) {
      const myOpenLost = data.filter(
        (x) =>
          x.kind === 'lost' &&
          (x.lostType || '분실물') === '분실물' &&
          !x.linkedPostId &&
          getStatus(x) === 'open' &&
          x.authorId === me.id,
      );
      if (myOpenLost.length) {
        return `<div class="pb-link-panel">
          <strong>내 분실물 신고글 연결</strong>
          <p class="pb-hint">본인 물건이 맞다면 작성해 둔 분실물 글과 연결할 수 있어요.</p>
          <select id="pb-link-select" aria-label="내 분실물 선택">${myOpenLost
            .map((c) => `<option value="${c.id}">${escape(c.title)}</option>`)
            .join('')}</select>
          <div class="pb-link-actions">
            <button type="button" class="primary" data-pb-link="${p.id}">내 분실물과 연결하기</button>
          </div>
        </div>`;
      }
    }

    return '';
  }

  function detail(id) {
    const p = data.find((x) => x.id === id);
    if (!p || !allowed(p.kind)) {
      return window.parkToast?.('이 게시판은 캐스트만 볼 수 있어요.');
    }
    const me = actor();
    const isAuthor = p.authorId === me.id;
    const isCast = isCastMode();
    const isMissingResolved = p.kind === 'missing' && getStatus(p) === 'resolved';

    const photoHtml = isMissingResolved
      ? '<div class="pb-masked-box">보호자 인계가 완료되어 개인정보 보호를 위해 사진과 연락처가 비공개 처리되었습니다.</div>'
      : safePhoto(p.photoUrl)
        ? `<img class="pb-photo" src="${p.photoUrl}" alt="게시글 첨부 사진">`
        : '';

    const missingResolveBtn =
      p.kind === 'missing' && getStatus(p) !== 'resolved' && (isAuthor || isCast)
        ? ` <button type="button" class="primary" data-pb-resolve="${p.id}">찾음 · 인계 완료</button>`
        : '';

    window.parkModal?.(`
      <div class="pb-detail-top">
        <span class="tag free">${labels[p.kind]}${p.lostType ? ' · ' + escape(p.lostType) : ''}</span>
        ${statusBadge(p)}
      </div>
      <h2>${escape(p.title)}</h2>
      <p class="pb-hint">${escape(p.author)} · ${escape(p.authorType)} · ${time(p.createdAt)}</p>
      ${renderStructuredMeta(p)}
      ${renderLostLinkSection(p, me)}
      ${photoHtml}
      <p class="pb-body">${escape(p.body || p.clothes)}</p>
      <div class="pb-detail-actions">
        <button type="button" class="outline" data-pb-like="${p.id}" aria-pressed="${p.likes.some((l) => l.id === me.id)}">${
          p.likes.some((l) => l.id === me.id) ? '♥' : '♡'
        } 좋아요 ${total(p)}</button>
        ${missingResolveBtn}
        ${isAuthor && canWrite(p.kind) ? `<button type="button" class="outline" data-pb-edit="${p.id}">수정</button>` : ''}
        ${isAuthor ? `<button type="button" class="outline" data-pb-delete="${p.id}">내 글 삭제</button>` : ''}
      </div>
      <div class="cast-comments">
        <strong>댓글 ${comments(p)}</strong>
        ${(p.replies || [])
          .map(
            (r) => `<p>
              <span class="pb-reply-head">
                <b>${escape(r.author)} · ${escape(r.authorType || '캐스트')}</b>
                ${
                  r.authorId === me.id && r.id
                    ? `<button type="button" class="pb-reply-del" data-pb-del-comment="${p.id}:${r.id}">삭제</button>`
                    : ''
                }
              </span>
              <span>${escape(r.body)}</span>
            </p>`,
          )
          .join('')}
      </div>
      <form data-pb-comment="${p.id}" class="cast-comment-form">
        <input name="body" maxlength="300" aria-label="댓글 입력" placeholder="댓글을 입력해 주세요" required>
        <button class="primary" type="submit">등록</button>
      </form>
    `);
  }

  function zoneOptions(selectedZone = '') {
    return ZONES.map(
      (z) => `<option value="${escape(z)}" ${selectedZone === z ? 'selected' : ''}>${escape(z)}</option>`,
    ).join('');
  }

  function itemCategoryOptions(selectedCat = '') {
    return ITEM_CATEGORIES.map(
      (c) => `<option value="${escape(c)}" ${selectedCat === c ? 'selected' : ''}>${escape(c)}</option>`,
    ).join('');
  }

  function fields(kind, preset = {}) {
    if (kind === 'praise') {
      return `
        <label>칭찬 대상 캐스트<input name="praiseTarget" maxlength="40" value="${escape(
          preset.praiseTarget || '',
        )}" placeholder="예: 주토피아 김OO 캐스트" required></label>
        <label>근무 구역<select name="zone">${zoneOptions(preset.zone)}</select></label>
        <label>방문 일자<input name="visitDate" type="date" value="${escape(preset.visitDate || '')}"></label>
        <label>제목<input name="title" maxlength="80" value="${escape(
          preset.title || '',
        )}" placeholder="예: 친절한 안내 덕분에 즐거운 하루 보냈어요" required></label>
        <label>칭찬 내용<textarea name="body" maxlength="1000" placeholder="감사했던 순간을 적어주세요" required>${escape(
          preset.body || '',
        )}</textarea></label>
      `;
    }

    if (kind === 'lost') {
      const isFound = isCastMode();
      return `
        <input type="hidden" name="lostType" value="${isFound ? '습득물' : '분실물'}">
        <p class="pb-hint">${isFound ? '캐스트 습득물 등록 양식입니다.' : '방문객 분실물 신고 양식입니다.'}</p>
        <label>물품 종류<select name="itemCategory">${itemCategoryOptions(preset.itemCategory)}</select></label>
        <label>제목<input name="title" maxlength="80" value="${escape(
          preset.title || '',
        )}" placeholder="${isFound ? '예: [습득] 검정색 카드지갑 보관중' : '예: 검정색 카드지갑 분실'}" required></label>
        <label>구역 선택<select name="zone">${zoneOptions(preset.zone)}</select></label>
        <label>${isFound ? '습득 세부 장소' : '분실 세부 장소'}<input name="place" maxlength="80" value="${escape(
          preset.place || '',
        )}" placeholder="예: 티익스프레스 대기줄 입구 인근" required></label>
        <label>${isFound ? '습득 시각' : '분실 추정 시각'}<input name="eventTime" type="datetime-local" value="${escape(
          preset.eventTime || '',
        )}"></label>
        ${
          isFound
            ? `<label>현재 보관 장소 (필수)<input name="storageLocation" maxlength="80" value="${escape(
                preset.storageLocation || '',
              )}" placeholder="예: 정문 손님상담실 유실물 보관함" required></label>`
            : ''
        }
        <label>물품 특징 및 내용<textarea name="body" maxlength="1000" placeholder="색상, 브랜드, 케이스 등 특징을 적어주세요" required>${escape(
          preset.body || '',
        )}</textarea></label>
        <label>사진 (1MB 이하)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label>
      `;
    }

    if (kind === 'missing') {
      return `
        <label>미아 이름 또는 호칭<input name="childName" maxlength="30" value="${escape(
          preset.childName || '',
        )}" placeholder="예: 민준이 (또는 노란 모자 어린이)" required></label>
        <label>나이<input name="age" type="number" min="0" max="120" value="${escape(preset.age || '')}" required></label>
        <label>성별<select name="gender">
          <option ${preset.gender === '여성' ? 'selected' : ''}>여성</option>
          <option ${preset.gender === '남성' ? 'selected' : ''}>남성</option>
          <option ${preset.gender === '확인 불가' ? 'selected' : ''}>확인 불가</option>
        </select></label>
        <label>제목<input name="title" maxlength="80" value="${escape(
          preset.title || '',
        )}" placeholder="예: 주토피아 인근 6세 남아를 찾습니다" required></label>
        <label>인상착의 및 특징<textarea name="body" maxlength="1000" placeholder="상의, 하의, 신발 색상 및 특징을 적어주세요" required>${escape(
          preset.body || preset.clothes || '',
        )}</textarea></label>
        <label>마지막 목격 구역<select name="zone">${zoneOptions(preset.zone)}</select></label>
        <label>마지막 목격 세부 장소<input name="place" maxlength="80" value="${escape(
          preset.place || '',
        )}" placeholder="예: 회전목마 앞 분수대" required></label>
        <label>마지막 목격 시각<input name="eventTime" type="datetime-local" value="${escape(
          preset.eventTime || '',
        )}"></label>
        <label>보호자 연락처<input name="guardianContact" type="tel" maxlength="30" value="${escape(
          preset.guardianContact || '',
        )}" placeholder="예: 010-1234-5678 (찾음 완료 시 자동 비공개)" required></label>
        <label>최근 사진 (1MB 이하)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label>
      `;
    }

    return `
      <label>제목<input name="title" maxlength="80" value="${escape(preset.title || '')}" required></label>
      <label>내용<textarea name="body" maxlength="1000" required>${escape(preset.body || '')}</textarea></label>
    `;
  }

  function composeOptionLabel(k) {
    if (k === 'lost' && isCastMode()) return '습득물 (분실물 게시판)';
    return labels[k];
  }

  function write(kind = selected, preset = {}, editId = null) {
    const tabs = writableTabs();
    if (!tabs.includes(kind)) kind = tabs[0];
    const editing = Boolean(editId);
    window.parkModal?.(`
      <h2>${editing ? '게시글 수정' : isCastMode() ? '캐스트 글쓰기' : '방문객 글쓰기'}</h2>
      <form id="pb-compose" class="pv-board-form" ${editId ? `data-pb-edit-id="${editId}"` : ''}>
        <label>게시판<select name="kind" data-pb-category ${editing ? 'disabled' : ''}>${tabs
          .map((k) => `<option value="${k}" ${kind === k ? 'selected' : ''}>${composeOptionLabel(k)}</option>`)
          .join('')}</select></label>
        ${editing ? `<input type="hidden" name="kind" value="${kind}">` : ''}
        <div id="pb-fields">${fields(kind, preset)}</div>
        <p class="pb-hint">${escape(actor().name)} · ${actor().type} 유형으로 표시됩니다. 이 브라우저의 두 모드에 함께 저장됩니다.</p>
        <button class="primary" type="submit">${editing ? '수정 완료' : '게시하기'}</button>
      </form>
    `);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-pb-write')) {
      quickLinkTargetId = null;
      write();
    }
    if (b.dataset.pbKind) {
      selected = b.dataset.pbKind;
      query = '';
      lostFilter = 'all';
      const input = document.querySelector('[data-pb-search]');
      if (input) input.value = '';
      refresh();
    }
    if (b.dataset.pbLostFilter) {
      lostFilter = b.dataset.pbLostFilter;
      refresh();
    }
    if (b.dataset.pbHomeKind) {
      homeKind = b.dataset.pbHomeKind;
      refresh();
    }
    if (b.hasAttribute('data-pb-more')) {
      selected = homeKind;
      query = '';
      searchOpen = false;
      go('board');
    }
    if (b.hasAttribute('data-pb-search-toggle')) {
      searchOpen = !searchOpen;
      const panel = document.querySelector('#pb-search-panel');
      panel.hidden = !searchOpen;
      b.setAttribute('aria-expanded', String(searchOpen));
      b.setAttribute('aria-label', searchOpen ? '게시글 검색 닫기' : '게시글 검색 열기');
      if (searchOpen) panel.querySelector('input').focus();
      else {
        query = '';
        panel.querySelector('input').value = '';
        refresh();
      }
    }
    if (b.dataset.pbOpen) {
      selected = b.dataset.pbOpen;
      query = '';
      go('board');
    }
    if (b.dataset.pbPost) detail(b.dataset.pbPost);
    if (b.dataset.pbLike) {
      const p = data.find((x) => x.id === b.dataset.pbLike);
      if (!p || !allowed(p.kind)) return;
      const me = actor();
      const i = p.likes.findIndex((l) => l.id === me.id);
      if (i >= 0) p.likes.splice(i, 1);
      else p.likes.push({ id: me.id, at: Date.now() });
      if (persist()) {
        refresh();
        detail(p.id);
      }
    }
    if (b.dataset.pbEdit) {
      const p = data.find((x) => x.id === b.dataset.pbEdit);
      if (!p || !canWrite(p.kind) || p.authorId !== actor().id) return;
      quickLinkTargetId = null;
      write(p.kind, p, p.id);
    }
    if (b.dataset.pbDelete) {
      const p = data.find((x) => x.id === b.dataset.pbDelete);
      if (!p || !allowed(p.kind) || p.authorId !== actor().id) return;
      unlinkPost(p.id);
      data = data.filter((x) => x.id !== p.id);
      if (persist()) {
        document.querySelector('#modal')?.close();
        refresh();
        window.parkToast?.('내 글을 삭제했어요.');
      }
    }
    if (b.dataset.pbDelComment) {
      const [postId, replyId] = b.dataset.pbDelComment.split(':');
      const p = data.find((x) => x.id === postId);
      if (!p || !allowed(p.kind)) return;
      const me = actor();
      const idx = (p.replies || []).findIndex((r) => r.id === replyId && r.authorId === me.id);
      if (idx < 0) return;
      p.replies.splice(idx, 1);
      if (persist()) {
        refresh();
        detail(p.id);
      }
    }
    if (b.dataset.pbLink) {
      const targetId = document.querySelector('#pb-link-select')?.value;
      if (!targetId) return window.parkToast?.('연결할 게시글을 선택해 주세요.');
      const source = data.find((x) => x.id === b.dataset.pbLink);
      const target = data.find((x) => x.id === targetId);
      if (!source || !target) return;
      const me = actor();
      const allowedLink =
        isCastMode() || (source.lostType === '습득물' && target.authorId === me.id);
      if (!allowedLink) return window.parkToast?.('연결 권한이 없습니다.');
      if (linkPosts(source.id, target.id)) {
        refresh();
        detail(source.id);
        window.parkToast?.('분실물과 습득물을 연결했어요.');
      }
    }
    if (b.dataset.pbUnlink) {
      if (!isCastMode()) return window.parkToast?.('캐스트만 연결을 해제할 수 있어요.');
      if (unlinkPost(b.dataset.pbUnlink)) {
        refresh();
        detail(b.dataset.pbUnlink);
        window.parkToast?.('연결을 해제했어요.');
      }
    }
    if (b.dataset.pbResolve) {
      const p = data.find((x) => x.id === b.dataset.pbResolve);
      if (!p) return;
      const me = actor();
      const allowedResolve = isCastMode() || (p.kind === 'missing' && p.authorId === me.id);
      if (!allowedResolve) return window.parkToast?.('완료 처리 권한이 없습니다.');
      if (resolvePost(p.id)) {
        refresh();
        detail(p.id);
        window.parkToast?.(
          p.kind === 'missing'
            ? '인계 완료 처리되었으며 개인정보가 비공개로 전환되었어요.'
            : '인계 완료 상태로 변경했어요.',
        );
      }
    }
    if (b.dataset.pbQuickFound) {
      if (!isCastMode()) return;
      const lostPost = data.find((x) => x.id === b.dataset.pbQuickFound);
      if (!lostPost) return;
      quickLinkTargetId = lostPost.id;
      write('lost', {
        lostType: '습득물',
        itemCategory: lostPost.itemCategory || '기타 소지품',
        zone: lostPost.zone || '정문 · 글로벌페어',
        place: lostPost.place || '',
        title: `[습득] ${lostPost.title}`,
      });
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.hasAttribute('data-pb-search')) {
      query = e.target.value;
      const listEl = document.querySelector('#pb-list');
      if (listEl) listEl.innerHTML = cards(selected);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.hasAttribute('data-pb-category')) {
      quickLinkTargetId = null;
      document.querySelector('#pb-fields').innerHTML = fields(e.target.value);
    }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (form.id !== 'pb-compose' && !form.dataset.pbComment) return;
    e.preventDefault();
    const f = new FormData(form);
    const me = actor();
    const body = String(f.get('body') || '').trim();
    if (!body) return window.parkToast?.('내용을 입력해 주세요.');

    if (form.dataset.pbComment) {
      const p = data.find((x) => x.id === form.dataset.pbComment);
      if (!p || !allowed(p.kind)) return;
      p.replies.push({
        id: uid(),
        author: me.name,
        authorType: me.type,
        authorId: me.id,
        body: body.slice(0, 300),
        createdAt: Date.now(),
      });
      if (persist()) {
        refresh();
        detail(p.id);
      }
      return;
    }

    const editId = form.dataset.pbEditId || null;
    const existing = editId ? data.find((x) => x.id === editId) : null;
    const kind = existing ? existing.kind : f.get('kind');
    const title = String(f.get('title') || '').trim();
    if (!title || !canWrite(kind)) {
      return window.parkToast?.('현재 모드에서는 작성할 수 없는 게시판이에요.');
    }

    const file = f.get('photo');
    let photoUrl = existing?.photoUrl || '';
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;

    try {
      if (file?.size) {
        if (file.size > 1000000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
          throw Error('PNG·JPG·WebP 사진 1MB 이하로 선택해 주세요.');
        }
        photoUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = () => reject(Error('사진을 읽지 못했어요.'));
          r.readAsDataURL(file);
        });
      }
      if (!canWrite(kind) || actor().id !== me.id) {
        throw Error('계정 모드가 변경되었어요. 다시 작성해 주세요.');
      }

      const isFound = kind === 'lost' && isCastMode();
      const extraFields = {
        praiseTarget: kind === 'praise' ? String(f.get('praiseTarget') || '').trim().slice(0, 40) : '',
        visitDate: kind === 'praise' ? String(f.get('visitDate') || '').trim() : '',
        itemCategory: kind === 'lost' ? String(f.get('itemCategory') || '기타 소지품').trim() : '',
        zone: ['praise', 'lost', 'missing'].includes(kind) ? String(f.get('zone') || '').trim() : '',
        eventTime: ['lost', 'missing'].includes(kind) ? String(f.get('eventTime') || '').trim() : '',
        storageLocation: isFound ? String(f.get('storageLocation') || '').trim().slice(0, 80) : '',
        childName: kind === 'missing' ? String(f.get('childName') || '').trim().slice(0, 30) : '',
        guardianContact: kind === 'missing' ? String(f.get('guardianContact') || '').trim().slice(0, 30) : '',
        age: kind === 'missing' ? f.get('age') || '' : '',
        gender: kind === 'missing' ? f.get('gender') || '' : '',
        place: ['lost', 'missing'].includes(kind) ? String(f.get('place') || '').trim().slice(0, 80) : '',
        lostType: kind === 'lost' ? (isFound ? '습득물' : '분실물') : '',
      };

      if (existing) {
        if (existing.authorId !== me.id) throw Error('본인 글만 수정할 수 있어요.');
        Object.assign(existing, {
          title: title.slice(0, 80),
          body: body.slice(0, 1000),
          photoUrl,
          ...extraFields,
        });
        if (persist()) {
          document.querySelector('#modal')?.close();
          refresh();
          detail(existing.id);
          window.parkToast?.('글을 수정했어요.');
        }
      } else {
        const newPost = {
          id: uid(),
          kind,
          title: title.slice(0, 80),
          body: body.slice(0, 1000),
          author: me.name,
          authorType: me.type,
          authorId: me.id,
          createdAt: Date.now(),
          likes: [],
          replies: [],
          photoUrl,
          status: ['lost', 'missing'].includes(kind) ? 'open' : null,
          linkedPostId: null,
          ...extraFields,
        };
        data.unshift(newPost);

        const targetToLink = quickLinkTargetId;
        quickLinkTargetId = null;
        if (targetToLink && isFound) {
          linkPosts(newPost.id, targetToLink);
        }

        if (persist()) {
          selected = kind;
          query = '';
          lostFilter = 'all';
          document.querySelector('#modal')?.close();
          refresh();
          if (targetToLink && isFound) {
            detail(targetToLink);
            window.parkToast?.('습득물을 등록하고 분실물과 연결했어요.');
          } else {
            window.parkToast?.('글을 등록했어요.');
          }
        }
      }
    } catch (error) {
      window.parkToast?.(error.message);
    } finally {
      submit.disabled = false;
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      data = read(KEY, []);
      refresh();
    }
  });
  setInterval(() => {
    if (selected === 'popular' && document.querySelector('.pb-page')) refresh();
  }, 60000);

  // AI 도우미용 게시판 검색. 현재 모드에서 볼 수 있는 글만, 제목·본문·댓글을 함께 본다.
  const PARTICLES = /(으로|에서|에게|까지|부터|이랑|하고|이에요|예요|은|는|이|가|을|를|에|의|도|로|와|과|요|야|나|좀)$/;
  const GENERIC = new Set(['어떻게','어디','어디서','뭐야','무엇','알려줘','알려주세요','궁금','궁금해','있어','있나','있나요','있어요','하나요','해요','되나요','어떤','누가','언제','왜']);
  function stems(text) {
    return [...new Set(String(text || '').toLowerCase().split(/[^0-9a-z가-힣]+/).map(w => {
      let s = w;
      for (let i = 0; i < 2; i++) s = s.replace(PARTICLES, '');
      return s;
    }).filter(s => s.length >= 2 && !GENERIC.has(s)))];
  }
  function search(question, limit = 3) {
    const words = stems(question);
    if (!words.length) return [];
    return data.filter(p => allowed(p.kind)).map(p => {
      const title = String(p.title || '').toLowerCase(), body = String(p.body || p.clothes || '').toLowerCase();
      const replies = (p.replies || []).map(r => String(r.body || ''));
      let score = 0, hits = 0;
      for (const w of words) {
        let hit = false;
        if (title.includes(w)) { score += 3; hit = true; }
        if (body.includes(w)) { score += 2; hit = true; }
        if (replies.some(r => r.toLowerCase().includes(w))) { score += 2; hit = true; }
        if (hit) hits++;
      }
      return { p, score, hits };
    }).filter(x => x.score >= 3 && x.hits >= (words.length >= 4 ? 2 : 1))
      .sort((a, b) => b.score - a.score || (b.p.createdAt || 0) - (a.p.createdAt || 0))
      .slice(0, limit)
      .map(({ p }) => ({
        id: p.id, kind: p.kind, board: `${labels[p.kind]} 게시판`,
        title: String(p.title || '').slice(0, 80), body: String(p.body || p.clothes || '').slice(0, 400),
        author: p.author, authorType: p.authorType || '캐스트', createdAt: p.createdAt || null,
        replies: (p.replies || []).slice(-5).map(r => ({ author: r.author, authorType: r.authorType || '', body: String(r.body || '').slice(0, 200) })),
      }));
  }

  window.ParkBoards = {
    page,
    home,
    write,
    detail,
    recent,
    list,
    linkPosts,
    resolvePost,
    search,
    setQuery: (value) => {
      query = value;
      searchOpen = Boolean(value);
    },
    reset: () => {
      selected = 'popular';
      query = '';
      lostFilter = 'all';
    },
  };
})();
