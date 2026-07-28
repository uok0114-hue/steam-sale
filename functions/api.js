export async function onRequest(context) {
    const url = new URL(context.request.url);
    const type = url.searchParams.get('type') || 'price';

    // [1] 게임 이름으로 스팀에서 검색하여 게임 ID(appid) 찾는 기능
    if (type === 'search') {
        const term = url.searchParams.get('term');
        if (!term) {
            return new Response(JSON.stringify({ error: '검색어를 입력해 주세요.' }), { status: 400 });
        }

        // 1차 시도: 사용자가 입력한 그대로 검색
        let searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=korean&cc=kr`;

        try {
            let response = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            let data = await response.json();

            // 만약 검색 결과가 없고 띄어쓰기가 포함되어 있다면 -> 띄어쓰기를 붙여서 2차 재검색 (예: "팰 월드" -> "팰월드")
            if ((!data.items || data.items.length === 0) && term.includes(' ')) {
                const noSpaceTerm = term.replace(/\s+/g, '');
                const retryUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(noSpaceTerm)}&l=korean&cc=kr`;
                response = await fetch(retryUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                data = await response.json();
            }

            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: '검색 실패' }), { status: 500 });
        }
    }

    // [2] 게임 ID(appid)로 상세 가격 가져오는 기능
    const appid = url.searchParams.get('appid') || '1623730';
    const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=kr`;

    try {
        const response = await fetch(steamUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '가격 조회 실패' }), { status: 500 });
    }
}