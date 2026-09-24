import type { CustomStrategy } from '@/lib/investment-strategies';

export type CommunityStrategy = {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  description: string;
  summary: string;
  tags: string[];
  assetScope: string;
  rebalance: string;
  entryRules: string[];
  riskControls: string[];
  price: number;
  referenceCount: number;
  updatedLabel: string;
  cover: string;
  coverAlt: string;
  accent: string;
  featured?: boolean;
  newRelease?: boolean;
};

export const communityStrategies: CommunityStrategy[] = [
  {
    id: 'orbit-rotation',
    title: '大类资产强势轮动',
    authorId: 'chaoxi',
    authorName: '潮汐',
    authorAvatar: '/avatars/chaoxi.jpg',
    authorRole: '行业轮动研究者',
    description:
      '在主要宽基、黄金与成长类 ETF 之间比较趋势质量，只保留相对强势且数据完整的候选。',
    summary: '以趋势质量和相对强弱为核心，限制换手的大类资产轮动规则。',
    tags: ['轮动', 'ETF', '趋势'],
    assetScope: '宽基、成长、黄金等大类资产 ETF',
    rebalance: '每日收盘后复核，仅在候选名单变化时调整',
    entryRules: [
      '对最近 25 个交易日的归一化价格进行趋势质量排序。',
      '只保留排名靠前且数据窗口完整的 ETF，避免盘中瞬时信号。',
    ],
    riskControls: [
      '候选趋势转弱或数据缺失时转入现金观察。',
      '单一资产目标仓位不超过组合风险预算上限。',
    ],
    price: 0,
    referenceCount: 328,
    updatedLabel: '今天更新',
    cover: '/strategy-covers/rotation.jpg',
    coverAlt: '紫色轨道与多个资产节点组成的抽象轮动策略封面',
    accent: '#a98bea',
    featured: true,
  },
  {
    id: 'night-risk-budget',
    title: '守夜人风险预算',
    authorId: 'shouyeren',
    authorName: '守夜人',
    authorAvatar: '/avatars/shouyeren.jpg',
    authorRole: '风险预算研究者',
    description:
      '先定义组合可承受回撤，再根据波动与现金缓冲动态调整风险资产比例。',
    summary: '以风险预算为起点，在风险资产与现金之间保持纪律。',
    tags: ['稳健', '风控', '仓位'],
    assetScope: '账户整体仓位与现金',
    rebalance: '每周复核，达到风险阈值时追加检查',
    entryRules: [
      '组合风险预算充足时，按既定上限逐步恢复风险暴露。',
      '任何调整都需要保留最低现金缓冲。',
    ],
    riskControls: [
      '组合回撤达到 12% 时暂停新增风险暴露。',
      '波动快速抬升时分阶段提高现金比例。',
    ],
    price: 0,
    referenceCount: 214,
    updatedLabel: '今天更新',
    cover: '/strategy-covers/defensive.jpg',
    coverAlt: '蓝绿色盾牌与平衡结构组成的抽象风控策略封面',
    accent: '#72d1c0',
  },
  {
    id: 'dividend-balance',
    title: '红利低波均衡配置',
    authorId: 'beichen',
    authorName: '北辰',
    authorAvatar: '/avatars/beichen.jpg',
    authorRole: '稳健配置研究者',
    description:
      '在红利低波、黄金与核心宽基之间建立分散配置，以定期再平衡代替短期预测。',
    summary: '红利、黄金和核心宽基构成的低波动配置框架。',
    tags: ['红利', '低波', '均衡'],
    assetScope: '红利低波 ETF、黄金 ETF 与核心宽基',
    rebalance: '每月复核，偏离目标区间时再平衡',
    entryRules: [
      '按目标区间配置红利、黄金和核心宽基资产。',
      '只有当权重偏离预设范围时才触发再平衡。',
    ],
    riskControls: [
      '单类资产最高权重不超过 35%。',
      '组合回撤扩大时优先保留现金与黄金缓冲。',
    ],
    price: 0,
    referenceCount: 196,
    updatedLabel: '昨天更新',
    cover: '/strategy-covers/defensive.jpg',
    coverAlt: '蓝色盾牌与平衡托盘组成的稳健配置策略封面',
    accent: '#69bdd2',
  },
  {
    id: 'growth-pulse',
    title: '成长趋势脉冲',
    authorId: 'chihu',
    authorName: '赤狐',
    authorAvatar: '/avatars/chihu.jpg',
    authorRole: '趋势成长研究者',
    description:
      '跟随成长资产的中期趋势，同时用波动过滤器控制单一赛道暴露和追高风险。',
    summary: '成长趋势与波动过滤结合的进攻型规则框架。',
    tags: ['成长', '趋势', '进阶'],
    assetScope: '纳指、创业板、半导体等成长类 ETF',
    rebalance: '每周复核，趋势失效时调整',
    entryRules: [
      '趋势方向、强度与持续性同时满足时进入候选。',
      '高波动阶段缩小新建仓位，不追逐单日快速上涨。',
    ],
    riskControls: [
      '单一赛道上限为组合的 30%。',
      '观察回撤达到 15% 时暂停新增并复核趋势。',
    ],
    price: 39,
    referenceCount: 168,
    updatedLabel: '今天更新',
    cover: '/strategy-covers/growth-gold.jpg',
    coverAlt: '珊瑚色能量轨迹穿过金色山峰的抽象成长策略封面',
    accent: '#ef9b9d',
    newRelease: true,
  },
  {
    id: 'global-balance',
    title: '全球资产再平衡',
    authorId: 'changfeng',
    authorName: '长风',
    authorAvatar: '/avatars/changfeng.jpg',
    authorRole: '全球配置研究者',
    description:
      '跨市场配置宽基、科技、黄金与稳健资产，用再平衡纪律降低单一市场依赖。',
    summary: '以跨市场分散和纪律再平衡为核心的长期配置规则。',
    tags: ['全球', '配置', '均衡'],
    assetScope: 'A 股、美股、黄金与稳健类基金',
    rebalance: '每月检查，每季度完成一次纪律再平衡',
    entryRules: [
      '按长期目标区间分配各市场资产，不进行单一方向押注。',
      '偏离区间后分批再平衡，避免一次性大幅调整。',
    ],
    riskControls: [
      '单一市场风险资产占比不超过 45%。',
      '汇率与市场风险同时上升时提高现金缓冲。',
    ],
    price: 29,
    referenceCount: 142,
    updatedLabel: '3 天前更新',
    cover: '/strategy-covers/rotation.jpg',
    coverAlt: '多个星球沿紫色轨道运行的全球配置策略封面',
    accent: '#e2bd7d',
  },
  {
    id: 'gold-buffer',
    title: '黄金防守缓冲',
    authorId: 'shanhai',
    authorName: '山海',
    authorAvatar: '/avatars/shanhai.jpg',
    authorRole: '价值均衡研究者',
    description:
      '把黄金作为组合缓冲而非单向押注，通过目标区间控制配置比例和追涨风险。',
    summary: '以黄金目标区间为核心的组合缓冲和再平衡规则。',
    tags: ['黄金', '防守', '再平衡'],
    assetScope: '黄金 ETF 与账户整体风险资产',
    rebalance: '每月复核，越过目标区间时调整',
    entryRules: [
      '黄金配置低于目标区间且组合风险缓冲不足时分批补充。',
      '价格快速上涨时不追高，以目标权重为唯一调整依据。',
    ],
    riskControls: [
      '黄金目标权重保持在 8%–18%。',
      '不将黄金作为替代现金的短期交易工具。',
    ],
    price: 0,
    referenceCount: 121,
    updatedLabel: '4 天前更新',
    cover: '/strategy-covers/growth-gold.jpg',
    coverAlt: '金色山峰与流动光带组成的黄金防守策略封面',
    accent: '#d7ae67',
    newRelease: true,
  },
];

export function communityStrategyStorageId(id: string) {
  return `personal-market-${id}`;
}

export function toCustomStrategy(strategy: CommunityStrategy): CustomStrategy {
  return {
    id: communityStrategyStorageId(strategy.id),
    name: strategy.title,
    description: strategy.description,
    summary: strategy.summary,
    tags: strategy.tags,
    assetScope: strategy.assetScope,
    rebalance: strategy.rebalance,
    entryRules: strategy.entryRules,
    riskControls: strategy.riskControls,
    createdAt: new Date().toISOString(),
    origin: 'community',
    author: strategy.authorName,
    authorId: strategy.authorId,
    marketId: strategy.id,
    cover: strategy.cover,
  };
}
