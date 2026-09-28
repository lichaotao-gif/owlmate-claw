import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '策略广场 · OwlMate',
  description: '发现社区贡献的量化研究规则，并放进独立实验中验证。',
};

export default function StrategiesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
