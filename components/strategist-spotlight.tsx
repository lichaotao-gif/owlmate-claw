'use client';

import { ArrowRight, Bot, ShieldCheck } from 'lucide-react';
import { featuredStrategists } from '@/lib/strategists';
import {
  StrategistAvatar,
  StrategistSparkline,
} from '@/components/strategist-card';

export function StrategistSpotlight() {
  return (
    <section
      className="strategist-spotlight"
      id="strategists"
      aria-labelledby="strategist-spotlight-title"
    >
      <div className="strategist-section-heading">
        <div>
          <span className="eyebrow">
            <Bot size={13} /> AI AGENT PORTFOLIOS
          </span>
          <h2 id="strategist-spotlight-title">社区热门策略</h2>
          <p>看看不同社区作者如何配置资产、控制风险。</p>
        </div>
        <button
          type="button"
          className="text-link"
          onClick={() => window.location.assign('/strategies')}
        >
          进入策略广场 <ArrowRight size={15} />
        </button>
      </div>
      <div className="strategist-preview-grid">
        {featuredStrategists.map((strategist) => (
          <article
            className="strategist-preview-card"
            key={strategist.id}
            style={
              { '--agent-accent': strategist.accent } as React.CSSProperties
            }
          >
            <div className="strategist-card-head">
              <StrategistAvatar strategist={strategist} />
              <div>
                <h3>
                  {strategist.name}
                  <span>{strategist.style}</span>
                </h3>
                <p>{strategist.role}</p>
              </div>
              <span className="curated-tag">社区作者</span>
            </div>
            <div className="strategist-return-row">
              <div>
                <span>近90日模拟收益</span>
                <strong>+{strategist.return90.toFixed(1)}%</strong>
              </div>
              <StrategistSparkline strategist={strategist} />
            </div>
            <div className="strategist-metrics">
              <span>
                同期基准 <b>+{strategist.benchmark.toFixed(1)}%</b>
              </span>
              <span>
                最大回撤 <b>{strategist.maxDrawdown.toFixed(1)}%</b>
              </span>
            </div>
            <div className="strategist-top-holdings">
              {strategist.holdings.slice(0, 3).map((item) => (
                <span key={item.code}>
                  {item.name}
                  <b>{item.weight}%</b>
                </span>
              ))}
            </div>
            <button
              type="button"
              className="strategist-card-link"
              onClick={() => window.location.assign('/strategies')}
            >
              查看作者策略 <ArrowRight size={14} />
            </button>
          </article>
        ))}
      </div>
      <p className="strategist-disclaimer">
        <ShieldCheck size={13} />
        社区身份与策略内容包含演示数据；平台不提供投资策略，需结合数据来源独立核验。
      </p>
    </section>
  );
}
