// Cloudflare Pages Function — AI 도우미 프록시
// 환경변수: GEMINI_API_KEY (또는 ANTHROPIC_API_KEY)
// 경로: /api/assistant

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM = `당신은 에버랜드 캐스트와 방문객을 돕는 파크톡 앱의 'AI 생활 도우미'입니다.
현재 사용자 모드: {ROLE}.

규칙:
- 한국어로 친근하고 짧게(3~5문장) 답합니다.
- 에버랜드 운영 규정·요금·시간처럼 확인되지 않은 정보는 추측하지 말고 "공식 앱·홈페이지에서 확인해 주세요"라고 말합니다.
- 미아·부상·안전 문제는 가장 먼저 가까운 근무자(캐스트)에게 알리도록 안내합니다.
- 답변 마지막 줄에 [[USED: ]] 를 적습니다.`;

export async function onRequest(context) {
  const req = context.request;

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes(405, { error: 'POST만 허용합니다.' });

  const GEMINI_KEY = context.env.GEMINI_API_KEY || '';
  const ANTHROPIC_KEY = context.env.ANTHROPIC_API_KEY || '';
  if (!GEMINI_KEY && !ANTHROPIC_KEY) {
    return jsonRes(503, { error: 'AI 키가 설정되지 않았어요.', fallback: true });
  }

  let payload;
  try { payload = await req.json(); } catch { return jsonRes(400, { error: '잘못된 요청이에요.' }); }

  const question = String(payload.question || '').trim().slice(0, 200);
  if (!question) return jsonRes(400, { error: '질문을 입력해 주세요.' });

  const role = payload.role === 'cast' ? '캐스트' : '일반 사용자';
  const system = SYSTEM.replace('{ROLE}', role);

  const history = (Array.isArray(payload.history) ? payload.history : [])
    .slice(-6)
    .filter(t => t?.question && t?.answer)
    .flatMap(t => [
      { role: 'user', content: String(t.question).slice(0, 200) },
      { role: 'assistant', content: String(t.answer).slice(0, 800) },
    ]);

  const messages = [...history, { role: 'user', content: question }];

  try {
    const raw = GEMINI_KEY
      ? await callGemini(GEMINI_KEY, system, messages)
      : await callAnthropic(ANTHROPIC_KEY, system, messages);

    const match = raw.match(/\[\[USED:([^\]]*)\]\]\s*$/);
    const answer = (match ? raw.slice(0, match.index) : raw).trim();
    if (!answer) return jsonRes(502, { error: '빈 답변이에요.', fallback: true });
    return jsonRes(200, { answer, source: 'ai', usedPostIds: [], usedOfficial: [] });
  } catch {
    return jsonRes(502, { error: 'AI 응답을 받지 못했어요.', fallback: true });
  }
}

function jsonRes(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function callGemini(key, system, messages) {
  const r = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(20_000),
    }
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  const parts = d.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => !p.thought && p.text).map(p => p.text).join('').trim();
}

async function callAnthropic(key, system, messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: 'claude-haiku-5-5', max_tokens: 500, system, messages }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}
