export type ExperimentAsset = {
  id: string;
  kind: 'cash' | 'security';
  name: string;
  code?: string;
  amount: number;
};

export type ExperimentTrade = {
  id: string;
  time: string;
  action: '买入' | '卖出' | '调仓';
  asset: string;
  detail: string;
  reason: string;
};

export const investmentMarkets = [
  'A股',
  '港股',
  '美股',
  'ETF',
  '期货',
  '期权',
  '数字货币',
] as const;

export type InvestmentMarket = (typeof investmentMarkets)[number];

export type ExperimentChannel = {
  id: string;
  name: string;
  strategyId: string;
  strategyName: string;
  strategyScope: '通用' | '单品';
  market: InvestmentMarket;
  config: string;
  assets: ExperimentAsset[];
  initialValue: number;
  currentValue: number;
  createdAt: string;
  status: '运行中' | '已暂停';
  trades: ExperimentTrade[];
};

export const EXPERIMENT_CHANNELS_KEY = 'owlmate-experiment-channels-v1';
export const EXPERIMENT_CHANNELS_EVENT = 'owlmate-experiment-channels-change';

export const demoExperimentChannels: ExperimentChannel[] = [
  {
    id: 'experiment-a-share-quality',
    name: 'A股质量成长实验',
    strategyId: 'a-share-quality-growth',
    strategyName: '质量成长双因子',
    strategyScope: '通用',
    market: 'A股',
    config:
      '在沪深300成分股中综合比较盈利质量与中期趋势，每周复核，单一股票目标仓位不超过 30%。',
    assets: [
      { id: 'cash-cny', kind: 'cash', name: '人民币现金', amount: 30000 },
      {
        id: 'asset-600519',
        kind: 'security',
        name: '贵州茅台',
        code: '600519',
        amount: 40000,
      },
      {
        id: 'asset-300750',
        kind: 'security',
        name: '宁德时代',
        code: '300750',
        amount: 30000,
      },
    ],
    initialValue: 100000,
    currentValue: 104360,
    createdAt: '2026-08-28T09:30:00.000Z',
    status: '运行中',
    trades: [],
  },
  {
    id: 'experiment-owl-rotation',
    name: '猫头鹰轮动实验',
    strategyId: 'owl-rotation-1',
    strategyName: '猫头鹰轮动 1 号',
    strategyScope: '通用',
    market: 'ETF',
    config: '每日收盘后复核强势排名，仅在候选名单变化时换仓。',
    assets: [{ id: 'cash', kind: 'cash', name: '人民币现金', amount: 100000 }],
    initialValue: 100000,
    currentValue: 106820,
    createdAt: '2026-09-03T09:30:00.000Z',
    status: '运行中',
    trades: [
      {
        id: 'trade-1',
        time: '09-25 15:02',
        action: '调仓',
        asset: '黄金 ETF → 纳指 ETF',
        detail: '卖出 518880，买入 513100',
        reason: '25日趋势评分排名发生变化',
      },
      {
        id: 'trade-2',
        time: '09-18 15:01',
        action: '买入',
        asset: '黄金 ETF',
        detail: '模拟成交 ¥98,420',
        reason: '进入候选池第一名',
      },
    ],
  },
  {
    id: 'experiment-balanced',
    name: '红利黄金混合实验',
    strategyId: 'balanced-scenario',
    strategyName: '红利低波均衡配置',
    strategyScope: '通用',
    market: 'ETF',
    config: '每月复核，偏离目标区间时自动完成虚拟再平衡。',
    assets: [
      { id: 'cash', kind: 'cash', name: '人民币现金', amount: 32000 },
      {
        id: 'asset-510880',
        kind: 'security',
        name: '红利 ETF',
        code: '510880',
        amount: 46000,
      },
      {
        id: 'asset-518880',
        kind: 'security',
        name: '黄金 ETF',
        code: '518880',
        amount: 22000,
      },
    ],
    initialValue: 100000,
    currentValue: 102460,
    createdAt: '2026-09-12T09:30:00.000Z',
    status: '运行中',
    trades: [
      {
        id: 'trade-3',
        time: '09-23 15:04',
        action: '调仓',
        asset: '红利 ETF / 黄金 ETF',
        detail: '红利减仓 ¥3,200，黄金增仓 ¥3,200',
        reason: '资产权重偏离目标区间',
      },
    ],
  },
  {
    id: 'experiment-single',
    name: '沪深300趋势实验',
    strategyId: 'asset-trend-20',
    strategyName: '单资产 20 日趋势确认',
    strategyScope: '单品',
    market: 'ETF',
    config: '交易对象 510300；每日收盘后检查20日趋势。',
    assets: [
      {
        id: 'asset-510300',
        kind: 'security',
        name: '沪深300 ETF',
        code: '510300',
        amount: 80000,
      },
    ],
    initialValue: 80000,
    currentValue: 78560,
    createdAt: '2026-09-19T09:30:00.000Z',
    status: '运行中',
    trades: [
      {
        id: 'trade-4',
        time: '09-19 15:00',
        action: '买入',
        asset: '沪深300 ETF',
        detail: '以初始持仓开始模拟',
        reason: '创建单品实验',
      },
    ],
  },
  {
    id: 'experiment-index-futures',
    name: '股指期货趋势实验',
    strategyId: 'futures-trend-control',
    strategyName: '股指趋势与保证金控制',
    strategyScope: '单品',
    market: '期货',
    config:
      '跟踪沪深300与中证500股指期货的日线趋势，使用虚拟保证金，波动扩大时主动降低风险敞口。',
    assets: [
      {
        id: 'cash-margin',
        kind: 'cash',
        name: '可用保证金',
        amount: 60000,
      },
      {
        id: 'asset-if-main',
        kind: 'security',
        name: '沪深300股指期货',
        code: 'IF主力',
        amount: 40000,
      },
    ],
    initialValue: 100000,
    currentValue: 97180,
    createdAt: '2026-09-07T09:30:00.000Z',
    status: '运行中',
    trades: [],
  },
  {
    id: 'experiment-crypto-rotation',
    name: '数字货币轮动实验',
    strategyId: 'crypto-strength-rotation',
    strategyName: 'BTC / ETH 强弱轮动',
    strategyScope: '通用',
    market: '数字货币',
    config:
      '每日按收盘数据比较 BTC 与 ETH 的相对强弱，仅做虚拟现货轮动，并保留至少 30% USDT 现金缓冲。',
    assets: [
      { id: 'cash-usdt', kind: 'cash', name: 'USDT 现金', amount: 35000 },
      {
        id: 'asset-btc',
        kind: 'security',
        name: 'BTC / USDT',
        code: 'BTCUSDT',
        amount: 40000,
      },
      {
        id: 'asset-eth',
        kind: 'security',
        name: 'ETH / USDT',
        code: 'ETHUSDT',
        amount: 25000,
      },
    ],
    initialValue: 100000,
    currentValue: 108940,
    createdAt: '2026-09-15T09:30:00.000Z',
    status: '已暂停',
    trades: [],
  },
];

const requiredDemoMarkets: InvestmentMarket[] = [
  'A股',
  'ETF',
  '期货',
  '数字货币',
];

const marketDemoAssets: Record<InvestmentMarket, [string, string]> = {
  A股: ['沪深300指数', '红利低波组合'],
  港股: ['恒生科技指数', '恒生指数'],
  美股: ['纳斯达克100', '标普500'],
  ETF: ['沪深300 ETF', '黄金 ETF'],
  期货: ['沪深300股指期货', '中证500股指期货'],
  期权: ['50ETF认购期权', '50ETF认沽期权'],
  数字货币: ['BTC / USDT', 'ETH / USDT'],
};

export function withSimulatedTradeHistory(
  channel: ExperimentChannel,
): ExperimentChannel {
  if (channel.trades.length >= 6) return channel;
  const heldAssets = channel.assets
    .filter((asset) => asset.kind === 'security')
    .map((asset) => asset.name);
  const fallback = marketDemoAssets[channel.market];
  const primary = heldAssets[0] ?? fallback[0];
  const secondary = heldAssets[1] ?? fallback[1];
  const candidates: ExperimentTrade[] = [
    {
      id: `daily-${channel.id}-08-04`,
      time: '08-04',
      action: '买入',
      asset: primary,
      detail: `模拟建仓 ${primary}，使用 30% 实验资产`,
      reason: '趋势信号首次得到日线确认',
    },
    {
      id: `daily-${channel.id}-08-14`,
      time: '08-14',
      action: '卖出',
      asset: primary,
      detail: `模拟减仓 ${primary}，降低 15% 风险暴露`,
      reason: '短期强度回落至策略观察线下方',
    },
    {
      id: `daily-${channel.id}-08-26`,
      time: '08-26',
      action: '买入',
      asset: secondary,
      detail: `模拟买入 ${secondary}，目标仓位 25%`,
      reason: '相对强弱排名提升并连续两日确认',
    },
    {
      id: `daily-${channel.id}-09-08`,
      time: '09-08',
      action: '调仓',
      asset: `${primary} → ${secondary}`,
      detail: `卖出部分 ${primary}，转入 ${secondary}`,
      reason: '周度排名变化，按策略完成低频再平衡',
    },
    {
      id: `daily-${channel.id}-09-18`,
      time: '09-18',
      action: '卖出',
      asset: secondary,
      detail: `模拟减仓 ${secondary}，保留现金缓冲`,
      reason: '波动扩大，触发日线风险控制条件',
    },
    {
      id: `daily-${channel.id}-09-25`,
      time: '09-25',
      action: '买入',
      asset: primary,
      detail: `模拟重新买入 ${primary}，目标仓位 30%`,
      reason: '趋势重新转强并通过收盘确认',
    },
  ];
  const occupiedDates = new Set(
    channel.trades.map((trade) => trade.time.slice(0, 5)),
  );
  const additions = candidates
    .filter((trade) => !occupiedDates.has(trade.time))
    .slice(0, 6 - channel.trades.length);
  return {
    ...channel,
    trades: [...channel.trades, ...additions].sort((left, right) =>
      right.time.localeCompare(left.time),
    ),
  };
}

function isExperimentChannel(value: unknown): value is ExperimentChannel {
  if (!value || typeof value !== 'object') return false;
  const item = value as ExperimentChannel;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.strategyId === 'string' &&
    typeof item.strategyName === 'string' &&
    (item.strategyScope === '通用' || item.strategyScope === '单品') &&
    (investmentMarkets.includes(item.market as InvestmentMarket) ||
      (item.market as unknown) === 'A股 / ETF') &&
    typeof item.config === 'string' &&
    Array.isArray(item.assets) &&
    item.assets.every(
      (asset) =>
        asset &&
        typeof asset.id === 'string' &&
        (asset.kind === 'cash' || asset.kind === 'security') &&
        typeof asset.name === 'string' &&
        Number.isFinite(asset.amount) &&
        asset.amount >= 0,
    ) &&
    Number.isFinite(item.initialValue) &&
    Number.isFinite(item.currentValue) &&
    typeof item.createdAt === 'string' &&
    (item.status === '运行中' || item.status === '已暂停') &&
    Array.isArray(item.trades)
  );
}

export function readExperimentChannels(raw: string | null) {
  if (!raw) return demoExperimentChannels.map(withSimulatedTradeHistory);
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 50)
    throw new Error('Invalid experiment channels');
  if (!value.every(isExperimentChannel))
    throw new Error('Invalid experiment channel');
  const migrated = value.map((channel) =>
    (channel as { market: string }).market === 'A股 / ETF'
      ? { ...channel, market: 'ETF' as const }
      : channel,
  ) as ExperimentChannel[];
  const missingDemoChannels = requiredDemoMarkets
    .filter((market) => !migrated.some((channel) => channel.market === market))
    .map((market) =>
      demoExperimentChannels.find((channel) => channel.market === market),
    )
    .filter((channel): channel is ExperimentChannel => Boolean(channel));
  return [...migrated, ...missingDemoChannels].map(withSimulatedTradeHistory);
}

export function saveExperimentChannels(channels: ExperimentChannel[]) {
  localStorage.setItem(EXPERIMENT_CHANNELS_KEY, JSON.stringify(channels));
  window.dispatchEvent(new Event(EXPERIMENT_CHANNELS_EVENT));
}

export function experimentTotal(channel: ExperimentChannel) {
  return channel.assets.reduce((sum, asset) => sum + asset.amount, 0);
}

export function experimentAssetMode(channel: ExperimentChannel) {
  const hasCash = channel.assets.some(
    (asset) => asset.kind === 'cash' && asset.amount > 0,
  );
  const hasSecurity = channel.assets.some(
    (asset) => asset.kind === 'security' && asset.amount > 0,
  );
  if (hasCash && hasSecurity) return '混合资产';
  if (hasSecurity) return '持仓启动';
  return '现金启动';
}
