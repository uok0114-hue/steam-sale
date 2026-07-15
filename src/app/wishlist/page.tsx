'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WishlistItem {
  id: number;
  user_id: string;
  app_id: number;
  alert_target_price: number | null;
  notification_channel: 'discord' | 'telegram' | 'kakaotalk';
  channel_destination: string;
  created_at: string;
  game?: {
    app_id: number;
    title: string;
    header_image: string;
    steam_price: number;
    steam_discount_percent: number;
    domestic_price: number | null;
    domestic_store_name: string | null;
    lowest_recorded_price: number;
  };
}

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ id: number; success: boolean; text: string } | null>(null);

  // 스팀 연동 전용 상태 선언
  const [steamId, setSteamId] = useState('');
  const [steamApiKey, setSteamApiKey] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showImportForm, setShowImportForm] = useState(false);

  const handleImportSteam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steamId) return;

    try {
      setImporting(true);
      setImportResult(null);
      
      const res = await fetch('/api/steam/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId, apiKey: steamApiKey })
      });
      const json = await res.json();
      
      if (json.success) {
        setImportResult({ success: true, message: json.message });
        setSteamId('');
        fetchWishlist(); // 최신 찜목록으로 동기화
      } else {
        setImportResult({ success: false, message: json.error || '연동 실패' });
      }
    } catch (err) {
      setImportResult({ success: false, message: '서버 통신 오류가 발생했습니다.' });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wishlist?userId=guest_user');
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
      }
    } catch (e) {
      console.error('Failed to load wishlist', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 가격 알림을 해제하시겠습니까?')) return;
    
    try {
      const res = await fetch(`/api/wishlist?userId=guest_user&id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setItems(items.filter(item => item.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete wishlist item', e);
    }
  };

  const handleTestNotification = async (id: number) => {
    try {
      setTestingId(id);
      setStatusMessage(null);
      const res = await fetch('/api/wishlist/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: 'guest_user' })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ id, success: true, text: '테스트 알림이 전송되었습니다! 🚀' });
      } else {
        setStatusMessage({ id, success: false, text: json.error || '알림 전송 실패' });
      }
    } catch (e) {
      setStatusMessage({ id, success: false, text: '네트워크 에러 발생' });
    } finally {
      setTestingId(null);
    }
  };

  const formatDestination = (channel: string, dest: string) => {
    if (channel === 'discord') {
      if (dest.startsWith('https://discord.com/api/webhooks/')) {
        return `Discord Webhook (...${dest.substring(dest.length - 12)})`;
      }
      return 'Discord Webhook (URL)';
    }
    if (channel === 'telegram') {
      const parts = dest.split(':');
      if (parts.length >= 2) {
        return `Telegram (ChatID: ${parts[parts.length - 1]})`;
      }
      return 'Telegram Bot';
    }
    return `알림톡 (수신처: ${dest})`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-extrabold text-zinc-100 flex items-center gap-1.5">
          <svg className="w-5 h-5 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          나의 알림 찜목록
        </h2>
        <span className="text-[10px] bg-zinc-800/60 border border-zinc-700/60 rounded px-2 py-0.5 text-zinc-400 font-bold">
          총 {items.length}개 추적 중
        </span>
      </div>

      {/* Steam Wishlist Import Panel */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col gap-3">
        <button 
          onClick={() => setShowImportForm(!showImportForm)}
          type="button"
          className="flex items-center justify-between w-full text-left cursor-pointer"
        >
          <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-500 dark:text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            스팀(Steam) 찜목록 자동 연동
          </span>
          <svg 
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${showImportForm ? 'rotate-180' : ''}`} 
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {showImportForm && (
          <form onSubmit={handleImportSteam} className="flex flex-col gap-3 mt-1 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/60 animate-in fade-in duration-200">
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              사용자님의 스팀 계정 주소나 17자리 고유번호(SteamID64)를 입력하시면, 스팀에 담아둔 찜목록을 즉시 K-SteamTracker로 한 번에 가져와 최저가 알림을 자동 세팅합니다.
              <span className="block mt-1 font-bold text-violet-600 dark:text-violet-400">* 스팀 계정 프로필 및 게임 상세 정보가 [공개] 상태여야 수집이 가능합니다.</span>
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400">스팀 ID / 프로필 고유주소</label>
              <input 
                type="text" 
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                placeholder="예: 76561198034567890 또는 gamedev_capy"
                required
                className="w-full bg-zinc-100/50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>스팀 Web API Key (선택)</span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-normal">비공개 계정 매핑용</span>
              </label>
              <input 
                type="password" 
                value={steamApiKey}
                onChange={(e) => setSteamApiKey(e.target.value)}
                placeholder="스팀 웹 API 키 입력"
                className="w-full bg-zinc-100/50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              />
            </div>

            <button 
              type="submit"
              disabled={importing || !steamId}
              className="w-full h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-black text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {importing ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin"></div>
                  동기화 진행 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  찜목록 일괄 가져오기
                </>
              )}
            </button>

            {importResult && (
              <div className={`p-2.5 rounded-xl border text-[10px] font-semibold leading-relaxed flex items-start gap-1.5 ${
                importResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              }`}>
                <span>{importResult.success ? '✓' : '⚠'}</span>
                <span>{importResult.message}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Wishlist Items List */}
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin"></div>
            <span className="text-xs text-zinc-500 font-medium">찜목록을 로드 중...</span>
          </div>
        ) : items.length > 0 ? (
          items.map((item) => {
            if (!item.game) return null;
            const game = item.game;
            const resellerCheaper = game.domestic_price !== null && game.domestic_price < game.steam_price;
            const currentPrice = resellerCheaper ? game.domestic_price! : game.steam_price;

            return (
              <div key={item.id} className="glass-panel rounded-2xl p-3 flex flex-col gap-3">
                <div className="flex gap-3">
                  {/* Game Thumbnail */}
                  <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-200 dark:bg-zinc-800">
                    <img 
                      src={game.header_image} 
                      alt={game.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Wishlist Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-xs text-zinc-800 dark:text-zinc-100 line-clamp-1">{game.title}</h3>
                      
                      {/* Subscription Rule info */}
                      <div className="flex flex-col gap-1 mt-1.5">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-500 font-bold">설정 알림 조건</span>
                          <span className="font-black text-violet-600 dark:text-violet-400">
                            {item.alert_target_price 
                              ? `${item.alert_target_price.toLocaleString()}원 이하` 
                              : '역대 최저가 갱신 시'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-500 font-bold">현재 최저가</span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            {currentPrice.toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-500 font-bold">수신 채널</span>
                          <span className="text-zinc-650 dark:text-zinc-400 font-semibold truncate max-w-[150px]">
                            {formatDestination(item.notification_channel, item.channel_destination)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status messages from test alerts */}
                {statusMessage && statusMessage.id === item.id && (
                  <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold border ${
                    statusMessage.success 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {statusMessage.text}
                  </div>
                )}

                {/* Footer Buttons inside Card */}
                <div className="flex gap-2 border-t border-zinc-800/60 pt-2.5">
                  <button
                    onClick={() => handleTestNotification(item.id)}
                    disabled={testingId !== null}
                    className="flex-1 h-7 bg-zinc-800 hover:bg-zinc-700/80 transition-colors rounded-lg text-zinc-300 font-bold text-[10px] flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {testingId === item.id ? (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full border border-zinc-400 border-t-transparent animate-spin"></div>
                        전송 중...
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        테스트 발송
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 h-7 bg-red-950/30 hover:bg-red-950/60 border border-red-900/30 text-red-400 hover:text-red-300 font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    해제
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          /* Empty State using custom Sleepy Capybara SVG */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center glass-panel rounded-2xl border border-zinc-800">
            {/* Custom Sleepy Capybara SVG */}
            <svg className="w-20 h-20 mb-3 text-zinc-600 animate-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="25" y="35" width="50" height="40" rx="15" fill="#6B5340" />
              <line x1="33" y1="52" x2="43" y2="52" stroke="#2D1F17" strokeWidth="4" strokeLinecap="round" />
              <line x1="57" y1="52" x2="67" y2="52" stroke="#2D1F17" strokeWidth="4" strokeLinecap="round" />
              <line x1="46" y1="65" x2="54" y2="65" stroke="#2D1F17" strokeWidth="3" strokeLinecap="round" />
              <rect x="20" y="40" width="8" height="12" rx="4" fill="#544031" />
              <rect x="72" y="40" width="8" height="12" rx="4" fill="#544031" />
              <text x="75" y="32" fill="#8B5CF6" fontSize="12" fontWeight="bold" fontFamily="monospace">Z</text>
              <text x="83" y="24" fill="#A78BFA" fontSize="8" fontWeight="bold" fontFamily="monospace">z</text>
            </svg>
            <h3 className="font-extrabold text-sm text-zinc-300">알림 찜목록이 텅 비었어...</h3>
            <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
              추적 중인 가격 알림이 없습니다.<br />메인 탐색 화면에서 원하는 게임의 '알림 받기'를 클릭하고 수신처를 입력해보세요!
            </p>
            <Link 
              href="/" 
              className="mt-4 px-4 h-9 bg-violet-600 hover:bg-violet-700 transition-colors text-white font-extrabold text-xs rounded-xl shadow-lg shadow-violet-950/20 flex items-center justify-center gap-1.5"
            >
              게임 찾으러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
