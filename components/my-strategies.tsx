'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CircleHelp,
  ChevronRight,
  FileText,
  FlaskConical,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { AppRail } from '@/components/app-rail';
import { StrategyGuide, StrategyWelcome } from '@/components/strategy-guide';
import { CustomStrategyDialog } from '@/components/custom-strategy-dialog';
import { StrategyEditDialog } from '@/components/strategy-edit-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CUSTOM_STRATEGIES_EVENT,
  CUSTOM_STRATEGIES_KEY,
  readCustomStrategies,
  type CustomStrategy,
} from '@/lib/investment-strategies';
import { upsertPersonalStrategy } from '@/lib/strategy-library';

export function MyStrategies() {
  const [strategies, setStrategies] = useState<CustomStrategy[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'personal' | 'community'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [editing, setEditing] = useState<CustomStrategy | null>(null);
  const [created, setCreated] = useState<CustomStrategy | null>(null);
  useEffect(() => {
    const refresh = () => {
      try {
        setStrategies(
          readCustomStrategies(localStorage.getItem(CUSTOM_STRATEGIES_KEY)),
        );
        setError('');
      } catch {
        setError('策略库读取失败，原有存档未被覆盖。请检查浏览器存储设置。');
      }
      setReady(true);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === CUSTOM_STRATEGIES_KEY || event.key === null) refresh();
    };
    refresh();
    window.addEventListener(CUSTOM_STRATEGIES_EVENT, refresh);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(CUSTOM_STRATEGIES_EVENT, refresh);
      window.removeEventListener('storage', storage);
    };
  }, []);
  const visible = strategies
    .filter((strategy) => {
      return (
        (filter === 'all' ||
          (filter === 'community'
            ? strategy.origin === 'community'
            : strategy.origin !== 'community')) &&
        `${strategy.name} ${strategy.description} ${strategy.tags.join(' ')}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
      );
    })
    .toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  function save(strategy: CustomStrategy) {
    const previous = readCustomStrategies(
      localStorage.getItem(CUSTOM_STRATEGIES_KEY),
    );
    const next = upsertPersonalStrategy(previous, strategy);
    readCustomStrategies(JSON.stringify(next));
    localStorage.setItem(CUSTOM_STRATEGIES_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CUSTOM_STRATEGIES_EVENT));
    setEditing(null);
  }
  function test(strategy: CustomStrategy) {
    try {
      localStorage.setItem(
        'owlmate-new-experiment-strategy',
        JSON.stringify({ id: strategy.id, name: strategy.name }),
      );
      if (window.parent !== window)
        window.parent.postMessage(
          { type: 'owlmate:open-lab', create: true },
          '*',
        );
      else window.location.assign('/holdings?create=1');
    } catch {
      setError('无法打开测试，请检查浏览器存储设置后重试。');
    }
  }
  return (
    <div className="app-shell my-strategies-shell">
      <AppRail />
      <div className="workspace my-strategies-workspace">
        <header className="topbar">
          <div className="wordmark">
            我的策略 <span className="brand-beta">BETA</span>
          </div>
          <div className="header-right">
            <button
              className="lab-help-trigger"
              aria-label="使用指南"
              onClick={() => setGuideOpen(true)}
            >
              <CircleHelp size={17} aria-hidden="true" />
              <span>使用指南</span>
            </button>
            <button
              className="strategy-create-submit"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={17} />
              创建策略
            </button>
          </div>
        </header>
        <main className="my-strategies-main">
          <section className="my-strategies-intro">
            <span className="eyebrow">
              <FolderOpen size={15} /> PERSONAL STRATEGY LIBRARY
            </span>
            <h1>把你的投资想法，沉淀成策略</h1>
            <p>用文字或语音描述规则，保存、迭代，再放进实验室验证。</p>
            <div className="my-strategies-counts">
              <span>
                <b>
                  {strategies.filter((s) => s.origin !== 'community').length}
                </b>{' '}
                个人策略
              </span>
              <span>
                <b>
                  {strategies.filter((s) => s.origin === 'community').length}
                </b>{' '}
                收藏策略
              </span>
            </div>
          </section>
          <div className="my-strategies-toolbar">
            <div className="my-strategies-filters">
              {(
                [
                  { id: 'all', label: '全部策略' },
                  { id: 'personal', label: '我创建的' },
                  { id: 'community', label: '已收藏' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="my-strategies-search">
              <Search size={16} aria-hidden="true" />
              <input
                aria-label="搜索我的策略"
                placeholder="搜索名称、规则或标签"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="strategy-agent-error">
              {error}
            </p>
          )}
          {!ready ? (
            <output>正在读取策略库…</output>
          ) : !strategies.length ? (
            <StrategyWelcome
              mode="market"
              onStart={() => setCreateOpen(true)}
              onHelp={() => setGuideOpen(true)}
            />
          ) : !visible.length ? (
            <section className="my-strategies-empty">
              <FlaskConical size={38} />
              <h2>
                {strategies.length
                  ? '没有找到匹配的策略'
                  : '创建你的第一份策略'}
              </h2>
              <p>
                {strategies.length
                  ? '换个关键词，或切换策略分类。'
                  : '从一个想法开始，逐步形成可复核的规则与风控条件。'}
              </p>
              <button
                className="strategy-create-submit"
                onClick={() => setCreateOpen(true)}
              >
                <Sparkles size={16} />
                创建策略
              </button>
            </section>
          ) : (
            <div className="my-strategies-grid">
              {visible.map((strategy) => (
                <article className="my-strategy-card" key={strategy.id}>
                  <div className="my-strategy-card-heading">
                    <span className="my-strategy-card-icon">
                      <FileText size={21} />
                    </span>
                    <span className="my-strategy-origin">
                      {strategy.origin === 'community'
                        ? '社区收藏'
                        : '个人策略'}
                    </span>
                  </div>
                  <h2>{strategy.name}</h2>
                  <p className="my-strategy-summary">
                    {strategy.summary || strategy.description}
                  </p>
                  <div className="my-strategy-tags">
                    {strategy.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <dl>
                    <div>
                      <dt>适用资产</dt>
                      <dd>{strategy.assetScope}</dd>
                    </div>
                    <div>
                      <dt>复核频率</dt>
                      <dd>{strategy.rebalance}</dd>
                    </div>
                  </dl>
                  <details>
                    <summary>查看策略规则</summary>
                    <h3>候选与入场</h3>
                    <ul>
                      {strategy.entryRules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                    <h3>风险控制</h3>
                    <ul>
                      {strategy.riskControls.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  </details>
                  <p className="my-strategy-date">
                    创建于{' '}
                    {new Date(strategy.createdAt).toLocaleDateString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                    })}
                  </p>
                  <div className="my-strategy-actions">
                    {strategy.origin !== 'community' && (
                      <button onClick={() => setEditing(strategy)}>
                        <Pencil size={15} />
                        编辑
                      </button>
                    )}
                    <button
                      className="my-strategy-test"
                      onClick={() => test(strategy)}
                    >
                      <FlaskConical size={15} />
                      进入回测 <ChevronRight size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <details className="my-strategies-data">
            <summary>数据说明</summary>
            <p>
              策略保存在本机，与策略实验室共用策略库。当前创建器使用本地规则整理，尚未调用大模型；测试入口打开实验创建流程，不自动执行通用历史回测，也不会进行真实交易。
            </p>
          </details>
        </main>
      </div>
      {guideOpen && (
        <StrategyGuide
          mode="market"
          onClose={() => setGuideOpen(false)}
          onStart={() => setCreateOpen(true)}
        />
      )}
      <CustomStrategyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        context="market"
        onCreated={(strategy) => {
          setCreated(strategy);
          setQuery('');
          setFilter('personal');
        }}
      />
      {editing && (
        <StrategyEditDialog
          key={editing.id}
          strategy={editing}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      <Dialog
        open={!!created}
        onOpenChange={(open) => {
          if (!open) setCreated(null);
        }}
      >
        <DialogContent className="owl-dialog my-strategy-success">
          <CheckCircle2 size={40} />
          <DialogTitle>策略已创建</DialogTitle>
          <DialogDescription>
            「{created?.name}
            」已加入我的策略。现在要进入实验室，创建测试实验吗？
          </DialogDescription>
          <div>
            <button onClick={() => setCreated(null)}>稍后测试</button>
            <button
              className="strategy-create-submit"
              onClick={() => {
                if (created) test(created);
              }}
            >
              <FlaskConical size={16} />
              进入回测
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
