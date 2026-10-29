'use client';

import { useId, useState } from 'react';

// Layout fixtures only: these points are not market data or a strategy backtest.
const previewStrategy = [
  0, 2, -1, 3, 1, 6, 9, 5, 12, 14, 10, 18, 22, 16, 20, 25, 21, 29, 32, 26, 35,
  37, 30, 19, 27, 33, 31, 40, 45, 38, 43, 49, 46, 53, 48, 58,
];
const previewBenchmark = [
  0, 1, -2, 0, -1, 2, 3, 1, 4, 2, 0, 5, 7, 4, 6, 8, 5, 9, 7, 4, 8, 11, 8, 3, 6,
  8, 5, 11, 13, 9, 12, 15, 12, 17, 14, 18,
];
const width = 600,
  height = 190,
  left = 42,
  right = 14,
  top = 15,
  bottom = 28;
const px = (index: number) =>
  left + (index / (previewStrategy.length - 1)) * (width - left - right);
const py = (value: number) =>
  top + ((60 - value) / 80) * (height - top - bottom);
const line = (points: number[]) =>
  points
    .map((n, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(n).toFixed(1)}`)
    .join(' ');
export function StrategyPerformance({ metrics = true }: { metrics?: boolean }) {
  const id = useId().replaceAll(':', '');
  const [active, setActive] = useState<number | null>(null);
  return (
    <section className="strategy-performance" aria-label="策略表现预览">
      {metrics && (
        <div className="strategy-performance-metrics">
          {['年化收益', '累计收益', '最大回撤', '夏普比率'].map((label) => (
            <div key={label}>
              <strong>—</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="strategy-performance-caption">
        <span>曲线样式预览</span>
        <small>示例数据 · 非回测结果</small>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        aria-label="示例策略与示例基准的双曲线，仅预览样式，不代表策略表现"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * width;
          setActive(
            Math.max(
              0,
              Math.min(
                previewStrategy.length - 1,
                Math.round(
                  ((x - left) / (width - left - right)) *
                    (previewStrategy.length - 1),
                ),
              ),
            ),
          );
        }}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient
            id={`performance-fill-${id}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="var(--chart-strategy)"
              stopOpacity=".14"
            />
            <stop
              offset="100%"
              stopColor="var(--chart-strategy)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[-20, 0, 20, 40, 60].map((value) => (
          <g key={value}>
            <line
              x1={left}
              x2={width - right}
              y1={py(value)}
              y2={py(value)}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <text
              x={left - 8}
              y={py(value) + 4}
              textAnchor="end"
              fill="var(--muted)"
              fontSize="10"
            >
              {value}%
            </text>
          </g>
        ))}
        <path
          d={`${line(previewStrategy)} L${px(previewStrategy.length - 1)},${py(0)} L${px(0)},${py(0)} Z`}
          fill={`url(#performance-fill-${id})`}
        />
        <path
          d={line(previewBenchmark)}
          fill="none"
          stroke="var(--chart-benchmark)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d={line(previewStrategy)}
          fill="none"
          stroke="var(--chart-strategy)"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        {[0, 9, 18, 27, 35].map((index, i) => (
          <text
            key={index}
            x={px(index)}
            y={height - 7}
            textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
            fill="var(--muted)"
            fontSize="10"
          >
            {i === 0 ? '起点' : i === 4 ? '终点' : `${i * 25}% 进度`}
          </text>
        ))}
        {active !== null && (
          <g>
            <line
              x1={px(active)}
              x2={px(active)}
              y1={top}
              y2={height - bottom}
              stroke="var(--muted)"
              strokeDasharray="3 3"
            />
            <circle
              cx={px(active)}
              cy={py(previewStrategy[active])}
              r="3"
              fill="var(--chart-strategy)"
            />
            <rect
              x={Math.min(px(active) + 7, width - 157)}
              y={top}
              width="142"
              height="38"
              rx="5"
              fill="var(--card)"
              stroke="var(--border)"
            />
            <text
              x={Math.min(px(active) + 15, width - 149)}
              y={top + 15}
              fontSize="10"
              fill="var(--foreground)"
            >
              示例策略 {previewStrategy[active]}%
            </text>
            <text
              x={Math.min(px(active) + 15, width - 149)}
              y={top + 29}
              fontSize="10"
              fill="var(--muted)"
            >
              示例基准 {previewBenchmark[active]}%
            </text>
          </g>
        )}
      </svg>
      <div className="strategy-performance-legend">
        <span>
          <i />
          示例策略
        </span>
        <span>
          <i />
          示例基准
        </span>
        <small>真实表现待测试</small>
      </div>
    </section>
  );
}
