import { ArrowRight, Bot, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
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
          <h2 id="strategist-spotlight-title">策略达人</h2>
          <p>看看不同 AI Agent 如何配置资产、控制风险。</p>
        </div>
        <Link href="/strategists" className="text-link">
          查看全部策略达人 <ArrowRight size={15} />
        </Link>
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
              <span className="curated-tag">平台精选</span>
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
            <Link
              href={`/strategists#${strategist.id}`}
              className="strategist-card-link"
            >
              查看组合与决策 <ArrowRight size={14} />
            </Link>
          </article>
        ))}
      </div>
      <p className="strategist-disclaimer">
        <ShieldCheck size={13} />
        虚构 AI Agent 模拟组合；收益与持仓为演示数据，不构成投资建议。
      </p>
    </section>
  );
}
