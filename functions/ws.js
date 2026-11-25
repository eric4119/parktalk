// Cloudflare Pages Function — WebSocket 위치 공유 허브
// 엔드포인트: /ws?group=ABCDEF&name=홍길동
// Durable Object: LocationHub (그룹 코드마다 1개 인스턴스)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Upgrade',
};

// ── Durable Object ──────────────────────────────────────────────
export class LocationHub {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }

    const url = new URL(request.url);
    const name = decodeURIComponent(url.searchParams.get('name') || '익명').slice(0, 20);

    const [client, server] = Object.values(new WebSocketPair());
    // tag 배열에 name 저장 → webSocketClose 에서 꺼내 씀
    this.state.acceptWebSocket(server, [name]);

    // 현재 접속 중인 멤버 위치 snapshot 전송
    const members = (await this.state.storage.get('members')) || {};
    server.send(JSON.stringify({ type: 'snapshot', members: Object.values(members) }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      const name = this.state.getTags(ws)[0] || '익명';

      if (data.type === 'location' && typeof data.lat === 'number' && typeof data.lng === 'number') {
        const entry = { name, lat: data.lat, lng: data.lng, ts: Date.now() };

        // SQLite KV에 저장 (그룹 내 최신 위치)
        const members = (await this.state.storage.get('members')) || {};
        members[name] = entry;
        await this.state.storage.put('members', members);

        // 같은 그룹의 다른 세션에 브로드캐스트
        const broadcast = JSON.stringify({ type: 'location', ...entry });
        for (const session of this.state.getWebSockets()) {
          if (session !== ws) {
            try { session.send(broadcast); } catch {}
          }
        }
      }
    } catch {}
  }

  async webSocketClose(ws) {
    const name = this.state.getTags(ws)[0];
    if (!name) return;

    // 저장된 위치 삭제
    const members = (await this.state.storage.get('members')) || {};
    delete members[name];
    await this.state.storage.put('members', members);

    // 나감 알림 브로드캐스트
    const broadcast = JSON.stringify({ type: 'leave', name });
    for (const session of this.state.getWebSockets()) {
      try { session.send(broadcast); } catch {}
    }
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
}

// ── Pages Function 핸들러 ────────────────────────────────────────
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const group = url.searchParams.get('group');

  if (!group || !/^[A-Z0-9]{6}$/.test(group)) {
    return new Response('그룹 코드가 올바르지 않아요.', { status: 400 });
  }

  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('WebSocket 연결이 필요해요.', { status: 426 });
  }

  if (!env.LOCATION_HUB) {
    return new Response('위치 공유 서비스가 아직 준비되지 않았어요.', { status: 503 });
  }

  const id = env.LOCATION_HUB.idFromName(group);
  const hub = env.LOCATION_HUB.get(id);

  // DO에 WebSocket 요청 위임
  const doReq = new Request(url.toString(), request);
  return hub.fetch(doReq);
}
