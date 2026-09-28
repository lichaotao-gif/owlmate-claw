'use client';

import {
  createElement,
  useEffect,
  useMemo,
  useState,
  type ImgHTMLAttributes,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Library,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
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
  communityStrategies,
  toCustomStrategy,
  type CommunityStrategy,
} from '@/lib/community-strategies';
import {
  CUSTOM_STRATEGIES_EVENT,
  CUSTOM_STRATEGIES_KEY,
  readCustomStrategies,
  type CustomStrategy,
} from '@/lib/investment-strategies';

type MarketFilter = '全部' | '免费' | '付费' | '稳健' | '轮动' | '成长';

const marketFilters: MarketFilter[] = [
  '全部',
  '免费',
  '付费',
  '稳健',
  '轮动',
  '成长',
];

function StrategyImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  // Native images avoid the current vinext next/image client-runtime mismatch.
  return createElement('img', props);
}

function priceLabel(strategy: CommunityStrategy) {
  return strategy.price === 0 ? '免费' : `¥${strategy.price}`;
}

function matchesFilter(strategy: CommunityStrategy, filter: MarketFilter) {
  if (filter === '全部') return true;
  if (filter === '免费') return strategy.price === 0;
  if (filter === '付费') return strategy.price > 0;
  return strategy.tags.includes(filter);
}

function StrategyCard({
  strategy,
  referenced,
  onOpen,
  onReference,
  wide = false,
}: {
  strategy: CommunityStrategy;
  referenced: boolean;
  onOpen: () => void;
  onReference: () => void;
  wide?: boolean;
}) {
  return (
    <article
      className={`market-strategy-card${wide ? ' market-strategy-card-wide' : ''}`}
      style={{ '--strategy-accent': strategy.accent } as React.CSSProperties}
    >
      <div className="market-strategy-cover">
        <StrategyImage
          src={strategy.cover}
          alt={strategy.coverAlt}
          width={1440}
          height={810}
          loading="lazy"
        />
        <div className="market-cover-shade" />
        <div className="market-cover-badges">
          <span className={strategy.price === 0 ? 'free' : 'paid'}>
            {priceLabel(strategy)}
          </span>
          <span>{strategy.tags[0]}</span>
        </div>
      </div>
      <div className="market-strategy-card-body">
        <h3>{strategy.title}</h3>
        <div className="market-author-row">
          <StrategyImage
            src={strategy.authorAvatar}
            alt=""
            width={30}
            height={30}
          />
          <span>
            <b>{strategy.authorName}</b>
            <small>{strategy.updatedLabel}</small>
          </span>
        </div>
        <p>{strategy.summary}</p>
        <div className="market-strategy-meta">
          <span>
            <Users size={13} /> {strategy.referenceCount} 人引用
          </span>
          <span>
            <Clock3 size={13} /> {strategy.rebalance.split('，')[0]}
          </span>
        </div>
        <div className="market-strategy-actions">
          <button className="market-card-secondary" onClick={onOpen}>
            查看详情
          </button>
          <button
            className={
              referenced ? 'market-card-referenced' : 'market-card-primary'
            }
            onClick={onReference}
          >
            {referenced ? (
              <>
                <Check size={14} /> 已引用
              </>
            ) : strategy.price === 0 ? (
              <>
                <Plus size={14} /> 免费引用
              </>
            ) : (
              <>
                <LockKeyhole size={14} /> 获取策略
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function MarketSection({
  eyebrow,
  title,
  description,
  strategies,
  referencedIds,
  onOpen,
  onReference,
  layout = 'grid',
  onViewAll,
}: {
  eyebrow: string;
  title: string;
  description: string;
  strategies: CommunityStrategy[];
  referencedIds: Set<string>;
  onOpen: (strategy: CommunityStrategy) => void;
  onReference: (strategy: CommunityStrategy) => void;
  layout?: 'grid' | 'bento';
  onViewAll?: () => void;
}) {
  const titleId = `shelf-${eyebrow.toLowerCase().replaceAll(' ', '-')}`;
  return (
    <section className="market-shelf" aria-labelledby={titleId}>
      <div className="market-shelf-heading">
        <div>
          <span>{eyebrow}</span>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        {onViewAll && (
          <button className="market-shelf-more" onClick={onViewAll}>
            查看全部 <ArrowRight size={14} />
          </button>
        )}
      </div>
      <div
        className={
          layout === 'bento' ? 'market-bento-grid' : 'market-card-grid'
        }
      >
        {strategies.map((strategy, index) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            referenced={referencedIds.has(strategy.id)}
            onOpen={() => onOpen(strategy)}
            onReference={() => onReference(strategy)}
            wide={layout === 'bento' && index === 0}
          />
        ))}
      </div>
    </section>
  );
}

export function StrategyMarketplace() {
  const [tab, setTab] = useState<'market' | 'mine'>('market');
  const [filter, setFilter] = useState<MarketFilter>('全部');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CommunityStrategy | null>(null);
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>(
    [],
  );
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    function load() {
      try {
        setCustomStrategies(
          readCustomStrategies(localStorage.getItem(CUSTOM_STRATEGIES_KEY)),
        );
      } catch {
        setNotice('本机策略数据暂时无法读取。');
      }
    }
    load();
    window.addEventListener(CUSTOM_STRATEGIES_EVENT, load);
    return () => window.removeEventListener(CUSTOM_STRATEGIES_EVENT, load);
  }, []);

  const referencedIds = useMemo(
    () =>
      new Set(
        customStrategies
          .map((strategy) => strategy.marketId)
          .filter((id): id is string => Boolean(id)),
      ),
    [customStrategies],
  );

  const filteredStrategies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return communityStrategies.filter((strategy) => {
      const searchable = [
        strategy.title,
        strategy.authorName,
        strategy.description,
        ...strategy.tags,
      ]
        .join(' ')
        .toLowerCase();
      return matchesFilter(strategy, filter) && searchable.includes(normalized);
    });
  }, [filter, query]);

  function persistStrategies(next: CustomStrategy[]) {
    localStorage.setItem(CUSTOM_STRATEGIES_KEY, JSON.stringify(next));
    setCustomStrategies(next);
    window.dispatchEvent(new CustomEvent(CUSTOM_STRATEGIES_EVENT));
  }

  function referenceStrategy(strategy: CommunityStrategy) {
    if (strategy.price > 0) {
      setSelected(strategy);
      setNotice('收费策略目前开放规则预览，获取流程将在后续版本接入。');
      return;
    }
    if (referencedIds.has(strategy.id)) {
      setTab('mine');
      setNotice(`「${strategy.title}」已经在你的策略中。`);
      return;
    }
    try {
      persistStrategies([...customStrategies, toCustomStrategy(strategy)]);
      setNotice(
        `已将「${strategy.title}」引用到我的策略，可在驾驶舱推演中使用。`,
      );
    } catch {
      setNotice('引用失败，请检查浏览器是否允许本机存储。');
    }
  }

  function showAll(filterValue: MarketFilter) {
    setQuery('');
    setFilter(filterValue);
    window.requestAnimationFrame(() => {
      document
        .getElementById('strategy-market-toolbar')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function openInSimulation(strategy: CustomStrategy) {
    try {
      localStorage.setItem(
        'owlmate-new-experiment-strategy',
        JSON.stringify({ id: strategy.id, name: strategy.name }),
      );
      window.location.assign('/holdings?create=1');
    } catch {
      setNotice('暂时无法载入该策略，请稍后重试。');
    }
  }

  const featured = communityStrategies.find((strategy) => strategy.featured)!;
  const freeStrategies = communityStrategies
    .filter((strategy) => strategy.price === 0)
    .slice(0, 4);
  const popularStrategies = [...communityStrategies]
    .sort((a, b) => b.referenceCount - a.referenceCount)
    .slice(0, 3);
  const paidStrategies = communityStrategies.filter(
    (strategy) => strategy.price > 0,
  );

  return (
    <div className="app-shell strategies-shell">
      <AppRail />
      <div className="workspace strategies-workspace">
        <header className="topbar">
          <div className="wordmark">
            OwlMate<span className="brand-beta">BETA</span>
          </div>
          <span className="header-divider" />
          <span className="workspace-label">社区策略市场</span>
          <div className="header-right">
            <span className="snapshot">
              {communityStrategies.length} 个社区策略 ·{' '}
              {customStrategies.length} 个已入库
            </span>
            <Link href="/holdings" className="back-cockpit">
              <ArrowLeft size={14} /> 返回实验室
            </Link>
            <ThemeSelector />
          </div>
        </header>

        <main className="strategy-market-main">
          <section className="strategy-market-intro">
            <div>
              <span className="eyebrow">
                <Store size={13} /> COMMUNITY STRATEGY SQUARE
              </span>
              <h1>
                策略广场
                <span className="heading-dot" />
              </h1>
              <p>
                发现社区贡献的量化规则，把适合自己的策略放进独立实验中验证。
              </p>
            </div>
            <button
              className="strategy-create-button"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={16} /> 创建策略
            </button>
          </section>

          <div className="strategy-market-tabs" aria-label="策略广场内容切换">
            <button
              aria-pressed={tab === 'market'}
              onClick={() => setTab('market')}
            >
              <Store size={15} /> 策略市场
              <small>{communityStrategies.length}</small>
            </button>
            <button
              aria-pressed={tab === 'mine'}
              onClick={() => setTab('mine')}
            >
              <Library size={15} /> 我的策略
              <small>{customStrategies.length}</small>
            </button>
          </div>

          {notice && (
            <output className="strategy-market-notice" aria-live="polite">
              <Check size={14} /> {notice}
            </output>
          )}

          {tab === 'market' ? (
            <>
              <section
                className="strategy-featured"
                aria-labelledby="featured-title"
              >
                <StrategyImage
                  src={featured.cover}
                  alt={featured.coverAlt}
                  width={1440}
                  height={810}
                  fetchPriority="high"
                />
                <div className="strategy-featured-overlay" />
                <div className="strategy-featured-copy">
                  <span>
                    <Sparkles size={13} /> 社区热门 · 免费
                  </span>
                  <h2 id="featured-title">{featured.title}</h2>
                  <p>{featured.description}</p>
                  <div className="strategy-featured-author">
                    <StrategyImage
                      src={featured.authorAvatar}
                      alt=""
                      width={34}
                      height={34}
                    />
                    <span>
                      <b>{featured.authorName}</b>
                      <small>
                        {featured.authorRole} · {featured.updatedLabel}
                      </small>
                    </span>
                  </div>
                  <button onClick={() => setSelected(featured)}>
                    查看策略 <ArrowRight size={15} />
                  </button>
                </div>
              </section>

              <aside className="strategy-community-note">
                <ShieldCheck size={18} />
                <div>
                  <b>平台不提供操作建议，广场内容均以社区研究规则展示</b>
                  <p>
                    OwlMate 只提供规则整理和虚拟仿真能力。Beta
                    期间的社区身份与策略内容包含演示数据，不连接真实账户。
                  </p>
                </div>
              </aside>

              <div
                className="strategy-market-toolbar"
                id="strategy-market-toolbar"
              >
                <div aria-label="策略筛选">
                  {marketFilters.map((item) => (
                    <button
                      key={item}
                      aria-pressed={filter === item}
                      onClick={() => setFilter(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {query || filter !== '全部' ? (
                <section className="market-shelf market-search-results">
                  <div className="market-shelf-heading">
                    <div>
                      <span>SEARCH RESULTS</span>
                      <h2>找到 {filteredStrategies.length} 个策略</h2>
                      <p>结果同时匹配当前关键词与筛选条件。</p>
                    </div>
                  </div>
                  <div className="market-card-grid">
                    {filteredStrategies.map((strategy) => (
                      <StrategyCard
                        key={strategy.id}
                        strategy={strategy}
                        referenced={referencedIds.has(strategy.id)}
                        onOpen={() => setSelected(strategy)}
                        onReference={() => referenceStrategy(strategy)}
                      />
                    ))}
                  </div>
                </section>
              ) : (
                <>
                  <MarketSection
                    eyebrow="FREE TO REFERENCE"
                    title="免费策略"
                    description="社区用户免费分享，可直接引用到自己的策略库。"
                    strategies={freeStrategies}
                    referencedIds={referencedIds}
                    onOpen={setSelected}
                    onReference={referenceStrategy}
                    onViewAll={() => showAll('免费')}
                  />
                  <MarketSection
                    eyebrow="TRENDING THIS WEEK"
                    title="本周热门"
                    description="根据引用人数与近期更新活跃度排列。"
                    strategies={popularStrategies}
                    referencedIds={referencedIds}
                    onOpen={setSelected}
                    onReference={referenceStrategy}
                    layout="bento"
                  />
                  <MarketSection
                    eyebrow="CREATOR EDITIONS"
                    title="创作者进阶策略"
                    description="可预览规则框架；收费获取流程将在后续版本开放。"
                    strategies={paidStrategies}
                    referencedIds={referencedIds}
                    onOpen={setSelected}
                    onReference={referenceStrategy}
                    onViewAll={() => showAll('付费')}
                  />
                </>
              )}
            </>
          ) : (
            <section
              className="my-strategy-library"
              aria-labelledby="my-strategy-title"
            >
              <div className="market-shelf-heading">
                <div>
                  <span>MY STRATEGY LIBRARY</span>
                  <h2 id="my-strategy-title">我的策略</h2>
                  <p>包含你创建的策略，以及从社区引用的策略。</p>
                </div>
                <button
                  className="strategy-create-button compact"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus size={15} /> 创建策略
                </button>
              </div>
              {customStrategies.length > 0 ? (
                <div className="my-strategy-grid">
                  {customStrategies.map((strategy) => (
                    <article className="my-strategy-card" key={strategy.id}>
                      <div className="my-strategy-cover">
                        <StrategyImage
                          src={
                            strategy.cover ?? '/strategy-covers/defensive.jpg'
                          }
                          alt=""
                          width={1440}
                          height={810}
                          loading="lazy"
                        />
                        <span>
                          {strategy.origin === 'community'
                            ? '社区引用'
                            : '我创建的'}
                        </span>
                      </div>
                      <div>
                        <h3>{strategy.name}</h3>
                        <p>{strategy.summary}</p>
                        <div className="my-strategy-tags">
                          {strategy.tags.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        <small>
                          {strategy.author
                            ? `引用自 ${strategy.author}`
                            : '保存在当前浏览器'}
                        </small>
                        <button onClick={() => openInSimulation(strategy)}>
                          创建策略实验 <ArrowRight size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="my-strategy-empty">
                  <Library size={28} />
                  <h3>你的策略库还是空的</h3>
                  <p>先去市场引用免费策略，或创建一套自己的规则。</p>
                  <button onClick={() => setTab('market')}>浏览策略市场</button>
                </div>
              )}
            </section>
          )}

          <footer className="page-footer strategy-market-footer">
            <span>
              <ShieldCheck size={12} /> 社区规则仅用于科研与仿真，不连接真实交易
            </span>
            <span>OwlMate / Strategies by the community.</span>
          </footer>
        </main>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="owl-dialog market-strategy-dialog">
          <DialogTitle>{selected?.title}</DialogTitle>
          <DialogDescription>
            {selected?.authorName} 贡献 · {selected ? priceLabel(selected) : ''}
          </DialogDescription>
          {selected && (
            <div className="market-strategy-detail">
              <div className="market-detail-cover">
                <StrategyImage
                  src={selected.cover}
                  alt={selected.coverAlt}
                  width={1440}
                  height={810}
                />
                <div>
                  <span className={selected.price === 0 ? 'free' : 'paid'}>
                    {priceLabel(selected)}
                  </span>
                  <span>{selected.referenceCount} 人引用</span>
                </div>
              </div>
              <div className="market-detail-author">
                <StrategyImage
                  src={selected.authorAvatar}
                  alt=""
                  width={44}
                  height={44}
                />
                <span>
                  <b>{selected.authorName}</b>
                  <small>
                    {selected.authorRole} · {selected.updatedLabel}
                  </small>
                </span>
              </div>
              <p className="market-detail-description">
                {selected.description}
              </p>
              <div className="market-detail-facts">
                <span>
                  <small>适用资产</small>
                  <b>{selected.assetScope}</b>
                </span>
                <span>
                  <small>复核与调仓</small>
                  <b>{selected.rebalance}</b>
                </span>
              </div>
              <div className="market-detail-rules">
                <section>
                  <h3>候选与入场规则</h3>
                  {selected.entryRules.map((rule) => (
                    <p key={rule}>{rule}</p>
                  ))}
                </section>
                <section>
                  <h3>风险控制</h3>
                  {selected.riskControls.map((rule) => (
                    <p key={rule}>{rule}</p>
                  ))}
                </section>
              </div>
              <div className="market-detail-actions">
                <button
                  className="market-card-secondary"
                  onClick={() => setSelected(null)}
                >
                  继续浏览
                </button>
                <button
                  className={
                    referencedIds.has(selected.id)
                      ? 'market-card-referenced'
                      : 'market-card-primary'
                  }
                  onClick={() => referenceStrategy(selected)}
                >
                  {referencedIds.has(selected.id) ? (
                    <>
                      <Check size={14} /> 已在我的策略
                    </>
                  ) : selected.price === 0 ? (
                    <>
                      <Plus size={14} /> 免费引用到我的策略
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={14} /> 获取策略 · ¥{selected.price}
                    </>
                  )}
                </button>
              </div>
              <p className="market-detail-note">
                由社区用户贡献，仅用于规则记录与虚拟仿真，不构成操作建议。
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CustomStrategyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        context="market"
        onCreated={(strategy) => {
          setTab('mine');
          setNotice(`「${strategy.name}」已保存为我的策略。`);
        }}
      />
    </div>
  );
}
