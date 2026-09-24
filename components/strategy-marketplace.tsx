'use client';

import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileText,
  Library,
  LockKeyhole,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  Users,
} from 'lucide-react';
import { AppRail } from '@/components/app-rail';
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
  generateCustomStrategy,
  readCustomStrategies,
  type CustomStrategy,
} from '@/lib/investment-strategies';

type MarketFilter = '全部' | '免费' | '付费' | '稳健' | '轮动' | '成长';
type AgentInputMode = 'text' | 'voice' | 'document';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

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

function inferStrategyName(description: string) {
  const firstLine = description
    .split(/[\n。！？]/u)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return '我的自定义策略';
  const compact = firstLine.replace(/^[我想要做一个套的]+/u, '').trim();
  return (compact || firstLine).slice(0, 18);
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
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [agentInputMode, setAgentInputMode] = useState<AgentInputMode>('text');
  const [generatedDraft, setGeneratedDraft] = useState<CustomStrategy | null>(
    null,
  );
  const [createError, setCreateError] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [isReadingDocument, setIsReadingDocument] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

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

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

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

  function resetCreateAgent() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setDraftName('');
    setDraftDescription('');
    setGeneratedDraft(null);
    setCreateError('');
    setDocumentName('');
    setAgentInputMode('text');
  }

  function generateStrategyDraft() {
    if (draftDescription.trim().length < 12) {
      setCreateError(
        '请再多描述一些，至少包含适用资产、选择规则或风险控制中的一项。',
      );
      return;
    }
    try {
      const name = draftName.trim() || inferStrategyName(draftDescription);
      setGeneratedDraft(generateCustomStrategy(name, draftDescription));
      setCreateError('');
    } catch {
      setCreateError('策略草案生成失败，请稍后重试。');
    }
  }

  function saveGeneratedStrategy() {
    if (!generatedDraft) return;
    try {
      persistStrategies([...customStrategies, generatedDraft]);
      setCreateOpen(false);
      setTab('mine');
      setNotice(`「${generatedDraft.name}」已保存为我的策略。`);
      resetCreateAgent();
    } catch {
      setCreateError('策略保存失败，请检查浏览器本地存储设置。');
    }
  }

  function toggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setCreateError(
        '当前浏览器不支持语音转写，请使用 Chrome / Edge，或改用文字输入。',
      );
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = '';
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        if (event.results[index].isFinal) {
          transcript += event.results[index][0].transcript;
        }
      }
      if (transcript) {
        setDraftDescription((current) =>
          `${current}${current ? '\n' : ''}${transcript}`.slice(0, 1200),
        );
      }
    };
    recognition.onerror = () => {
      setCreateError('没有获取到语音，请检查麦克风权限后重试。');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setCreateError('');
    setIsListening(true);
    recognition.start();
  }

  async function readStrategyDocument(file: File | undefined) {
    if (!file) return;
    setCreateError('');
    setGeneratedDraft(null);
    setIsReadingDocument(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let content = '';
      if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });
        content = result.value;
      } else if (extension === 'txt' || extension === 'md') {
        content = await file.text();
      } else {
        throw new Error('unsupported');
      }
      const cleaned = content.trim().slice(0, 1200);
      if (!cleaned) throw new Error('empty');
      setDocumentName(file.name);
      setDraftDescription(cleaned);
      if (!draftName.trim()) {
        setDraftName(file.name.replace(/\.(docx|txt|md)$/iu, '').slice(0, 40));
      }
    } catch {
      setDocumentName('');
      setCreateError(
        '文档未能读取。请上传 .docx、.txt 或 .md 文件，并确认文件中有可读取的文字。',
      );
    } finally {
      setIsReadingDocument(false);
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
      const raw = localStorage.getItem('owlmate-strategies-v1');
      const previous = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'owlmate-strategies-v1',
        JSON.stringify({ ...previous, portfolio: strategy.id }),
      );
      window.location.assign('/#simulation');
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
            <Link href="/" className="back-cockpit">
              <ArrowLeft size={14} /> 返回驾驶舱
            </Link>
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
                发现社区用户贡献的投资规则，把适合自己的策略引用到个人策略库中。
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
                  <b>平台不提供投资策略，广场内容均以社区用户身份贡献</b>
                  <p>
                    OwlMate 只提供规则整理、引用和情景推演能力。Beta
                    期间的社区身份与策略内容包含演示数据，所有策略均不构成投资建议。
                  </p>
                </div>
              </aside>

              <div
                className="strategy-market-toolbar"
                id="strategy-market-toolbar"
              >
                <label>
                  <Search size={15} />
                  <span className="sr-only">搜索策略、作者或标签</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索策略、作者或标签"
                  />
                </label>
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
                          用于情景推演 <ArrowRight size={14} />
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
              <ShieldCheck size={12} /> 社区规则仅用于分析与推演，不连接真实交易
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
                由社区用户贡献，仅用于规则记录、组合分析与情景推演，不构成投资建议。
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateAgent();
        }}
      >
        <DialogContent className="owl-dialog strategy-create-dialog">
          <DialogTitle>OwlMate 策略 Agent</DialogTitle>
          <DialogDescription>
            说出、写下或导入你的想法，Agent 会整理成可复核的个人策略。
          </DialogDescription>
          {!generatedDraft ? (
            <div className="strategy-agent-create">
              <div className="strategy-agent-input-panel">
                <label>
                  策略名称 <small>可选，Agent 可自动起名</small>
                  <input
                    value={draftName}
                    maxLength={40}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="例如：我的稳健轮动"
                  />
                </label>
                <label>
                  {agentInputMode === 'voice'
                    ? '口述转写'
                    : agentInputMode === 'document'
                      ? '文档内容'
                      : '我的策略想法'}
                  <textarea
                    value={draftDescription}
                    maxLength={1200}
                    onChange={(event) => {
                      setDraftDescription(event.target.value);
                      setGeneratedDraft(null);
                    }}
                    placeholder="例如：从沪深300、纳指和黄金 ETF 中选最强的两个，每周调整；回撤超过 12% 时降低仓位……"
                  />
                  <small>{draftDescription.length} / 1200</small>
                </label>

                <div
                  className="strategy-agent-modes"
                  aria-label="选择策略输入方式"
                >
                  <button
                    aria-pressed={agentInputMode === 'text'}
                    onClick={() => setAgentInputMode('text')}
                  >
                    <FileText size={16} />
                    <span>
                      <b>文字描述</b>
                      <small>直接编辑上方内容</small>
                    </span>
                  </button>
                  <button
                    aria-pressed={agentInputMode === 'voice'}
                    onClick={() => setAgentInputMode('voice')}
                  >
                    <Mic size={16} />
                    <span>
                      <b>语音口述</b>
                      <small>转写到上方输入框</small>
                    </span>
                  </button>
                  <button
                    aria-pressed={agentInputMode === 'document'}
                    onClick={() => setAgentInputMode('document')}
                  >
                    <Upload size={16} />
                    <span>
                      <b>导入文档</b>
                      <small>提取到上方输入框</small>
                    </span>
                  </button>
                </div>

                {agentInputMode === 'voice' && (
                  <div className="strategy-agent-voice">
                    <button
                      className={isListening ? 'is-listening' : ''}
                      onClick={toggleVoiceInput}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                      {isListening ? '停止录入' : '开始口述'}
                    </button>
                    <span>
                      {isListening
                        ? '正在聆听，你可以说适用资产、买入条件和止损规则……'
                        : '首次使用时浏览器会请求麦克风权限。'}
                    </span>
                  </div>
                )}

                {agentInputMode === 'document' && (
                  <label className="strategy-agent-upload">
                    <Upload size={20} />
                    <span>
                      <b>
                        {isReadingDocument
                          ? '正在读取文档……'
                          : documentName || '选择策略文档'}
                      </b>
                      <small>支持 .docx、.txt 和 .md，单个文件</small>
                    </span>
                    <input
                      type="file"
                      accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                      disabled={isReadingDocument}
                      onChange={(event) =>
                        void readStrategyDocument(event.target.files?.[0])
                      }
                    />
                  </label>
                )}
              </div>

              {createError && (
                <p className="strategy-agent-error" role="alert">
                  {createError}
                </p>
              )}
              <div className="strategy-agent-privacy">
                <ShieldCheck size={15} />
                <span>
                  文档只在浏览器内读取，不会上传到
                  OwlMate；语音转写由浏览器提供，是否联网取决于浏览器。策略只保存到本地策略库。
                </span>
              </div>
              <button
                className="strategy-create-submit"
                onClick={generateStrategyDraft}
                disabled={isReadingDocument}
              >
                <Sparkles size={15} /> 让 Agent 生成策略草案
              </button>
            </div>
          ) : (
            <div className="strategy-agent-preview">
              <div className="strategy-agent-preview-heading">
                <span>
                  <Sparkles size={14} /> AGENT DRAFT
                </span>
                <h3>{generatedDraft.name}</h3>
                <p>{generatedDraft.summary}</p>
                <div>
                  {generatedDraft.tags.map((tag) => (
                    <small key={tag}>{tag}</small>
                  ))}
                </div>
              </div>
              <div className="strategy-agent-preview-facts">
                <span>
                  <small>适用资产</small>
                  <b>{generatedDraft.assetScope}</b>
                </span>
                <span>
                  <small>复核与调仓</small>
                  <b>{generatedDraft.rebalance}</b>
                </span>
              </div>
              <div className="strategy-agent-preview-rules">
                <section>
                  <h4>候选与入场规则</h4>
                  {generatedDraft.entryRules.map((rule) => (
                    <p key={rule}>{rule}</p>
                  ))}
                </section>
                <section>
                  <h4>风险控制</h4>
                  {generatedDraft.riskControls.map((rule) => (
                    <p key={rule}>{rule}</p>
                  ))}
                </section>
              </div>
              {createError && (
                <p className="strategy-agent-error" role="alert">
                  {createError}
                </p>
              )}
              <p className="strategy-agent-boundary">
                请检查关键条件。Agent
                只整理规则，不评判收益，也不会自动交易或发布到市场。
              </p>
              <div className="strategy-agent-preview-actions">
                <button
                  className="market-card-secondary"
                  onClick={() => setGeneratedDraft(null)}
                >
                  <RotateCcw size={14} /> 返回修改
                </button>
                <button
                  className="strategy-create-submit"
                  onClick={saveGeneratedStrategy}
                >
                  <Check size={15} /> 保存到我的策略
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
