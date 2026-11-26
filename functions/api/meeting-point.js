// Cloudflare Pages Function — AI 집합장소 추천
// 환경변수: GEMINI_API_KEY
// 경로: /api/meeting-point

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const req = context.request;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes(405, { error: 'POST만 허용합니다.' });

  const GEMINI_KEY = context.env.GEMINI_API_KEY || '';
  if (!GEMINI_KEY) return jsonRes(503, { error: 'AI 키가 설정되지 않았어요.' });

  let payload;
  try { payload = await req.json(); } catch { return jsonRes(400, { error: '잘못된 요청이에요.' }); }

  const members = (payload.members || []).slice(0, 20);
  const points  = (payload.points  || []).slice(0, 20);
  if (!points.length) return jsonRes(400, { error: '집합장소 목록이 없어요.' });

  const memberDesc = members.length
    ? members.map(m => `- ${m.name}: 위도 ${m.lat.toFixed(5)}, 경도 ${m.lng.toFixed(5)}`).join('\n')
    : '(위치 정보 없음)';

  const pointDesc = points.map(p =>
    `- id: ${p.id}, 이름: ${p.name}, 위도: ${p.lat.toFixed(5)}, 경도: ${p.lng.toFixed(5)}`
  ).join('\n');

  const prompt = `에버랜드 내 일행 집합장소를 추천해 주세요.

[일행 현재 위치]
${memberDesc}

[선택 가능한 집합장소]
${pointDesc}

위 정보를 바탕으로 모든 일행이 이동하기 가장 편리한 집합장소 하나를 선택하고, 아래 JSON만 출력하세요. 다른 텍스트는 절대 출력하지 마세요.
{"id":"<집합장소 id>","reason":"<한 문장 이유, 20자 이내>"}`;

  try {
    const raw = await callGemini(GEMINI_KEY, prompt);
    const match = raw.match(/\{[^}]+\}/);
    if (!match) throw new Error('JSON 파싱 실패');
    const { id, reason } = JSON.parse(match[0]);
    const point = points.find(p => p.id === id) || points[0];
    return jsonRes(200, { point, reason: reason || '중간 위치에 가장 가까워요.' });
  } catch {
    // fallback: 기하학적 무게중심에서 가장 가까운 곳
    const point = members.length ? geoFallback(members, points) : points[0];
    return jsonRes(200, { point, reason: '중간 위치에서 가장 가까운 곳을 추천했어요.' });
  }
}

function geoFallback(members, points) {
  const cx = members.reduce((s, m) => s + m.lat, 0) / members.length;
  const cy = members.reduce((s, m) => s + m.lng, 0) / members.length;
  return points.reduce((best, p) => {
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
        generationConfig: { maxOutputTokens: 128, temperature: 0.2 },
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
