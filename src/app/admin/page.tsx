'use client';

import { useState, useEffect } from 'react';

interface NotifierLog {
  id: string;
  gameTitle: string;
  channel: 'kakaotalk' | 'discord' | 'telegram';
  destination: string;
  message: string;
  timestamp: string;
  status: 'success' | 'failed';
  error?: string;
}

export default function AdminCenter() {
  const [logs, setLogs] = useState<NotifierLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  
  // Detect DB mode (simulated on client based on headers/data or static check)
  const [dbMode, setDbMode] = useState<'Local JSON DB' | 'Supabase Postgres'>('Local JSON DB');

  useEffect(() => {
    fetchLogs();
    
    // Check if Supabase keys exist (simple check, we'll fetch from API if we want it to be exact, but local fallback is the default)
    // We can assume Local JSON DB unless configured in backend.
    
    // Setup log polling every 3 seconds for live alert monitoring
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetch('/api/cron/sync');
      const json = await res.json();
      if (json.success) {
        setSyncResult(`동기화 성공: 총 ${json.count}개 게임 갱신 완료!`);
        fetchLogs();
      } else {
        setSyncResult(`동기화 실패: ${json.error || '알 수 없는 오류'}`);
      }
    } catch (e) {
      setSyncResult('동기화 네트워크 에러 발생');
    } finally {
      setSyncing(false);
    }
  };

  const handleResetDb = async () => {
    if (!confirm('경고: 모든 사용자 찜목록이 삭제되고 기본 게임 가격 데이터로 초기화됩니다. 계속하시겠습니까?')) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert('데이터베이스가 성공적으로 초기화되었습니다!');
        setSyncResult('DB 리셋 완료');
        setLogs([]);
        fetchLogs();
      }
    } catch (e) {
      alert('DB 리셋 실패');
    } finally {
      setResetting(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setLogs([]);
      }
    } catch (e) {
      console.error('Failed to clear logs', e);
    }
  };

  const formatDest = (channel: string, dest: string) => {
    if (channel === 'discord') {
      return `Discord Webhook (...${dest.substring(dest.length - 8)})`;
    }
    if (channel === 'telegram') {
      const parts = dest.split(':');
      return `Telegram (ChatID: ${parts[parts.length - 1]})`;
    }
    return `수신 번호 (${dest})`;
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Title */}
      <h2 className="text-base font-extrabold text-zinc-100 flex items-center gap-1.5">
        <svg className="w-5 h-5 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
        백엔드 관제 센터
      </h2>

      {/* Database & System Info */}
      <div className="glass-panel rounded-2xl p-4 border border-zinc-800 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-zinc-400">시스템 연동 상태</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3 flex flex-col">
            <span className="text-[8px] text-zinc-500 font-extrabold uppercase">데이터베이스 모드</span>
            <span className="text-xs font-black text-violet-400 mt-0.5">{dbMode}</span>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-800 rounded-xl p-3 flex flex-col">
            <span className="text-[8px] text-zinc-500 font-extrabold uppercase">스케줄러 상태</span>
            <span className="text-xs font-black text-emerald-400 mt-0.5">정상 작동 (3회/일)</span>
          </div>
        </div>
      </div>

      {/* Manual Actions Panel */}
      <div className="glass-panel rounded-2xl p-4 border border-zinc-800 flex flex-col gap-3">
        <h3 className="text-xs font-bold text-zinc-400 font-sans">수동 파이프라인 제어</h3>
        
        {syncResult && (
          <div className={`p-2.5 rounded-lg text-[10px] font-bold border ${
            syncResult.includes('성공') || syncResult.includes('완료')
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {syncResult}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleManualSync}
            disabled={syncing || resetting}
            className="h-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-[11px] rounded-xl shadow-md shadow-violet-950/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {syncing ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin"></div>
                동기화 중...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                가격/리뷰 동기화
              </>
            )}
          </button>

          <button
            onClick={handleResetDb}
            disabled={syncing || resetting}
            className="h-10 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 font-extrabold text-[11px] rounded-xl border border-zinc-700/50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            DB 초기화 리셋
          </button>
        </div>
      </div>

      {/* Notification Logs audit */}
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-zinc-400 flex items-center gap-1">
            실시간 알림 발송 기록
            <span className="text-[9px] text-zinc-600 font-bold">(3초 자동 갱신)</span>
          </h3>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-[9px] text-red-400 font-bold hover:underline"
            >
              로그 비우기
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
          {loadingLogs ? (
            <div className="text-center py-6 text-xs text-zinc-500 font-medium">로그를 불러오는 중...</div>
          ) : logs.length > 0 ? (
            logs.map((log) => (
              <div 
                key={log.id} 
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-1.5"
              >
                {/* Header info */}
                <div className="flex justify-between items-start">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {/* Channel badge */}
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                      log.channel === 'discord'
                        ? 'bg-violet-650/20 border-violet-500 text-violet-300'
                        : log.channel === 'telegram'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-yellow-600/20 border-yellow-500 text-yellow-400'
                    }`}>
                      {log.channel === 'discord' && '👾 Discord'}
                      {log.channel === 'telegram' && '✈️ Telegram'}
                      {log.channel === 'kakaotalk' && '💬 알림톡 (모의)'}
                    </span>

                    {/* Status badge */}
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                      log.status === 'success'
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/20 border-red-500/30 text-red-450'
                    }`}>
                      {log.status === 'success' ? '성공' : '실패'}
                    </span>
                  </div>

                  <span className="text-[9px] text-zinc-600 font-bold font-mono">
                    {formatTime(log.timestamp)}
                  </span>
                </div>

                {/* Log message */}
                <p className="text-[10px] font-semibold text-zinc-200 leading-normal font-mono break-all whitespace-pre-wrap">
                  {log.message}
                </p>

                {/* Obstufcated Dest & Errors */}
                <div className="flex flex-col gap-1 text-[8px] text-zinc-500 font-bold border-t border-zinc-800/40 pt-1.5">
                  <span>수신처: {formatDest(log.channel, log.destination)}</span>
                  {log.error && <span className="text-red-450 font-semibold font-mono">에러 내용: {log.error}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 glass-panel rounded-2xl border border-zinc-800 text-[10px] text-zinc-500 font-bold">
              아직 발송된 가격 알림 기록이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
