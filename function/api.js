// 게이머들이 자주 사용하는 한글 줄임말 & 영문 게임명 매핑 테이블
const keywordMap = {
  // 몬스터 헌터 시리즈
  "몬헌": "Monster Hunter",
  "몬스터헌터": "Monster Hunter",
  "몬스터 헌터": "Monster Hunter",

  // 사이버펑크 2077
  "사펑": "Cyberpunk 2077",
  "사이버펑크": "Cyberpunk 2077",
  "사이버 펑크": "Cyberpunk 2077",

  // 레드 데드 리뎀션
  "레데리": "Red Dead Redemption",
  "레데리2": "Red Dead Redemption 2",
  "레드데드리뎀션": "Red Dead Redemption",
  "레드 데드 리뎀션": "Red Dead Redemption",

  // 배틀그라운드
  "배그": "PUBG: BATTLEGROUNDS",
  "배틀그라운드": "PUBG: BATTLEGROUNDS",
  "pubg": "PUBG: BATTLEGROUNDS",

  // 엘든 링
  "엘든링": "ELDEN RING",
  "엘든 링": "ELDEN RING",

  // 아크 서바이벌
  "아크": "ARK: Survival",
  "아크서바이벌": "ARK: Survival",
  "아크 서바이벌": "ARK: Survival",

  // GTA 시리즈
  "지티에이": "Grand Theft Auto",
  "gta": "Grand Theft Auto",
  "gta5": "Grand Theft Auto V",

  // 위쳐 시리즈
  "위쳐": "The Witcher",
  "위쳐3": "The Witcher 3",

  // 엘더스크롤 스카이림
  "스카이림": "The Elder Scrolls V: Skyrim",

  // 팰월드
  "팰월드": "Palworld",
  "팔월드": "Palworld",

  // 발더스 게이트
  "발더스": "Baldur's Gate",
  "발더스게이트": "Baldur's Gate",
  "발더스 게이트": "Baldur's Gate",

  // 데이브 더 다이버
  "데다바": "Dave the Diver",
  "데이브더다이버": "Dave the Diver",

  // 갓 오브 워
  "갓옵워": "God of War",
  "갓 오브 워": "God of War",

  // 호그와트 레거시
  "호그와트": "Hogwarts Legacy",

  // 헬다이버즈
  "헬다이버즈": "HELLDIVERS",
  "헬다2": "HELLDIVERS 2"
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || 'price';

  // [1] 게임 이름(한글/줄임말/영문)으로 스팀에서 검색하여 게임 ID(appid) 찾는 기능
  if (type === 'search') {
    const term = url.searchParams.get('term');
    if (!term) {
      return new Response(JSON.stringify({ error: '검색어를 입력해 주세요.' }), { status: 400 });
    }

    const trimmedTerm = term.trim();
    const normalizedKey = trimmedTerm.replace(/\s+/g, '').toLowerCase();

    // 1. 매핑 테이블 검사 (줄임말 / 한글명 -> 스팀 공식 명칭)
    let mappedTerm = null;
    for (const [key, value] of Object.entries(keywordMap)) {
      if (key.replace(/\s+/g, '').toLowerCase() === normalizedKey) {
        mappedTerm = value;
        break;
      }
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    try {
      let data = null;

      // 매핑 단어가 있을 경우 매핑 명칭으로 우선 검색
      if (mappedTerm) {
        const mappedUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(mappedTerm)}&l=koreana&cc=KR`;
        const res = await fetch(mappedUrl, { headers });
        data = await res.json();
      }

      // 매핑으로 결과가 없거나 매핑 단어가 없었던 경우 -> 일반 검색 (1차: 원본 검색어)
      if (!data || !data.items || data.items.length === 0) {
        const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(trimmedTerm)}&l=koreana&cc=KR`;
        const res = await fetch(searchUrl, { headers });
        data = await res.json();
      }

      // [2단계 Fallback] 일반 검색으로도 결과가 없고 띄어쓰기가 포함된 경우 -> 띄어쓰기 제거 재검색
      if ((!data.items || data.items.length === 0) && trimmedTerm.includes(' ')) {
        const noSpaceTerm = trimmedTerm.replace(/\s+/g, '');
        const retryUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(noSpaceTerm)}&l=koreana&cc=KR`;
        const res = await fetch(retryUrl, { headers });
        data = await res.json();
      }

      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: '검색 실패' }), { status: 500 });
    }
  }

  // [2] 게임 ID(appid)로 상세 가격 가져오는 기능
  const appid = url.searchParams.get('appid') || '1623730';
  const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=kr&l=koreana`;

  try {
    const response = await fetch(steamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    });
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '가격 조회 실패' }), { status: 500 });
  }
}