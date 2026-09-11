'use client';

import type { InvestorProfile } from './onboarding-demo';
import { forecast, money } from '@/lib/simulation';

export function AdviceSummary({
  current,
  target,
  allocation,
  total,
  deposit,
  profile,
  largest,
}: {
  current: number;
  target: number;
  allocation: number;
  total: number;
  deposit: number;
  profile: InvestorProfile | null;
  largest: string;
}) {
  const changed = Math.abs(allocation - target) > 0.01;
  return (
    <div className="advice-summary">
      <div className="advice-kicker">OWL MATE · 演示规则建议</div>
      <h3>
        {total <= 0
          ? '先添加账户资产，再比较配置'
          : current > target + 0.01
            ? '降低组合风险资产占比，增加现金储备'
            : '维持当前风险资产占比，继续观察'}
      </h3>
      <p>
        当前 {current.toFixed(1)}% → 参考目标 <b>{target.toFixed(1)}%</b> ·{' '}
        {profile ? '结合已填写画像' : '未建立画像，使用示例上限 65%'}{' '}
      </p>
      <div className="advice-actions">
        <span>
          {changed
            ? `当前试算 ${allocation}% · 自定义方案`
            : '当前试算与建议仓位一致'}
        </span>
      </div>
      <details>
        <summary>为什么这样建议？查看依据与局限</summary>
        <div className="advice-evidence">
          <p>
            <b>账户依据</b>手动录入资产 ¥{money(total, false)}，风险资产占比{' '}
            {current.toFixed(1)}%。{largest}
          </p>
          <p>
            <b>画像依据</b>
            {profile
              ? `${profile.riskLabel} · ${profile.horizon}。使用画像问卷给出的演示上限 ${profile.recommendedAllocation}%。`
              : '尚未填写；65% 是产品演示预设，不是对你的风险承受能力评估。'}
          </p>
          <p>
            <b>触发规则</b>目标取「当前仓位」与「画像上限（缺省
            65%）」中较低值，不主动建议增仓。各风险资产仍按原比例分配，不会改变行业之间的相对集中度。
          </p>
          <p>
            <b>模拟依据</b>20 日风险资产假设：上涨 +8%、基准 +1.5%、下跌
            −10%；其他期限按复利换算。现金收益为 0，调整成本为调整金额的
            0.1%。两种配置采用相同假设。
          </p>
          <p>
            <b>数据边界</b>
            未使用实时行情或新闻；浅色区间是上下情景范围，不是置信区间。新增资金
            ¥{money(deposit, false)}{' '}
            只加入试算基数，规则目标暂不根据新增资金重算。
          </p>
          <p>
            <b>何时复核</b>
            持仓改变时重新计算规则目标，试算仓位可通过下方滑块调整；完成画像录入会载入画像的演示仓位。资金用途改变或获得新行情时，应重新评估，不自动执行交易。
          </p>
        </div>
      </details>
    </div>
  );
}

export function AdviceChart({
  allocation,
  days,
  account,
  deposit,
  customized,
}: {
  allocation: number;
  days: number;
  account: { total: number; riskAllocation: number };
  deposit: number;
  customized: boolean;
}) {
  const current =
    account.total + deposit
      ? (account.total * account.riskAllocation) / (account.total + deposit)
      : 0;
  const values = [allocation, current].flatMap((a) =>
    ['bull', 'bear'].map(
      (sc) =>
        forecast(a, days, sc as 'bull' | 'bear', deposit, account).percent,
    ),
  );
  const maxAbsoluteValue = values.reduce(
    (maximum, value) => Math.max(maximum, Math.abs(value)),
    0,
  );
  const bound = Math.max(6, Math.ceil(maxAbsoluteValue / 3) * 3);
  const y = (a: number, d: number, sc: 'bull' | 'base' | 'bear') =>
    150 - (forecast(a, d, sc, deposit, account).percent / bound) * 108;
  const points = (a: number, sc: 'bull' | 'base' | 'bear') =>
    Array.from({ length: 41 }, (_, i) => [
      70 + i * 12.5,
      y(a, (days * i) / 40, sc),
    ]);
  const path = (pts: number[][]) =>
    pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const band =
    path(points(allocation, 'bull')) +
    ' ' +
    path(points(allocation, 'bear').reverse()).replace('M', 'L') +
    ' Z';
  return (
    <div className="advice-chart">
      <div className="advice-chart-caption">
        未来 {days} 个交易日 · 相同市场假设下的组合对比
      </div>
      <svg
        viewBox="0 0 650 300"
        aria-label="方案模拟：当前试算与维持现状的基准情景对比，阴影为上下情景范围，非预测概率"
      >
        {[42, 96, 150, 204, 258].map((v, i) => (
          <g key={v}>
            <line
              x1="65"
              x2="575"
              y1={v}
              y2={v}
              stroke="#343044"
              strokeDasharray="3 5"
            />
            <text x="590" y={v + 4} fill="#a9a2bb" fontSize="12">
              {(bound * (1 - i / 2)).toFixed(0)}%
            </text>
          </g>
        ))}
        <path d={band} fill="#8b83d9" opacity=".12" />
        <path
          d={path(points(current, 'base'))}
          fill="none"
          stroke="#929bac"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d={path(points(allocation, 'base'))}
          fill="none"
          stroke="#c6a2ff"
          strokeWidth="3"
        />
        <circle
          cx="570"
          cy={y(allocation, days, 'base')}
          r="4"
          fill="#dcc5ff"
        />
        <text x="65" y="286" fill="#aaa1ba" fontSize="12">
          今天 · 以当前资产为基准
        </text>
        <text x="540" y="286" fill="#aaa1ba" fontSize="12">
          +{days}日
        </text>
      </svg>
      <div className="advice-legend">
        <span>━ {customized ? '自定义方案' : '建议配置'} · 基准情景</span>
        <span>┄ 维持现状 · 基准情景</span>
        <span>▧ 上下情景范围</span>
      </div>
      <p>
        基准情景仅为计算假设，不代表最可能走势；降低仓位也会减少上涨情景中的收益。
      </p>
    </div>
  );
}
