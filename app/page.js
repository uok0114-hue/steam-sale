'use client';

import { useState, useRef } from 'react';
import gamesMap from '../games.json';

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  // 🔍 실시간 연관 검색어 도출 (캡처 1.png 스타일: 썸네일 + 제목 + 실시간 가격)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    const trimmed = value.trim();
    if (!trimmed || trimmed.length < 1) {
      setSuggestions([]);
      return;
    }

    const normInput = trimmed.replace(/\s+/g, '').toLowerCase();
    const localMatches = [];
    const seenAppIds = new Set();

    for (const key in gamesMap) {
      const normKey = key.replace(/\s+/g, '').toLowerCase();
      if (normKey.includes(normInput) || normInput.includes(normKey)) {
        const appId = gamesMap[key];
        if (!seenAppIds.has(appId)) {
          seenAppIds.add(appId);
          localMatches.push({
            appId: appId,
            name: key,
            tinyImage: `https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/${appId}/header.jpg`,
            price: '가격 조회 가능'
          });
        }
      }
    }

    setSuggestions(localMatches.slice(0, 7));
  };

  // 🔍 App ID 매핑 헬퍼
  const findAppIdFromInput = (input) => {
    const raw = input.trim();
    if (!isNaN(Number(raw))) {
      return Number(raw);
    }

    const normInput = raw.replace(/\s+/g, '').toLowerCase();

    // 1. Exact Match
    for (const key in gamesMap) {
      if (key.replace(/\s+/g, '').toLowerCase() === normInput) {
        return gamesMap[key];
      }
    }

    // 2. Partial Substring Match
    for (const key in gamesMap) {
      const normKey = key.replace(/\s+/g, '').toLowerCase();
      if (normKey.includes(normInput) || normInput.includes(normKey)) {
        return gamesMap[key];
      }
    }

    return null;
  };

  // 🌐 CORS 100% 우회 스팀 API 호출 헬퍼
  const fetchSteamApiWithCorsBypass = async (appId) => {
    const steamTargetUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=kr&l=korean`;
    
    // 1차 시도: corsproxy.io
    try {
      const proxy1 = `https://corsproxy.io/?${encodeURIComponent(steamTargetUrl)}`;
      const res1 = await fetch(proxy1);
      if (res1.ok) {
        const json1 = await res1.json();
        if (json1 && json1[appId] && json1[appId].success) {
          return json1[appId].data;
        }
      }
    } catch (e1) {}

    // 2차 시도: api.allorigins.win
    try {
      const proxy2 = `https://api.allorigins.win/get?url=${encodeURIComponent(steamTargetUrl)}`;
      const res2 = await fetch(proxy2);
      if (res2.ok) {
        const json2 = await res2.json();
        const parsed = JSON.parse(json2.contents);
        if (parsed && parsed[appId] && parsed[appId].success) {
          return parsed[appId].data;
        }
      }
    } catch (e2) {}

    // 3차 시도: 직접 fetch (서버사이드 또는 CORS 오픈 호스트용)
    try {
      const res3 = await fetch(steamTargetUrl);
      if (res3.ok) {
        const json3 = await res3.json();
        if (json3 && json3[appId] && json3[appId].success) {
          return json3[appId].data;
        }
      }
    } catch (e3) {}

    return null;
  };

  const fetchGamePrice = async (searchTerm) => {
    const q = searchTerm || query;
    if (!q || !q.trim()) {
      setError('검색할 게임 이름 또는 App ID를 입력해 주세요!');
      return;
    }

    setError('');
    setData(null);
    setLoading(true);

    try {
      const matchedAppId = findAppIdFromInput(q);

      if (!matchedAppId) {
        setLoading(false);
        setError(`'${q.trim()}' 관련 스팀 게임을 찾지 못했습니다. 목록에 있는 다른 게임 명칭이나 숫자로 App ID를 입력해 보세요.`);
        return;
      }

      const gData = await fetchSteamApiWithCorsBypass(matchedAppId);
      setLoading(false);

      if (!gData) {
        setError('스팀 게임 상세 정보(가격/이미지)를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      setData({
        appId: matchedAppId,
        name: gData.name,
        headerImage: gData.header_image,
        price: gData.is_free ? '무료' : (gData.price_overview ? gData.price_overview.final_formatted : '가격 정보 없음'),
        discountPercent: gData.price_overview ? gData.price_overview.discount_percent : 0,
        steamLink: `https://store.steampowered.com/app/${matchedAppId}`
      });

    } catch (err) {
      setLoading(false);
      setError('스팀 데이터를 조회하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  const handleSuggestionClick = (item) => {
    setQuery(item.name);
    fetchGamePrice(item.name);
  };

  return (
    <main style={{
      maxWidth: '650px',
      margin: '40px auto',
      padding: '24px 16px',
      fontFamily: 'system-ui, sans-serif',
      color: '#f3f4f6'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '8px', color: '#fff' }}>🎮 스팀 가격 조회</h1>
        <p style={{ color: '#9ca3af', fontSize: '15px' }}>
          유사한 글자를 입력하면 아래에 관련 연관 게임이 실시간으로 추천됩니다!
        </p>
      </div>

      {/* 📌 캡처 1.png 스타일 둥근 사각형 검색창 (Input Box) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#121824',
        padding: '10px 14px',
        borderRadius: '24px',
        border: '1.5px solid #1e293b',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        marginBottom: '16px'
      }}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && fetchGamePrice()}
          placeholder="게임 이름 입력 (예: 아크, 사이버, 몬헌)"
          autoComplete="off"
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: '17px',
            fontWeight: '500'
          }}
        />
        <button
          onClick={() => fetchGamePrice()}
          style={{
            padding: '12px 30px',
            borderRadius: '16px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
            whiteSpace: 'nowrap'
          }}
        >
          검색
        </button>
      </div>

      {/* 📌 캡처 1.png 연관 검색 추천 카드 리스트 (Real-time Suggestions List) */}
      {query.trim().length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {suggestions.length === 0 ? (
            <div style={{
              padding: '14px 20px',
              borderRadius: '18px',
              backgroundColor: '#121824',
              border: '1px solid #1e293b',
              fontSize: '14px',
              color: '#64748b',
              textAlign: 'center'
            }}>
              `'{query}' 관련 추천 연관 게임을 찾는 중...`
            </div>
          ) : (
            suggestions.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSuggestionClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  backgroundColor: '#121824',
                  border: '1.5px solid #1e293b',
                  borderRadius: '20px',
                  padding: '12px 18px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.backgroundColor = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1e293b';
                  e.currentTarget.style.backgroundColor = '#121824';
                }}
              >
                {/* 게임 썸네일 이미지 */}
                <img
                  src={item.tinyImage || `https://shared.fastly.steamstatic.com/store_images_cdn/steam/apps/${item.appId}/header.jpg`}
                  alt={item.name}
                  style={{
                    width: '64px',
                    height: '30px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    backgroundColor: '#1e293b'
                  }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                {/* 게임 제목 */}
                <span style={{
                  flex: 1,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#f3f4f6',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {item.name}
                </span>
                {/* 실시간 가격 정보 */}
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#38bdf8',
                  whiteSpace: 'nowrap'
                }}>
                  {item.price || '조회 가능'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Quick Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
        {['아크', '사이버', '팰월드', '몬헌', '레데리', '발더스'].map((chip) => (
          <span
            key={chip}
            onClick={() => { setQuery(chip); fetchGamePrice(chip); }}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13px',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
          >
            #{chip}
          </span>
        ))}
      </div>

      {loading && <p style={{ color: '#3b82f6', fontWeight: 'bold', textAlign: 'center' }}>⚡ 스팀 상세 가격 정보를 불러오는 중...</p>}

      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          fontSize: '14px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {/* 상세 스팀 카드 결과 */}
      {data && (
        <div style={{
          backgroundColor: '#121824',
          borderRadius: '24px',
          padding: '24px',
          border: '1.5px solid #1e293b',
          marginTop: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
        }}>
          <img src={data.headerImage} alt={data.name} style={{ width: '100%', borderRadius: '12px', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#fff' }}>{data.name}</h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '12px' }}>
            <span style={{ fontSize: '24px', color: '#38bdf8', fontWeight: '800' }}>
              가격: {data.price}
            </span>
            {data.discountPercent > 0 && (
              <span style={{ backgroundColor: '#a4d007', color: '#171a21', fontWeight: '800', padding: '3px 8px', borderRadius: '6px', fontSize: '14px' }}>
                -{data.discountPercent}% 할인 중
              </span>
            )}
          </div>
          {data.steamLink && (
            <a
              href={data.steamLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                marginTop: '20px',
                padding: '14px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '16px',
                color: '#38bdf8',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '15px'
              }}
            >
              🛒 스팀 공식 상점 페이지 바로가기 ➔
            </a>
          )}
        </div>
      )}
    </main>
  );
}
