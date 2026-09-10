import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '策略达人 · OwlMate',
  description: '观察不同 AI Agent 的模拟持仓、收益、回撤与调仓决策。',
};

export default function StrategistsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
