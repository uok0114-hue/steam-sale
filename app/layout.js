export const metadata = {
  title: '🎮 스팀 게임 가격 조회기 | K-SteamTracker',
  description: '스팀 App ID 및 게임 이름으로 실시간 원가, 할인가, 이미지 및 가격 정보를 조회하는 서비스',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0b0e14', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
