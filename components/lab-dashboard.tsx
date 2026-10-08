'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Beaker,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircleDollarSign,
  FlaskConical,
  ListChecks,
  Pause,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from 'lucide-react';
import { AppRail, navigateWithPageLoad } from '@/components/app-rail';
import { CustomStrategyDialog } from '@/components/custom-strategy-dialog';
import { ThemeSelector } from '@/components/theme-selector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CUSTOM_STRATEGIES_EVENT,
  CUSTOM_STRATEGIES_KEY,
  investmentStrategies,
  readCustomStrategies,
  type CustomStrategy,
} from '@/lib/investment-strategies';
import {
  EXPERIMENT_CHANNELS_KEY,
  experimentAssetMode,
  experimentTotal,
  investmentMarkets,
  readExperimentChannels,
  saveExperimentChannels,
  withSimulatedTradeHistory,
  type ExperimentAsset,
  type ExperimentChannel,
  type ExperimentTrade,
  type InvestmentMarket,
} from '@/lib/experiment-channels';

type DraftHolding = { id: string; name: string; code: string; amount: string };
type DraftAsset = Omit<ExperimentAsset, 'amount'> & { amount: string };
type AssetMode = 'cash' | 'security' | 'mixed';

const steps = ['命名实验', '选择策略', '初始资产'];

const broadMarketStrategies: InvestmentMarket[] = [
  'A股',
  '港股',
  '美股',
  'ETF',
];
const priceSeriesMarkets: InvestmentMarket[] = [...investmentMarkets];
const strategyMarketMap: Record<string, InvestmentMarket[]> = {
  'balanced-scenario': broadMarketStrategies,
  'owl-rotation-1': ['ETF'],
  'owl-rotation-2': ['ETF'],
  'asset-trend-20': priceSeriesMarkets,
  'asset-breakout-20': priceSeriesMarkets,
  'asset-mean-watch': priceSeriesMarkets,
  'asset-drawdown-guard': priceSeriesMarkets,
};
const marketCurrencyMap: Record<InvestmentMarket, string> = {
  A股: '人民币',
  港股: '港币',
  美股: '美元',
  ETF: '人民币',
  期货: '人民币',
  期权: '人民币',
  数字货币: 'USDT',
};

function customStrategyMarkets(strategy: CustomStrategy): InvestmentMarket[] {
  if (
    strategy.marketId &&
    investmentMarkets.includes(strategy.marketId as InvestmentMarket)
  ) {
    return [strategy.marketId as InvestmentMarket];
  }
  const text = `${strategy.assetScope} ${strategy.description} ${strategy.tags.join(' ')}`;
  const matched = investmentMarkets.filter((market) => text.includes(market));
  if (/股票|个股/u.test(text)) matched.push('A股', '港股', '美股');
  return matched.length ? [...new Set(matched)] : priceSeriesMarkets;
}

type CandlePoint = {
  date: Date;
  dateKey: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trade?: ExperimentChannel['trades'][number];
};

const chartRanges = [1, 5, 15, 30, 48] as const;
type ChartRange = (typeof chartRanges)[number];

function chartRangeLabel(range: ChartRange) {
  return range === 48 ? '全部' : `${range}日`;
}

function money(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(
    value,
  );
}

function seededRandom(seed: string) {
  let value = Array.from(seed).reduce(
    (sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeCandleData(channel: ExperimentChannel): CandlePoint[] {
  const random = seededRandom(channel.id);
  const tradingDates: Date[] = [];
  const cursor = new Date('2026-09-27T12:00:00');
  while (tradingDates.length < 48) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      tradingDates.unshift(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const target = channel.initialValue
    ? (channel.currentValue / channel.initialValue) * 100
    : 100;
  const tradeMap = new Map(
    channel.trades.map((trade) => [trade.time.slice(0, 5), trade]),
  );
  let previousClose = 100;

  return tradingDates.map((date, index) => {
    const progress = index / (tradingDates.length - 1);
    const trend = 100 + (target - 100) * progress;
    const wave = Math.sin(index * 0.72) * 0.58 + Math.sin(index * 0.21) * 0.34;
    const noise = (random() - 0.5) * 0.74;
    const close =
      index === tradingDates.length - 1 ? target : trend + wave + noise;
    const open =
      index === 0
        ? 100 + (random() - 0.5) * 0.5
        : previousClose + (random() - 0.5) * 0.48;
    const high = Math.max(open, close) + 0.22 + random() * 0.66;
    const low = Math.min(open, close) - 0.22 - random() * 0.66;
    const dateKey = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    previousClose = close;
    return {
      date,
      dateKey,
      open,
      high,
      low,
      close,
      volume: Math.round(42 + random() * 128 + Math.abs(close - open) * 38),
      trade: tradeMap.get(dateKey),
    };
  });
}

function experimentRiskMetrics(channel: ExperimentChannel) {
  const closes = makeCandleData(channel).map((candle) => candle.close);
  const returns = closes.slice(1).map((close, index) => {
    const previous = closes[index];
    return previous ? close / previous - 1 : 0;
  });
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(1, returns.length - 1);
  const deviation = Math.sqrt(variance);
  const sharpe = deviation ? (mean / deviation) * Math.sqrt(252) : 0;
  let peak = closes[0] ?? 100;
  let maxDrawdown = 0;

  closes.forEach((close) => {
    peak = Math.max(peak, close);
    maxDrawdown = Math.min(maxDrawdown, close / peak - 1);
  });

  return {
    sharpe,
    maxDrawdown: maxDrawdown * 100,
  };
}

function tradeCode(action: ExperimentTrade['action']) {
  if (action === '买入') return 'B';
  if (action === '卖出') return 'S';
  return 'R';
}

function experimentCompactLabel(name: string) {
  const concise = name.replace(/实验|验证/gu, '').replace(/\s+/gu, '');
  return Array.from(concise).slice(0, 2).join('');
}

function experimentMarketTone(market: InvestmentMarket) {
  if (market === '数字货币') return 'crypto';
  if (market === '期货' || market === '期权') return 'derivative';
  if (market === 'ETF') return 'fund';
  return 'equity';
}

type ExperimentChartMode = 'security' | 'portfolio' | 'cash';

function experimentChartMode(channel: ExperimentChannel): ExperimentChartMode {
  const securities = channel.assets.filter(
    (asset) => asset.kind === 'security',
  );
  if (securities.length === 1 && channel.assets.length === 1) {
    return 'security';
  }
  if (
    securities.length === 0 &&
    channel.trades.length === 0 &&
    channel.currentValue === channel.initialValue
  ) {
    return 'cash';
  }
  return 'portfolio';
}

function experimentChartHeading(mode: ExperimentChartMode) {
  if (mode === 'security') return '标的 K 线';
  if (mode === 'cash') return '现金净值曲线';
  return '组合净值曲线';
}

function compactTradeDetail(detail: string) {
  return detail
    .replaceAll('模拟重新买入', 'B')
    .replaceAll('模拟买入', 'B')
    .replaceAll('模拟建仓', 'B')
    .replaceAll('买入', 'B')
    .replaceAll('卖出部分', 'S')
    .replaceAll('模拟减仓', 'S')
    .replaceAll('卖出', 'S')
    .replaceAll('减仓', 'S')
    .replaceAll('转入', '切换至');
}

function MetricHelp({
  title,
  description,
  reading,
  align = 'center',
}: {
  title: string;
  description: string;
  reading: string;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className="experiment-metric-help"
        aria-label={`了解${title}`}
      >
        <CircleHelp size={12} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        className="experiment-metric-popover"
        align={align}
        side="bottom"
        sideOffset={7}
      >
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          <PopoverDescription>{description}</PopoverDescription>
        </PopoverHeader>
        <div className="experiment-metric-reading">
          <b>怎么看</b>
          <p>{reading}</p>
        </div>
        <small>当前为演示口径，基于模拟净值序列计算。</small>
      </PopoverContent>
    </Popover>
  );
}

function ExperimentCandlestickChart({
  channel,
  holding,
}: {
  channel: ExperimentChannel;
  holding?: ExperimentAsset;
}) {
  const allCandles = useMemo(() => {
    if (!holding) return makeCandleData(channel);
    // Holdings have no individual return history yet; retain the demo
    // normalization while separating their series and relevant trade markers.
    return makeCandleData({
      ...channel,
      id: `${channel.id}-${holding.id}`,
      trades: channel.trades.filter(
        (trade) =>
          `${trade.asset} ${trade.detail}`.includes(holding.name) ||
          Boolean(
            holding.code &&
            `${trade.asset} ${trade.detail}`.includes(holding.code),
          ),
      ),
    });
  }, [channel, holding]);
  const [range, setRange] = useState<ChartRange>(30);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const candles = useMemo(() => allCandles.slice(-range), [allCandles, range]);
  const rangeDescription =
    range === 48 ? '全部 48 个交易日' : `近 ${range} 个交易日`;
  const width = 760;
  const height = 318;
  const plot = { left: 48, right: 16, top: 14, bottom: 74 };
  const plotWidth = width - plot.left - plot.right;
  const priceHeight = height - plot.top - plot.bottom;
  const volumeHeight = 36;
  const candleStep = plotWidth / candles.length;
  const candleWidth = Math.min(12, Math.max(4, candleStep * 0.58));
  const values = candles.flatMap((item) => [item.high, item.low]);
  const minPrice = Math.min(...values);
  const maxPrice = Math.max(...values);
  const pricePadding = Math.max((maxPrice - minPrice) * 0.08, 0.3);
  const scaleMin = minPrice - pricePadding;
  const scaleMax = maxPrice + pricePadding;
  const maxVolume = Math.max(...candles.map((item) => item.volume));
  const y = (value: number) =>
    plot.top + ((scaleMax - value) / (scaleMax - scaleMin)) * priceHeight;
  const x = (index: number) => plot.left + candleStep * (index + 0.5);
  const active = activeIndex === null ? null : candles[activeIndex];
  const activeX = activeIndex === null ? null : x(activeIndex);
  const priceTicks = Array.from(
    { length: 5 },
    (_, index) => scaleMax - ((scaleMax - scaleMin) * index) / 4,
  );
  const dateLabelStep = Math.max(1, Math.ceil(candles.length / 6));

  function selectFromPointer(clientX: number, target: HTMLElement) {
    const bounds = target.getBoundingClientRect();
    const svgX = ((clientX - bounds.left) / bounds.width) * width;
    const next = Math.max(
      0,
      Math.min(candles.length - 1, Math.floor((svgX - plot.left) / candleStep)),
    );
    setActiveIndex(next);
  }

  return (
    <figure className="lab-candlestick">
      <div className="lab-chart-range-toolbar">
        <span>{rangeDescription}</span>
        <fieldset>
          <legend className="sr-only">选择 K 线展示周期</legend>
          {chartRanges.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={range === item}
              className={range === item ? 'active' : ''}
              onClick={() => {
                setRange(item);
                setActiveIndex(null);
              }}
            >
              {chartRangeLabel(item)}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="lab-chart-legend">
        <span>
          <i className="bull" />
          上涨
        </span>
        <span>
          <i className="bear" />
          下跌
        </span>
        <span>
          <i className="trade" />
          策略操作
        </span>
        <em>悬停或使用 ← → 查看详情</em>
      </div>
      <div className="lab-chart-surface">
        <button
          type="button"
          className="lab-k-interaction"
          aria-label={`${holding?.name ?? channel.name}${rangeDescription}净值K线图。聚焦后使用左右方向键查看每日行情。`}
          onPointerMove={(event) =>
            selectFromPointer(event.clientX, event.currentTarget)
          }
          onPointerDown={(event) =>
            selectFromPointer(event.clientX, event.currentTarget)
          }
          onPointerLeave={() => setActiveIndex(null)}
          onFocus={() =>
            setActiveIndex((current) => current ?? candles.length - 1)
          }
          onBlur={() => setActiveIndex(null)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            setActiveIndex((current) => {
              const start = current ?? candles.length - 1;
              return Math.max(
                0,
                Math.min(
                  candles.length - 1,
                  start + (event.key === 'ArrowRight' ? 1 : -1),
                ),
              );
            });
          }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
            focusable="false"
          >
            {priceTicks.map((tick) => (
              <g className="lab-k-grid" key={tick}>
                <line
                  x1={plot.left}
                  x2={width - plot.right}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text x={plot.left - 7} y={y(tick) + 3}>
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
            {candles.map((candle, index) => {
              const rising = candle.close >= candle.open;
              const candleX = x(index);
              const bodyTop = y(Math.max(candle.open, candle.close));
              const bodyHeight = Math.max(
                1.8,
                Math.abs(y(candle.open) - y(candle.close)),
              );
              const volumeY =
                height - 25 - (candle.volume / maxVolume) * volumeHeight;
              return (
                <g
                  className={rising ? 'lab-candle bull' : 'lab-candle bear'}
                  key={candle.dateKey}
                >
                  <line
                    className="wick"
                    x1={candleX}
                    x2={candleX}
                    y1={y(candle.high)}
                    y2={y(candle.low)}
                  />
                  <rect
                    className="body"
                    x={candleX - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyHeight}
                    rx="0.7"
                  />
                  <rect
                    className="volume"
                    x={candleX - candleWidth / 2}
                    y={volumeY}
                    width={candleWidth}
                    height={height - 25 - volumeY}
                  />
                  {candle.trade && (
                    <g
                      className={`lab-trade-marker ${candle.trade.action === '卖出' ? 'sell' : 'buy'}`}
                    >
                      <circle
                        cx={candleX}
                        cy={Math.max(10, y(candle.high) - 10)}
                        r="7"
                      />
                      <text
                        x={candleX}
                        y={Math.max(10, y(candle.high) - 10) + 3}
                      >
                        {candle.trade.action === '卖出' ? 'S' : 'B'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            {candles
              .filter(
                (_, index) =>
                  index % dateLabelStep === 0 || index === candles.length - 1,
              )
              .map((candle) => {
                const index = candles.indexOf(candle);
                return (
                  <text
                    className="lab-k-date"
                    x={x(index)}
                    y={height - 7}
                    key={candle.dateKey}
                  >
                    {candle.dateKey}
                  </text>
                );
              })}
            {active && activeX !== null && (
              <g className="lab-crosshair" aria-hidden="true">
                <line
                  x1={activeX}
                  x2={activeX}
                  y1={plot.top}
                  y2={height - 25}
                />
                <line
                  x1={plot.left}
                  x2={width - plot.right}
                  y1={y(active.close)}
                  y2={y(active.close)}
                />
                <circle cx={activeX} cy={y(active.close)} r="3.5" />
              </g>
            )}
          </svg>
        </button>
        {active && activeIndex !== null && (
          <output
            className={`lab-k-tooltip${activeIndex > candles.length * 0.64 ? ' align-right' : ''}`}
            style={{ left: `${(x(activeIndex) / width) * 100}%` }}
          >
            <div className="lab-k-tooltip-heading">
              <b>
                {active.date.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  weekday: 'short',
                })}
              </b>
              <span className={active.close >= active.open ? 'up' : 'down'}>
                {active.close >= active.open ? '上涨' : '下跌'}{' '}
                {Math.abs(
                  ((active.close - active.open) / active.open) * 100,
                ).toFixed(2)}
                %
              </span>
            </div>
            <dl>
              <div>
                <dt>开</dt>
                <dd>{active.open.toFixed(2)}</dd>
              </div>
              <div>
                <dt>高</dt>
                <dd>{active.high.toFixed(2)}</dd>
              </div>
              <div>
                <dt>低</dt>
                <dd>{active.low.toFixed(2)}</dd>
              </div>
              <div>
                <dt>收</dt>
                <dd>{active.close.toFixed(2)}</dd>
              </div>
              <div>
                <dt>成交量</dt>
                <dd>{active.volume.toFixed(0)} 万份</dd>
              </div>
            </dl>
            {active.trade ? (
              <div className="lab-k-trade-detail">
                <span>{active.trade.action}</span>
                <b>{active.trade.asset}</b>
                <p>{active.trade.detail}</p>
                <small>{active.trade.reason}</small>
              </div>
            ) : (
              <p className="lab-k-no-trade">当日无策略操作</p>
            )}
          </output>
        )}
      </div>
      <figcaption>
        {holding
          ? '单持仓 K 线为模拟示意，使用通道收益归一化至 100，尚未接入该标的独立行情；B 为买入/调仓，S 为卖出。'
          : '净值以实验初始日为 100；B 为买入/调仓，S 为卖出。图表数据为模拟实验记录。'}
      </figcaption>
    </figure>
  );
}

function ExperimentChartCard({ channel }: { channel: ExperimentChannel }) {
  const mode = experimentChartMode(channel);
  const securities = channel.assets.filter(
    (asset) => asset.kind === 'security',
  );
  const [view, setView] = useState('curve');
  const [holdingId, setHoldingId] = useState(securities[0]?.id ?? '');
  const holding =
    securities.find((asset) => asset.id === holdingId) ?? securities[0];
  const hasMultipleHoldings = securities.length > 1;

  return (
    <div className="experiment-chart-card">
      <div className="lab-card-heading">
        <div>
          <span>实验表现</span>
          <b>
            {hasMultipleHoldings && view === 'candles'
              ? '持仓 K 线'
              : experimentChartHeading(mode)}
          </b>
        </div>
        <small>非未来预测</small>
      </div>
      {hasMultipleHoldings ? (
        <Tabs
          value={view}
          onValueChange={setView}
          className="experiment-chart-tabs"
        >
          <div className="experiment-chart-toolbar">
            <TabsList
              aria-label="图表类型"
              className="experiment-chart-tab-list"
            >
              <TabsTrigger value="curve">净值曲线</TabsTrigger>
              <TabsTrigger value="candles">持仓 K 线</TabsTrigger>
            </TabsList>
            {view === 'candles' && (
              <label className="experiment-chart-holding-picker">
                <span>查看持仓</span>
                <select
                  aria-label="查看持仓"
                  value={holding.id}
                  onChange={(event) => setHoldingId(event.target.value)}
                >
                  {securities.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                      {asset.code ? ` · ${asset.code}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <TabsContent value="curve">
            <ExperimentNetValueChart channel={channel} mode="portfolio" />
          </TabsContent>
          <TabsContent value="candles">
            <ExperimentCandlestickChart
              key={holding.id}
              channel={channel}
              holding={holding}
            />
          </TabsContent>
        </Tabs>
      ) : mode === 'security' ? (
        <ExperimentCandlestickChart channel={channel} />
      ) : (
        <ExperimentNetValueChart channel={channel} mode={mode} />
      )}
    </div>
  );
}

type NetValuePoint = CandlePoint & {
  value: number;
  benchmark?: number;
};

const demoBenchmarkReturns: Record<InvestmentMarket, number> = {
  A股: 2.3,
  港股: 1.4,
  美股: 3.2,
  ETF: 1.9,
  期货: 0.8,
  期权: -0.6,
  数字货币: 4.6,
};

function ExperimentNetValueChart({
  channel,
  mode,
}: {
  channel: ExperimentChannel;
  mode: Exclude<ExperimentChartMode, 'security'>;
}) {
  const allPoints = useMemo<NetValuePoint[]>(() => {
    const candles = makeCandleData(channel);
    const firstClose = candles[0]?.close || 100;
    const benchmarkReturn = demoBenchmarkReturns[channel.market];
    return candles.map((candle, index) => {
      const progress = index / Math.max(1, candles.length - 1);
      const value = mode === 'cash' ? 100 : (candle.close / firstClose) * 100;
      const benchmark =
        mode === 'cash'
          ? undefined
          : 100 + benchmarkReturn * progress + Math.sin(index * 0.38) * 0.24;
      return { ...candle, value, benchmark };
    });
  }, [channel, mode]);
  const [range, setRange] = useState<ChartRange>(30);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = useMemo(() => allPoints.slice(-range), [allPoints, range]);
  const rangeDescription =
    range === 48 ? '全部 48 个交易日' : `近 ${range} 个交易日`;
  const width = 760;
  const height = 286;
  const plot = { left: 48, right: 16, top: 18, bottom: 34 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const values = points.flatMap((point) =>
    point.benchmark === undefined
      ? [point.value]
      : [point.value, point.benchmark],
  );
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.max((maxValue - minValue) * 0.14, 0.5);
  const scaleMin = minValue - padding;
  const scaleMax = maxValue + padding;
  const xStep = plotWidth / Math.max(1, points.length - 1);
  const x = (index: number) =>
    points.length === 1 ? plot.left + plotWidth / 2 : plot.left + xStep * index;
  const y = (value: number) =>
    plot.top + ((scaleMax - value) / (scaleMax - scaleMin)) * plotHeight;
  const linePath = (key: 'value' | 'benchmark') =>
    points
      .filter((point) => point[key] !== undefined)
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point[key] as number).toFixed(2)}`,
      )
      .join(' ');
  const valuePath = linePath('value');
  const areaPath = `${valuePath} L ${x(points.length - 1).toFixed(2)} ${(height - plot.bottom).toFixed(2)} L ${x(0).toFixed(2)} ${(height - plot.bottom).toFixed(2)} Z`;
  const active = activeIndex === null ? null : points[activeIndex];
  const activeX = activeIndex === null ? null : x(activeIndex);
  const previousActive =
    activeIndex === null || activeIndex === 0 ? null : points[activeIndex - 1];
  const dailyReturn =
    active && previousActive
      ? ((active.value - previousActive.value) / previousActive.value) * 100
      : 0;
  const cumulativeReturn = active ? active.value - 100 : 0;
  const valueTicks = Array.from(
    { length: 5 },
    (_, index) => scaleMax - ((scaleMax - scaleMin) * index) / 4,
  );
  const dateLabelStep = Math.max(1, Math.ceil(points.length / 6));

  function selectFromPointer(clientX: number, target: HTMLElement) {
    const bounds = target.getBoundingClientRect();
    const svgX = ((clientX - bounds.left) / bounds.width) * width;
    const next = Math.max(
      0,
      Math.min(
        points.length - 1,
        Math.round((svgX - plot.left) / Math.max(1, xStep)),
      ),
    );
    setActiveIndex(next);
  }

  return (
    <figure className="lab-candlestick lab-net-value-chart">
      <div className="lab-chart-range-toolbar">
        <span>{rangeDescription}</span>
        <fieldset>
          <legend className="sr-only">选择净值曲线展示周期</legend>
          {chartRanges.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={range === item}
              className={range === item ? 'active' : ''}
              onClick={() => {
                setRange(item);
                setActiveIndex(null);
              }}
            >
              {chartRangeLabel(item)}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="lab-chart-legend" aria-hidden="true">
        <span>
          <i className="portfolio-line" />
          {mode === 'cash' ? '现金净值' : '组合净值'}
        </span>
        {mode === 'portfolio' && (
          <span>
            <i className="benchmark-line" />
            模拟基准
          </span>
        )}
        {mode === 'portfolio' && (
          <div
            className="lab-trade-code-legend"
            aria-label="策略操作代号：B 表示买入，S 表示卖出，R 表示调仓"
          >
            <span>
              <b className="signal-b">B</b>买入
            </span>
            <span>
              <b className="signal-s">S</b>卖出
            </span>
            <span>
              <b className="signal-r">R</b>调仓
            </span>
          </div>
        )}
        <em>悬停或使用 ← → 查看详情</em>
      </div>
      <div className="lab-chart-surface">
        <button
          type="button"
          className="lab-k-interaction"
          aria-label={`${channel.name}${rangeDescription}${mode === 'cash' ? '现金' : '组合'}净值曲线。B 表示买入，S 表示卖出，R 表示调仓。聚焦后使用左右方向键查看每日净值。`}
          onPointerMove={(event) =>
            selectFromPointer(event.clientX, event.currentTarget)
          }
          onPointerDown={(event) =>
            selectFromPointer(event.clientX, event.currentTarget)
          }
          onPointerLeave={() => setActiveIndex(null)}
          onFocus={() =>
            setActiveIndex((current) => current ?? points.length - 1)
          }
          onBlur={() => setActiveIndex(null)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            setActiveIndex((current) => {
              const start = current ?? points.length - 1;
              return Math.max(
                0,
                Math.min(
                  points.length - 1,
                  start + (event.key === 'ArrowRight' ? 1 : -1),
                ),
              );
            });
          }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient
                id="lab-net-area-gradient"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#a98bff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#a98bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {valueTicks.map((tick) => (
              <g className="lab-k-grid" key={tick}>
                <line
                  x1={plot.left}
                  x2={width - plot.right}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text x={plot.left - 7} y={y(tick) + 3}>
                  {tick.toFixed(1)}
                </text>
              </g>
            ))}
            {points.length > 1 && (
              <path className="lab-net-area" d={areaPath} />
            )}
            {mode === 'portfolio' && (
              <path className="lab-net-benchmark" d={linePath('benchmark')} />
            )}
            <path
              className={`lab-net-line${mode === 'cash' ? ' cash' : ''}`}
              d={valuePath}
            />
            {points.length === 1 && (
              <circle
                className="lab-net-current-point"
                cx={x(0)}
                cy={y(points[0].value)}
                r="4"
              />
            )}
            {mode === 'portfolio' &&
              points.map(
                (point, index) =>
                  point.trade && (
                    <g
                      className={`lab-net-trade-marker signal-${tradeCode(point.trade.action).toLowerCase()}`}
                      key={`${point.dateKey}-${point.trade.id}`}
                    >
                      <circle cx={x(index)} cy={y(point.value)} r="7" />
                      <text x={x(index)} y={y(point.value) + 3}>
                        {tradeCode(point.trade.action)}
                      </text>
                    </g>
                  ),
              )}
            {points
              .filter(
                (_, index) =>
                  index % dateLabelStep === 0 || index === points.length - 1,
              )
              .map((point) => {
                const index = points.indexOf(point);
                return (
                  <text
                    className="lab-k-date"
                    x={x(index)}
                    y={height - 8}
                    key={point.dateKey}
                  >
                    {point.dateKey}
                  </text>
                );
              })}
            {active && activeX !== null && (
              <g className="lab-crosshair" aria-hidden="true">
                <line
                  x1={activeX}
                  x2={activeX}
                  y1={plot.top}
                  y2={height - plot.bottom}
                />
                <line
                  x1={plot.left}
                  x2={width - plot.right}
                  y1={y(active.value)}
                  y2={y(active.value)}
                />
                <circle cx={activeX} cy={y(active.value)} r="3.5" />
              </g>
            )}
          </svg>
        </button>
        {active && activeIndex !== null && (
          <output
            className={`lab-k-tooltip lab-net-tooltip${activeIndex > points.length * 0.64 ? ' align-right' : ''}`}
            style={{ left: `${(x(activeIndex) / width) * 100}%` }}
          >
            <div className="lab-k-tooltip-heading">
              <b>
                {active.date.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  weekday: 'short',
                })}
              </b>
              <span className={dailyReturn >= 0 ? 'up' : 'down'}>
                {dailyReturn >= 0 ? '+' : ''}
                {dailyReturn.toFixed(2)}%
              </span>
            </div>
            <dl>
              <div>
                <dt>{mode === 'cash' ? '现金净值' : '组合净值'}</dt>
                <dd>{active.value.toFixed(2)}</dd>
              </div>
              <div>
                <dt>累计收益</dt>
                <dd>
                  {cumulativeReturn >= 0 ? '+' : ''}
                  {cumulativeReturn.toFixed(2)}%
                </dd>
              </div>
              {active.benchmark !== undefined && (
                <div>
                  <dt>模拟基准</dt>
                  <dd>{active.benchmark.toFixed(2)}</dd>
                </div>
              )}
            </dl>
            {active.trade ? (
              <div className="lab-k-trade-detail">
                <span>{tradeCode(active.trade.action)}</span>
                <b>{active.trade.asset}</b>
                <p>{compactTradeDetail(active.trade.detail)}</p>
                <small>{active.trade.reason}</small>
              </div>
            ) : (
              <p className="lab-k-no-trade">
                {mode === 'cash' ? '现金通道尚未建仓' : '当日无策略操作'}
              </p>
            )}
          </output>
        )}
      </div>
      <figcaption>
        {mode === 'cash'
          ? '现金通道尚未建仓；净值以实验初始日为 100。'
          : '组合净值以实验初始日为 100；实线为组合，虚线为模拟基准。B 表示买入，S 表示卖出，R 表示调仓。'}
      </figcaption>
    </figure>
  );
}

function ExperimentCard({
  channel,
  active,
  onSelect,
}: {
  channel: ExperimentChannel;
  active: boolean;
  onSelect: () => void;
}) {
  const change = channel.initialValue
    ? ((channel.currentValue - channel.initialValue) / channel.initialValue) *
      100
    : 0;
  const positive = change >= 0;
  return (
    <button
      className={`experiment-card ${channel.status === '运行中' ? 'is-running' : 'is-paused'}${active ? ' active' : ''}`}
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`${channel.name}，策略：${channel.strategyName}，当前实验资产 ¥${money(channel.currentValue)}`}
      title={`${channel.name} · ${channel.strategyName}`}
    >
      <div className="experiment-card-top">
        <span
          className={`experiment-status ${channel.status === '运行中' ? 'running' : ''}`}
        >
          {channel.status === '运行中' ? (
            <Play size={11} />
          ) : (
            <Pause size={11} />
          )}
          {channel.status}
        </span>
        <span>{channel.strategyScope}</span>
      </div>
      <div className="experiment-card-title">
        <span
          className={`experiment-card-symbol tone-${experimentMarketTone(channel.market)}`}
        >
          <FlaskConical size={17} aria-hidden="true" />
          <b className="experiment-card-compact-label" aria-hidden="true">
            {experimentCompactLabel(channel.name)}
          </b>
        </span>
        <div>
          <b>{channel.name}</b>
          <small>策略：{channel.strategyName}</small>
        </div>
      </div>
      <div className="experiment-card-value">
        <span>当前实验资产</span>
        <b>¥{money(channel.currentValue)}</b>
      </div>
      <div className="experiment-card-meta">
        <span>{experimentAssetMode(channel)}</span>
        <strong className={positive ? 'up' : 'down'}>
          {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {positive ? '+' : ''}
          {change.toFixed(2)}%
        </strong>
      </div>
      <i className="experiment-card-arrow">
        <ArrowRight size={15} />
      </i>
    </button>
  );
}

export function LabDashboard() {
  const [channels, setChannels] = useState<ExperimentChannel[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [customStrategyOpen, setCustomStrategyOpen] = useState(false);
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>(
    [],
  );
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const [newUserDemo, setNewUserDemo] = useState(false);
  const [channelsCollapsed, setChannelsCollapsed] = useState(false);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [assetEditorOpen, setAssetEditorOpen] = useState(false);
  const [assetDrafts, setAssetDrafts] = useState<DraftAsset[]>([]);
  const [assetEditorError, setAssetEditorError] = useState('');
  const [strategyEditorOpen, setStrategyEditorOpen] = useState(false);
  const [strategyDraftId, setStrategyDraftId] = useState('');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [strategyId, setStrategyId] = useState('');
  const [market, setMarket] = useState<InvestmentMarket | ''>('');
  const [scope, setScope] = useState<'通用' | '单品'>('通用');
  const [assetMode, setAssetMode] = useState<AssetMode>('cash');
  const [cash, setCash] = useState('100000');
  const [holdings, setHoldings] = useState<DraftHolding[]>([
    { id: 'holding-1', name: '沪深300 ETF', code: '510300', amount: '50000' },
  ]);

  const strategies = [
    ...customStrategies.map((item) => ({
      id: item.id,
      name: item.name,
      summary: item.summary,
      rule: item.description,
      scope: item.assetScope.includes('单')
        ? ('单品' as const)
        : ('通用' as const),
      markets: customStrategyMarkets(item),
    })),
    ...investmentStrategies.map((item) => ({
      id: item.id,
      name: item.shortName,
      summary: item.summary,
      rule: `${item.rule} ${item.rebalance}`,
      scope: item.scope === 'asset' ? ('单品' as const) : ('通用' as const),
      markets: strategyMarketMap[item.id] ?? priceSeriesMarkets,
    })),
  ];
  const availableStrategies = market
    ? strategies.filter((strategy) => strategy.markets.includes(market))
    : [];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const next = readExperimentChannels(
          localStorage.getItem(EXPERIMENT_CHANNELS_KEY),
        );
        setChannels(next);
        setSelectedId((current) => current || next[0]?.id || '');
      } catch {
        setNotice('本机实验数据读取失败，已显示演示实验。');
        const next = readExperimentChannels(null);
        setChannels(next);
        setSelectedId(next[0]?.id ?? '');
      }
      const shouldCreate =
        new URLSearchParams(window.location.search).get('create') === '1';
      if (shouldCreate) {
        try {
          const pending = JSON.parse(
            localStorage.getItem('owlmate-new-experiment-strategy') ?? 'null',
          ) as { id?: string; name?: string } | null;
          if (pending?.id) setStrategyId(pending.id);
          if (pending?.name) setName(`${pending.name}实验`);
          localStorage.removeItem('owlmate-new-experiment-strategy');
        } catch {
          // The creation flow remains usable when the handoff payload is invalid.
        }
        setCreateOpen(true);
        window.history.replaceState(null, '', '/holdings');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function loadCustomStrategies() {
      try {
        setCustomStrategies(
          readCustomStrategies(localStorage.getItem(CUSTOM_STRATEGIES_KEY)),
        );
      } catch {
        setCustomStrategies([]);
      }
    }
    loadCustomStrategies();
    window.addEventListener(CUSTOM_STRATEGIES_EVENT, loadCustomStrategies);
    return () =>
      window.removeEventListener(CUSTOM_STRATEGIES_EVENT, loadCustomStrategies);
  }, []);

  const visibleChannels = newUserDemo ? [] : channels;
  const selected =
    visibleChannels.find((channel) => channel.id === selectedId) ??
    visibleChannels[0];
  const riskMetrics = useMemo(
    () => (selected ? experimentRiskMetrics(selected) : null),
    [selected],
  );
  const switchableStrategies = selected
    ? [
        ...(strategies.some((strategy) => strategy.id === selected.strategyId)
          ? []
          : [
              {
                id: selected.strategyId,
                name: selected.strategyName,
                summary: '当前实验正在使用的策略',
                rule: selected.config,
                scope: selected.strategyScope,
                markets: [selected.market],
              },
            ]),
        ...strategies.filter((strategy) =>
          strategy.markets.includes(selected.market),
        ),
      ]
    : [];
  const totalValue = visibleChannels.reduce(
    (sum, channel) => sum + channel.currentValue,
    0,
  );
  const runningCount = visibleChannels.filter(
    (channel) => channel.status === '运行中',
  ).length;

  function resetDraft() {
    setStep(0);
    setName('');
    setStrategyId('');
    setMarket('');
    setScope('通用');
    setAssetMode('cash');
    setCash('100000');
    setHoldings([
      {
        id: `holding-${Date.now()}`,
        name: '沪深300 ETF',
        code: '510300',
        amount: '50000',
      },
    ]);
  }

  function createExperiment() {
    const strategy = availableStrategies.find((item) => item.id === strategyId);
    const assets: ExperimentAsset[] = [];
    if (assetMode !== 'security' && Number(cash) > 0) {
      assets.push({
        id: 'cash',
        kind: 'cash',
        name: `${market ? marketCurrencyMap[market] : '人民币'}现金`,
        amount: Number(cash),
      });
    }
    if (assetMode !== 'cash') {
      holdings.forEach((holding) => {
        if (holding.name.trim() && Number(holding.amount) > 0) {
          assets.push({
            id: holding.id,
            kind: 'security',
            name: holding.name.trim(),
            code: holding.code.trim(),
            amount: Number(holding.amount),
          });
        }
      });
    }
    const initialValue = assets.reduce((sum, asset) => sum + asset.amount, 0);
    if (!name.trim() || !market || !strategy || initialValue <= 0) return;
    const channel = withSimulatedTradeHistory({
      id: `experiment-${Date.now()}`,
      name: name.trim().slice(0, 32),
      strategyId: strategy.id,
      strategyName: strategy.name,
      strategyScope: scope,
      market,
      config: strategy.rule.slice(0, 500),
      assets,
      initialValue,
      currentValue: initialValue,
      createdAt: new Date().toISOString(),
      status: '运行中',
      trades: [],
    });
    const next = [channel, ...channels];
    setChannels(next);
    setSelectedId(channel.id);
    setNewUserDemo(false);
    saveExperimentChannels(next);
    setCreateOpen(false);
    setNotice(`「${channel.name}」已经开始运行。`);
    resetDraft();
  }

  function toggleStatus() {
    if (!selected) return;
    if (selected.status === '运行中') {
      setPauseConfirmOpen(true);
      return;
    }
    const next = channels.map((channel) =>
      channel.id === selected.id
        ? {
            ...channel,
            status: '运行中' as const,
          }
        : channel,
    );
    setChannels(next);
    saveExperimentChannels(next);
    setNotice(`「${selected.name}」已继续运行。`);
  }

  function confirmPauseExperiment() {
    if (!selected) return;
    const next = channels.map((channel) =>
      channel.id === selected.id
        ? { ...channel, status: '已暂停' as const }
        : channel,
    );
    setChannels(next);
    saveExperimentChannels(next);
    setPauseConfirmOpen(false);
    setNotice(`「${selected.name}」已暂停，不再产生新的模拟操作。`);
  }

  function openStrategyEditor() {
    if (!selected) return;
    setStrategyDraftId(selected.strategyId);
    setStrategyEditorOpen(true);
  }

  function saveStrategyChange() {
    if (!selected) return;
    const strategy = switchableStrategies.find(
      (item) => item.id === strategyDraftId,
    );
    if (!strategy) return;
    const next = channels.map((channel) =>
      channel.id === selected.id
        ? {
            ...channel,
            strategyId: strategy.id,
            strategyName: strategy.name,
            strategyScope: strategy.scope,
            config: strategy.rule.slice(0, 500),
          }
        : channel,
    );
    setChannels(next);
    saveExperimentChannels(next);
    setStrategyEditorOpen(false);
    setNotice(`「${selected.name}」已切换为「${strategy.name}」。`);
  }

  function openAssetEditor() {
    if (!selected) return;
    setAssetDrafts(
      selected.assets.map((asset) => ({
        ...asset,
        code: asset.code ?? '',
        amount: String(asset.amount),
      })),
    );
    setAssetEditorError('');
    setAssetEditorOpen(true);
  }

  function updateAssetDraft(
    id: string,
    field: 'name' | 'code' | 'amount',
    value: string,
  ) {
    setAssetDrafts((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, [field]: value } : asset,
      ),
    );
    setAssetEditorError('');
  }

  function addAssetDraft(kind: ExperimentAsset['kind']) {
    const currency = selected ? marketCurrencyMap[selected.market] : '人民币';
    setAssetDrafts((current) => [
      ...current,
      {
        id: `${kind}-${Date.now()}`,
        kind,
        name: kind === 'cash' ? `${currency}现金` : '',
        code: '',
        amount: '',
      },
    ]);
    setAssetEditorError('');
  }

  function saveAssetChanges() {
    if (!selected) return;
    const hasInvalidAsset = assetDrafts.some(
      (asset) =>
        !asset.name.trim() ||
        !Number.isFinite(Number(asset.amount)) ||
        Number(asset.amount) <= 0,
    );
    if (!assetDrafts.length || hasInvalidAsset) {
      setAssetEditorError(
        assetDrafts.length
          ? '请补全每项资产名称，并填写大于 0 的资产金额。'
          : '至少保留一项现金或持仓资产。',
      );
      return;
    }

    const assets: ExperimentAsset[] = assetDrafts.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      name: asset.name.trim(),
      ...(asset.kind === 'security' && asset.code?.trim()
        ? { code: asset.code.trim() }
        : {}),
      amount: Number(asset.amount),
    }));
    const initialValue = assets.reduce((sum, asset) => sum + asset.amount, 0);
    const accumulatedProfit = selected.currentValue - selected.initialValue;
    const next = channels.map((channel) =>
      channel.id === selected.id
        ? {
            ...channel,
            assets,
            initialValue,
            currentValue: Math.max(0, initialValue + accumulatedProfit),
          }
        : channel,
    );
    setChannels(next);
    saveExperimentChannels(next);
    setAssetEditorOpen(false);
    setNotice(`「${selected.name}」的初始资产已更新。`);
  }

  const canContinue =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 &&
      Boolean(
        market &&
        strategyId &&
        availableStrategies.some((strategy) => strategy.id === strategyId),
      )) ||
    (step === 2 &&
      ((assetMode !== 'security' && Number(cash) > 0) ||
        (assetMode !== 'cash' &&
          holdings.some((item) => Number(item.amount) > 0))));

  return (
    <div className="app-shell lab-shell">
      <AppRail />
      <div className="workspace lab-workspace">
        <header className="topbar lab-topbar">
          <div className="wordmark">
            OwlMate <span className="wordmark-product">实验室</span>
            <span className="brand-beta">BETA</span>
          </div>
          <div className="header-right">
            <button
              className={`lab-demo-toggle${newUserDemo ? ' active' : ''}`}
              aria-pressed={newUserDemo}
              aria-label={newUserDemo ? '退出新用户演示' : '查看新用户演示'}
              onClick={() => {
                setNewUserDemo((current) => !current);
                setNotice('');
              }}
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>{newUserDemo ? '退出演示' : '新用户演示'}</span>
            </button>
            <Link
              href="/strategies"
              className="lab-strategy-link"
              onClick={(event) => navigateWithPageLoad(event, '/strategies')}
            >
              策略广场 <ArrowRight size={14} />
            </Link>
            <ThemeSelector />
          </div>
        </header>

        <main className="lab-main">
          <section className="lab-hero">
            <div>
              <span className="eyebrow">
                <Beaker size={13} /> QUANT RESEARCH WORKSPACE
              </span>
              <h1>
                把每个想法，放进独立实验里运行
                <span className="heading-dot" />
              </h1>
              <p>
                一个实验绑定一个策略和一套独立虚拟资产。用现金、持仓或两者混合启动，观察策略实际执行后的历史结果。
              </p>
            </div>
            <button
              className="lab-create-button"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={17} /> 新建实验
            </button>
          </section>

          {notice && (
            <output className="lab-notice" aria-live="polite">
              <Check size={14} /> {notice}
            </output>
          )}

          <section className="lab-summary-grid" aria-label="实验概览">
            <article>
              <span>
                <FlaskConical size={15} /> 全部实验
              </span>
              <b>{visibleChannels.length}</b>
              <small>{runningCount} 个正在运行</small>
            </article>
            <article>
              <span>
                <CircleDollarSign size={15} /> 实验资产总额
              </span>
              <b>¥{money(totalValue)}</b>
              <small>各实验相互独立，不合并交易</small>
            </article>
            <article>
              <span>
                <Activity size={15} /> 已记录操作
              </span>
              <b>
                {visibleChannels.reduce(
                  (sum, item) => sum + item.trades.length,
                  0,
                )}
              </b>
              <small>只展示已经发生的模拟动作</small>
            </article>
          </section>

          {!selected && (
            <section
              className="lab-empty-onboarding"
              aria-labelledby="lab-empty-title"
            >
              <div className="lab-empty-intro">
                <span className="lab-empty-icon" aria-hidden="true">
                  <FlaskConical size={25} />
                </span>
                <div>
                  <span className="eyebrow">START YOUR FIRST EXPERIMENT</span>
                  <h2 id="lab-empty-title">还没有实验，从一个想法开始</h2>
                  <p>
                    每个实验都是独立通道，策略、资产与操作记录互不影响。按下面三步即可开始观察。
                  </p>
                </div>
                <button
                  className="lab-create-button"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={17} aria-hidden="true" /> 创建第一个实验
                </button>
              </div>

              <ol
                className="lab-onboarding-steps"
                aria-label="开始实验的三个步骤"
              >
                <li>
                  <span>1</span>
                  <div>
                    <b>命名实验</b>
                    <p>给投资想法起一个容易识别的名字，建立独立实验通道。</p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <b>选择类型与策略</b>
                    <p>先选投资类型，再从对应策略中选择或创建自定义策略。</p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <b>配置资产并运行</b>
                    <p>用现金、持仓或混合资产启动，随后查看日 K 与操作日志。</p>
                  </div>
                </li>
              </ol>

              {newUserDemo && (
                <p className="lab-demo-safe-note">
                  <ShieldCheck size={14} aria-hidden="true" />
                  当前仅预览新用户空状态，已有实验数据没有变化。
                </p>
              )}
            </section>
          )}

          {selected && (
            <div
              className={`lab-content-grid${channelsCollapsed ? ' channels-collapsed' : ''}`}
            >
              <section
                className="experiment-list-panel"
                aria-labelledby="experiment-list-title"
              >
                <div className="lab-section-heading">
                  <div>
                    <span>EXPERIMENT CHANNELS</span>
                    <h2 id="experiment-list-title">实验通道</h2>
                  </div>
                  <div className="experiment-list-actions">
                    <button
                      className="lab-add-channel-button"
                      onClick={() => setCreateOpen(true)}
                      aria-label="新建实验"
                      title="新建实验"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="experiment-channel-collapse"
                      type="button"
                      aria-expanded={!channelsCollapsed}
                      aria-controls="experiment-channel-list"
                      aria-label={
                        channelsCollapsed ? '展开实验通道' : '收起实验通道'
                      }
                      title={channelsCollapsed ? '展开通道' : '收起通道'}
                      onClick={() =>
                        setChannelsCollapsed((current) => !current)
                      }
                    >
                      {channelsCollapsed ? (
                        <ChevronRight size={17} aria-hidden="true" />
                      ) : (
                        <ChevronLeft size={17} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="experiment-list" id="experiment-channel-list">
                  {visibleChannels.map((channel) => (
                    <ExperimentCard
                      key={channel.id}
                      channel={channel}
                      active={selected?.id === channel.id}
                      onSelect={() => setSelectedId(channel.id)}
                    />
                  ))}
                </div>
              </section>

              {selected && (
                <section
                  className="experiment-detail-panel"
                  aria-label={`${selected.name}实验详情`}
                >
                  <section
                    className="experiment-visual-panel"
                    aria-labelledby="experiment-detail-title"
                  >
                    <div className="experiment-overview-panel">
                      <div className="experiment-detail-heading">
                        <div>
                          <span className="eyebrow">ACTIVE EXPERIMENT</span>
                          <h2 id="experiment-detail-title">{selected.name}</h2>
                          <p className="experiment-strategy-summary">
                            <span>策略：</span>
                            <b>{selected.strategyName}</b>
                            <button
                              className="experiment-strategy-edit"
                              onClick={openStrategyEditor}
                              aria-label={`切换策略，当前策略：${selected.strategyName}`}
                              title="切换策略"
                            >
                              <Pencil size={12} />
                            </button>
                            <small>
                              {selected.market} · {selected.strategyScope}
                            </small>
                          </p>
                        </div>
                        <div className="experiment-heading-actions">
                          <button
                            className="lab-secondary-button"
                            onClick={toggleStatus}
                          >
                            {selected.status === '运行中' ? (
                              <>
                                <Pause size={14} /> 暂停实验
                              </>
                            ) : (
                              <>
                                <Play size={14} /> 继续实验
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="experiment-kpis">
                        <div>
                          <span>初始资产</span>
                          <b>¥{money(selected.initialValue)}</b>
                        </div>
                        <div>
                          <span>当前资产</span>
                          <b>¥{money(selected.currentValue)}</b>
                        </div>
                        <div>
                          <span className="experiment-kpi-label">
                            累计收益率
                            <MetricHelp
                              title="累计收益率"
                              description="当前资产相对于初始资产的总变化比例。"
                              reading="正数表示实验资产增长，负数表示实验资产低于初始值。"
                            />
                          </span>
                          <b
                            className={
                              selected.currentValue >= selected.initialValue
                                ? 'up'
                                : 'down'
                            }
                          >
                            {selected.initialValue
                              ? `${(((selected.currentValue - selected.initialValue) / selected.initialValue) * 100).toFixed(2)}%`
                              : '—'}
                          </b>
                        </div>
                        <div className="experiment-kpi-risk">
                          <span className="experiment-kpi-label">
                            夏普比率
                            <MetricHelp
                              title="夏普比率"
                              description="衡量每承担一单位波动风险获得的收益效率。"
                              reading="通常数值越高，风险收益效率越好；本演示按无风险利率为 0 估算。"
                              align="end"
                            />
                          </span>
                          <b
                            className={
                              (riskMetrics?.sharpe ?? 0) >= 1 ? 'up' : ''
                            }
                          >
                            {riskMetrics?.sharpe.toFixed(2) ?? '—'}
                          </b>
                          <small>年化估算</small>
                        </div>
                        <div className="experiment-kpi-risk">
                          <span className="experiment-kpi-label">
                            最大回撤
                            <MetricHelp
                              title="最大回撤"
                              description="观察期内，净值从历史峰值跌至随后最低点的最大跌幅。"
                              reading="绝对值越小，代表该阶段经历的最大下跌幅度越轻。"
                              align="end"
                            />
                          </span>
                          <b className="down">
                            {riskMetrics
                              ? `${riskMetrics.maxDrawdown.toFixed(2)}%`
                              : '—'}
                          </b>
                          <small>净值序列</small>
                        </div>
                      </div>
                    </div>

                    <ExperimentChartCard key={selected.id} channel={selected} />
                  </section>

                  <div className="experiment-detail-columns">
                    <section className="experiment-assets">
                      <div className="lab-card-heading">
                        <div>
                          <span>初始资产</span>
                          <b>{experimentAssetMode(selected)}</b>
                        </div>
                        <div className="experiment-asset-heading-actions">
                          <small>¥{money(experimentTotal(selected))}</small>
                          <button
                            type="button"
                            className="experiment-asset-edit-button"
                            onClick={openAssetEditor}
                          >
                            <Pencil size={13} aria-hidden="true" /> 管理资产
                          </button>
                        </div>
                      </div>
                      <div className="experiment-asset-list">
                        {selected.assets.map((asset) => (
                          <div key={asset.id}>
                            <span>
                              <WalletCards size={14} /> <b>{asset.name}</b>
                              <small>
                                {asset.kind === 'cash' ? '现金' : asset.code}
                              </small>
                            </span>
                            <strong>¥{money(asset.amount)}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="experiment-log">
                      <div className="lab-card-heading">
                        <div>
                          <span>操作日志</span>
                          <b>策略信号记录</b>
                        </div>
                        <div className="experiment-log-heading-meta">
                          <span
                            className="experiment-log-legend"
                            aria-label="操作代号：B 表示买入，S 表示卖出，R 表示调仓"
                          >
                            B 买入 · S 卖出 · R 调仓
                          </span>
                          <small>{selected.trades.length} 条</small>
                        </div>
                      </div>
                      {selected.trades.length ? (
                        <div className="experiment-log-list">
                          {selected.trades.map((trade) => {
                            const code = tradeCode(trade.action);
                            const expanded = expandedTradeId === trade.id;
                            return (
                              <article
                                className={`experiment-log-row${expanded ? ' expanded' : ''}`}
                                key={trade.id}
                              >
                                <button
                                  type="button"
                                  className="experiment-log-summary"
                                  aria-expanded={expanded}
                                  aria-label={`${trade.action}记录，${trade.asset}，${trade.time.slice(0, 5)}，${expanded ? '收起' : '查看'}详情`}
                                  onClick={() =>
                                    setExpandedTradeId((current) =>
                                      current === trade.id ? null : trade.id,
                                    )
                                  }
                                >
                                  <i
                                    className={`signal-${code.toLowerCase()}`}
                                    aria-hidden="true"
                                  >
                                    {code}
                                  </i>
                                  <span>
                                    <b>{trade.asset}</b>
                                    <small>{trade.time.slice(0, 5)}</small>
                                  </span>
                                  <ChevronRight size={14} aria-hidden="true" />
                                </button>
                                {expanded && (
                                  <div className="experiment-log-detail">
                                    <p>{compactTradeDetail(trade.detail)}</p>
                                    <small>{trade.reason}</small>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="experiment-log-empty">
                          <ListChecks size={21} />
                          <span>实验刚刚开始，暂无模拟交易</span>
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="experiment-rule-note">
                    <Bot size={17} />
                    <div>
                      <b>实验规则</b>
                      <p>{selected.config}</p>
                    </div>
                  </aside>
                </section>
              )}
            </div>
          )}

          <footer className="page-footer lab-footer">
            <span>
              <ShieldCheck size={12} /> OwlMate 实验室仅用于量化策略科研与学习
            </span>
            <span>虚拟资产与模拟交易不构成任何操作建议</span>
          </footer>
        </main>
      </div>

      <Dialog open={pauseConfirmOpen} onOpenChange={setPauseConfirmOpen}>
        <DialogContent className="owl-dialog experiment-pause-dialog">
          <div className="experiment-pause-icon" aria-hidden="true">
            <Pause size={20} />
          </div>
          <DialogTitle>确认暂停实验？</DialogTitle>
          <DialogDescription>
            暂停「{selected?.name ?? '当前实验'}
            」后，策略将停止产生新的模拟操作。
          </DialogDescription>
          <div className="experiment-pause-note">
            已有资产、净值曲线和历史日志都会保留，之后可以随时继续实验。
          </div>
          <div className="lab-dialog-actions">
            <button
              type="button"
              className="lab-secondary-button"
              onClick={() => setPauseConfirmOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="lab-pause-confirm-button"
              onClick={confirmPauseExperiment}
            >
              <Pause size={14} aria-hidden="true" />
              确认暂停
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={strategyEditorOpen}
        onOpenChange={(open) => {
          setStrategyEditorOpen(open);
          if (!open) setStrategyDraftId('');
        }}
      >
        <DialogContent className="owl-dialog experiment-strategy-dialog">
          <DialogTitle>切换实验策略</DialogTitle>
          <DialogDescription>
            当前通道为 {selected?.market ?? '—'}
            ，仅展示适用于该投资类型的策略。资产与历史日志不会改变。
          </DialogDescription>

          <div className="experiment-strategy-current">
            <span>当前策略</span>
            <b>{selected?.strategyName ?? '—'}</b>
          </div>

          <div
            className="experiment-strategy-switch-list"
            aria-label="选择新的实验策略"
          >
            {switchableStrategies.map((strategy) => (
              <button
                type="button"
                key={strategy.id}
                className={strategyDraftId === strategy.id ? 'active' : ''}
                aria-pressed={strategyDraftId === strategy.id}
                onClick={() => setStrategyDraftId(strategy.id)}
              >
                <span>
                  {selected?.market} · {strategy.scope}
                </span>
                <b>{strategy.name}</b>
                <p>{strategy.summary}</p>
                {strategyDraftId === strategy.id && (
                  <Check size={16} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          <div className="lab-dialog-actions">
            <button
              type="button"
              className="lab-secondary-button"
              onClick={() => setStrategyEditorOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="lab-primary-button"
              disabled={!strategyDraftId}
              onClick={saveStrategyChange}
            >
              确认切换
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assetEditorOpen}
        onOpenChange={(open) => {
          setAssetEditorOpen(open);
          if (!open) setAssetEditorError('');
        }}
      >
        <DialogContent className="owl-dialog experiment-asset-dialog">
          <DialogTitle>管理初始资产</DialogTitle>
          <DialogDescription>
            编辑当前实验通道的现金与持仓。保存后会按新合计重算初始资产，并保留已有盈亏金额。
          </DialogDescription>

          <div className="experiment-asset-editor-list">
            {assetDrafts.map((asset, index) => (
              <fieldset className="experiment-asset-editor-row" key={asset.id}>
                <legend>
                  {asset.kind === 'cash' ? '现金资产' : '持仓资产'} {index + 1}
                </legend>
                <label>
                  <span>资产名称</span>
                  <input
                    value={asset.name}
                    onChange={(event) =>
                      updateAssetDraft(asset.id, 'name', event.target.value)
                    }
                    placeholder={
                      asset.kind === 'cash' ? '人民币现金' : '例如：沪深300 ETF'
                    }
                  />
                </label>
                {asset.kind === 'security' && (
                  <label>
                    <span>代码</span>
                    <input
                      value={asset.code ?? ''}
                      onChange={(event) =>
                        updateAssetDraft(asset.id, 'code', event.target.value)
                      }
                      placeholder="例如：510300"
                    />
                  </label>
                )}
                <label>
                  <span>资产金额</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    inputMode="decimal"
                    value={asset.amount}
                    onChange={(event) =>
                      updateAssetDraft(asset.id, 'amount', event.target.value)
                    }
                    placeholder="0"
                  />
                </label>
                <button
                  type="button"
                  className="experiment-asset-delete-button"
                  aria-label={`删除${asset.name || '此项资产'}`}
                  onClick={() => {
                    setAssetDrafts((current) =>
                      current.filter((item) => item.id !== asset.id),
                    );
                    setAssetEditorError('');
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" /> 删除
                </button>
              </fieldset>
            ))}
          </div>

          {assetEditorError && (
            <p className="experiment-asset-editor-error" role="alert">
              {assetEditorError}
            </p>
          )}

          <div className="experiment-asset-add-actions">
            <button type="button" onClick={() => addAssetDraft('cash')}>
              <Plus size={14} aria-hidden="true" /> 增加现金
            </button>
            <button type="button" onClick={() => addAssetDraft('security')}>
              <Plus size={14} aria-hidden="true" /> 增加持仓
            </button>
          </div>

          <div className="lab-dialog-actions">
            <button
              type="button"
              className="lab-secondary-button"
              onClick={() => setAssetEditorOpen(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="lab-primary-button"
              onClick={saveAssetChanges}
            >
              保存资产
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCustomStrategyOpen(false);
            resetDraft();
          }
        }}
      >
        <DialogContent className="owl-dialog lab-create-dialog">
          <DialogTitle>新建策略实验</DialogTitle>
          <DialogDescription>
            每个实验绑定一个策略和一套独立虚拟资产，创建后自动开始记录。
          </DialogDescription>
          <ol className="lab-stepper" aria-label="创建实验步骤">
            {steps.map((label, index) => (
              <li
                key={label}
                className={
                  index === step ? 'active' : index < step ? 'complete' : ''
                }
              >
                <span>{index < step ? <Check size={12} /> : index + 1}</span>
                <b>{label}</b>
              </li>
            ))}
          </ol>

          <div className="lab-step-content">
            {step === 0 && (
              <label className="lab-field">
                <span>实验名称</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：十万元轮动策略实验"
                  maxLength={32}
                />
                <small>名称只用于区分不同实验，不会影响策略运行。</small>
              </label>
            )}
            {step === 1 && (
              <div className="lab-strategy-step">
                <div className="lab-market-heading">
                  <div>
                    <b>选择投资类型</b>
                    <small>策略会根据投资类型进行筛选</small>
                  </div>
                  {market && <span>已选：{market}</span>}
                </div>
                <div className="lab-market-options" aria-label="选择投资类型">
                  {investmentMarkets.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={market === item ? 'active' : ''}
                      aria-pressed={market === item}
                      onClick={() => {
                        setMarket(item);
                        setStrategyId('');
                        setScope('通用');
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {!market ? (
                  <div className="lab-market-empty">
                    <ListChecks size={20} />
                    <div>
                      <b>请先选择投资类型</b>
                      <span>选择后将显示对应的可用策略。</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="lab-strategy-results-heading">
                      <b>{market}可用策略</b>
                      <span>{availableStrategies.length} 个</span>
                    </div>
                    <div className="lab-strategy-options">
                      <button
                        type="button"
                        className="lab-custom-strategy-card"
                        onClick={() => setCustomStrategyOpen(true)}
                      >
                        <span>{market} · 自定义</span>
                        <b>
                          <Plus size={15} /> 创建自己的策略
                        </b>
                        <p>
                          用自然语言描述想法，创建仅用于{market}的完整策略。
                        </p>
                        <Sparkles size={16} />
                      </button>
                      {availableStrategies.map((strategy) => (
                        <button
                          type="button"
                          key={strategy.id}
                          className={strategyId === strategy.id ? 'active' : ''}
                          aria-pressed={strategyId === strategy.id}
                          onClick={() => {
                            setStrategyId(strategy.id);
                            setScope(strategy.scope);
                          }}
                        >
                          <span>
                            {market} · {strategy.scope}
                          </span>
                          <b>{strategy.name}</b>
                          <p>{strategy.summary}</p>
                          {strategyId === strategy.id && <Check size={16} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {step === 2 && (
              <div className="lab-assets-step">
                <div className="lab-asset-mode" aria-label="选择初始资产类型">
                  {(
                    [
                      ['cash', '纯现金'],
                      ['security', '纯持仓'],
                      ['mixed', '现金＋持仓'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      className={assetMode === value ? 'active' : ''}
                      aria-pressed={assetMode === value}
                      onClick={() => setAssetMode(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {assetMode !== 'security' && (
                  <label className="lab-field">
                    <span>
                      初始现金
                      {market ? `（${marketCurrencyMap[market]}）` : ''}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={cash}
                      onChange={(event) => setCash(event.target.value)}
                    />
                  </label>
                )}
                {assetMode !== 'cash' && (
                  <div className="lab-holding-editor">
                    <div className="lab-holding-editor-heading">
                      <b>初始持仓</b>
                      <button
                        onClick={() =>
                          setHoldings((items) => [
                            ...items,
                            {
                              id: `holding-${Date.now()}`,
                              name: '',
                              code: '',
                              amount: '',
                            },
                          ])
                        }
                      >
                        <Plus size={13} /> 添加标的
                      </button>
                    </div>
                    {holdings.map((holding) => (
                      <div className="lab-holding-row" key={holding.id}>
                        <label>
                          <span>标的名称</span>
                          <input
                            value={holding.name}
                            onChange={(event) =>
                              setHoldings((items) =>
                                items.map((item) =>
                                  item.id === holding.id
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>标的代码</span>
                          <input
                            value={holding.code}
                            onChange={(event) =>
                              setHoldings((items) =>
                                items.map((item) =>
                                  item.id === holding.id
                                    ? { ...item, code: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          <span>初始市值</span>
                          <input
                            type="number"
                            min="0"
                            value={holding.amount}
                            onChange={(event) =>
                              setHoldings((items) =>
                                items.map((item) =>
                                  item.id === holding.id
                                    ? { ...item, amount: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <button
                          aria-label={`移除${holding.name || '该持仓'}`}
                          onClick={() =>
                            setHoldings((items) =>
                              items.filter((item) => item.id !== holding.id),
                            )
                          }
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lab-dialog-actions">
            <button
              className="lab-secondary-button"
              disabled={step === 0}
              onClick={() => setStep((value) => value - 1)}
            >
              <ChevronLeft size={15} /> 上一步
            </button>
            {step < steps.length - 1 ? (
              <button
                className="lab-primary-button"
                disabled={!canContinue}
                onClick={() => setStep((value) => value + 1)}
              >
                下一步 <ChevronRight size={15} />
              </button>
            ) : (
              <button
                className="lab-primary-button"
                disabled={!canContinue}
                onClick={createExperiment}
              >
                <Play size={15} /> 开始实验
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <CustomStrategyDialog
        open={customStrategyOpen}
        onOpenChange={setCustomStrategyOpen}
        marketId={market || undefined}
        onCreated={(strategy) => {
          setCustomStrategies((items) => [
            ...items.filter((item) => item.id !== strategy.id),
            strategy,
          ]);
          setStrategyId(strategy.id);
          setScope(strategy.assetScope.includes('单') ? '单品' : '通用');
          setNotice(`「${strategy.name}」已创建并选中。`);
        }}
      />
    </div>
  );
}
