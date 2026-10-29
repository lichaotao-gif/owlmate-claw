'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FlaskConical,
  Plus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  nextGuideStep,
  strategyGuideSteps,
  type StrategyGuideMode,
} from '@/lib/strategy-guide';

function StrategyGuidePicture({
  mode,
  step,
}: {
  mode: StrategyGuideMode;
  step: number;
}) {
  const markers = [
    { x: 746, y: 46 },
    { x: 126, y: 180 },
    { x: 346, y: 328 },
    { x: 736, y: 270 },
  ];
  return (
    <svg
      className="strategy-guide-picture"
      viewBox="0 0 900 420"
      aria-label="带有一到四编号的操作图解：创建入口、选择规则、配置资产和结果观察"
    >
      <title>策略使用流程图：创建、核对规则、配置资产、观察结果</title>
      <rect
        x="2"
        y="2"
        width="896"
        height="416"
        rx="18"
        className="guide-svg-background"
      />
      <path d="M2 86h896" className="guide-svg-line" />
      <text x="30" y="52" className="guide-svg-title">
        {mode === 'lab' ? '策略实验室' : '策略广场'}
      </text>
      <rect
        x="766"
        y="23"
        width="109"
        height="43"
        rx="9"
        className="guide-svg-primary"
      />
      <text x="783" y="50" className="guide-svg-button">
        ＋ {mode === 'lab' ? '新建实验' : '创建策略'}
      </text>
      <rect
        x="28"
        y="112"
        width="246"
        height="280"
        rx="12"
        className="guide-svg-panel"
      />
      <text x="48" y="145" className="guide-svg-label">
        {mode === 'lab' ? '选择你的策略' : '我的策略库'}
      </text>
      <rect
        x="48"
        y="165"
        width="206"
        height="85"
        rx="9"
        className="guide-svg-selected"
      />
      <text x="68" y="200" className="guide-svg-label">
        我的趋势研究策略
      </text>
      <text x="68" y="226" className="guide-svg-muted">
        适用资产 · 复核频率
      </text>
      <rect
        x="48"
        y="266"
        width="206"
        height="54"
        rx="8"
        className="guide-svg-background"
      />
      <text x="68" y="299" className="guide-svg-muted">
        候选规则与风险控制
      </text>
      <rect
        x="48"
        y="337"
        width="206"
        height="36"
        rx="8"
        className="guide-svg-background"
      />
      <text x="68" y="361" className="guide-svg-muted">
        {mode === 'lab' ? '查看策略详情' : '创建策略实验 →'}
      </text>
      <rect
        x="294"
        y="112"
        width="578"
        height="180"
        rx="12"
        className="guide-svg-panel"
      />
      <text x="316" y="145" className="guide-svg-label">
        实验净值与结果观察
      </text>
      <path d="M320 245h520M320 192h520" className="guide-svg-line" />
      <path
        d="m322 249 52-15 48 7 55-32 55 8 59-32 52 9 61-31 63 10 66-32"
        className="guide-svg-chart"
      />
      <text x="316" y="275" className="guide-svg-muted">
        净值曲线 · 持仓结构 · 操作记录
      </text>
      <rect
        x="294"
        y="310"
        width="578"
        height="82"
        rx="12"
        className="guide-svg-panel"
      />
      <text x="316" y="344" className="guide-svg-label">
        初始资产
      </text>
      <text x="316" y="370" className="guide-svg-muted">
        现金 / 持仓 / 混合资产
      </text>
      <rect
        x="638"
        y="333"
        width="210"
        height="35"
        rx="8"
        className="guide-svg-background"
      />
      <text x="654" y="356" className="guide-svg-muted">
        金额与持仓设置
      </text>
      {markers.map((marker, index) => (
        <g
          key={index}
          className={
            step === index ? 'guide-svg-marker active' : 'guide-svg-marker'
          }
        >
          <circle
            cx={marker.x}
            cy={marker.y}
            r="22"
            className="guide-svg-halo"
          />
          <circle cx={marker.x} cy={marker.y} r="15" />
          <text x={marker.x} y={marker.y + 5} textAnchor="middle">
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function StrategyWelcome({
  mode = 'lab',
  onStart,
  onHelp,
}: {
  mode?: StrategyGuideMode;
  onStart: () => void;
  onHelp: () => void;
}) {
  return (
    <section
      className="strategy-welcome"
      aria-label={mode === 'lab' ? '开始第一个实验' : '开始使用策略'}
    >
      <div className="strategy-welcome-heading">
        <span className="strategy-welcome-icon">
          <FlaskConical size={27} />
        </span>
        <div>
          <span className="eyebrow">START YOUR RESEARCH</span>
          <h2>
            {mode === 'lab'
              ? '还没有实验，从一个想法开始'
              : '策略库还没有内容，从第一份策略开始'}
          </h2>
          <p>
            {mode === 'lab'
              ? '四步建立独立实验，逐步观察规则、资产与操作记录。'
              : '先创建自己的规则，再带入实验室验证。不需要等待广场出现内容。'}
          </p>
        </div>
      </div>
      <ol className="strategy-welcome-steps">
        {strategyGuideSteps[mode].map((item, index) => (
          <li key={item.title}>
            <span>{index + 1}</span>
            <div>
              <b>{item.title}</b>
              <small>{item.short}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className="strategy-welcome-actions">
        <button className="strategy-guide-start" onClick={onStart}>
          <Plus size={16} />
          {mode === 'lab' ? '创建第一个实验' : '创建第一份策略'}
        </button>
        <button className="strategy-guide-help" onClick={onHelp}>
          <BookOpen size={16} />
          查看四步图解
        </button>
      </div>
    </section>
  );
}

export function StrategyGuide({
  mode = 'lab',
  onClose,
  onStart,
}: {
  mode?: StrategyGuideMode;
  onClose: () => void;
  onStart: () => void;
}) {
  const [step, setStep] = useState(0);
  const steps = strategyGuideSteps[mode];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="owl-dialog strategy-guide-dialog">
        <DialogTitle>
          {mode === 'lab' ? '四步开始策略实验' : '从策略到实验，四步上手'}
        </DialogTitle>
        <DialogDescription>
          对照图中的编号查看操作位置，也可以点击下方步骤切换说明。
        </DialogDescription>
        <div className="strategy-guide-picture-wrap">
          <StrategyGuidePicture mode={mode} step={step} />
        </div>
        <div className="strategy-guide-step-picker" aria-label="操作步骤">
          {steps.map((item, index) => (
            <button
              key={item.title}
              aria-current={step === index ? 'step' : undefined}
              onClick={() => setStep(index)}
            >
              <span>{index + 1}</span>
              {item.title}
            </button>
          ))}
        </div>
        <div className="strategy-guide-explanation">
          <b>
            {step + 1}. {steps[step].title}
          </b>
          <p>{steps[step].body}</p>
        </div>
        <div className="strategy-guide-controls">
          <button
            disabled={step === 0}
            onClick={() => setStep((current) => nextGuideStep(current, -1))}
          >
            <ArrowLeft size={15} />
            上一步
          </button>
          <span>{step + 1} / 4</span>
          {step < 3 ? (
            <button
              className="strategy-guide-start"
              onClick={() => setStep((current) => nextGuideStep(current, 1))}
            >
              下一步
              <ArrowRight size={15} />
            </button>
          ) : (
            <button
              className="strategy-guide-start"
              onClick={() => {
                onClose();
                onStart();
              }}
            >
              <Plus size={15} />
              {mode === 'lab' ? '开始创建实验' : '开始创建策略'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
