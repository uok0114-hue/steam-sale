export async function onRequest(context) {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || 'price';

  // [1] 게임 이름(한글/영문)으로 스팀에서 검색하여 게임 ID(appid) 찾는 기능
  if (type === 'search') {
    const term = url.searchParams.get('term');
    if (!term) {
      return new Response(JSON.stringify({ error: '검색어를 입력해 주세요.' }), { status: 400 });
    }

    // 스팀 상점의 한글 자동완성/검색 엔드포인트 사용 (l=koreana / cc=KR)
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=koreana&cc=KR`;

    try {
      let response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });
      let data = await response.json();

      // 검색 결과가 없는 경우 띄어쓰기 제거 후 재시도 (예: "사이버 펑크" -> "사이버펑크")
      if ((!data.items || data.items.length === 0) && term.includes(' ')) {
        const noSpaceTerm = term.replace(/\s+/g, '');
        const retryUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(noSpaceTerm)}&l=koreana&cc=KR`;
        response = await fetch(retryUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept-Language': 'ko-KR,ko;q=0.9'
          }
        });
        data = await response.json();
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