import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'OwlMate · AI 投资驾驶舱',
  description: '看清持仓，从容决策。OwlMate 投资驾驶舱交互演示。',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
