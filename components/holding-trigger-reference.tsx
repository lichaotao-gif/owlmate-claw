import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleDollarSign,
  Gauge,
} from 'lucide-react';
import type { Holding } from '@/lib/holdings';

type FocusedHolding = Holding & { allocation: number };

function referencePrice(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function percentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function HoldingTriggerReference({
  holding,
}: {
  holding: FocusedHolding;
}) {
  const range = holding.range;

  if (!range) {
    return (
      <section
        className="holding-trigger-reference empty"
        aria-label={`${holding.name}触发参考`}
      >
        <div>
          <span className="trigger-reference-kicker">触发参考</span>
          <b>{holding.name}尚未设置加减仓参考区间</b>
        </div>
        <small>可在“区间雷达”中补充价格区间，设置后会自动显示在这里。</small>
      </section>
    );
  }

  const addDistance = Math.abs(
    ((range.valuationLow - holding.price) / holding.price) * 100,
  );
  const reduceDistance = Math.abs(
    ((range.valuationHigh - holding.price) / holding.price) * 100,
  );
  const addTriggered = holding.price <= range.valuationLow;
  const reduceTriggered = holding.price >= range.valuationHigh;
  const closestIsAdd = addDistance <= reduceDistance;
  const status = addTriggered
    ? '已进入加仓参考区'
    : reduceTriggered
      ? '已进入减仓参考区'
      : '参考区间内';
  const nearest = addTriggered
    ? `低于加仓参考 ${percentage(addDistance)}`
    : reduceTriggered
      ? `高于减仓参考 ${percentage(reduceDistance)}`
      : `距${closestIsAdd ? '加仓' : '减仓'}参考 ${percentage(
          closestIsAdd ? addDistance : reduceDistance,
        )}`;

  return (
    <section
      className={`holding-trigger-reference ${
        addTriggered ? 'add-active' : reduceTriggered ? 'reduce-active' : ''
      }`}
      aria-label={`${holding.name}触发参考`}
    >
      <div className="trigger-reference-heading">
        <div>
          <span className="trigger-reference-kicker">触发参考</span>
          <b>{holding.name} · 当前区间监控</b>
        </div>
        <span className="trigger-reference-status">{status}</span>
      </div>
      <dl className="trigger-reference-grid">
        <div>
          <dt>
            <CircleDollarSign size={14} aria-hidden="true" /> 当前参考价
          </dt>
          <dd>¥{referencePrice(holding.price)}</dd>
          <small>当前仓位 {percentage(holding.allocation)}</small>
        </div>
        <div>
          <dt>
            <ArrowDownToLine size={14} aria-hidden="true" /> 加仓参考
          </dt>
          <dd>≤ ¥{referencePrice(range.valuationLow)}</dd>
          <small>
            {addTriggered
              ? '已到达参考位置'
              : `需回落 ${percentage(addDistance)}`}
          </small>
        </div>
        <div>
          <dt>
            <ArrowUpFromLine size={14} aria-hidden="true" /> 减仓参考
          </dt>
          <dd>≥ ¥{referencePrice(range.valuationHigh)}</dd>
          <small>
            {reduceTriggered
              ? '已到达参考位置'
              : `需上涨 ${percentage(reduceDistance)}`}
          </small>
        </div>
        <div>
          <dt>
            <Gauge size={14} aria-hidden="true" /> 距触发距离
          </dt>
          <dd>{nearest}</dd>
          <small>按当前参考价计算</small>
        </div>
      </dl>
      <p>
        价格区间 {referencePrice(range.valuationLow)}–
        {referencePrice(range.valuationHigh)} · {range.note || '用户设置'} ·
        更新于 {range.updatedAt}。仅显示已设置规则，不代表买卖指令。
      </p>
    </section>
  );
}
