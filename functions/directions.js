// Cloudflare Pages Function — Naver Directions API 프록시
// 엔드포인트: /directions?start=lng,lat&goal=lng,lat
// Cloudflare Pages 환경변수 설정: NCP_KEY_ID, NCP_KEY_SECRET

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const req = context.request;
  const KEY_ID     = context.env.NCP_KEY_ID;
  const KEY_SECRET = context.env.NCP_KEY_SECRET;

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const { searchParams } = new URL(req.url);
  const start  = searchParams.get('start');
  const goal   = searchParams.get('goal');
  const option = searchParams.get('option') ?? 'traoptimal';

  if (!start || !goal) {
    return new Response(JSON.stringify({ error: 'start, goal 필요' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  const url = `https://maps.apigw.ntruss.com/map-direction/v1/driving`
    + `?start=${start}&goal=${goal}&option=${option}`;

  const res = await fetch(url, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': KEY_ID,
      'X-NCP-APIGW-API-KEY':    KEY_SECRET,
    },
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
