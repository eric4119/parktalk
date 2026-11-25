// Cloudflare Pages Function — 파크 데이터 (기본값 반환)
// 관리자가 등록한 데이터는 Cloudflare 환경에서 사용 불가 → 클라이언트가 park-data.js 기본값 사용
// 경로: /api/park-data

export async function onRequest() {
  return new Response(JSON.stringify({}), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
