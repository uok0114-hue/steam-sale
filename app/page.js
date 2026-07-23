'use client';

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

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
      let url = '';
      if (!isNaN(Number(q.trim()))) {
        url = `/api/game/${q.trim()}`;
      } else {
        url = `/api/search?name=${encodeURIComponent(q.trim())}`;
      }

      const response = await fetch(url);
      const resData = await response.json();
      setLoading(false);

      if (!response.ok || resData.error) {
        setError(resData.error || '게임을 찾을 수 없습니다.');
        return;
      }

      setData(resData);
    } catch (err) {
      setLoading(false);
      setError('스팀 데이터를 조회하는 중 오류가 발생했습니다.');
    }
  };

  return (
    <main style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '24px 16px',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        display: 'inline-block',
        padding: '6px 14px',
        borderRadius: '9999px',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        color: '#66c0f4',
        fontSize: '13px',
        marginBottom: '16px'
      }}>
        ⚡ 스팀 가격 조회 서비스
      </div>

      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
        🎮 스팀 게임 가격 조회기
      </h1>
      <p style={{ color: '#9ca3af', fontSize: '15px', marginBottom: '24px' }}>
        게임 이름(예: 팰월드, 사이버펑크, 배틀그라운드)이나 App ID를 입력하세요.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchGamePrice()}
          placeholder="게임 이름 또는 App ID 입력"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
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
        {['팰월드', '사이버펑크', '배틀그라운드', '엘든 링', '데이브 더 다이버'].map((chip) => (
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
            {chip}
          </span>
        ))}
      </div>

      {loading && <p style={{ color: '#3b82f6' }}>스팀 데이터를 조회하는 중...</p>}

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
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginTop: '16px'
        }}>
          <img src={data.headerImage} alt={data.name} style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>{data.name}</h2>
          <p style={{ fontSize: '20px', color: '#66c0f4', fontWeight: 'bold', margin: '12px 0 0 0' }}>
            가격: {data.price} {data.discountPercent > 0 && `(-${data.discountPercent}%)`}
          </p>
        </div>
      )}
    </main>
  );
}
