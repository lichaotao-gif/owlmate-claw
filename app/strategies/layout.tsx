import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '策略广场 · OwlMate',
  description: '发现社区用户贡献的投资策略，并引用到自己的策略库。',
};

export default function StrategiesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
