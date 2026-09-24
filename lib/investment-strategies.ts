import { marketHistory } from '@/lib/market-data';

export type InvestmentStrategyId =
  | 'balanced-scenario'
  | 'owl-rotation-1'
  | 'owl-rotation-2'
  | 'asset-trend-20'
  | 'asset-breakout-20'
  | 'asset-mean-watch'
  | 'asset-drawdown-guard';

export type InvestmentStrategy = {
  id: InvestmentStrategyId;
  name: string;
  shortName: string;
  type: string;
  summary: string;
  rule: string;
  rebalance: string;
  source: string;
  scope: 'portfolio' | 'asset' | 'both';
};

export type CustomStrategy = {
  id: string;
  name: string;
  description: string;
  summary: string;
  tags: string[];
  assetScope: string;
  rebalance: string;
  entryRules: string[];
  riskControls: string[];
  createdAt: string;
  origin?: 'personal' | 'community';
  author?: string;
  authorId?: string;
  marketId?: string;
  cover?: string;
};

export const CUSTOM_STRATEGIES_KEY = 'owlmate-custom-strategies-v1';
export const CUSTOM_STRATEGIES_EVENT = 'owlmate-custom-strategies-change';

export const investmentStrategies: InvestmentStrategy[] = [
  {
    id: 'balanced-scenario',
    name: 'OwlMate 稳健仓位策略',
    shortName: '稳健仓位',
    type: '仓位情景',
    summary: '根据账户仓位、现金缓冲和风险画像比较不同市场情景。',
    rule: '以目标风险资产仓位为核心输入，分别计算上涨、震荡和下跌情景。',
    rebalance: '由用户调整目标仓位后生成方案，不自动修改持仓。',
    source: 'OwlMate 内置规则',
    scope: 'portfolio',
  },
  {
    id: 'owl-rotation-1',
    name: '大类资产 ETF 轮动 · 猫头鹰策略 ETF 1 号',
    shortName: '猫头鹰轮动 1 号',
    type: '单强轮动',
    summary: '在大类资产 ETF 池中选择动量评分最高的 1 只。',
    rule: '取最近 25 个交易日归一化收盘价，按线性回归斜率 × R² 排序。',
    rebalance: '每个交易日复核排名，目标资金集中到排名第一的 ETF。',
    source: '附件策略 etf_rotation_strategy.py',
    scope: 'both',
  },
  {
    id: 'owl-rotation-2',
    name: '大类资产 ETF 轮动 · 猫头鹰策略 ETF 2 号',
    shortName: '猫头鹰轮动 2 号',
    type: '双强轮动',
    summary: '在大类资产 ETF 池中选择动量评分最高的 2 只并等权。',
    rule: '取最近 25 个交易日归一化收盘价，按线性回归斜率 × R² 排序。',
    rebalance: '仅当入选名单变化时再平衡，入选 ETF 之间等权配置。',
    source: '附件策略 etf_rotation_strategy_v2.py',
    scope: 'both',
  },
  {
    id: 'asset-trend-20',
    name: '单资产 20 日趋势确认',
    shortName: '20 日趋势确认',
    type: '趋势观察',
    summary:
      '结合 20 日均线与近 5 日变化，判断单个资产的短期趋势是否获得确认。',
    rule: '收盘价位于 20 日均线上方，且近 5 个交易日变化为正时，标记为趋势确认。',
    rebalance: '每日收盘后复核，不以盘中瞬时波动触发。',
    source: 'OwlMate 单资产观察规则',
    scope: 'asset',
  },
  {
    id: 'asset-breakout-20',
    name: '单资产 20 日区间突破',
    shortName: '20 日区间突破',
    type: '突破观察',
    summary: '比较当前收盘价与前 20 个交易日高点，识别是否出现区间突破。',
    rule: '只在收盘价达到或超过前 20 日最高收盘价时确认，不使用盘中最高价。',
    rebalance: '每日收盘后复核，突破失效时恢复观察。',
    source: 'OwlMate 单资产观察规则',
    scope: 'asset',
  },
  {
    id: 'asset-mean-watch',
    name: '单资产均值偏离观察',
    shortName: '均值偏离观察',
    type: '区间观察',
    summary: '用 20 日均值和标准差衡量价格偏离程度，帮助识别过度伸展。',
    rule: '当收盘价与 20 日均值的偏离超过 1 个标准差时，进入偏离复核区。',
    rebalance: '每日复核偏离值，仅作观察信号，不单独构成交易依据。',
    source: 'OwlMate 单资产观察规则',
    scope: 'asset',
  },
  {
    id: 'asset-drawdown-guard',
    name: '单资产 60 日回撤保护',
    shortName: '60 日回撤保护',
    type: '风险观察',
    summary: '跟踪当前收盘价相对近 60 日高点的回撤，强化单资产风险复核。',
    rule: '相对近 60 日最高收盘价回撤达到 8% 时，进入风险复核状态。',
    rebalance: '每日收盘后复核，优先检查仓位集中度与组合风险预算。',
    source: 'OwlMate 单资产观察规则',
    scope: 'asset',
  },
];

export const defaultInvestmentStrategyId: InvestmentStrategyId =
  'balanced-scenario';
export const defaultAssetStrategyId: InvestmentStrategyId = 'asset-trend-20';

const rotationUniverse = ['513100', '518880', '510880', '159915'];

function regressionScore(values: number[]) {
  if (values.length < 2 || !values[0]) return null;
  const normalized = values.map((value) => value / values[0]);
  const n = normalized.length;
  const meanX = (n + 1) / 2;
  const meanY = normalized.reduce((sum, value) => sum + value, 0) / n;
  let covariance = 0;
  let varianceX = 0;
  let totalVariance = 0;
  for (let index = 0; index < n; index += 1) {
    const xDelta = index + 1 - meanX;
    covariance += xDelta * (normalized[index] - meanY);
    varianceX += xDelta * xDelta;
    totalVariance += Math.pow(normalized[index] - meanY, 2);
  }
  if (!varianceX) return null;
  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const residual = normalized.reduce((sum, value, index) => {
    const fitted = intercept + slope * (index + 1);
    return sum + Math.pow(value - fitted, 2);
  }, 0);
  const r2 = totalVariance ? Math.max(0, 1 - residual / totalVariance) : 0;
  return slope * r2;
}

export function isInvestmentStrategyId(
  value: unknown,
): value is InvestmentStrategyId {
  return investmentStrategies.some((strategy) => strategy.id === value);
}

export function getInvestmentStrategy(id: InvestmentStrategyId) {
  return (
    investmentStrategies.find((strategy) => strategy.id === id) ??
    investmentStrategies[0]
  );
}

function validCustomStrategy(value: unknown): value is CustomStrategy {
  if (!value || typeof value !== 'object') return false;
  const strategy = value as CustomStrategy;
  return (
    typeof strategy.id === 'string' &&
    /^personal-[a-z0-9-]{6,80}$/i.test(strategy.id) &&
    typeof strategy.name === 'string' &&
    strategy.name.length > 0 &&
    strategy.name.length <= 40 &&
    typeof strategy.description === 'string' &&
    strategy.description.length > 0 &&
    strategy.description.length <= 1200 &&
    typeof strategy.summary === 'string' &&
    strategy.summary.length <= 160 &&
    typeof strategy.assetScope === 'string' &&
    strategy.assetScope.length <= 100 &&
    typeof strategy.rebalance === 'string' &&
    strategy.rebalance.length <= 100 &&
    Array.isArray(strategy.tags) &&
    strategy.tags.length <= 8 &&
    strategy.tags.every((tag) => typeof tag === 'string' && tag.length <= 20) &&
    Array.isArray(strategy.entryRules) &&
    strategy.entryRules.length <= 8 &&
    strategy.entryRules.every(
      (rule) => typeof rule === 'string' && rule.length <= 240,
    ) &&
    Array.isArray(strategy.riskControls) &&
    strategy.riskControls.length <= 8 &&
    strategy.riskControls.every(
      (rule) => typeof rule === 'string' && rule.length <= 240,
    ) &&
    typeof strategy.createdAt === 'string' &&
    !Number.isNaN(Date.parse(strategy.createdAt)) &&
    (strategy.origin === undefined ||
      strategy.origin === 'personal' ||
      strategy.origin === 'community') &&
    (strategy.author === undefined ||
      (typeof strategy.author === 'string' && strategy.author.length <= 40)) &&
    (strategy.authorId === undefined ||
      (typeof strategy.authorId === 'string' &&
        strategy.authorId.length <= 80)) &&
    (strategy.marketId === undefined ||
      (typeof strategy.marketId === 'string' &&
        strategy.marketId.length <= 80)) &&
    (strategy.cover === undefined ||
      (typeof strategy.cover === 'string' && strategy.cover.length <= 240))
  );
}

export function readCustomStrategies(raw: string | null): CustomStrategy[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length > 30)
    throw new Error('Invalid custom strategy list');
  if (!parsed.every(validCustomStrategy))
    throw new Error('Invalid custom strategy');
  return parsed;
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function generateCustomStrategy(
  name: string,
  description: string,
): CustomStrategy {
  const cleanName = name.trim().slice(0, 40);
  const cleanDescription = description.trim().slice(0, 1200);
  const tags = new Set<string>(['个人策略']);
  const tagGroups: Array<[string, string[]]> = [
    ['稳健', ['稳健', '保守', '低风险']],
    ['趋势', ['趋势', '动量', '强势']],
    ['轮动', ['轮动', '排名', '切换']],
    ['价值', ['价值', '低估', '估值']],
    ['红利', ['红利', '分红', '股息']],
    ['成长', ['成长', '科技', '创业板', '纳指']],
    ['黄金', ['黄金', '避险']],
    ['回撤控制', ['回撤', '止损', '风控']],
  ];
  tagGroups.forEach(([tag, words]) => {
    if (includesAny(cleanDescription, words)) tags.add(tag);
  });
  if (tags.size === 1) tags.add('自定义规则');

  const assetScope = includesAny(cleanDescription, ['ETF', 'etf'])
    ? 'ETF 及用户指定基金池'
    : includesAny(cleanDescription, ['股票', '个股'])
      ? '用户自选股票与当前持仓'
      : '当前持仓与用户自选资产';
  const rebalance = includesAny(cleanDescription, ['每天', '每日', '日频'])
    ? '每个交易日收盘后复核'
    : includesAny(cleanDescription, ['每周', '周频'])
      ? '每周复核一次'
      : includesAny(cleanDescription, ['季度', '季频'])
        ? '每季度复核一次'
        : '每月复核，触发风险条件时追加检查';
  const entryRules = [
    includesAny(cleanDescription, ['轮动', '排名', '动量', '趋势', '强势'])
      ? '对候选资产进行趋势与相对强弱排序，只保留排名靠前且数据完整的标的。'
      : includesAny(cleanDescription, ['低估', '估值', '价值'])
        ? '优先筛选进入预设估值区间、基本条件未明显恶化的标的。'
        : '只在文字描述中的核心条件满足，并通过账户风险预算检查后进入候选。',
    includesAny(cleanDescription, ['突破'])
      ? '价格突破观察区间后等待收盘确认，避免仅依据盘中瞬时波动触发。'
      : '信号需要在统一数据窗口内确认，不使用单个时点作为唯一依据。',
  ];
  const drawdownMatch = cleanDescription.match(
    /(?:回撤|止损)[^0-9]{0,8}(\d{1,2}(?:\.\d+)?)\s*[%％]/,
  );
  const drawdownLimit = drawdownMatch ? Number(drawdownMatch[1]) : 15;
  const riskControls = [
    `策略观察回撤达到 ${Math.min(50, Math.max(1, drawdownLimit))}% 时暂停新增风险暴露并复核。`,
    '单一资产目标仓位原则上不超过组合的 30%，超出时提示集中度风险。',
    '保存和切换策略只影响分析结果，不连接券商，也不会自动执行交易。',
  ];
  const idPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: `personal-${idPart}`,
    name: cleanName,
    description: cleanDescription,
    summary:
      cleanDescription.length > 86
        ? `${cleanDescription.slice(0, 86)}…`
        : cleanDescription,
    tags: [...tags].slice(0, 8),
    assetScope,
    rebalance,
    entryRules,
    riskControls,
    createdAt: new Date().toISOString(),
    origin: 'personal',
  };
}

export function customStrategyMarkdown(strategy: CustomStrategy) {
  const bullets = (items: string[]) =>
    items.map((item) => `- ${item}`).join('\n');
  return `# ${strategy.name}\n\n> OwlMate 个人策略\n\n## 策略介绍\n\n${strategy.description}\n\n## 策略摘要\n\n${strategy.summary}\n\n## 标签\n\n${strategy.tags.map((tag) => `\`${tag}\``).join(' ')}\n\n## 适用资产\n\n${strategy.assetScope}\n\n## 复核与调仓频率\n\n${strategy.rebalance}\n\n## 候选与入场规则\n\n${bullets(strategy.entryRules)}\n\n## 风险控制\n\n${bullets(strategy.riskControls)}\n\n## 使用边界\n\n本策略由用户文字描述整理生成，仅用于组合分析、情景试算与规则记录，不构成投资建议，不连接券商，也不会自动执行交易。\n\n生成时间：${new Date(strategy.createdAt).toLocaleString('zh-CN')}\n`;
}

export function rotationSnapshot(id: InvestmentStrategyId) {
  if (id !== 'owl-rotation-1' && id !== 'owl-rotation-2') return null;
  const ranked = rotationUniverse
    .map((code) => {
      const asset = marketHistory[code];
      const bars = asset?.bars.slice(-25) ?? [];
      const score = regressionScore(bars.map((bar) => bar.close));
      return asset && score !== null
        ? {
            code,
            name: asset.name.replace(/(易方达|华泰柏瑞|国泰|华安|华夏)$/u, ''),
            score,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score);
  const holdingSize = id === 'owl-rotation-1' ? 1 : 2;
  return {
    ranked,
    selected: ranked.slice(0, holdingSize),
    available: ranked.length,
    total: rotationUniverse.length,
    window: 25,
  };
}

function assetObservationSignal(id: InvestmentStrategyId, focusCode?: string) {
  if (!id.startsWith('asset-')) return null;
  const asset = focusCode ? marketHistory[focusCode] : undefined;
  const bars = asset?.bars.slice(-65) ?? [];
  if (!asset || bars.length < 21) {
    return {
      tone: 'neutral' as const,
      headline: focusCode ? '当前资产的历史数据不足' : '请先选择一个具体资产',
      detail: '单资产观察策略至少需要 21 个交易日的收盘数据。',
    };
  }
  const closes = bars.map((bar) => bar.close);
  const latest = closes.at(-1)!;
  const last20 = closes.slice(-20);
  const sma20 = last20.reduce((sum, value) => sum + value, 0) / last20.length;
  const variance =
    last20.reduce((sum, value) => sum + Math.pow(value - sma20, 2), 0) /
    last20.length;
  const deviation = Math.sqrt(variance);
  const zScore = deviation ? (latest - sma20) / deviation : 0;
  const fiveDayBase = closes.at(-6) ?? latest;
  const fiveDayChange = fiveDayBase ? latest / fiveDayBase - 1 : 0;
  const previous20 = closes.slice(-21, -1);
  const previousHigh = Math.max(...previous20);
  const peak60 = Math.max(...closes.slice(-60));
  const drawdown = peak60 ? latest / peak60 - 1 : 0;
  const assetName = asset.name.replace(
    /(易方达|华泰柏瑞|国泰|华安|华夏)$/u,
    '',
  );

  if (id === 'asset-trend-20') {
    const confirmed = latest >= sma20 && fiveDayChange > 0;
    return {
      tone: confirmed ? ('positive' as const) : ('neutral' as const),
      headline: confirmed
        ? `${assetName}通过 20 日趋势确认`
        : `${assetName}尚未通过 20 日趋势确认`,
      detail: `当前收盘价${latest >= sma20 ? '高于' : '低于'} 20 日均线，近 5 日变化 ${fiveDayChange >= 0 ? '+' : ''}${(fiveDayChange * 100).toFixed(1)}%。仅用于趋势观察。`,
    };
  }
  if (id === 'asset-breakout-20') {
    const breakout = latest >= previousHigh;
    const distance = previousHigh ? latest / previousHigh - 1 : 0;
    return {
      tone: breakout ? ('positive' as const) : ('neutral' as const),
      headline: breakout
        ? `${assetName}收盘价达到 20 日观察高点`
        : `${assetName}距 20 日观察高点还有 ${Math.abs(distance * 100).toFixed(1)}%`,
      detail: `前 20 日最高收盘价 ${previousHigh.toFixed(3)}，当前 ${latest.toFixed(3)}。收盘确认前不视为突破。`,
    };
  }
  if (id === 'asset-mean-watch') {
    const stretched = Math.abs(zScore) >= 1;
    return {
      tone: stretched ? ('attention' as const) : ('neutral' as const),
      headline: stretched
        ? `${assetName}已进入均值偏离复核区`
        : `${assetName}仍在常规波动区间`,
      detail: `当前价格相对 20 日均值偏离 ${zScore.toFixed(2)} 个标准差。偏离不代表必然回归。`,
    };
  }
  const guardTriggered = drawdown <= -0.08;
  return {
    tone: guardTriggered ? ('attention' as const) : ('neutral' as const),
    headline: guardTriggered
      ? `${assetName}触发 60 日回撤复核`
      : `${assetName}未触发 8% 回撤阈值`,
    detail: `相对近 60 日最高收盘价的回撤为 ${(drawdown * 100).toFixed(1)}%。触发后优先复核仓位与集中度。`,
  };
}

export function strategySignal(
  id: string,
  focusCode?: string,
  customStrategies: CustomStrategy[] = [],
) {
  const custom = customStrategies.find((item) => item.id === id);
  if (custom) {
    return {
      tone: 'personal' as const,
      headline: `已采用个人策略「${custom.name}」`,
      detail: `${custom.entryRules[0]} 当前曲线仍为情景推演，策略不会自动修改持仓。`,
    };
  }
  const safeId = isInvestmentStrategyId(id) ? id : defaultInvestmentStrategyId;
  const strategy = getInvestmentStrategy(safeId);
  const assetSignal = assetObservationSignal(safeId, focusCode);
  if (assetSignal) return { ...assetSignal, strategy };
  const snapshot = rotationSnapshot(safeId);
  if (!snapshot) {
    return {
      tone: 'neutral' as const,
      headline: '按账户风险预算进行仓位情景比较',
      detail: '目标仓位仍由你控制；曲线展示相同假设下的账户变化。',
    };
  }
  const names = snapshot.selected.map((item) => item.name).join('、');
  const focused = focusCode
    ? snapshot.selected.find((item) => item.code === focusCode)
    : undefined;
  const knownFocus = focusCode
    ? snapshot.ranked.find((item) => item.code === focusCode)
    : undefined;
  return {
    tone: focused ? ('positive' as const) : ('neutral' as const),
    headline: focusCode
      ? focused
        ? `${focused.name}进入当前策略候选`
        : knownFocus
          ? `${knownFocus.name}暂未进入当前策略候选`
          : '该持仓不在此策略的原始 ETF 池中'
      : `当前候选：${names || '暂无可计算标的'}`,
    detail: `依据最近 ${snapshot.window} 个交易日的斜率 × R² 排名；原始策略池当前可计算 ${snapshot.available}/${snapshot.total}。切换策略只改变分析规则，不修改实际持仓。`,
    strategy,
  };
}
