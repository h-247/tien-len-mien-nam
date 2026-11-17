import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tiến Lên Miền Nam - Đấu Bài Online & Bot AI',
  description: 'Trò chơi Tiến Lên Miền Nam trực tuyến nhiều người chơi, phòng đấu bạn bè, cược VND mô phỏng và đấu trí cùng AI.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#212121] text-[#ECECEC] antialiased selection:bg-neutral-700 selection:text-white">
        {children}
      </body>
    </html>
  );
}
