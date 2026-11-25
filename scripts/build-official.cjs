#!/usr/bin/env node
/* 에버랜드 공식 FAQ 원본(official/everland-faq.raw.json)과 이용 안내 페이지 정리본(official/guide-pages.json)을
 * 앱과 서버가 쓰는 official-faq.json으로 변환한다.
 *
 * 사용법: node scripts/build-official.cjs [원본 FAQ 파일 경로]
 *   - 경로를 주면 그 파일을 official/everland-faq.raw.json으로 복사한 뒤 변환한다(최신 FAQ로 갱신할 때).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const rawPath = path.join(root, "official", "everland-faq.raw.json");
const guidePath = path.join(root, "official", "guide-pages.json");
const outPath = path.join(root, "official-faq.json");
const FAQ_URL = "https://www.everland.com/cscenter/faq-list";

// 원본 FAQ의 영어 카테고리 이름을 한국어 화면 이름으로 바꾼다.
const CATEGORY = {
  "Comprehensive usage information": "종합이용안내",
  "App usage": "앱 사용",
  "Smart Reservation": "스마트예약",
  "Zoos": "동물원",
  "Caribbean Bay": "캐리비안베이",
  "Reservation system for disabled passengers": "장애인 탑승예약",
  "Sign Up/Log In": "회원가입/로그인",
  "SOMSANG Membership": "솜사탕멤버십",
  "Regular pass": "정기권",
  "TEAM EVERLAND": "팀에버랜드",
  "Gift cards": "기프트카드",
  "Home Bridge": "홈브리지",
  "Dream Tour": "드림투어",
  "Ecube School": "이큐브스쿨",
};

function decode(text) {
  return String(text || "")
    .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

// 앞쪽 따옴표가 잘려 나간 문장(예: 에버랜드"를 검색) 보정
function fixQuotes(text) {
  return (text.match(/"/g) || []).length % 2 === 1 && !text.startsWith('"') ? `"${text}` : text;
}

function clean(item) {
  let answer = decode(item.a);
  let link = "";
  // 링크만 남은 답변: _blank">https://...
  const linkOnly = answer.match(/^_blank">(https?:\/\/\S+)/);
  if (linkOnly) {
    link = linkOnly[1].replace(/&$/, "");
    answer = `공식 홈페이지에서 실시간으로 확인할 수 있어요: ${link}`;
  }
  // 사이트 운영자용 내부 메모 제거
  answer = answer.replace(/\*?\s*매년 운영상황에 따라 달라질 수 있으므로,?\s*확인 가능한 URL 주소 입력 필요/g, "").trim();
  // 본문에서 링크가 빠진 '바로가기' 문구 정리
  const hadLinkText = /☞|\[자세히 보기/.test(answer);
  answer = answer.replace(/\[자세히 보기\s*☞\]/g, "").replace(/☞\s*[^.。]*?(바로가기|다운로드)/g, "").replace(/\s+/g, " ").trim();
  if (hadLinkText && !link) {
    answer = /아래 링크에서/.test(answer)
      ? answer.replace(/아래 링크에서/, "에버랜드 공식 홈페이지·앱에서")
      : `${answer} 자세한 내용은 에버랜드 공식 홈페이지·앱에서 확인해 주세요.`.trim();
  }
  answer = fixQuotes(answer);
  const question = fixQuotes(decode(item.q).replace(/[/]$/, "").trim());
  // 내용이 없거나 링크 안내 문구만 남은 항목은 버린다.
  const meaningful = answer.replace(/자세한 내용은 에버랜드 공식 홈페이지·앱에서 확인해 주세요\./, "").trim();
  if (!question || meaningful.length < 5) return null;
  if (/^(이큐브스쿨 키즈, 에코 모집은)$/.test(meaningful)) return null;
  return {
    id: item.id,
    cat: CATEGORY[item.cat] || item.cat,
    q: question,
    a: answer,
    date: item.date || "",
    url: link || FAQ_URL,
  };
}

function build(rawFile = rawPath) {
  const raw = JSON.parse(fs.readFileSync(rawFile, "utf8"));
  const guide = JSON.parse(fs.readFileSync(guidePath, "utf8"));
  const seen = new Set();
  const faqItems = (raw.items || []).map(clean).filter(Boolean).filter((item) => {
    const key = `${item.q}|${item.a}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const guideItems = guide.items.map((item) => ({ ...item, a: decode(item.a), q: decode(item.q) }));
  const items = [...guideItems, ...faqItems];
  const categories = [...new Set(items.map((item) => item.cat))];
  return {
    source: "에버랜드 공식 홈페이지 (자주하는 질문·이용 안내 사항·교통정보)",
    fetchedAt: raw.fetchedAt || null,
    count: items.length,
    dropped: (raw.items || []).length - faqItems.length,
    categories,
    items,
  };
}

if (require.main === module) {
  const input = process.argv[2];
  if (input) fs.copyFileSync(path.resolve(input), rawPath);
  const result = build();
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`official-faq.json: ${result.count}개 (공식 FAQ에서 ${result.dropped}개 제외), 카테고리 ${result.categories.length}개`);
}

module.exports = { build, clean };
