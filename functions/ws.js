// 위치 공유는 Firebase Realtime Database로 처리 (visitor.js 참고)
// 이 파일은 사용하지 않음
export async function onRequest() {
  return new Response('Not used', { status: 404 });
}
