const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 모든 도메인에서의 요청 허용 (CORS 해결)
app.use(cors());
app.use(express.static('.'));

// 1. 한국어/별칭 - App ID 딕셔너리 로드
let gameMap = {};
try {
  const mapData = fs.readFileSync(path.join(__dirname, 'games.json'), 'utf-8');
  gameMap = JSON.parse(mapData);
  console.log(`📚 [하이브리드 매핑] ${Object.keys(gameMap).length}개의 게임 별칭 딕셔너리 로드 완료`);
} catch (e) {
  console.warn('games.json 매핑 파일을 찾을 수 없거나 로드에 실패했습니다.');
}

// 검색어 정규화 함수 (공백 제거, 소문자 변환)
function normalizeString(str) {
  return str.replace(/\s+/g, '').toLowerCase();
}

// 스팀 상세 정보 요청 헬퍼
async function fetchSteamDetails(appId, headers) {
  const detailsUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=kr&l=korean`;
  const response = await axios.get(detailsUrl, { headers, timeout: 7000 });
  const gameData = response.data[appId];
  if (!gameData || !gameData.success) {
    return null;
  }
  return gameData.data;
}

// 📌 스팀 가격 직접 조회 (App ID 기준)
app.get('/api/game/:appId', async (req, res) => {
  const { appId } = req.params;
  
  if (!appId || isNaN(Number(appId))) {
    return res.status(400).json({ error: '올바른 숫자의 App ID를 입력해주세요.' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  try {
    const data = await fetchSteamDetails(appId, headers);

    if (!data) {
      return res.status(404).json({ error: '게임을 찾을 수 없습니다. (존재하지 않거나 해당 지역 미지원)' });
    }

    res.json({
      appId: Number(appId),
      name: data.name,
      headerImage: data.header_image,
      isFree: data.is_free,
      shortDescription: data.short_description || '',
      genres: (data.genres || []).map(g => g.description),
      price: data.is_free ? '무료' : (data.price_overview ? data.price_overview.final_formatted : '가격 정보 없음'),
      initialPrice: data.price_overview ? data.price_overview.initial_formatted : null,
      discountPercent: data.price_overview ? data.price_overview.discount_percent : 0,
      steamLink: `https://store.steampowered.com/app/${appId}`
    });
  } catch (error) {
    console.error('API 호출 중 에러:', error.message);
    res.status(500).json({ error: '스팀 데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
});

// 🔍 하이브리드 검색 API (1단계: 초고속 딕셔너리 매핑 -> 2단계: 숫자 ID -> 3단계: 원격 API 폴백)
app.get('/api/search', async (req, res) => {
  const { name } = req.query;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '검색할 게임 이름을 입력해 주세요.' });
  }

  const rawInput = name.trim();
  const normalizedInput = normalizeString(rawInput);
  console.log(`🔍 [하이브리드 검색] 입력: "${rawInput}" (정규화: "${normalizedInput}")`);

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  let appId = null;
  let suggestions = [];

  // --- 1단계: 로컬 한국어/별칭 매핑 딕셔너리 매칭 ---
  for (const key in gameMap) {
    if (normalizeString(key) === normalizedInput) {
      appId = gameMap[key];
      console.log(`⚡ [1단계 딕셔너리 매칭 성공] 키: "${key}" -> AppID: ${appId}`);
      break;
    }
  }

  // --- 2단계: 숫자인 경우 App ID로 직접 인식 ---
  if (!appId && !isNaN(rawInput)) {
    appId = Number(rawInput);
    console.log(`🔢 [2단계 숫자 AppID 인식] AppID: ${appId}`);
  }

  // --- 3단계: 매핑되지 않은 신규/기타 게임 - 원격 스팀 API 라이브 검색 (storesearch & suggesterservice) ---
  if (!appId) {
    console.log('🌐 [3단계 원격 스팀 API 검색 실행]...');
    
    // 3-1. storesearch API 시도
    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(rawInput)}&l=korean&cc=kr`;
      const searchResponse = await axios.get(searchUrl, { headers, timeout: 5000 });
      const items = searchResponse.data ? searchResponse.data.items : [];

      if (items && items.length > 0) {
        appId = items[0].id;
        suggestions = items.slice(0, 5).map(item => ({
          appId: item.id,
          name: item.name,
          tinyImage: item.tiny_image || item.header_image,
          price: item.price ? (item.price.final / 100).toLocaleString() + '원' : '가격 정보 없음'
        }));
        console.log(`✅ 3차 storesearch 원격 검색 성공 - AppID: ${appId} (${items[0].name})`);
      }
    } catch (e1) {
      console.warn('storesearch 원격 API 시도 실패:', e1.message);
    }

    // 3-2. suggesterservice API 시도 (storesearch 결과 없을 시)
    if (!appId) {
      try {
        const suggestUrl = `https://store.steampowered.com/api/suggesterservice/getsearchpredictions/v1/?search_term=${encodeURIComponent(rawInput)}&cc=KR&l=korean`;
        const suggestResponse = await axios.get(suggestUrl, { headers, timeout: 5000 });
        const predictions = suggestResponse.data?.response?.predictions;

        if (predictions && predictions.length > 0) {
          appId = predictions[0].appid;
          suggestions = predictions.slice(0, 5).map(item => ({
            appId: item.appid,
            name: item.name,
            tinyImage: item.header_image || `https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/${item.appid}/header.jpg`,
            price: '조회 가능'
          }));
          console.log(`✅ 3차 suggesterservice 원격 검색 성공 - AppID: ${appId} (${predictions[0].name})`);
        }
      } catch (e2) {
        console.error('suggesterservice 원격 API 시도 실패:', e2.message);
      }
    }
  }

  if (!appId) {
    return res.status(404).json({ error: `'${rawInput}' 검색 결과를 찾을 수 없습니다. 영문 제목이나 숫자로 App ID를 입력해 보세요.` });
  }

  // 4. 결정된 App ID로 스팀 상세 데이터 리턴
  try {
    const data = await fetchSteamDetails(appId, headers);

    if (!data) {
      return res.status(404).json({ error: '게임 상세 정보(가격/이미지)를 불러오지 못했습니다.' });
    }

    res.json({
      appId: appId,
      name: data.name,
      headerImage: data.header_image,
      isFree: data.is_free,
      shortDescription: data.short_description || '',
      genres: (data.genres || []).map(g => g.description),
      price: data.is_free ? '무료' : (data.price_overview ? data.price_overview.final_formatted : '가격 정보 없음'),
      initialPrice: data.price_overview ? data.price_overview.initial_formatted : null,
      discountPercent: data.price_overview ? data.price_overview.discount_percent : 0,
      steamLink: `https://store.steampowered.com/app/${appId}`,
      suggestions: suggestions
    });

  } catch (error) {
    console.error('게임 데이터 응답 에러:', error.message);
    res.status(500).json({ error: '스팀 게임 데이터를 조회하는 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`🎮 Steam Price Tracker Hybrid Server running on http://localhost:${PORT}`);
});
