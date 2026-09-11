'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BellRing,
  Bookmark,
  Bot,
  CircleGauge,
  Database,
  FileQuestion,
  FlaskConical,
  Layers3,
  LockKeyhole,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  Wallet,
} from 'lucide-react';
import { AppRail } from '@/components/app-rail';
import { HoldingsPanel } from '@/components/holdings-panel';
import { ValuationZonePanel } from '@/components/valuation-zone-panel';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  initialAccount,
  parseAccount,
  summarize,
  type Account,
} from '@/lib/holdings';
import { readPlans, virtualAccount, type Plan } from '@/lib/plans';
import {
  forecast,
  money,
  scenarioLabels,
  type Scenario,
} from '@/lib/simulation';
import { assessAccount } from '@/lib/valuation-zones';

export type FeatureSection =
  | 'holdings'
  | 'zones'
  | 'simulation'
  | 'events'
  | 'plans'
  | 'help'
  | 'profile';

const meta: Record<
  FeatureSection,
  { eyebrow: string; title: string; description: string }
> = {
  holdings: {
    eyebrow: 'PORTFOLIO INVENTORY',
    title: '我的持仓',
    description: '维护账户资产，查看每只持仓对组合收益与风险的实际影响。',
  },
  zones: {
    eyebrow: 'HOLDING ZONE RADAR',
    title: '区间雷达',
    description: '集中复核价格区间、目标仓位和临界状态。',
  },
  simulation: {
    eyebrow: 'SCENARIO LAB',
    title: '情景试算',
    description: '在不改变真实持仓的前提下，比较仓位和市场情景。',
  },
  events: {
    eyebrow: 'PORTFOLIO SIGNALS',
    title: '事件雷达',
    description: '只展示与你当前持仓和风险预算有关的观察事项。',
  },
  plans: {
    eyebrow: 'SAVED SIMULATIONS',
    title: '我的方案',
    description: '管理保存的组合快照、模拟进度和对比结果。',
  },
  help: {
    eyebrow: 'PRODUCT GUIDE',
    title: '帮助中心',
    description: '了解数据边界、功能关系和推荐的使用顺序。',
  },
  profile: {
    eyebrow: 'ACCOUNT & PROFILE',
    title: '账户与画像',
    description: '查看演示账户状态，以及画像如何影响组合建议。',
  },
};

function useLocalAccount() {
  const [account, setAccount] = useState<Account>(initialAccount);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem('owlmate-account-v1');
        if (raw) setAccount(parseAccount(raw));
      } catch {
        setNotice('本机账户读取失败，暂时显示示例数据。');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update(next: Account) {
    setAccount(next);
    try {
      localStorage.setItem('owlmate-account-v1', JSON.stringify(next));
      setNotice('账户已保存在本机，相关页面会同步使用最新数据。');
    } catch {
      setNotice('页面已更新，但本机存储失败，刷新后可能恢复原数据。');
    }
  }

  return { account, update, notice, setNotice };
}

function FeatureHeader() {
  return (
    <header className="topbar feature-topbar">
      <div className="wordmark">
        OwlMate<span className="brand-beta">BETA</span>
      </div>
      <span className="header-divider" />
      <span className="workspace-label">个人投资工作台</span>
      <div className="header-right">
        <span className="demo-badge">
          <i /> 交互演示
        </span>
        <Link className="feature-home-link" href="/">
          <ArrowLeft size={14} /> 返回首页
        </Link>
      </div>
    </header>
  );
}

function PageHeading({ section }: { section: FeatureSection }) {
  const item = meta[section];
  return (
    <div className="feature-page-heading">
      <div>
        <span className="eyebrow">{item.eyebrow}</span>
        <h1>
          {item.title}
          <span className="heading-dot" />
        </h1>
        <p>{item.description}</p>
      </div>
      <span className="feature-local-badge">
        <LockKeyhole size={14} /> 本机演示数据
      </span>
    </div>
  );
}

function HoldingsView({
  account,
  update,
}: {
  account: Account;
  update: (account: Account) => void;
}) {
  const [selected, setSelected] = useState(-1);
  const summary = summarize(account);
  const active = selected < 0 ? null : summary.assets[selected];
  return (
    <>
      <section className="feature-stat-grid" aria-label="持仓概览">
        <article>
          <span>持仓市值</span>
          <b>¥{money(summary.marketValue, false)}</b>
          <small>{summary.assets.length} 类风险资产</small>
        </article>
        <article>
          <span>可用现金</span>
          <b>¥{money(account.cash, false)}</b>
          <small>{(100 - summary.riskAllocation).toFixed(1)}% 现金缓冲</small>
        </article>
        <article>
          <span>持仓浮动盈亏</span>
          <b className={summary.pnl >= 0 ? 'up' : 'down'}>
            {summary.pnl >= 0 ? '+' : ''}¥{money(summary.pnl, false)}
          </b>
          <small>按手动参考现价计算</small>
        </article>
      </section>
      <div className="feature-holdings-layout">
        <HoldingsPanel
          account={account}
          selected={selected}
          onSelect={setSelected}
          onChange={(next) => {
            setSelected(-1);
            update(next);
          }}
        />
        <section className="panel holding-focus-panel" aria-live="polite">
          <div className="panel-heading">
            <div>
              <h2>{active ? `${active.name} · 持仓详情` : '组合结构'}</h2>
              <p>{active ? active.code : '选择左侧持仓查看单项影响'}</p>
            </div>
            <Layers3 size={18} />
          </div>
          {active ? (
            <div className="holding-focus-body">
              <div className="holding-focus-kpis">
                <span>
                  当前仓位 <b>{active.allocation.toFixed(1)}%</b>
                </span>
                <span>
                  当前市值 <b>¥{money(active.value, false)}</b>
                </span>
                <span>
                  浮动盈亏{' '}
                  <b className={active.pnl >= 0 ? 'up' : 'down'}>
                    {active.pnl >= 0 ? '+' : ''}¥{money(active.pnl, false)}
                  </b>
                </span>
              </div>
              <div className="allocation-visual">
                <div>
                  <span>该持仓</span>
                  <span>其余资产与现金</span>
                </div>
                <i>
                  <b
                    style={{
                      width: `${active.allocation}%`,
                      background: active.color,
                    }}
                  />
                </i>
              </div>
              <aside className="feature-insight">
                <Bot size={17} />
                <div>
                  <b>Agent 观察</b>
                  <p>
                    该持仓占组合 {active.allocation.toFixed(1)}%，
                    {active.allocation >= 25
                      ? '属于主要风险敞口，适合进一步检查集中度。'
                      : '当前对组合的单项影响相对有限。'}
                  </p>
                </div>
              </aside>
              <div className="feature-action-row">
                <Link href="/zones">
                  查看合理区间 <CircleGauge size={14} />
                </Link>
                <Link href="/simulation">
                  进入情景试算 <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="portfolio-breakdown">
              {summary.assets.map((asset, index) => (
                <button key={asset.id} onClick={() => setSelected(index)}>
                  <span>
                    <i style={{ background: asset.color }} /> {asset.name}
                  </span>
                  <b>{asset.allocation.toFixed(1)}%</b>
                </button>
              ))}
              <button>
                <span>
                  <i className="cash-dot" /> 现金
                </span>
                <b>{(100 - summary.riskAllocation).toFixed(1)}%</b>
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ZonesView({
  account,
  update,
  notify,
}: {
  account: Account;
  update: (account: Account) => void;
  notify: (message: string) => void;
}) {
  return (
    <ValuationZonePanel
      account={account}
      onChange={update}
      onSimulate={(holding) =>
        notify(`已选择 ${holding.name}，可前往情景试算比较组合影响。`)
      }
    />
  );
}

function ScenarioChart({ scenario }: { scenario: Scenario }) {
  const paths: Record<Scenario, string> = {
    bull: 'M10 117 C70 108 93 100 145 96 S220 72 270 67 S355 37 430 30',
    base: 'M10 117 C70 108 93 100 145 96 S220 82 270 79 S355 66 430 62',
    bear: 'M10 117 C70 108 93 100 145 96 S220 91 270 99 S355 112 430 128',
  };
  return (
    <figure
      className={`feature-scenario-chart scenario-${scenario}`}
      aria-label={`${scenarioLabels[scenario]}资产走势示意`}
    >
      <svg viewBox="0 0 440 150" aria-hidden="true">
        <path
          className="scenario-gridline"
          d="M10 30H430M10 75H430M10 120H430"
        />
        <path
          className="scenario-history"
          d="M10 117 C70 108 93 100 145 96 S185 84 220 84"
        />
        <path className="scenario-future" d={paths[scenario]} />
        <circle cx="220" cy="84" r="4" />
      </svg>
      <figcaption>
        <span>历史示意</span>
        <span>{scenarioLabels[scenario]} · 非概率预测</span>
      </figcaption>
    </figure>
  );
}

function SimulationView({ account }: { account: Account }) {
  const summary = summarize(account);
  const [allocation, setAllocation] = useState(65);
  const [days, setDays] = useState(20);
  const [scenario, setScenario] = useState<Scenario>('base');
  const result = forecast(allocation, days, scenario, 0, {
    total: summary.total,
    riskAllocation: summary.riskAllocation,
  });
  return (
    <div className="feature-simulation-layout">
      <section className="panel feature-simulation-main">
        <div className="panel-heading">
          <div>
            <h2>组合未来路径</h2>
            <p>以当前账户为基数，仅改变模拟仓位和情景</p>
          </div>
          <span className="purple-tag">DEMO</span>
        </div>
        <div className="feature-scenario-toolbar">
          <Tabs
            value={scenario}
            onValueChange={(value) => setScenario(value as Scenario)}
          >
            <TabsList className="scenario-tabs">
              <TabsTrigger value="bull">上涨</TabsTrigger>
              <TabsTrigger value="base">震荡</TabsTrigger>
              <TabsTrigger value="bear">下跌</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs
            value={String(days)}
            onValueChange={(value) => setDays(Number(value))}
          >
            <TabsList className="period-tabs">
              {[5, 20, 60].map((day) => (
                <TabsTrigger value={String(day)} key={day}>
                  {day}日
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <ScenarioChart scenario={scenario} />
        <div className="feature-allocation-control">
          <div>
            <span>
              <SlidersHorizontal size={14} /> 目标风险资产仓位
            </span>
            <b>{allocation}%</b>
          </div>
          <Slider
            value={[allocation]}
            min={0}
            max={100}
            step={5}
            onValueChange={(value) =>
              setAllocation(typeof value === 'number' ? value : value[0])
            }
            aria-label="目标风险资产仓位"
          />
          <small>
            0% 全部现金 · 当前实际 {summary.riskAllocation.toFixed(1)}% · 100%
            满仓
          </small>
        </div>
      </section>
      <aside className="panel feature-result-panel">
        <span className="eyebrow">SIMULATION RESULT</span>
        <h2>{scenarioLabels[scenario]}结果</h2>
        <div className="feature-result-primary">
          <span>模拟期末资产</span>
          <b>¥{money(result.end, false)}</b>
          <em className={result.pnl >= 0 ? 'up' : 'down'}>
            {result.pnl >= 0 ? '+' : ''}¥{money(result.pnl, false)}（
            {result.percent.toFixed(2)}%）
          </em>
        </div>
        <dl>
          <dt>模拟现金</dt>
          <dd>¥{money(result.cash, false)}</dd>
          <dt>风险资产调整</dt>
          <dd>
            {result.riskyDelta >= 0 ? '+' : '−'}¥
            {money(Math.abs(result.riskyDelta), false)}
          </dd>
          <dt>模拟调仓成本</dt>
          <dd>¥{money(result.cost, false)}</dd>
        </dl>
        <Link className="primary-button feature-save-link" href="/#simulation">
          在驾驶舱保存方案 <Bookmark size={14} />
        </Link>
        <p>这里不会修改“我的持仓”，结果仅供组合比较。</p>
      </aside>
    </div>
  );
}

function EventsView({ account }: { account: Account }) {
  const summary = summarize(account);
  const assessment = assessAccount(account);
  const events = useMemo(() => {
    const list = summary.assets.map((asset) => ({
      id: asset.id,
      title:
        asset.id === summary.largest?.id
          ? `${asset.name}是当前最大单一敞口`
          : `${asset.name}持仓状态需要持续观察`,
      type: asset.id === summary.largest?.id ? '集中度观察' : '资产动态',
      level: asset.allocation >= 25 ? 'high' : 'normal',
      asset: asset.name,
      detail: `当前占账户 ${asset.allocation.toFixed(1)}%，浮动盈亏 ${asset.pnl >= 0 ? '+' : ''}¥${money(asset.pnl, false)}。`,
    }));
    if (assessment.review)
      list.unshift({
        id: 'zone-review',
        title: `${assessment.review} 项区间或仓位状态需要复核`,
        type: '策略风控',
        level: 'high',
        asset: '我的组合',
        detail: 'Agent 已根据价格区间、目标仓位和临界状态生成复核清单。',
      });
    return list;
  }, [assessment.review, summary.assets, summary.largest?.id]);
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const visible =
    filter === 'all'
      ? events
      : events.filter((event) => event.level === 'high');
  return (
    <div className="feature-events-layout">
      <section className="panel event-center-panel">
        <div className="feature-filter-row">
          <div>
            <button
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              全部事件 <span>{events.length}</span>
            </button>
            <button
              aria-pressed={filter === 'high'}
              onClick={() => setFilter('high')}
            >
              重点关注{' '}
              <span>
                {events.filter((event) => event.level === 'high').length}
              </span>
            </button>
          </div>
          <small>最近更新 14:30</small>
        </div>
        <div className="feature-event-list">
          {visible.map((event) => (
            <article key={event.id}>
              <span className={`event-signal ${event.level}`}>
                {event.level === 'high' ? (
                  <BellRing size={16} />
                ) : (
                  <Activity size={16} />
                )}
              </span>
              <div>
                <span>
                  {event.type} · 关联：{event.asset}
                </span>
                <h2>{event.title}</h2>
                <p>{event.detail}</p>
              </div>
              <Link
                href={event.id === 'zone-review' ? '/zones' : '/simulation'}
              >
                查看影响 <ArrowRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <aside className="panel event-side-panel">
        <Radio size={19} />
        <h2>只关注与你有关的事件</h2>
        <p>
          事件会根据本机持仓、仓位和区间设置生成。演示版尚未接入实时新闻与行情。
        </p>
        <div>
          <span>
            风险资产 <b>{summary.riskAllocation.toFixed(1)}%</b>
          </span>
          <span>
            最大持仓 <b>{summary.largest?.name ?? '暂无'}</b>
          </span>
          <span>
            待复核 <b>{assessment.review} 项</b>
          </span>
        </div>
      </aside>
    </div>
  );
}

function PlansView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem('owlmate-plans-v2');
        setPlans(raw ? readPlans(raw) : []);
      } catch {
        setPlans([]);
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <section className="panel feature-plans-panel">
      <div className="feature-plans-summary">
        <div>
          <span>全部方案</span>
          <b>{plans.length}</b>
        </div>
        <div>
          <span>模拟中</span>
          <b>{plans.filter((plan) => plan.status === 'running').length}</b>
        </div>
        <div>
          <span>已归档</span>
          <b>{plans.filter((plan) => plan.status === 'archived').length}</b>
        </div>
        <Link href="/#simulation">
          新建模拟方案 <ArrowRight size={14} />
        </Link>
      </div>
      {!ready ? (
        <p className="feature-loading">正在读取本机方案…</p>
      ) : plans.length ? (
        <div className="feature-plan-grid">
          {plans.map((plan) => {
            const virtual = virtualAccount(plan, plan.elapsed);
            return (
              <article key={plan.id}>
                <div>
                  <span className={`plan-status ${plan.status}`}>
                    {
                      {
                        pending: '待模拟',
                        running: '模拟中',
                        archived: '已归档',
                      }[plan.status]
                    }
                  </span>
                  <small>{new Date(plan.at).toLocaleDateString('zh-CN')}</small>
                </div>
                <h2>{plan.name}</h2>
                <p>
                  {scenarioLabels[plan.scenario]} · {plan.days} 日 · 目标仓位{' '}
                  {plan.allocation}%
                </p>
                <dl>
                  <dt>当前模拟资产</dt>
                  <dd>¥{money(virtual.result.end, false)}</dd>
                  <dt>模拟进度</dt>
                  <dd>
                    {plan.elapsed}/{plan.days} 日
                  </dd>
                </dl>
                <Link href="/#simulation">
                  回到驾驶舱管理 <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="feature-empty-state">
          <Bookmark size={25} />
          <h2>还没有保存的方案</h2>
          <p>在情景试算中调整仓位并保存后，方案会显示在这里。</p>
          <Link className="primary-button" href="/#simulation">
            开始第一次试算
          </Link>
        </div>
      )}
    </section>
  );
}

function HelpView() {
  const guides = [
    {
      icon: Wallet,
      title: '先维护持仓',
      text: '录入数量、成本和参考现价，建立组合分析基线。',
      href: '/holdings',
    },
    {
      icon: CircleGauge,
      title: '再检查区间',
      text: '为每只持仓设置合理价格和目标仓位区间。',
      href: '/zones',
    },
    {
      icon: FlaskConical,
      title: '最后做试算',
      text: '比较不同仓位和市场情景，不影响真实持仓。',
      href: '/simulation',
    },
  ];
  return (
    <>
      <section className="feature-guide-grid">
        {guides.map((guide, index) => {
          const Icon = guide.icon;
          return (
            <Link href={guide.href} key={guide.title}>
              <span>{index + 1}</span>
              <Icon size={20} />
              <h2>{guide.title}</h2>
              <p>{guide.text}</p>
              <b>
                查看功能 <ArrowRight size={14} />
              </b>
            </Link>
          );
        })}
      </section>
      <section className="feature-help-grid">
        <article className="panel">
          <Database size={19} />
          <h2>数据从哪里来？</h2>
          <p>
            当前持仓、方案和画像保存在这台电脑的浏览器中；行情和事件均为演示数据。
          </p>
        </article>
        <article className="panel">
          <ShieldCheck size={19} />
          <h2>会自动交易吗？</h2>
          <p>
            不会。所有建议、调仓和资金配置都是试算，不会连接券商或改变真实账户。
          </p>
        </article>
        <article className="panel">
          <FileQuestion size={19} />
          <h2>建议代表收益承诺吗？</h2>
          <p>
            不代表。区间与结果来自演示规则，主要用于帮助理解组合结构和风险。
          </p>
        </article>
      </section>
    </>
  );
}

function ProfileView({ account }: { account: Account }) {
  const summary = summarize(account);
  return (
    <div className="feature-profile-layout">
      <section className="panel profile-account-card">
        <span className="profile-large-avatar">演</span>
        <div>
          <span>演示账户</span>
          <h2>尚未完成投资画像</h2>
          <p>
            注册和画像分开进行；建立画像后，建议仓位会根据期限、流动性和最大可承受回撤调整。
          </p>
        </div>
        <Link className="primary-button" href="/">
          返回首页建立画像
        </Link>
      </section>
      <section className="feature-profile-grid">
        <article className="panel">
          <UserRound size={18} />
          <span>账户状态</span>
          <b>演示模式</b>
          <small>手机号与验证码仅用于演示注册流程</small>
        </article>
        <article className="panel">
          <Target size={18} />
          <span>当前建议依据</span>
          <b>示例稳健配置</b>
          <small>未建立画像时使用 65% 风险资产参考上限</small>
        </article>
        <article className="panel">
          <Wallet size={18} />
          <span>本机账户规模</span>
          <b>¥{money(summary.total, false)}</b>
          <small>
            {summary.assets.length} 类持仓 · 现金{' '}
            {(100 - summary.riskAllocation).toFixed(1)}%
          </small>
        </article>
      </section>
      <aside className="feature-profile-note">
        <Sparkles size={17} />
        <p>
          <b>画像会影响什么？</b>建议仓位、风险提醒和 Agent
          的解释角度会变化；真实持仓不会自动改变。
        </p>
      </aside>
    </div>
  );
}

export function FeatureWorkspace({ section }: { section: FeatureSection }) {
  const { account, update, notice, setNotice } = useLocalAccount();
  return (
    <div className="app-shell feature-shell">
      <AppRail />
      <div className="workspace feature-workspace">
        <FeatureHeader />
        <main className="feature-main">
          <PageHeading section={section} />
          {notice && (
            <output className="notice feature-notice">{notice}</output>
          )}
          {section === 'holdings' && (
            <HoldingsView account={account} update={update} />
          )}
          {section === 'zones' && (
            <ZonesView account={account} update={update} notify={setNotice} />
          )}
          {section === 'simulation' && <SimulationView account={account} />}
          {section === 'events' && <EventsView account={account} />}
          {section === 'plans' && <PlansView />}
          {section === 'help' && <HelpView />}
          {section === 'profile' && <ProfileView account={account} />}
          <footer className="page-footer feature-footer">
            <span>
              <ShieldCheck size={12} />
              本机账户 · 演示规则 · 未接入真实交易
            </span>
            <span>OwlMate / Investment in perspective.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
