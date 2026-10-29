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
  CircleHelp,
  Library,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Search,
  Bookmark,
  FlaskConical,
  Users,
} from 'lucide-react';
import { AppRail } from '@/components/app-rail';
import { CustomStrategyDialog } from '@/components/custom-strategy-dialog';
import { ThemeSelector } from '@/components/theme-selector';
import { StrategyPerformance } from '@/components/strategy-performance';
import { StrategyGuide, StrategyWelcome } from '@/components/strategy-guide';
import {
  discoverStrategies,
  strategyCategories,
  strategyMarkets,
  strategyMarket,
  type StrategyCategory,
  type StrategyMarket,
} from '@/lib/strategy-discovery';
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

function StrategyImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  // Native images avoid the current vinext next/image client-runtime mismatch.
  return createElement('img', props);
}

function priceLabel(strategy: CommunityStrategy) {
  return strategy.price === 0 ? '免费' : `¥${strategy.price}`;
}

function StrategyCard({
  strategy,
  referenced,
  onOpen,
  onReference,
  onFavorite,
  wide = false,
}: {
  strategy: CommunityStrategy;
  referenced: boolean;
  onOpen: () => void;
  onReference: () => void;
  onFavorite: () => void;
  wide?: boolean;
}) {
  return (
    <article
      className={`market-strategy-card${wide ? ' market-strategy-card-wide' : ''}`}
      style={{ '--strategy-accent': strategy.accent } as React.CSSProperties}
    >
      <div className="market-strategy-card-body">
        <div className="discovery-title-row">
          <h3>{strategy.title}</h3>
          <div className="discovery-title-actions">
            <span className="discovery-price">{priceLabel(strategy)}</span>
            {strategy.price === 0 && (
              <button
                type="button"
                aria-label={`${referenced ? '已收藏' : '收藏'}${strategy.title}`}
                disabled={referenced}
                onClick={onFavorite}
              >
                <Bookmark
                  size={14}
                  fill={referenced ? 'currentColor' : 'none'}
                />
                {referenced ? '已收藏' : '收藏'}
              </button>
            )}
          </div>
        </div>
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
        <StrategyPerformance />
        <div className="discovery-card-facts">
          <span>
            <small>适用范围</small>
            {strategyMarket(strategy.id)}
          </span>
          <span>
            <small>测试状态</small>待测试
          </span>
        </div>
        <p className="discovery-asset-scope">{strategy.assetScope}</p>
        <div className="discovery-tags">
          {strategy.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
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
                <Check size={14} /> 打开实验室
              </>
            ) : strategy.price === 0 ? (
              <>
                <Plus size={14} /> 加入实验室
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

export function StrategyMarketplace() {
  const [tab, setTab] = useState<'market' | 'mine'>('market');
  const [filter, setFilter] = useState<StrategyCategory>('全部');
  const [market, setMarket] = useState<StrategyMarket>('全部市场');
  const [access, setAccess] = useState('全部获取方式');
  const [sort, setSort] = useState('精选顺序');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CommunityStrategy | null>(null);
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>(
    [],
  );
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

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

  const filteredStrategies = useMemo(
    () =>
      discoverStrategies(communityStrategies, {
        query,
        category: filter,
        market,
        access,
        sort,
      }),
    [query, filter, market, access, sort],
  );

  function persistStrategies(next: CustomStrategy[]) {
    localStorage.setItem(CUSTOM_STRATEGIES_KEY, JSON.stringify(next));
    setCustomStrategies(next);
    window.dispatchEvent(new CustomEvent(CUSTOM_STRATEGIES_EVENT));
  }

  function favoriteStrategy(strategy: CommunityStrategy) {
    if (strategy.price > 0 || referencedIds.has(strategy.id)) return;
    try {
      if (customStrategies.length >= 30)
        throw new Error('策略库已满，请先整理现有策略。');
      persistStrategies([...customStrategies, toCustomStrategy(strategy)]);
      setNotice(`已收藏「${strategy.title}」，新建实验时可从已有策略中选择。`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : '收藏失败，请检查本机存储。',
      );
    }
  }

  function referenceStrategy(strategy: CommunityStrategy) {
    if (strategy.price > 0) {
      setSelected(strategy);
      setNotice('收费策略目前开放规则预览，获取流程将在后续版本接入。');
      return;
    }
    if (referencedIds.has(strategy.id)) {
      const existing = customStrategies.find(
        (item) => item.marketId === strategy.id,
      );
      if (existing) openInSimulation(existing);
      return;
    }
    try {
      const copy = toCustomStrategy(strategy);
      persistStrategies([...customStrategies, copy]);
      openInSimulation(copy);
    } catch {
      setNotice('引用失败，请检查浏览器是否允许本机存储。');
    }
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
            <button
              className="lab-help-trigger"
              aria-label="使用指南"
              onClick={() => setGuideOpen(true)}
            >
              <CircleHelp size={17} aria-hidden="true" />
              <span>使用指南</span>
            </button>
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
              <Sparkles size={16} /> AI 创建策略
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
            communityStrategies.length ? (
              <>
                <section className="discovery-controls" aria-label="查找策略">
                  <label className="discovery-search">
                    <Search size={18} aria-hidden="true" />
                    <input
                      aria-label="搜索策略"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="搜索策略名称、逻辑、作者或标签"
                    />
                  </label>
                  <div className="discovery-categories" aria-label="策略分类">
                    {strategyCategories.map((item) => (
                      <button
                        key={item}
                        aria-pressed={filter === item}
                        onClick={() => setFilter(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="discovery-selects">
                    <label>
                      适用市场
                      <select
                        value={market}
                        onChange={(event) =>
                          setMarket(event.target.value as StrategyMarket)
                        }
                      >
                        {strategyMarkets.map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      获取方式
                      <select
                        value={access}
                        onChange={(event) => setAccess(event.target.value)}
                      >
                        {['全部获取方式', '免费', '付费'].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      排序
                      <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value)}
                      >
                        {['精选顺序', '引用人数', '名称'].map((item) => (
                          <option key={item}>{item}</option>
                        ))}
                      </select>
                    </label>
                    <span>{filteredStrategies.length} 个策略</span>
                    <button
                      onClick={() => {
                        setQuery('');
                        setFilter('全部');
                        setMarket('全部市场');
                        setAccess('全部获取方式');
                        setSort('精选顺序');
                      }}
                    >
                      重置筛选
                    </button>
                  </div>
                </section>
                <div className="discovery-status">
                  <FlaskConical size={16} />
                  <span>
                    先理解规则，再加入实验室验证。当前策略尚无统一回测结果，真实收益、回撤及曲线将在完成测试后展示。
                  </span>
                </div>
                {!filteredStrategies.length && (
                  <div className="strategy-welcome">
                    <h2>没有找到匹配的策略</h2>
                    <p>可以调整分类、适用市场或搜索关键词。</p>
                  </div>
                )}
                <div className="market-card-grid discovery-grid">
                  {filteredStrategies.map((strategy) => (
                    <StrategyCard
                      key={strategy.id}
                      strategy={strategy}
                      referenced={referencedIds.has(strategy.id)}
                      onOpen={() => setSelected(strategy)}
                      onReference={() => referenceStrategy(strategy)}
                      onFavorite={() => favoriteStrategy(strategy)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <StrategyWelcome
                mode="market"
                onStart={() => setCreateOpen(true)}
                onHelp={() => setGuideOpen(true)}
              />
            )
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
                <StrategyWelcome
                  mode="market"
                  onStart={() => setCreateOpen(true)}
                  onHelp={() => setGuideOpen(true)}
                />
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

      {guideOpen && (
        <StrategyGuide
          mode="market"
          onClose={() => setGuideOpen(false)}
          onStart={() => setCreateOpen(true)}
        />
      )}
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
              <section className="discovery-backtest">
                <h3>
                  回测表现 <span>待测试</span>
                </h3>
                <StrategyPerformance />
                <p>
                  曲线仅为样式预览，不代表此策略的历史表现。真实测试区间、对照基准、手续费和滑点将在回测接入后展示。
                </p>
              </section>
              <div className="discovery-flow">
                <span>1 加入实验室</span>
                <ArrowRight size={13} />
                <span>2 调整参数</span>
                <ArrowRight size={13} />
                <span>3 验证规则</span>
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
                      <Check size={14} /> 打开实验室
                    </>
                  ) : selected.price === 0 ? (
                    <>
                      <Plus size={14} /> 加入实验室
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
