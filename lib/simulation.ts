export type Scenario = 'bull' | 'base' | 'bear';
export const portfolio = { total: 1286400, riskAllocation: 80 };
export const scenarioLabels = {
  bull: '上涨情景',
  base: '震荡情景',
  bear: '下跌情景',
};
export function money(n: number, signed = true) {
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: signed ? 2 : 0,
    maximumFractionDigits: signed ? 2 : 0,
  });
}
export function forecast(
  allocation: number,
  days: number,
  scenario: Scenario,
  deposit = 0,
  account: { total: number; riskAllocation: number } = portfolio,
) {
  const total = account.total + deposit;
  const fraction = allocation / 100;
  const existing = (account.total * account.riskAllocation) / 100;
  const provisionalDelta = total * fraction - existing;
  const cost =
    (0.001 * Math.abs(provisionalDelta)) /
    (1 + (provisionalDelta >= 0 ? 1 : -1) * 0.001 * fraction);
  const risky = (total - cost) * fraction;
  const cash = total - cost - risky;
  const riskyDelta = risky - existing;
  const rate =
    Math.pow(1 + { bull: 0.08, base: 0.015, bear: -0.1 }[scenario], days / 20) -
    1;
  const pnl = risky * rate - cost;
  return {
    total,
    risky,
    cash,
    riskyDelta,
    cost,
    pnl,
    end: total + pnl,
    percent: total ? (pnl / total) * 100 : 0,
  };
}
