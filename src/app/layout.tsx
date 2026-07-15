import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'K-SteamTracker | 한국인을 위한 스팀 가격 추적 & 실시간 알림',
  description: '글로벌 스팀 가격, 국내 다이렉트게임즈/포기븐 등 최저가 실시간 비교! 한글 패치 유무 및 한국인 전용 긍정률(KR Score) 제공. 디스코드, 텔레그램, 카카오톡 즉시 알림.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full select-none">
      <body className="min-h-full bg-zinc-950 text-zinc-100 flex flex-col items-center">
        {/* Desktop Container & Mobile Screen Simulation Wrapper */}
        <div className="w-full max-w-md min-h-screen bg-zinc-900 shadow-2xl flex flex-col pb-20 border-x border-zinc-800 relative">
          {/* Header */}
          <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white overflow-hidden shadow-inner">
                {/* Mascot image */}
                <img 
                  src="/mascot.png" 
                  alt="Mascot" 
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 tracking-tight text-lg">
                K-SteamTracker
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-zinc-400 font-medium">실시간 작동 중</span>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 px-4 py-4 overflow-y-auto">
            {children}
          </main>

          {/* Bottom Mobile-First Navigation Bar */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800/80 h-16 flex items-center justify-around px-2 z-50">
            <Link href="/" className="flex flex-col items-center justify-center w-16 h-full text-zinc-400 hover:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span className="text-[10px] font-bold mt-1">가격 탐색</span>
            </Link>
            
            <Link href="/wishlist" className="flex flex-col items-center justify-center w-16 h-full text-zinc-400 hover:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span className="text-[10px] font-bold mt-1">알림 찜목록</span>
            </Link>

            <Link href="/admin" className="flex flex-col items-center justify-center w-16 h-full text-zinc-400 hover:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sliders-horizontal"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="17" y1="12" y2="12"/><line x1="13" x2="3" y1="12" y2="12"/><line x1="21" x2="11" y1="20" y2="20"/><line x1="7" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="17" x2="17" y1="10" y2="14"/><line x1="7" x2="7" y1="18" y2="22"/></svg>
              <span className="text-[10px] font-bold mt-1">관제 센터</span>
            </Link>
          </nav>
        </div>
      </body>
    </html>
  );
}
