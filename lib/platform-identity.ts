import type { Account } from '@/lib/holdings';
import type { InvestorProfile } from '@/components/onboarding-demo';

export type PlatformIdentity = {
  level: number;
  name: string;
  progress: number;
  next: string;
  milestones: Array<{ label: string; done: boolean }>;
};

const levels = ['观察者', '探索者', '规划者', '守望者', '策略伙伴'];

export function platformIdentity(
  profile: InvestorProfile | null,
  account: Account,
  savedPlans: number,
): PlatformIdentity {
  const hasHoldings = account.holdings.length > 0;
  const hasRanges = hasHoldings && account.holdings.every((item) => item.range);
  const hasProfile = Boolean(profile);
  const milestones = [
    { label: '建立投资画像', done: hasProfile },
    { label: '录入至少一只持仓', done: hasProfile && hasHoldings },
    {
      label: '为全部持仓设置区间',
      done: hasProfile && hasHoldings && hasRanges,
    },
    {
      label: '保存一套模拟方案',
      done: hasProfile && hasHoldings && hasRanges && savedPlans > 0,
    },
  ];
  const completed = profile
    ? 1 +
      Number(hasHoldings) +
      Number(hasHoldings && hasRanges) +
      Number(hasHoldings && hasRanges && savedPlans > 0)
    : 0;
  const level = completed + 1;
  return {
    level,
    name: levels[level - 1],
    progress: completed * 25,
    next:
      milestones.find((item) => !item.done)?.label ??
      '关键体验已完成，可持续复核画像与方案',
    milestones,
  };
}
