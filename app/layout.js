export const metadata = {
  title: 'Steam Sale Tracker',
  description: 'Steam price tracker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
