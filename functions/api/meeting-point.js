// Cloudflare Pages Function — AI 집합장소 추천 (자유 추천)
// 환경변수: GEMINI_API_KEY
// 경로: /api/meeting-point

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 에버랜드 경계 (대략적인 bbox)
const BOUNDS = { latMin: 37.288, latMax: 37.302, lngMin: 127.195, lngMax: 127.210 };

function inBounds(lat, lng) {
  return lat >= BOUNDS.latMin && lat <= BOUNDS.latMax
      && lng >= BOUNDS.lngMin && lng <= BOUNDS.lngMax;
}

// fallback용 대표 집합장소
const FALLBACK_POINTS = [
  { name: '정문 광장',           lat: 37.2933, lng: 127.2013 },
  { name: '글로벌페어 광장',     lat: 37.2940, lng: 127.2022 },
  { name: '아메리칸어드벤처 광장', lat: 37.2950, lng: 127.1995 },
  { name: '매직랜드 광장',        lat: 37.2965, lng: 127.2010 },
  { name: '주토피아 사파리',      lat: 37.2978, lng: 127.2050 },
];

export async function onRequest(context) {
  const req = context.request;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes(405, { error: 'POST만 허용합니다.' });

  const GEMINI_KEY = context.env.GEMINI_API_KEY || '';
  if (!GEMINI_KEY) return jsonRes(503, { error: 'AI 키가 설정되지 않았어요.' });

  let payload;
  try { payload = await req.json(); } catch { return jsonRes(400, { error: '잘못된 요청이에요.' }); }

  const members = (payload.members || []).slice(0, 20);

  const memberDesc = members.length
    ? members.map(m => `- ${m.name}: 위도 ${m.lat.toFixed(5)}, 경도 ${m.lng.toFixed(5)}`).join('\n')
    : '(위치 정보 없음)';

  const prompt = `에버랜드(경기도 용인시) 내 일행 집합장소를 AI가 자유롭게 추천해 주세요.

[일행 현재 위치]
${memberDesc}

에버랜드 주요 구역:
- 글로벌페어: 위도 37.2940, 경도 127.2022 부근
- 아메리칸어드벤처: 위도 37.2950, 경도 127.1995 부근
- 매직랜드: 위도 37.2965, 경도 127.2010 부근
- 주토피아: 위도 37.2978, 경도 127.2050 부근
- 정문 광장: 위도 37.2933, 경도 127.2013

위 일행들이 모두 모이기 가장 적합한 에버랜드 내 장소를 추천하세요. 광장, 어트랙션 앞, 푸드코트, 화장실 앞 등 구체적인 장소를 자유롭게 선택해도 됩니다.
아래 JSON만 출력하고 다른 텍스트는 절대 출력하지 마세요.
{"name":"<장소 이름, 15자 이내>","lat":<위도, 소수점 4자리>,"lng":<경도, 소수점 4자리>,"reason":"<한 문장 이유, 25자 이내>"}`;

  try {
    const raw = await callGemini(GEMINI_KEY, prompt);
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('JSON 없음');
    const data = JSON.parse(match[0]);
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);
    if (!inBounds(lat, lng)) throw new Error('경계 밖 좌표');
    const point = { id: 'ai', name: String(data.name || 'AI 추천 집합장소').slice(0, 20), lat, lng };
    return jsonRes(200, { point, reason: String(data.reason || '일행 중간 위치예요.').slice(0, 40) });
  } catch {
    // fallback: 무게중심에서 가장 가까운 대표 장소
    const point = members.length ? geoFallback(members) : FALLBACK_POINTS[0];
    return jsonRes(200, { point, reason: '중간 위치에서 가장 가까운 곳을 추천했어요.' });
  }
}

function geoFallback(members) {
  const cx = members.reduce((s, m) => s + m.lat, 0) / members.length;
  const cy = members.reduce((s, m) => s + m.lng, 0) / members.length;
  return FALLBACK_POINTS.reduce((best, p) => {
    const d = (p.lat - cx) ** 2 + (p.lng - cy) ** 2;
    const bd = (best.lat - cx) ** 2 + (best.lng - cy) ** 2;
    return d < bd ? p : best;
  });
}

async function callGemini(key, prompt) {
  const r = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return (d.candidates?.[0]?.content?.parts || []).map(p => p.text).join('').trim();
}

function jsonRes(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
