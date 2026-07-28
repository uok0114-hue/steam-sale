export async function onRequest(context) {
    // 클라이언트에서 보낸 appid 값 가져오기 (없으면 기본값 1623730)
    const url = new URL(context.request.url);
    const appid = url.searchParams.get('appid') || '1623730';

    // Cloudflare 서버가 직접 스팀 API를 호출합니다 (서버 대 서버 통신은 CORS 제약이 없음!)
    const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=kr`;

    try {
        const response = await fetch(steamUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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
        return new Response(JSON.stringify({ error: 'Failed to fetch steam data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}