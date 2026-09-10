import { summarize, type Account, type HoldingRange } from '@/lib/holdings';

export type ValuationZone = 'low' | 'safe' | 'high' | 'unset';
export type WeightZone = 'under' | 'safe' | 'over' | 'unset';

export const valuationLabels: Record<ValuationZone, string> = {
  low: '低于建议区',
  safe: '建议区间内',
  high: '高于建议区',
  unset: '未设置区间',
};
export const weightLabels: Record<WeightZone, string> = {
  under: '仓位不足',
  safe: '仓位合理',
  over: '仓位过高',
  unset: '未设置目标',
};

export function markerPosition(price: number, range: HoldingRange) {
  if (price < range.valuationLow)
    return Math.max(3, 25 * (price / range.valuationLow));
  if (price <= range.valuationHigh)
    return (
      25 +
      (50 * (price - range.valuationLow)) /
        (range.valuationHigh - range.valuationLow)
    );
  return Math.min(
    97,
    75 + 25 * ((price - range.valuationHigh) / (range.valuationHigh * 0.25)),
  );
}

export function assessAccount(account: Account) {
  const summary = summarize(account);
  const assets = summary.assets.map((holding, index) => {
    const range = holding.range;
    if (!range)
      return {
        ...holding,
        index,
        valuation: 'unset' as ValuationZone,
        weight: 'unset' as WeightZone,
        nearBoundary: false,
        needsReview: true,
        priority: 1,
        action: '先设置区间',
      };
    const valuation: ValuationZone =
      holding.price < range.valuationLow
        ? 'low'
        : holding.price > range.valuationHigh
          ? 'high'
          : 'safe';
    const weight: WeightZone =
      holding.allocation < range.weightLow
        ? 'under'
        : holding.allocation > range.weightHigh
          ? 'over'
          : 'safe';
    const distanceToBoundary =
      valuation === 'safe'
        ? Math.min(
            (holding.price - range.valuationLow) / range.valuationLow,
            (range.valuationHigh - holding.price) / range.valuationHigh,
          ) * 100
        : 0;
    const nearBoundary =
      valuation === 'safe' && distanceToBoundary <= range.alertBuffer;
    let action = '保持观察',
      priority = 0;
    if (valuation === 'high' && weight === 'over') {
      action = '优先减仓评估';
      priority = 5;
    } else if (valuation === 'low' && weight === 'under') {
      action = '进入加仓评估';
      priority = 4;
    } else if (valuation === 'high') {
      action = '暂停增加并复核';
      priority = 4;
    } else if (valuation === 'low') {
      action = weight === 'over' ? '关注集中度' : '复核基本面';
      priority = 3;
    } else if (weight === 'over') {
      action = '复核集中度';
      priority = 3;
    } else if (weight === 'under') {
      action = '复核目标配置';
      priority = 2;
    } else if (nearBoundary) {
      action = '接近区间边界';
      priority = 2;
    }
    return {
      ...holding,
      index,
      valuation,
      weight,
      nearBoundary,
      needsReview: priority > 0,
      priority,
      action,
      distanceToBoundary,
    };
  });
  const configured = assets.filter((asset) => asset.range);
  const marketValue = configured.reduce((sum, asset) => sum + asset.value, 0);
  const count = (zone: ValuationZone) =>
    assets.filter((asset) => asset.valuation === zone).length;
  const value = (zone: ValuationZone) =>
    configured
      .filter((asset) => asset.valuation === zone)
      .reduce((sum, asset) => sum + asset.value, 0);
  return {
    assets,
    configured: configured.length,
    review: assets.filter((asset) => asset.needsReview).length,
    counts: {
      low: count('low'),
      safe: count('safe'),
      high: count('high'),
      unset: count('unset'),
    },
    shares: {
      low: marketValue ? (value('low') / marketValue) * 100 : 0,
      safe: marketValue ? (value('safe') / marketValue) * 100 : 0,
      high: marketValue ? (value('high') / marketValue) * 100 : 0,
    },
  };
}
