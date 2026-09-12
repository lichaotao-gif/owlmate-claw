import rawHistory from '@/lib/market-history-data.json';
import type { Account } from '@/lib/holdings';

export type MarketBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type MarketAsset = {
  code: string;
  name: string;
  sourceFile: string;
  bars: MarketBar[];
};

type MarketHolding = {
  code: string;
  quantity: number;
};

export type HistoricalPoint = {
  date: string;
  value: number;
  normalized: number;
};

export const marketHistory = rawHistory as Record<string, MarketAsset>;

export const marketSnapshotDate =
  Object.values(marketHistory)
    .flatMap((asset) => asset.bars.at(-1)?.date ?? [])
    .sort()
    .at(-1) ?? '';

export function latestMarketPrice(code: string) {
  return marketHistory[code]?.bars.at(-1)?.close;
}

export function applyMarketSnapshot(account: Account): Account {
  let changed = false;
  const holdings = account.holdings.map((holding) => {
    const price = latestMarketPrice(holding.code);
    if (price === undefined || price === holding.price) return holding;
    changed = true;
    return { ...holding, price };
  });
  return changed ? { ...account, holdings } : account;
}

export function marketQuote(code: string) {
  const asset = marketHistory[code];
  const latest = asset?.bars.at(-1);
  const previous = asset?.bars.at(-2);
  if (!asset || !latest || !previous) return null;
  return {
    code,
    name: asset.name.replace(/(易方达|华泰柏瑞|国泰|华安|华夏)$/u, ''),
    price: latest.close,
    change: ((latest.close - previous.close) / previous.close) * 100,
    date: latest.date,
  };
}

export function assetHistory(code: string, limit = 65): HistoricalPoint[] {
  const bars = marketHistory[code]?.bars.slice(-limit) ?? [];
  const latest = bars.at(-1)?.close ?? 0;
  return bars.map((bar) => ({
    date: bar.date,
    value: bar.close,
    normalized: latest ? (bar.close / latest) * 100 : 100,
  }));
}

export function portfolioHistory(
  holdings: MarketHolding[],
  cash: number,
  limit = 65,
): HistoricalPoint[] {
  const known = holdings.filter((holding) => marketHistory[holding.code]);
  if (!known.length) return [];

  const dates = known
    .map(
      (holding) =>
        new Set(marketHistory[holding.code].bars.map((bar) => bar.date)),
    )
    .reduce(
      (common, next) => new Set([...common].filter((date) => next.has(date))),
    );
  const selectedDates = [...dates].sort().slice(-limit);
  const closeByCode = Object.fromEntries(
    known.map((holding) => [
      holding.code,
      new Map(
        marketHistory[holding.code].bars.map((bar) => [bar.date, bar.close]),
      ),
    ]),
  );
  const values = selectedDates.map((date) => ({
    date,
    value:
      cash +
      known.reduce(
        (sum, holding) =>
          sum + holding.quantity * (closeByCode[holding.code].get(date) ?? 0),
        0,
      ),
  }));
  const latest = values.at(-1)?.value ?? 0;
  return values.map((point) => ({
    ...point,
    normalized: latest ? (point.value / latest) * 100 : 100,
  }));
}

export function formatMarketDate(date: string) {
  const [, month, day] = date.split('-');
  return `${month}.${day}`;
}
