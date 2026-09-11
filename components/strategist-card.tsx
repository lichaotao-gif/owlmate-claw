import type { Strategist } from '@/lib/strategists';

export function StrategistAvatar({
  strategist,
  small = false,
}: {
  strategist: Strategist;
  small?: boolean;
}) {
  return (
    <span
      className={`strategist-avatar${small ? ' small' : ''}`}
      style={
        {
          '--agent-accent': strategist.accent,
          backgroundImage: `url(${strategist.avatar})`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    />
  );
}

export function StrategistSparkline({
  strategist,
  large = false,
}: {
  strategist: Strategist;
  large?: boolean;
}) {
  const width = large ? 620 : 240,
    height = large ? 150 : 54;
  const min = Math.min(...strategist.path) - 1,
    max = Math.max(...strategist.path) + 1;
  const points = strategist.path
    .map(
      (value, index) =>
        `${(index * width) / (strategist.path.length - 1)},${height - ((value - min) * height) / (max - min)}`,
    )
    .join(' ');
  return (
    <div className={`strategist-sparkline${large ? ' large' : ''}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label={`${strategist.name}近90日模拟收益 ${strategist.return90 > 0 ? '+' : ''}${strategist.return90}%，期间包含正常波动`}
      >
        <defs>
          <linearGradient
            id={`fill-${strategist.id}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0" stopColor={strategist.accent} stopOpacity=".28" />
            <stop offset="1" stopColor={strategist.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill={`url(#fill-${strategist.id})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={strategist.accent}
          strokeWidth={large ? 3 : 2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
