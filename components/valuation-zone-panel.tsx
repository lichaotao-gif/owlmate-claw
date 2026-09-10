'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleGauge,
  CircleHelp,
  ListChecks,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type Account,
  type Holding,
  type HoldingRange,
  validateRange,
} from '@/lib/holdings';
import {
  assessAccount,
  markerPosition,
  valuationLabels,
  weightLabels,
  type ValuationZone,
} from '@/lib/valuation-zones';

type Filter = 'all' | 'review' | ValuationZone;
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'review', label: '需要复核' },
  { id: 'low', label: '低于建议区' },
  { id: 'safe', label: '建议区间内' },
  { id: 'high', label: '高于建议区' },
  { id: 'unset', label: '未设置' },
];
const blank = {
  valuationLow: '',
  valuationHigh: '',
  weightLow: '',
  weightHigh: '',
  alertBuffer: '5',
  note: '',
};

export function ValuationZonePanel({
  account,
  onChange,
  onSimulate,
}: {
  account: Account;
  onChange: (account: Account) => void;
  onSimulate: (holding: Holding) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Holding | null>(null);
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank);
  const [error, setError] = useState('');
  const assessment = assessAccount(account);
  const rows = useMemo(
    () =>
      assessment.assets
        .filter(
          (asset) =>
            filter === 'all' ||
            (filter === 'review' && asset.needsReview) ||
            asset.valuation === filter,
        )
        .sort((a, b) => b.priority - a.priority || b.allocation - a.allocation),
    [assessment.assets, filter],
  );
  const explained = assessment.assets.find(
    (asset) => asset.id === explainingId,
  );

  function openEditor(holding: Holding) {
    const range = holding.range;
    setEditing(holding);
    setError('');
    setDraft(
      range
        ? {
            valuationLow: String(range.valuationLow),
            valuationHigh: String(range.valuationHigh),
            weightLow: String(range.weightLow),
            weightHigh: String(range.weightHigh),
            alertBuffer: String(range.alertBuffer),
            note: range.note,
          }
        : blank,
    );
  }
  function save() {
    if (!editing) return;
    if (
      Object.entries(draft).some(
        ([key, value]) => key !== 'note' && !value.trim(),
      )
    ) {
      setError('请完整填写价格、仓位和提醒比例。');
      return;
    }
    const range: HoldingRange = {
      valuationLow: Number(draft.valuationLow),
      valuationHigh: Number(draft.valuationHigh),
      weightLow: Number(draft.weightLow),
      weightHigh: Number(draft.weightHigh),
      alertBuffer: Number(draft.alertBuffer),
      note: draft.note.trim(),
      updatedAt: new Date().toISOString(),
    };
    const problem = validateRange(range);
    if (problem) {
      setError(problem);
      return;
    }
    onChange({
      ...account,
      holdings: account.holdings.map((holding) =>
        holding.id === editing.id ? { ...holding, range } : holding,
      ),
    });
    setEditing(null);
  }
  const filterCount = (id: Filter) =>
    id === 'all'
      ? assessment.assets.length
      : id === 'review'
        ? assessment.review
        : assessment.counts[id];
  const assetsIn = (zone: ValuationZone) =>
    assessment.assets.filter((asset) => asset.valuation === zone);
  return (
    <section
      className="panel valuation-zone-panel"
      id="zones"
      aria-labelledby="valuation-zone-title"
    >
      <div className="zone-panel-heading">
        <div>
          <span className="eyebrow">
            <CircleGauge size={13} /> HOLDING ZONE RADAR
          </span>
          <h2 id="valuation-zone-title">持仓区间雷达</h2>
          <p>Agent 综合估值区间、风险预算与集中度策略，生成可复核的建议区间。</p>
        </div>
        <div className="zone-status-summary">
          <span>
            <ShieldCheck size={14} />
            {assessment.configured}/{assessment.assets.length} 已设置
          </span>
          <strong className={assessment.review ? 'attention' : ''}>
            {assessment.review} 项需复核
          </strong>
        </div>
      </div>
      <div className="zone-overview" aria-label="持仓估值区间汇总">
        {(
          [
            { zone: 'low', label: '低于建议区', hint: '先复核基本面' },
            { zone: 'safe', label: '建议区间内', hint: '按仓位继续观察' },
            { zone: 'high', label: '高于建议区', hint: '关注回撤与集中度' },
          ] as const
        ).map((item) => (
          <div className={`zone-kpi zone-${item.zone}`} key={item.zone}>
            <span>
              <i />
              {item.label}
            </span>
            <strong>
              {assessment.counts[item.zone]}
              <small>只</small>
            </strong>
            <p>已设置持仓市值 {assessment.shares[item.zone].toFixed(1)}%</p>
            <em>{item.hint}</em>
            <div className="zone-kpi-assets" aria-label={`${item.label}持仓`}>
              {assetsIn(item.zone).map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setFilter(item.zone)}
                  aria-label={`查看${item.label}持仓，包含${asset.name}`}
                >
                  <i style={{ background: asset.color }} />
                  <span>{asset.name}</span>
                  <small>{asset.code}</small>
                </button>
              ))}
              {!assetsIn(item.zone).length && <small>暂无持仓</small>}
            </div>
          </div>
        ))}
        <div className="zone-kpi zone-review">
          <span>
            <AlertTriangle size={13} />
            复核清单
          </span>
          <strong>
            {assessment.review}
            <small>项</small>
          </strong>
          <p>
            {assessment.counts.unset
              ? `${assessment.counts.unset} 只尚未设置区间`
              : '区间设置已覆盖全部持仓'}
          </p>
          <em>价格、仓位或临界状态</em>
          <div className="zone-kpi-assets" aria-label="需要复核的持仓">
            {assessment.assets
              .filter((asset) => asset.needsReview)
              .map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setFilter('review')}
                  aria-label={`查看需要复核的持仓，包含${asset.name}`}
                >
                  <i style={{ background: asset.color }} />
                  <span>{asset.name}</span>
                  <small>{asset.code}</small>
                </button>
              ))}
            {!assessment.review && <small>暂无持仓</small>}
          </div>
        </div>
      </div>
      {assessment.configured > 0 && (
        <div className="zone-distribution">
          <div>
            <span>按已设置持仓市值</span>
            <small>
              低于建议 {assessment.shares.low.toFixed(1)}% · 区间内{' '}
              {assessment.shares.safe.toFixed(1)}% · 偏高{' '}
              {assessment.shares.high.toFixed(1)}%
            </small>
          </div>
          <figure
            className="distribution-track"
            aria-label={`持仓市值分布：低于建议区 ${assessment.shares.low.toFixed(1)}%，建议区间内 ${assessment.shares.safe.toFixed(1)}%，高于建议区 ${assessment.shares.high.toFixed(1)}%`}
          >
            <i className="low" style={{ width: `${assessment.shares.low}%` }} />
            <i
              className="safe"
              style={{ width: `${assessment.shares.safe}%` }}
            />
            <i
              className="high"
              style={{ width: `${assessment.shares.high}%` }}
            />
          </figure>
        </div>
      )}
      <div className="zone-toolbar" aria-label="筛选持仓区间">
        {filters.map((item) => (
          <button
            key={item.id}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span>{filterCount(item.id)}</span>
          </button>
        ))}
      </div>
      <div className="zone-list">
        {rows.map((asset) => (
          <article
            className={`zone-row zone-row-${asset.valuation}`}
            key={asset.id}
          >
            <div className="zone-asset">
              <span
                className="zone-asset-icon"
                style={{ '--asset-color': asset.color } as React.CSSProperties}
              >
                {asset.needsReview ? (
                  <AlertTriangle size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
              </span>
              <div>
                <h3>
                  {asset.name}
                  <small>{asset.code}</small>
                </h3>
                <p>
                  当前仓位 {asset.allocation.toFixed(1)}% · 市值 ¥
                  {Math.round(asset.value).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            {asset.range ? (
              <div className="zone-range">
                <div className="zone-range-labels">
                  <span>低于 {asset.range.valuationLow}</span>
                  <b>
                    建议 {asset.range.valuationLow}–{asset.range.valuationHigh}
                  </b>
                  <span>高于 {asset.range.valuationHigh}</span>
                </div>
                <figure
                  className="valuation-track"
                  aria-label={`${asset.name}当前价格 ${asset.price}，${valuationLabels[asset.valuation]}`}
                >
                  <span className="low" />
                  <span className="safe" />
                  <span className="high" />
                  <i
                    style={{
                      left: `${markerPosition(asset.price, asset.range)}%`,
                    }}
                  >
                    <b>{asset.price}</b>
                  </i>
                </figure>
                <div className="zone-range-foot">
                  <span>
                    {asset.range.note && asset.range.note !== '演示区间'
                      ? asset.range.note
                      : 'Agent 综合建议'}{' '}
                    ·{' '}
                    {new Date(asset.range.updatedAt).toLocaleDateString(
                      'zh-CN',
                    )}
                  </span>
                  <span>
                    目标仓位 {asset.range.weightLow}%–{asset.range.weightHigh}%
                  </span>
                </div>
              </div>
            ) : (
              <button
                className="zone-empty-range"
                onClick={() => openEditor(asset)}
              >
                <CircleGauge size={17} />
                <span>
                  <b>尚未设置合理区间</b>
                  <small>设置价格与目标仓位后开始判断</small>
                </span>
                <ArrowRight size={14} />
              </button>
            )}
            <div className="zone-verdict">
              <div>
                <span className={`zone-badge ${asset.valuation}`}>
                  {valuationLabels[asset.valuation]}
                </span>
                <span className={`weight-badge ${asset.weight}`}>
                  {weightLabels[asset.weight]}
                </span>
              </div>
              <strong>{asset.action}</strong>
              {asset.nearBoundary && (
                <small>
                  <AlertTriangle size={12} />
                  价格已接近区间边界
                </small>
              )}
              <div className="zone-actions">
                {asset.range && (
                  <button
                    className="zone-evidence-action"
                    onClick={() => setExplainingId(asset.id)}
                  >
                    <CircleHelp size={13} />
                    依据什么
                  </button>
                )}
                <button onClick={() => openEditor(asset)}>
                  <Pencil size={13} />
                  {asset.range ? '调整区间' : '设置区间'}
                </button>
                <button
                  className="zone-simulate"
                  onClick={() => onSimulate(asset)}
                  disabled={!asset.range}
                >
                  调仓试算
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </article>
        ))}
        {!rows.length && (
          <div className="zone-empty-list">
            <CheckCircle2 size={22} />
            <b>当前筛选项为空</b>
            <p>换一个条件查看其他持仓。</p>
          </div>
        )}
      </div>
      <p className="zone-disclaimer">
        <ShieldCheck size={13} />
        “建议区间”由 Agent 演示规则综合生成，可由用户调整；仅用于复核与情景试算，不代表安全承诺或买卖建议。
      </p>
      <Dialog
        open={explained !== undefined}
        onOpenChange={(open) => {
          if (!open) setExplainingId(null);
        }}
      >
        <DialogContent className="owl-dialog zone-evidence-dialog">
          <DialogTitle>{explained?.name ?? '持仓'} · Agent 建议依据</DialogTitle>
          <DialogDescription>
            展示本次建议实际使用的输入、策略规则与数据边界。
          </DialogDescription>
          {explained?.range && (
            <div className="zone-evidence-body">
              <div className="zone-evidence-summary">
                <span className="zone-evidence-icon"><Bot size={18} /></span>
                <div>
                  <span>Agent 综合结论</span>
                  <strong>{explained.action}</strong>
                  <p>
                    价格处于“{valuationLabels[explained.valuation]}”，仓位处于“{weightLabels[explained.weight]}”。
                  </p>
                </div>
              </div>
              <div className="zone-evidence-inputs">
                <span>参考现价 <b>{explained.price}</b></span>
                <span>建议价格 <b>{explained.range.valuationLow}–{explained.range.valuationHigh}</b></span>
                <span>当前仓位 <b>{explained.allocation.toFixed(1)}%</b></span>
                <span>建议仓位 <b>{explained.range.weightLow}%–{explained.range.weightHigh}%</b></span>
              </div>
              <section className="zone-strategy-section" aria-labelledby="zone-strategy-title">
                <h3 id="zone-strategy-title"><ListChecks size={15} /> 哪些策略参与了分析</h3>
                <div className="zone-strategy-list">
                  <article>
                    <span>已参与</span>
                    <div><b>估值区间策略</b><p>将参考现价与建议价格上下限比较，判断低于、处于或高于建议区间。</p></div>
                  </article>
                  <article>
                    <span>已参与</span>
                    <div><b>风险预算策略</b><p>将当前持仓占比与建议仓位区间比较，识别仓位不足、合理或过高。</p></div>
                  </article>
                  <article>
                    <span className={explained.weight === 'over' ? 'triggered' : ''}>{explained.weight === 'over' ? '已触发' : '已检查'}</span>
                    <div><b>集中度约束</b><p>仓位高于建议上限时提高复核优先级，避免单一持仓暴露继续扩大。</p></div>
                  </article>
                  <article>
                    <span className={explained.nearBoundary ? 'triggered' : ''}>{explained.nearBoundary ? '已触发' : '已检查'}</span>
                    <div><b>临界预警策略</b><p>价格距离建议区间边界不超过 {explained.range.alertBuffer}% 时，提前加入复核清单。</p></div>
                  </article>
                </div>
              </section>
              <div className="zone-evidence-limit">
                <ShieldCheck size={14} />
                <p><b>当前未参与</b>实时行情、财务数据、新闻事件、盈利预测与真实策略回测尚未接入；因此这是可解释的演示规则结果，不是实时投资建议。</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="owl-dialog zone-dialog">
          <DialogTitle>调整 {editing?.name} 的建议区间</DialogTitle>
          <DialogDescription>
            Agent 建议作为初始参考，你可以按自己的判断调整；保存后不会执行交易。
          </DialogDescription>
          <form
            className="dialog-body"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <fieldset>
              <legend>建议价格区间</legend>
              <div className="zone-form-grid">
                <label>
                  价格下限
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    inputMode="decimal"
                    value={draft.valuationLow}
                    onChange={(event) =>
                      setDraft({ ...draft, valuationLow: event.target.value })
                    }
                  />
                </label>
                <label>
                  价格上限
                  <input
                    type="number"
                    min="0.000001"
                    step="any"
                    inputMode="decimal"
                    value={draft.valuationHigh}
                    onChange={(event) =>
                      setDraft({ ...draft, valuationHigh: event.target.value })
                    }
                  />
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>建议仓位区间</legend>
              <div className="zone-form-grid">
                <label>
                  仓位下限 (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    value={draft.weightLow}
                    onChange={(event) =>
                      setDraft({ ...draft, weightLow: event.target.value })
                    }
                  />
                </label>
                <label>
                  仓位上限 (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputMode="decimal"
                    value={draft.weightHigh}
                    onChange={(event) =>
                      setDraft({ ...draft, weightHigh: event.target.value })
                    }
                  />
                </label>
              </div>
            </fieldset>
            <label>
              临界提醒比例 (%)
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                inputMode="decimal"
                value={draft.alertBuffer}
                onChange={(event) =>
                  setDraft({ ...draft, alertBuffer: event.target.value })
                }
              />
              <small>价格在合理区间内，但距离任一边界不足该比例时提醒。</small>
            </label>
            <label>
              补充依据或人工备注（选填）
              <input
                maxLength={80}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
                placeholder="例如：季度估值复核"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="info-box">
              参考现价：{editing?.price ?? '—'}
              。区间和更新时间保存在当前浏览器中。
            </div>
            <div className="dialog-action-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditing(null)}
              >
                取消
              </button>
              <button type="submit" className="primary-button">
                保存区间
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
