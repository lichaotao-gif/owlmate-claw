import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '积分消耗 · OwlMate',
  description: '查看 OwlMate Agent 调用与积分消耗历史。',
};

export default function CreditsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
