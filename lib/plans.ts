import { parseAccount, summarize, type Account } from './holdings';
import { forecast, type Scenario } from './simulation';
export type Plan = {
  id: string;
  name: string;
  at: string;
  account: Account;
  allocation: number;
  days: number;
  scenario: Scenario;
  deposit: number;
  status: 'pending' | 'running' | 'archived';
  elapsed: number;
};
export type PlanDraft = Pick<
  Plan,
  'account' | 'allocation' | 'days' | 'scenario' | 'deposit'
>;
export function createPlan(d: PlanDraft, name: string): Plan {
  const s = summarize(d.account);
  if (s.total + d.deposit <= 0 || (s.marketValue === 0 && d.allocation > 0))
    throw new Error('请先添加可分配的资产或现金。');
  return {
    ...d,
    account: JSON.parse(JSON.stringify(d.account)),
    id: crypto.randomUUID(),
    name,
    at: new Date().toISOString(),
    status: 'pending',
    elapsed: 0,
  };
}
export function readPlans(raw: string): Plan[] {
  const ps = JSON.parse(raw);
  if (!Array.isArray(ps) || ps.length > 200) throw new Error('方案存储无效');
  const ids = new Set();
  for (const p of ps) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      ids.has(p.id) ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      p.name.length > 60 ||
      typeof p.at !== 'string' ||
      !Number.isFinite(Date.parse(p.at)) ||
      !Number.isFinite(p.allocation) ||
      p.allocation < 0 ||
      p.allocation > 100 ||
      ![5, 20, 60].includes(p.days) ||
      !['bull', 'base', 'bear'].includes(p.scenario) ||
      !Number.isFinite(p.deposit) ||
      p.deposit < 0 ||
      p.deposit > 1e7 ||
      !['pending', 'running', 'archived'].includes(p.status) ||
      !Number.isInteger(p.elapsed) ||
      p.elapsed < 0 ||
      p.elapsed > p.days
    )
      throw new Error('方案数据无效');
    parseAccount(JSON.stringify(p.account));
    ids.add(p.id);
  }
  return ps;
}
export function accountKey(a: Account) {
  return JSON.stringify({
    cash: a.cash,
    holdings: a.holdings
      .map((h) => ({
        code: h.code,
        quantity: h.quantity,
        cost: h.cost,
        price: h.price,
      }))
      .sort((a, b) => a.code.localeCompare(b.code)),
  });
}
export function comparable(ps: Plan[]) {
  return (
    ps.length >= 2 &&
    ps.length <= 3 &&
    ps.every(
      (p) =>
        accountKey(p.account) === accountKey(ps[0].account) &&
        p.days === ps[0].days &&
        p.scenario === ps[0].scenario &&
        p.deposit === ps[0].deposit,
    )
  );
}
export function virtualAccount(p: Plan, day = p.elapsed) {
  const s = summarize(p.account);
  const initial = forecast(p.allocation, 0, p.scenario, p.deposit, s),
    result = forecast(p.allocation, day, p.scenario, p.deposit, s);
  const growth = initial.risky
    ? (result.end - initial.cash) / initial.risky
    : 1;
  return {
    result,
    initial,
    holdings: s.assets.map((h) => ({
      name: h.name,
      code: h.code,
      initialValue: s.marketValue
        ? (initial.risky * h.value) / s.marketValue
        : 0,
      value: s.marketValue
        ? ((initial.risky * h.value) / s.marketValue) * growth
        : 0,
    })),
    cash: initial.cash,
  };
}
