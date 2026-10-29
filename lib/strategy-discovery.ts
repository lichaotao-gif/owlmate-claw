export type DiscoveryItem = {
  id: string;
  title: string;
  authorName: string;
  description: string;
  tags: string[];
  price: number;
  referenceCount: number;
};
export const strategyCategories = [
  '全部',
  'ETF轮动',
  '趋势',
  '红利',
  '低波',
  '风险管理',
  '资产配置',
] as const;
export const strategyMarkets = ['全部市场', 'A股相关', '跨市场'] as const;
export type StrategyCategory = (typeof strategyCategories)[number];
export type StrategyMarket = (typeof strategyMarkets)[number];
const markets: Record<string, StrategyMarket> = {
  'orbit-rotation': '跨市场',
  'night-risk-budget': '跨市场',
  'dividend-balance': 'A股相关',
  'growth-pulse': '跨市场',
  'global-balance': '跨市场',
  'gold-buffer': '跨市场',
};
export function strategyMarket(id: string): StrategyMarket {
  return markets[id] ?? '跨市场';
}
export function discoverStrategies<T extends DiscoveryItem>(
  items: T[],
  options: {
    query: string;
    category: StrategyCategory;
    market: StrategyMarket;
    access: string;
    sort: string;
  },
): T[] {
  const tag: Record<string, string> = {
    ETF轮动: '轮动',
    趋势: '趋势',
    红利: '红利',
    低波: '低波',
    风险管理: '风控',
    资产配置: '配置',
  };
  const query = options.query.trim().toLowerCase();
  const result = items.filter(
    (s) =>
      (options.category === '全部' || s.tags.includes(tag[options.category])) &&
      (options.market === '全部市场' ||
        strategyMarket(s.id) === options.market) &&
      (options.access === '全部获取方式' ||
        (options.access === '免费' ? s.price === 0 : s.price > 0)) &&
      [s.title, s.authorName, s.description, ...s.tags]
        .join(' ')
        .toLowerCase()
        .includes(query),
  );
  if (options.sort === '引用人数')
    result.sort((a, b) => b.referenceCount - a.referenceCount);
  if (options.sort === '名称')
    result.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  return result;
}
