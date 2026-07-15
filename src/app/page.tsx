'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Game {
  app_id: number;
  title: string;
  header_image: string;
  is_free: boolean;
  has_kr_patch: boolean;
  kr_patch_url: string | null;
  kr_positive_rate: number;
  steam_price: number;
  steam_discount_percent: number;
  domestic_price: number | null;
  domestic_store_name: string | null;
  lowest_recorded_price: number;
  lowest_recorded_at: string | null;
}

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [globalSearchAppIds, setGlobalSearchAppIds] = useState<number[]>([]);
  const [officialKrOnly, setOfficialKrOnly] = useState(false);
  const [userKrOnly, setUserKrOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'discount' | 'kr_score' | 'price' | 'title'>('discount');

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!search.trim()) return;

    try {
      setSearchLoading(true);
      const res = await fetch(`/api/games?search=${encodeURIComponent(search.trim())}`);
      const json = await res.json();
      if (json.success) {
        setGames(json.data);
        setGlobalSearchAppIds(json.matches || []);
      }
    } catch (err) {
      console.error('Failed to run global steam store search', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Wishlist Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [alertTargetPrice, setAlertTargetPrice] = useState('');
  const [notificationChannel, setNotificationChannel] = useState<'discord' | 'telegram' | 'kakaotalk'>('discord');
  const [channelDestination, setChannelDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/games');
      const json = await res.json();
      if (json.success) {
        setGames(json.data);
        setGlobalSearchAppIds([]);
      }
    } catch (e) {
      console.error('Failed to load games', e);
    } finally {
      setLoading(false);
    }
  };

  const openWishlistModal = (game: Game) => {
    setSelectedGame(game);
    setAlertTargetPrice(game.steam_price.toString());
    setModalMessage(null);
    setIsModalOpen(true);
  };

  const handleWishlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame) return;

    try {
      setSubmitting(true);
      setModalMessage(null);
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'guest_user',
          appId: selectedGame.app_id,
          alertTargetPrice: alertTargetPrice ? parseInt(alertTargetPrice, 10) : null,
          notificationChannel,
          channelDestination
        })
      });
      const json = await res.json();
      if (json.success) {
        setModalMessage({ type: 'success', text: '알림이 성공적으로 등록되었습니다! 🔔' });
        // Automatically close modal after 1.5 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setSelectedGame(null);
          setAlertTargetPrice('');
          setChannelDestination('');
        }, 1500);
      } else {
        setModalMessage({ type: 'error', text: json.error || '알림 등록에 실패했습니다.' });
      }
    } catch (err) {
      setModalMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering & Sorting
  const filteredGames = games
    .filter(game => {
      // Search term match
      if (search && !game.title.toLowerCase().includes(search.toLowerCase())) {
        if (!globalSearchAppIds.includes(game.app_id)) {
          return false;
        }
      }
      // Official Korean support filter
      if (officialKrOnly) {
        // Dave, Cyberpunk, Elden Ring, Hades 2 officially support Korean
        // Only Lethal Company (1966720) does not support Korean officially (uses user patch)
        if (game.app_id === 1966720) return false;
      }
      // User Korean patch filter
      if (userKrOnly && !game.has_kr_patch) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'discount') {
        return b.steam_discount_percent - a.steam_discount_percent;
      }
      if (sortBy === 'kr_score') {
        return b.kr_positive_rate - a.kr_positive_rate;
      }
      if (sortBy === 'price') {
        const getCheapestPrice = (g: Game) => 
          g.domestic_price !== null && g.domestic_price < g.steam_price 
            ? g.domestic_price 
            : g.steam_price;
        return getCheapestPrice(a) - getCheapestPrice(b);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome Banner featuring Mascot (Main Capybara: sprout + pink cheeks) */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-violet-900/60 via-purple-900/40 to-indigo-900/60 p-4 border border-violet-800/30 flex items-center gap-4 shadow-lg shadow-violet-950/20">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-yellow-100 flex-shrink-0 border border-yellow-200/50 shadow flex items-center justify-center">
          <img 
            src="/mascot.png" 
            alt="Mascot Capybara" 
            className="w-full h-full object-cover scale-110"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* Text/Emoji backup avatar */}
          <span className="text-xl">🌱</span>
        </div>
        <div>
          <h2 className="text-xs font-bold text-violet-200 tracking-wider uppercase">Welcome Mascot</h2>
          <h3 className="text-sm font-extrabold text-white mt-0.5">안녕! 나는 겜돌이 카피바라야 🌱</h3>
          <p className="text-[10px] text-zinc-300 mt-1 leading-relaxed">
            한국인 맞춤형 최저가와 커뮤니티 한글 패치 링크를 전송해줄게. 역대 최저가 갱신 시 1초 알림을 받아봐!
          </p>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex gap-2 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="게임명 검색... (엔터 시 스팀 전체 검색)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!e.target.value.trim()) {
                  setGlobalSearchAppIds([]);
                }
              }}
              className="w-full h-11 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-100 rounded-xl px-4 pl-10 text-xs font-medium placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400 dark:text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.608 10.608Z" />
            </svg>
            {searchLoading && (
              <div className="absolute right-3.5 top-3.5 w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
            )}
          </div>
          <button 
            type="submit"
            disabled={searchLoading || !search.trim()}
            className="px-4 h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1 flex-shrink-0"
          >
            검색
          </button>
        </form>

        {/* Filter Badges & Switch Toggles */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setOfficialKrOnly(!officialKrOnly)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                officialKrOnly
                  ? 'bg-violet-600/30 border-violet-500 text-violet-650 dark:text-violet-200'
                  : 'bg-zinc-200/50 border-zinc-300 dark:bg-zinc-800/50 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              🇺🇳 공식 한국어
            </button>
            <button
              onClick={() => setUserKrOnly(!userKrOnly)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                userKrOnly
                  ? 'bg-violet-600/30 border-violet-500 text-violet-650 dark:text-violet-200'
                  : 'bg-zinc-200/50 border-zinc-300 dark:bg-zinc-800/50 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              🛠️ 유저 패치 포함
            </button>
          </div>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-7 bg-zinc-150 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700/60 rounded-lg px-2 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-violet-500"
          >
            <option value="discount">할인율 높은순</option>
            <option value="kr_score">KR Score 순</option>
            <option value="price">실시간 최저가순</option>
            <option value="title">이름 가나다순</option>
          </select>
        </div>
      </div>

      {/* Game Cards List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
            <span className="text-xs text-zinc-500">가격 데이터를 파싱 중...</span>
          </div>
        ) : filteredGames.length > 0 ? (
          filteredGames.map((game) => {
            const resellerCheaper = game.domestic_price !== null && game.domestic_price < game.steam_price;
            const currentLowest = resellerCheaper ? game.domestic_price! : game.steam_price;
            const originalPrice = game.steam_discount_percent > 0 
              ? Math.round(game.steam_price / (1 - game.steam_discount_percent / 100)) 
              : game.steam_price;

            return (
              <div 
                key={game.app_id} 
                className={`glass-panel-interactive rounded-2xl overflow-hidden flex flex-col ${
                  resellerCheaper ? 'border-l-4 border-l-purple-500' : ''
                }`}
              >
                {/* Main Card Content */}
                <div className="p-3 flex gap-3">
                  {/* Game Thumbnail */}
                  <div className="relative w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                    <img 
                      src={game.header_image} 
                      alt={game.title} 
                      className="w-full h-full object-cover"
                    />
                    {game.steam_discount_percent > 0 && (
                      <div className="absolute top-1 left-1 bg-red-600 text-white font-extrabold text-[9px] px-1 rounded">
                        -{game.steam_discount_percent}%
                      </div>
                    )}
                  </div>

                  {/* Game Info details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      {/* Tags/Badges */}
                      <div className="flex flex-wrap gap-1 items-center">
                        {game.app_id !== 1966720 ? (
                          <span className="text-[8px] font-extrabold bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded border border-blue-500/20">
                            공식 한글
                          </span>
                        ) : null}
                        
                        {game.has_kr_patch && (
                          <Link 
                            href={game.kr_patch_url || '#'} 
                            target="_blank"
                            className="text-[8px] font-extrabold bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/30 flex items-center gap-0.5"
                          >
                            🛠️ 유저 한글패치
                            <svg className="w-1.5 h-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </Link>
                        )}
                        
                        {/* KR Score indicator */}
                        <span className="text-[8px] font-extrabold bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/20">
                          KR 선호도: {game.kr_positive_rate}%
                        </span>
                      </div>

                      {/* Game Title */}
                      <h3 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-100 mt-1 line-clamp-1">
                        {game.title}
                      </h3>
                      
                      {/* Price Grid */}
                      <div className="flex flex-col gap-1 mt-2">
                        {/* Steam Price */}
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-zinc-500 dark:text-zinc-400 font-medium">스팀 상점가</span>
                          <div className="flex items-center gap-1.5">
                            {game.steam_discount_percent > 0 && (
                              <span className="line-through text-zinc-400 dark:text-zinc-600">{originalPrice.toLocaleString()}원</span>
                            )}
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{game.steam_price.toLocaleString()}원</span>
                          </div>
                        </div>

                        {/* Reseller Price (cheapest highlight) */}
                        {game.domestic_price !== null && (
                          <div className="flex justify-between items-center text-[10px] py-0.5 rounded px-1 -mx-1 bg-zinc-200/40 dark:bg-zinc-800/40">
                            <span className="text-zinc-500 dark:text-zinc-400 font-medium">국내 리셀러 ({game.domestic_store_name})</span>
                            <span className={`font-bold ${resellerCheaper ? 'text-violet-650 dark:text-violet-400 font-black' : 'text-zinc-700 dark:text-zinc-300'}`}>
                              {game.domestic_price.toLocaleString()}원
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom stats & Alerts triggers */}
                    <div className="flex items-center justify-between border-t border-zinc-200/60 dark:border-zinc-800/50 pt-2 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-zinc-450 dark:text-zinc-500 uppercase tracking-tight font-bold">역대 최저가</span>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                          {game.lowest_recorded_price.toLocaleString()}원
                        </span>
                      </div>
                      
                      <button
                        onClick={() => openWishlistModal(game)}
                        className="px-3 h-7 bg-violet-600 hover:bg-violet-700 transition-colors text-white font-extrabold text-[10px] rounded-lg shadow-md shadow-violet-900/20 flex items-center gap-1 cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                        </svg>
                        알림 받기
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reseller cheapest banner alert */}
                {resellerCheaper && (
                  <div className="bg-gradient-to-r from-violet-650 to-indigo-650 px-3 py-1 text-[9px] font-extrabold flex items-center justify-between text-violet-200">
                    <span className="flex items-center gap-1">
                      🔥 국내 스토어 특가! 스팀보다 { (game.steam_price - game.domestic_price!).toLocaleString() }원 더 저렴합니다.
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Empty State featuring Sleepy Sub-Capybara (Indifferent eyes, no sprout, no blush, darker clay brown fur) */
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center glass-panel rounded-2xl border border-zinc-800">
            {/* Custom Sleepy Capybara SVG */}
            <svg className="w-20 h-20 mb-3 text-zinc-600" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Capybara Head */}
              <rect x="25" y="35" width="50" height="40" rx="15" fill="#6B5340" />
              {/* Sleepy Eyes (Indifferent half closed lines) */}
              <line x1="33" y1="52" x2="43" y2="52" stroke="#2D1F17" strokeWidth="4" strokeLinecap="round" />
              <line x1="57" y1="52" x2="67" y2="52" stroke="#2D1F17" strokeWidth="4" strokeLinecap="round" />
              {/* Indifferent Mouth */}
              <line x1="46" y1="65" x2="54" y2="65" stroke="#2D1F17" strokeWidth="3" strokeLinecap="round" />
              {/* Ears */}
              <rect x="20" y="40" width="8" height="12" rx="4" fill="#544031" />
              <rect x="72" y="40" width="8" height="12" rx="4" fill="#544031" />
              {/* Sleep Zzzs */}
              <text x="75" y="32" fill="#8B5CF6" fontSize="12" fontWeight="bold" fontFamily="monospace">Z</text>
              <text x="83" y="24" fill="#A78BFA" fontSize="8" fontWeight="bold" fontFamily="monospace">z</text>
            </svg>
            <h3 className="font-extrabold text-sm text-zinc-300">일치하는 게임이 없어...</h3>
            <p className="text-[10px] text-zinc-500 mt-1">
              겜돌이 카피바라가 찾지 못했대! 다른 검색어로 검색해보거나 필터를 조절해봐. 💤
            </p>
          </div>
        )}
      </div>

      {/* Wishlist Configuration Modal */}
      {isModalOpen && selectedGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/40">
              <div className="flex flex-col">
                <span className="text-[9px] font-extrabold text-violet-400 uppercase tracking-wider">알림 구독 설정</span>
                <h3 className="font-extrabold text-sm text-zinc-100 line-clamp-1">{selectedGame.title}</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleWishlistSubmit} className="p-4 flex flex-col gap-4">
              {modalMessage && (
                <div className={`p-3 rounded-lg text-[10px] font-bold border ${
                  modalMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {modalMessage.text}
                </div>
              )}

              {/* Input: Target Price */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400">알림을 받을 가격 설정 (원)</label>
                <input
                  type="number"
                  placeholder="예: 20000 (미지정 시 역대 최저가 경신 시점 알림)"
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(e.target.value)}
                  className="w-full h-10 bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-violet-500 text-zinc-200"
                />
                <span className="text-[8px] text-zinc-500">
                  현재 실시간 최저가: {
                    (selectedGame.domestic_price !== null && selectedGame.domestic_price < selectedGame.steam_price
                      ? selectedGame.domestic_price
                      : selectedGame.steam_price
                    ).toLocaleString()
                  }원
                </span>
              </div>

              {/* Input: Notification Channel */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400">수신 모바일 채널 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNotificationChannel('discord')}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-colors flex flex-col items-center justify-center gap-1 ${
                      notificationChannel === 'discord'
                        ? 'bg-violet-600/20 border-violet-500 text-violet-200'
                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <span>👾 디스코드</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationChannel('telegram')}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-colors flex flex-col items-center justify-center gap-1 ${
                      notificationChannel === 'telegram'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <span>✈️ 텔레그램</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotificationChannel('kakaotalk')}
                    className={`py-2 rounded-lg text-[10px] font-bold border transition-colors flex flex-col items-center justify-center gap-1 ${
                      notificationChannel === 'kakaotalk'
                        ? 'bg-yellow-600/20 border-yellow-500 text-yellow-350'
                        : 'bg-zinc-800/40 border-zinc-800 text-zinc-500 hover:text-zinc-400'
                    }`}
                  >
                    <span>💬 알림톡 (모의)</span>
                  </button>
                </div>
              </div>

              {/* Input: Webhook URL / Bot Chat ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400">
                  {notificationChannel === 'discord' && '디스코드 Webhook URL 입력'}
                  {notificationChannel === 'telegram' && '텔레그램 Token:ChatID 입력'}
                  {notificationChannel === 'kakaotalk' && '전화번호 혹은 식별용 닉네임 입력'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    notificationChannel === 'discord'
                      ? 'https://discord.com/api/webhooks/...'
                      : notificationChannel === 'telegram'
                      ? '봇토큰:챗아이디 형식'
                      : '010-XXXX-XXXX 형식'
                  }
                  value={channelDestination}
                  onChange={(e) => setChannelDestination(e.target.value)}
                  className="w-full h-10 bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-violet-500 text-zinc-200"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[11px] rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-[11px] rounded-xl shadow-lg shadow-violet-900/30 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {submitting ? '등록 중...' : '알림 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
