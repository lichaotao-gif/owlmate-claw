'use client';

import { ShieldCheck, ArrowRight } from 'lucide-react';
import { summarize, type Account } from '@/lib/holdings';
import { healthTargets } from '@/lib/health-check';

export function PortfolioHealth({
  account,
  limit,
  hasProfile,
  onSimulate,
}: {
  account: Account;
  limit: number;
  hasProfile: boolean;
  onSimulate: (target: number, reason: string) => void;
}) {
  const summary = summarize(account);
  const largest = Number((summary.largest?.allocation ?? 0).toFixed(1));
  const targets = healthTargets(summary.riskAllocation, largest, limit);
  const over = Number(summary.riskAllocation.toFixed(1)) > limit;
  const concentrated = largest > 30 + 0.01;
  const issues = Number(over) + Number(concentrated);
  return (
    <section className="panel portfolio-health" aria-labelledby="health-title">
      <details className="health-disclosure">
        <summary className="health-toggle">
          <span id="health-title">
            <ShieldCheck size={17} aria-hidden="true" /> 持仓体检
          </span>
          <span className="health-verdict">
            {summary.total <= 0
              ? '待添加资产'
              : issues
                ? `${issues} 项值得关注`
                : '仓位规则未触发'}
          </span>
          <span className="health-toggle-label">查看体检</span>
        </summary>
        <p className="health-intro">
          随持仓更新 · 演示规则；未触发不代表没有风险。
        </p>
        <div className="health-grid">
          <details>
            <summary>
              <span>
                组合仓位 <b>{summary.riskAllocation.toFixed(1)}%</b>
              </span>
              <em>{over ? '超过参考上限' : '未触发'} · 查看依据</em>
            </summary>
            <div className="health-detail">
              <p>
                持仓市值 ÷ 总资产。{hasProfile ? '画像' : '未填写画像，示例'}
                上限为 {limit}%，当前现金占比为{' '}
                {(100 - summary.riskAllocation).toFixed(1)}
                %。演示将全部持仓计入风险资产。
              </p>
              <p>
                试算目标 {targets.allocation.toFixed(1)}%，保持各标的相对比例。
                {hasProfile
                  ? '资金用途或风险偏好变化时需重新评估。'
                  : '此上限不是对你个人风险承受能力的评估。'}
              </p>
              {summary.total > 0 && (
                <button
                  className="text-button"
                  onClick={() =>
                    onSimulate(
                      targets.allocation,
                      `组合仓位体检：当前 ${summary.riskAllocation.toFixed(1)}%，参考上限 ${limit}%。`,
                    )
                  }
                >
                  以 {targets.allocation.toFixed(1)}% 进入模拟{' '}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </details>
          <details>
            <summary>
              <span>
                最大单一持仓 <b>{largest.toFixed(1)}%</b>
              </span>
              <em>{concentrated ? '超过示例阈值' : '未触发'} · 查看依据</em>
            </summary>
            <div className="health-detail">
              <p>
                {summary.largest?.name ?? '暂无持仓'}；以该持仓市值 ÷
                总资产计算，演示阈值为 30%。不包含 ETF
                底层成分的重叠与行业分析。
              </p>
              <p>
                按比例降低总仓位可减少该标的占账户比例，但不会改善持仓内部的相对集中度。此处只演示增加现金后的变化。
              </p>
              {concentrated && (
                <button
                  className="text-button"
                  onClick={() =>
                    onSimulate(
                      targets.concentration,
                      `单一持仓体检：${summary.largest?.name} 占账户 ${largest.toFixed(1)}%，示例阈值 30%；按比例减仓，仅降低账户层面的暴露。`,
                    )
                  }
                >
                  以 {targets.concentration.toFixed(1)}% 进入模拟{' '}
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </details>
          <details>
            <summary>
              <span>
                数据范围 <b>手动录入</b>
              </span>
              <em>待补充数据 · 查看边界</em>
            </summary>
            <div className="health-detail">
              <p>
                已检查 {account.holdings.length}{' '}
                只持仓及现金。参考现价由用户维护，未验证时效；未接入行情、ETF
                成分、行业分类和现金支出计划。
              </p>
              <p>
                暂不判断行业偏重、ETF
                重叠或现金是否够用。修改持仓后会重新体检；已有模拟方案需重新核对。
              </p>
            </div>
          </details>
        </div>
      </details>
    </section>
  );
}
