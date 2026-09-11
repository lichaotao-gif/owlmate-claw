'use client';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  Bookmark,
  Ellipsis,
  Play,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  type Plan,
  type PlanDraft,
  createPlan,
  readPlans,
  accountKey,
  comparable,
  virtualAccount,
} from '@/lib/plans';
import { money, scenarioLabels } from '@/lib/simulation';
export type PlanLibraryHandle = { save: () => void; open: () => void };
export const PlanLibrary = forwardRef<
  PlanLibraryHandle,
  { draft: PlanDraft; notify: (s: string) => void }
>(function PlanLibrary({ draft, notify }, ref) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]),
    [ready, setReady] = useState(false),
    [view, setView] = useState<'all' | 'detail' | 'rename' | 'compare' | null>(
      null,
    ),
    [active, setActive] = useState(''),
    [name, setName] = useState(''),
    [deleting, setDeleting] = useState(''),
    [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem('owlmate-plans-v2');
        let ps: Plan[] = [];
        if (raw) ps = readPlans(raw);
        else {
          const old = localStorage.getItem('owlmate-plan-v1');
          if (old) {
            const p = JSON.parse(old);
            if (p.account) {
              const migrated = createPlan(p, '原有方案');
              ps = readPlans(JSON.stringify([migrated]));
              localStorage.setItem('owlmate-plans-v2', JSON.stringify(ps));
            } else
              notify('旧方案没有持仓快照，已保留旧数据，请重新保存当前方案。');
          }
        }
        setPlans(ps);
        setReady(true);
      } catch {
        notify('方案存储读取失败，原数据已保留；请先检查浏览器本机数据。');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [notify]);
  function commit(ps: Plan[]) {
    if (!ready) return;
    setPlans(ps);
    try {
      localStorage.setItem('owlmate-plans-v2', JSON.stringify(ps));
    } catch {
      notify('当前页面已更新，但本机存储失败，刷新会丢失本次修改。');
    }
  }
  function add(d: PlanDraft, n: string) {
    if (!ready) {
      notify('方案存储尚未就绪。');
      return;
    }
    if (plans.length >= 200) {
      notify('最多保存 200 套方案，请先删除不需要的方案。');
      return;
    }
    try {
      const p = createPlan(d, n);
      commit([p, ...plans]);
      notify('已新增待模拟方案，原始持仓不变。');
      return p;
    } catch (e) {
      notify((e as Error).message);
    }
  }
  useImperativeHandle(ref, () => ({
    save: () => {
      add(
        draft,
        `组合方案 ${plans.length + 1} · ${draft.allocation.toFixed(0)}%仓位`,
      );
    },
    open: () => setMenuOpen(true),
  }));
  const p = plans.find((p) => p.id === active),
    chosen = plans.filter((p) => selected.includes(p.id));
  function patch(id: string, change: Partial<Plan>) {
    commit(plans.map((p) => (p.id === id ? { ...p, ...change } : p)));
  }
  function start(p: Plan) {
    patch(p.id, { status: 'running', elapsed: 0 });
    setActive(p.id);
    setView('detail');
  }
  function card(p: Plan) {
    return (
      <article className="plan-card" key={p.id}>
        <div className="plan-card-heading">
          <Checkbox
            aria-label={`选择${p.name}进行对比`}
            checked={selected.includes(p.id)}
            onCheckedChange={(checked) => {
              if (checked && selected.length >= 3) {
                notify('最多对比 3 套方案。');
                return;
              }
              setSelected(
                checked
                  ? [...selected, p.id]
                  : selected.filter((id) => id !== p.id),
              );
            }}
          />
          <b>{p.name}</b>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="icon-button"
              aria-label={`${p.name}更多操作`}
            >
              <Ellipsis size={17} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="holding-menu">
              <DropdownMenuItem
                onClick={() => {
                  setActive(p.id);
                  setName(p.name);
                  setView('rename');
                }}
              >
                重命名
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => add(p, p.name.slice(0, 55) + ' 副本')}
              >
                复制方案
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  add(
                    { ...p, account: draft.account },
                    p.name.slice(0, 50) + ' · 最新持仓',
                  )
                }
              >
                基于最新持仓另存
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => patch(p.id, { status: 'archived' })}
                disabled={p.status === 'archived'}
              >
                归档
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleting(p.id)}
              >
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <span className="plan-status">
          {
            { pending: '待模拟', running: '模拟中', archived: '已归档' }[
              p.status
            ]
          }
          {p.status === 'running' ? ` · 第 ${p.elapsed}/${p.days} 日` : ''}
        </span>
        <p>
          风险资产 {p.allocation.toFixed(1)}% · 现金{' '}
          {(100 - p.allocation).toFixed(1)}%
        </p>
        <small>
          {p.days} 日 · {scenarioLabels[p.scenario]} ·{' '}
          {new Date(p.at).toLocaleString('zh-CN')}
        </small>
        {accountKey(p.account) !== accountKey(draft.account) && (
          <small className="plan-stale">
            原始账户已变化，此方案仍使用保存时的快照
          </small>
        )}
        <div className="tracking-actions">
          <button
            onClick={() => {
              setActive(p.id);
              setView('detail');
            }}
          >
            查看详情
            <ArrowRight size={13} />
          </button>
          {p.status === 'pending' && (
            <button onClick={() => start(p)}>
              <Play size={13} />
              开始模拟
            </button>
          )}
        </div>
      </article>
    );
  }
  const library = (
    <>
      <div className="plan-compare-action">
        <span>已选 {chosen.length}/3 套</span>
        <button
          className="secondary-button"
          disabled={chosen.length < 2}
          onClick={() => setView('compare')}
        >
          对比所选方案
        </button>
      </div>
      <div className="plan-card-grid">{plans.map(card)}</div>
    </>
  );
  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className="top-plans-trigger"
          aria-label={`我的方案，已保存 ${plans.length} 套`}
        >
          <Bookmark size={16} />
          <span>我的方案</span>
          <span className="top-plans-count">{plans.length}</span>
          <ChevronDown size={13} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="top-plans-dropdown"
        >
          <div className="top-plans-heading">
            已保存的方案 <small>本机保存 · 独立模拟</small>
          </div>
          <div className="top-plans-list">
            {plans.length ? (
              plans.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className="top-plan-option"
                  onClick={() => {
                    setActive(p.id);
                    setView('detail');
                  }}
                >
                  <div>
                    <b>{p.name}</b>
                    <small>
                      仓位 {p.allocation.toFixed(1)}% · {p.days} 日 ·{' '}
                      {scenarioLabels[p.scenario]}
                    </small>
                    <small>{new Date(p.at).toLocaleString('zh-CN')}</small>
                  </div>
                  <span className="plan-status">
                    {
                      {
                        pending: '待模拟',
                        running: '模拟中',
                        archived: '已归档',
                      }[p.status]
                    }
                  </span>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="top-plans-empty">
                还没有方案。调整模拟仓位后，点击「保存方案」。
              </p>
            )}
          </div>
          <DropdownMenuItem
            className="top-plans-manage"
            onClick={() => setView('all')}
          >
            管理与对比全部方案
            <ArrowRight size={15} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={view !== null}
        onOpenChange={(v) => {
          if (!v) setView(null);
        }}
      >
        <DialogContent
          className={
            'owl-dialog ' +
            (view === 'all' || view === 'compare'
              ? 'library-dialog'
              : 'trade-dialog')
          }
        >
          <DialogTitle>
            {
              {
                all: '我的模拟方案',
                detail: p?.name ?? '方案详情',
                rename: '重命名方案',
                compare: '方案对比',
              }[view ?? 'all']
            }
          </DialogTitle>
          <DialogDescription>
            固定快照、独立模拟。手动推进交易日，未接入真实行情、后台监控或交易。
          </DialogDescription>
          {view === 'all' && library}
          {view === 'rename' && p && (
            <form
              className="dialog-body"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) {
                  patch(p.id, { name: name.trim() });
                  setView('all');
                }
              }}
            >
              <label>
                方案名称
                <input
                  value={name}
                  maxLength={60}
                  required
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="primary-button" type="submit">
                保存名称
              </button>
            </form>
          )}
          {view === 'detail' &&
            p &&
            (() => {
              const v = virtualAccount(
                p,
                p.status === 'pending' ? 0 : p.elapsed,
              );
              return (
                <div className="dialog-body">
                  <div className="info-box">
                    {p.status === 'pending'
                      ? '待模拟 · 以下是应用方案后的初始虚拟配置'
                      : `第 ${p.elapsed} / ${p.days} 个模拟交易日`}
                    <br />
                    基于 {new Date(p.at).toLocaleString('zh-CN')} 持仓快照 ·
                    新增虚拟资金 ¥{money(p.deposit)}
                    <br />
                    情景：{scenarioLabels[p.scenario]} · 目标仓位 {p.allocation}
                    %
                  </div>
                  <div className="saved-grid">
                    <div>
                      虚拟资产<strong>¥{money(v.result.end)}</strong>
                    </div>
                    <div>
                      虚拟现金<strong>¥{money(v.cash)}</strong>
                    </div>
                    <div>
                      模拟盈亏（含费用）<strong>{money(v.result.pnl)}</strong>
                    </div>
                    <div>
                      初始调仓费用<strong>¥{money(v.result.cost)}</strong>
                    </div>
                  </div>
                  <div className="trade-rows">
                    {v.holdings.map((h) => (
                      <div className="trade-row" key={h.code}>
                        <b>
                          {h.name}
                          <small>{h.code}</small>
                        </b>
                        <div>
                          <small>初始虚拟市值</small>¥{money(h.initialValue)}
                        </div>
                        <div>
                          <small>当前虚拟市值</small>¥{money(h.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p>
                    虚拟仓位以金额记账，未按整手取整。收益来自固定情景假设，不是实际投资表现。
                  </p>
                  <div className="tracking-actions">
                    {p.status === 'pending' && (
                      <button onClick={() => start(p)}>开始模拟</button>
                    )}
                    {p.status === 'running' && (
                      <>
                        <button
                          disabled={p.elapsed >= p.days}
                          onClick={() =>
                            patch(p.id, {
                              elapsed: Math.min(p.days, p.elapsed + 1),
                            })
                          }
                        >
                          推进 1 个交易日
                        </button>
                        <button
                          disabled={p.elapsed >= p.days}
                          onClick={() => patch(p.id, { elapsed: p.days })}
                        >
                          推进至期末
                        </button>
                        <button onClick={() => patch(p.id, { elapsed: 0 })}>
                          重置模拟进度
                        </button>
                      </>
                    )}
                    {p.status !== 'archived' && (
                      <button
                        onClick={() => patch(p.id, { status: 'archived' })}
                      >
                        归档
                      </button>
                    )}
                  </div>
                  {p.elapsed === p.days && (
                    <p>模拟周期已完成，可查看结果或归档。</p>
                  )}
                  {accountKey(p.account) !== accountKey(draft.account) && (
                    <p className="plan-stale">
                      账户已变化。原方案保持不变，可通过「···」基于最新持仓另存。
                    </p>
                  )}
                </div>
              );
            })()}
          {view === 'compare' &&
            (!comparable(chosen) ? (
              <div className="dialog-body">
                <p>
                  这些方案的持仓快照、新增资金、周期或情景不一致，暂不直接比较收益。
                </p>
                <p>
                  请在相同账户下，保持相同的新增资金、周期和情景，调整不同仓位后另存方案。
                </p>
                <button
                  className="secondary-button"
                  onClick={() => setView('all')}
                >
                  返回选择
                </button>
              </div>
            ) : (
              <>
                <p className="plan-library-note">
                  统一按保存时的基数与完整 {chosen[0].days} 日
                  {scenarioLabels[chosen[0].scenario]}
                  比较，与各方案推进进度无关。未计算历史回撤。
                </p>
                <div className="plan-card-grid">
                  {chosen.map((p) => {
                    const v = virtualAccount(p, p.days);
                    return (
                      <article className="plan-card" key={p.id}>
                        <h3>{p.name}</h3>
                        <dl className="plan-results">
                          <dt>目标仓位</dt>
                          <dd>{p.allocation}%</dd>
                          <dt>期末虚拟资产</dt>
                          <dd>¥{money(v.result.end)}</dd>
                          <dt>模拟盈亏</dt>
                          <dd>{money(v.result.pnl)}</dd>
                          <dt>模拟收益率</dt>
                          <dd>{v.result.percent.toFixed(2)}%</dd>
                          <dt>现金</dt>
                          <dd>¥{money(v.cash)}</dd>
                          <dt>调仓费用</dt>
                          <dd>¥{money(v.result.cost)}</dd>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </>
            ))}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting('');
        }}
      >
        <AlertDialogContent className="owl-dialog">
          <AlertDialogTitle>删除模拟方案？</AlertDialogTitle>
          <AlertDialogDescription>
            将删除「{plans.find((p) => p.id === deleting)?.name}
            」及其模拟进度。原始持仓和其他方案不受影响。
          </AlertDialogDescription>
          <div className="dialog-action-row">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <button
              className="danger-button"
              onClick={() => {
                commit(plans.filter((p) => p.id !== deleting));
                setSelected(selected.filter((id) => id !== deleting));
                if (active === deleting) setView('all');
                setDeleting('');
              }}
            >
              确认删除
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
