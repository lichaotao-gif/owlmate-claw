'use client';

import { Check, LoaderCircle, Sparkles } from 'lucide-react';

const stages = ['解析策略描述', '整理执行规则与风控', '形成可复核的策略草案'];

export function StrategyGenerationProgress({
  step,
  onCancel,
}: {
  step: number;
  onCancel: () => void;
}) {
  return (
    <div className="strategy-generation-progress">
      <div className="strategy-generation-orbit" aria-hidden="true">
        <Sparkles size={28} />
      </div>
      <h3>正在整理你的策略</h3>
      <output className="sr-only">{stages[step]}</output>
      <p>将想法转化为结构化规则，完成后请检查关键条件。</p>
      <ol aria-live="polite">
        {stages.map((label, index) => (
          <li
            key={label}
            className={
              index < step ? 'complete' : index === step ? 'active' : ''
            }
            aria-current={index === step ? 'step' : undefined}
          >
            {index < step ? (
              <Check size={17} aria-hidden="true" />
            ) : index === step ? (
              <LoaderCircle
                size={17}
                className="strategy-generation-spinner"
                aria-hidden="true"
              />
            ) : (
              <span aria-hidden="true">{index + 1}</span>
            )}
            {label}
          </li>
        ))}
      </ol>
      <button className="market-card-secondary" onClick={onCancel}>
        取消生成，返回编辑
      </button>
    </div>
  );
}
