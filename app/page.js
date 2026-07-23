'use client';

import { useState } from 'react';
import gamesMap from '../games.json';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // 🔍 클라이언트 & 백엔드 유연한 부분 검색 헬퍼 (예: "아크" -> "아크 서바이벌", "사이버" -> "사이버펑크")
  const findAppIdFromInput = (input) => {
    const raw = input.trim();
    if (!isNaN(Number(raw))) {
      return Number(raw);
    }

    const normInput = raw.replace(/\s+/g, '').toLowerCase();
    
    // 1. Exact match (완전 일치)
    for (const key in gamesMap) {
      if (key.replace(/\s+/g, '').toLowerCase() === normInput) {
        return gamesMap[key];
      }
    }

    // 2. Partial substring match (부분 일치)
    if (normInput.length >= 1) {
      for (const key in gamesMap) {
        const normKey = key.replace(/\s+/g, '').toLowerCase();
        if (normKey.includes(normInput) || normInput.includes(normKey)) {
          return gamesMap[key];
        }
      }
    }

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
      // 1단계: 딕셔너리 부분 매칭으로 App ID 자동 도출
      const matchedAppId = findAppIdFromInput(q);
      
      let fetchUrl = '';
      if (matchedAppId) {
        fetchUrl = `https://store.steampowered.com/api/appdetails?appids=${matchedAppId}&cc=kr&l=korean`;
      } else {
        // 2단계: 스팀 원격 검색 API 릴레이
        fetchUrl = `/api/search?name=${encodeURIComponent(q.trim())}`;
      }

      // 스팀 API 직접 또는 프록시 요청
      const response = await fetch(fetchUrl);
      const resJson = await response.json();

      setLoading(false);

      if (matchedAppId) {
        const gameInfo = resJson[matchedAppId];
        if (!gameInfo || !gameInfo.success) {
          setError('게임을 찾을 수 없습니다.');
          return;
        }
        const gData = gameInfo.data;
        setData({
          appId: matchedAppId,
          name: gData.name,
          headerImage: gData.header_image,
          price: gData.is_free ? '무료' : (gData.price_overview ? gData.price_overview.final_formatted : '가격 정보 없음'),
          discountPercent: gData.price_overview ? gData.price_overview.discount_percent : 0,
          steamLink: `https://store.steampowered.com/app/${matchedAppId}`
        });
      } else {
        if (!response.ok || resJson.error) {
          setError(resJson.error || '게임을 찾을 수 없습니다.');
          return;
        }
        setData(resJson);
      }
    } catch (err) {
      setLoading(false);
      setError('스팀 데이터를 조회하는 중 오류가 발생했습니다.');
    }
  };

  return (
    <main style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '20px',
      fontFamily: 'sans-serif',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '8px' }}>🎮 스팀 가격 조회</h1>
      <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
        게임의 일부 단어(예: <b>아크</b>, <b>사이버</b>, <b>몬헌</b>, <b>레데리</b>)만 검색해도 자동으로 찾아줍니다!
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchGamePrice()}
          placeholder="게임 이름 (예: 아크, 팰월드, 사이버펑크) 입력"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #333',
            backgroundColor: '#161c27',
            color: '#fff',
            fontSize: '16px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => fetchGamePrice()}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer'
          }}
        >
          검색
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
        {['아크', '사이버', '팰월드', '몬헌', '레데리', '발더스'].map((chip) => (
          <span
            key={chip}
            onClick={() => { setQuery(chip); fetchGamePrice(chip); }}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '13px',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
          >
            #{chip}
          </span>
        ))}
      </div>

      {loading && <p style={{ color: '#3b82f6', fontWeight: 'bold' }}>⚡ 스팀 가격 정보를 조회하는 중...</p>}

      {error && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5',
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{
          textAlign: 'left',
          backgroundColor: '#161c27',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          marginTop: '16px'
        }}>
          <img src={data.headerImage} alt={data.name} style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{data.name}</h2>
          <p style={{ fontSize: '20px', color: '#66c0f4', fontWeight: 'bold', margin: '12px 0 0 0' }}>
            가격: {data.price} {data.discountPercent > 0 && `(-${data.discountPercent}%)`}
          </p>
          {data.steamLink && (
            <a
              href={data.steamLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                marginTop: '12px',
                color: '#3b82f6',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              🔗 스팀 상점 페이지로 이동 ➔
            </a>
          )}
        </div>
      )}
    </main>
  );
}
