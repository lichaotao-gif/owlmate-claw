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
import { AppRail } from '@/components/app-rail';
import { CustomStrategyDialog } from '@/components/custom-strategy-dialog';
import { ThemeSelector } from '@/components/theme-selector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
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

function ExperimentCandlestickChart({
  channel,
}: {
  channel: ExperimentChannel;
}) {
  const allCandles = useMemo(() => makeCandleData(channel), [channel]);
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
      <div className="lab-chart-legend" aria-hidden="true">
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
          aria-label={`${channel.name}${rangeDescription}净值K线图。聚焦后使用左右方向键查看每日行情。`}
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
            <title>
              {channel.name}
              {rangeDescription}净值K线
            </title>
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
        净值以实验初始日为 100；B 为买入/调仓，S
        为卖出。图表数据为模拟实验记录。
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
      className={`experiment-card${active ? ' active' : ''}`}
      onClick={onSelect}
      aria-pressed={active}
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
        <span>
          <FlaskConical size={17} />
        </span>
        <div>
          <b>{channel.name}</b>
          <small>{channel.strategyName}</small>
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
  const [assetEditorOpen, setAssetEditorOpen] = useState(false);
  const [assetDrafts, setAssetDrafts] = useState<DraftAsset[]>([]);
  const [assetEditorError, setAssetEditorError] = useState('');
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
    const next = channels.map((channel) =>
      channel.id === selected.id
        ? {
            ...channel,
            status:
              channel.status === '运行中'
                ? ('已暂停' as const)
                : ('运行中' as const),
          }
        : channel,
    );
    setChannels(next);
    saveExperimentChannels(next);
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
            OwlMate<span className="brand-beta">BETA</span>
          </div>
          <span className="header-divider" />
          <span className="workspace-label">OwlMate 实验室</span>
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
            <span className="lab-boundary">
              <ShieldCheck size={14} /> 虚拟仿真 · 不连接真实账户
            </span>
            <Link href="/strategies" className="lab-strategy-link">
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
            <div className="lab-content-grid">
              <section
                className="experiment-list-panel"
                aria-labelledby="experiment-list-title"
              >
                <div className="lab-section-heading">
                  <div>
                    <span>EXPERIMENT CHANNELS</span>
                    <h2 id="experiment-list-title">实验通道</h2>
                  </div>
                  <button
                    onClick={() => setCreateOpen(true)}
                    aria-label="新建实验"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="experiment-list">
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
                          <p>
                            {selected.strategyName} · {selected.market} ·{' '}
                            {selected.strategyScope}
                          </p>
                        </div>
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
                          <span>累计收益率</span>
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
                      </div>
                    </div>

                    <div className="experiment-chart-card">
                      <div className="lab-card-heading">
                        <div>
                          <span>实验净值 K 线</span>
                          <b>日 K · 历史净值</b>
                        </div>
                        <small>非未来预测</small>
                      </div>
                      <ExperimentCandlestickChart
                        key={selected.id}
                        channel={selected}
                      />
                    </div>
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
                          <b>日级模拟操作记录</b>
                        </div>
                        <small>{selected.trades.length} 条</small>
                      </div>
                      {selected.trades.length ? (
                        selected.trades.map((trade) => (
                          <div className="experiment-log-row" key={trade.id}>
                            <i>{trade.action}</i>
                            <div>
                              <b>{trade.asset}</b>
                              <span>{trade.detail}</span>
                              <small>
                                {trade.time.slice(0, 5)} · {trade.reason}
                              </small>
                            </div>
                          </div>
                        ))
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
