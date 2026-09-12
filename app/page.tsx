'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Expand,
  Layers3,
  MessageSquare,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { OwlLogo as Glasses } from '@/components/owl-logo';
import { StrategyCenter } from '@/components/strategy-center';
import { useInvestorProfile } from '@/lib/profile-store';
import { PortfolioHealth } from '@/components/portfolio-health';
import { AdviceSummary } from '@/components/advice-view';
import { StrategyWorkbench } from '@/components/strategy-workbench';
import { PlanLibrary, type PlanLibraryHandle } from '@/components/plan-library';
import { OnboardingDemo } from '@/components/onboarding-demo';
import { HoldingsPanel } from '@/components/holdings-panel';
import { ValuationZonePanel } from '@/components/valuation-zone-panel';
import {
  initialAccount,
  summarize,
  parseAccount,
  type Account,
} from '@/lib/holdings';
import {
  appendSnapshot,
  drawdown,
  readSnapshots,
  type Snapshot,
} from '@/lib/history';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { registerSimulationTools } from '@/lib/webmcp';
import {
  forecast,
  money,
  scenarioLabels,
  type Scenario,
} from '@/lib/simulation';
import { StrategistSpotlight } from '@/components/strategist-spotlight';
import { strategists } from '@/lib/strategists';
import { AppRail } from '@/components/app-rail';
import {
  applyMarketSnapshot,
  assetHistory,
  formatMarketDate,
  marketQuote,
  marketSnapshotDate,
  portfolioHistory,
  type HistoricalPoint,
} from '@/lib/market-data';

type EventItem = {
  title: string;
  type: string;
  time: string;
  asset: string;
  icon: typeof Activity;
  desc: string;
  question: string;
};

const MARKET_VERSION_KEY = 'owlmate-market-data-version';
const tickerQuotes = ['513100', '510300', '159915', '518880']
  .map(marketQuote)
  .filter((quote): quote is NonNullable<typeof quote> => Boolean(quote));
function buildEvents(summary: ReturnType<typeof summarize>): EventItem[] {
  const { assets, largest, riskAllocation } = summary;
  const list: EventItem[] = [];
  if (largest)
    list.push({
      title: `${largest.name}占账户 ${largest.allocation.toFixed(1)}%，留意组合集中度`,
      type: '市场观察',
      time: '14:28',
      asset: largest.name,
      icon: Activity,
      desc: `演示事件：假设${largest.name}所在板块波动上升。它目前是你最大的单一敞口，市值 ¥${money(largest.value, false)}，占账户 ${largest.allocation.toFixed(1)}%。此消息为虚构演示内容，请结合自己的持仓判断关联性。`,
      question: '分析我的持仓风险',
    });
  const mover = assets
    .filter((a) => a.id !== largest?.id)
    .reduce<(typeof assets)[number] | null>(
      (max, a) => (!max || Math.abs(a.pnl) > Math.abs(max.pnl) ? a : max),
      null,
    );
  if (mover)
    list.push({
      title: `${mover.name}浮动盈亏 ${mover.pnl >= 0 ? '+' : ''}${money(mover.pnl, false)}，观察分散效果`,
      type: '资产动态',
      time: '13:45',
      asset: mover.name,
      icon: TrendingUp,
      desc: `演示事件：假设${mover.name}走势延续。它占账户 ${mover.allocation.toFixed(1)}%，当前浮动盈亏 ${mover.pnl >= 0 ? '+' : ''}${money(mover.pnl, false)}。不同资产并非始终反向波动，建议比较上涨、震荡、下跌三种情景。此消息为虚构演示内容。`,
      question: '如果市场下跌呢？',
    });
  list.push(
    assets.length
      ? {
          title: '月度策略复核：检查现金与风险预算',
          type: '策略日历',
          time: '09:30',
          asset: '我的组合',
          icon: Target,
          desc: `演示计划：复核投资期限、资金用途、持仓集中度与模拟假设。当前风险资产仓位 ${riskAllocation.toFixed(1)}%，现金 ${(100 - riskAllocation).toFixed(1)}%。仅保存方案不会修改实际持仓。`,
          question: '为什么建议降低仓位？',
        }
      : {
          title: '尚未录入持仓，先建立组合基线',
          type: '策略日历',
          time: '09:30',
          asset: '我的组合',
          icon: Target,
          desc: '演示计划：事件雷达按你录入的持仓生成。请先在「我的持仓」添加资产或维护现金，之后这里会显示与实际敞口相关的演示事件。',
          question: '分析我的持仓风险',
        },
  );
  return list;
}
type Message = { role: 'user' | 'assistant'; text: string };

function Projection({
  allocation,
  days,
  scenario,
  selected,
  account,
  focusName,
  historySeries,
  deposit = 0,
  large = false,
}: {
  allocation: number;
  days: number;
  scenario: Scenario;
  selected: number;
  account: { total: number; riskAllocation: number };
  focusName: string;
  historySeries: HistoricalPoint[];
  deposit?: number;
  large?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const seed = selected + 2;
  const paths = useMemo(() => {
    const path = (points: number[][]) =>
      points
        .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`)
        .join(' ');
    const amp = (allocation / 80) * Math.sqrt(days / 20);
    const historyDeviation = historySeries.reduce(
      (max, point) => Math.max(max, Math.abs(point.normalized - 100)),
      0,
    );
    const bound = Math.max(
      12,
      Math.ceil(
        Math.max(
          historyDeviation * 1.08,
          Math.abs(
            forecast(allocation, days, 'bear', deposit, account).percent,
          ),
          Math.abs(
            forecast(allocation, days, 'bull', deposit, account).percent,
          ),
        ) / 6,
      ) * 6,
    );
    const historyValues = historySeries.length
      ? historySeries
      : [{ date: marketSnapshotDate, value: account.total, normalized: 100 }];
    const hist = historyValues.map((point, i) => [
      historyValues.length > 1 ? (i / (historyValues.length - 1)) * 400 : 400,
      164 - ((point.normalized - 100) * 128) / bound,
    ]);
    const futureY = (i: number, sc: Scenario) =>
      164 -
      (forecast(
        allocation,
        Math.max(0.0001, (i / 40) * days),
        sc,
        deposit,
        account,
      ).percent *
        128) /
        bound;
    const futures = ([-1, 0, 1] as const).map((k) =>
      Array.from({ length: 41 }, (_, i) => {
        const t = i / 40;
        return [
          400 + t * 290,
          futureY(i, (['bear', 'base', 'bull'] as Scenario[])[k + 1]) +
            Math.sin(i * 0.68 + seed) * 3 * Math.sin(Math.PI * t) * amp,
        ];
      }),
    );
    return {
      ticks: [100 + bound, 100 + bound / 2, 100, 100 - bound / 2, 100 - bound],
      history: path(hist),
      fill: path(hist) + ' L400,304 L0,304 Z',
      future: futures.map(path),
      endpoints: futures.map((points) => points[points.length - 1][1]),
      band:
        path(futures[2]) +
        ' ' +
        path([...futures[0]].reverse()).replace('M', 'L') +
        ' Z',
      ghosts: Array.from({ length: 18 }, (_, n) =>
        path(
          Array.from({ length: 41 }, (_, i) => {
            const t = i / 40;
            return [
              400 + t * 290,
              futureY(i, 'bear') * (1 - n / 17) +
                futureY(i, 'bull') * (n / 17) +
                (Math.sin(i * 0.43 + n) * 8 + Math.sin(i * 0.93 + n * 3) * 4) *
                  Math.sin(Math.PI * t) *
                  amp,
            ];
          }),
        ),
      ),
      firstDate: historyValues[0]?.date ?? marketSnapshotDate,
      middleDate:
        historyValues[Math.floor(historyValues.length / 2)]?.date ??
        marketSnapshotDate,
      lastDate: historyValues.at(-1)?.date ?? marketSnapshotDate,
    };
  }, [allocation, days, seed, deposit, account, historySeries]);
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const updateHover = (event: PointerEvent) => {
      const bounds = chart.getBoundingClientRect();
      setHover(
        Math.max(
          0,
          Math.min(690, ((event.clientX - bounds.left) / bounds.width) * 780),
        ),
      );
    };
    const clearHover = () => setHover(null);
    chart.addEventListener('pointermove', updateHover);
    chart.addEventListener('pointerleave', clearHover);
    return () => {
      chart.removeEventListener('pointermove', updateHover);
      chart.removeEventListener('pointerleave', clearHover);
    };
  }, []);
  const active = scenario === 'bear' ? 0 : scenario === 'base' ? 1 : 2;
  const hoveredHistorical =
    hover !== null && hover <= 400 && historySeries.length
      ? historySeries[Math.round((hover / 400) * (historySeries.length - 1))]
      : null;
  return (
    <div className={'projection ' + (large ? 'large' : '')}>
      <div className="chart-top-labels">
        <span>
          <i className="legend-dot history-dot" />
          {focusName} · 近 {historySeries.length || 1} 个交易日收盘
        </span>
        <span className="future-label">
          <Sparkles size={12} />
          组合未来 {days} 日 · 假设推演
        </span>
      </div>
      <svg
        ref={chartRef}
        viewBox="0 0 780 345"
        aria-label={`${focusName}截至${marketSnapshotDate}的历史收盘走势，以及未来${days}日三种假设情景。未来部分非行情预测。`}
      >
        <defs>
          <linearGradient
            id={large ? 'histFillL' : 'histFill'}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#55cfee" stopOpacity=".22" />
            <stop offset="55%" stopColor="#8c72f6" stopOpacity=".11" />
            <stop offset="100%" stopColor="#8c72f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={large ? 'histStrokeL' : 'histStroke'}
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0%" stopColor="#52d1e7" />
            <stop offset="48%" stopColor="#6ca9ff" />
            <stop offset="100%" stopColor="#b58cff" />
          </linearGradient>
          <linearGradient
            id={large ? 'forecastFillL' : 'forecastFill'}
            x1="0"
            x2="1"
          >
            <stop stopColor="#8676ef" stopOpacity=".03" />
            <stop offset="55%" stopColor="#56bfe5" stopOpacity=".08" />
            <stop offset="100%" stopColor="#58d4b7" stopOpacity=".14" />
          </linearGradient>
          <filter id={large ? 'glowL' : 'glow'}>
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id={large ? 'plotL' : 'plot'}>
            <rect width="705" height="307" />
          </clipPath>
        </defs>
        {[36, 100, 164, 228, 292].map((y, i) => (
          <g key={y}>
            <line
              x1="0"
              x2="700"
              y1={y}
              y2={y}
              stroke="#242633"
              strokeDasharray="3 5"
            />
            <text x="718" y={y + 4} fill="#777d92" fontSize="12">
              {paths.ticks[i]}
            </text>
          </g>
        ))}
        {[100, 200, 300, 500, 600].map((x) => (
          <line key={x} x1={x} x2={x} y1="24" y2="305" stroke="#1c1e2b" />
        ))}
        <g clipPath={`url(#${large ? 'plotL' : 'plot'})`}>
          <path
            d={paths.fill}
            fill={`url(#${large ? 'histFillL' : 'histFill'})`}
          />
          <path
            d={paths.history}
            stroke="#61c9ee"
            strokeWidth="8"
            opacity=".17"
            fill="none"
            filter={`url(#${large ? 'glowL' : 'glow'})`}
          />
          <path
            d={paths.history}
            stroke={`url(#${large ? 'histStrokeL' : 'histStroke'})`}
            strokeWidth="2.7"
            fill="none"
          />
          <path
            d={paths.band}
            fill={`url(#${large ? 'forecastFillL' : 'forecastFill'})`}
          />
          {paths.future.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={['#69aaf5', '#bd91ff', '#59d2ad'][i]}
              strokeWidth={active === i ? 2.8 : 1.5}
              strokeDasharray={active === i ? '6 4' : '3 5'}
              opacity={active === i ? 1 : 0.68}
            />
          ))}
          {paths.endpoints.map((y, i) => (
            <circle
              key={i}
              cx="690"
              cy={y}
              r={active === i ? 4.5 : 3}
              fill={['#69aaf5', '#bd91ff', '#59d2ad'][i]}
              stroke="#12141d"
              strokeWidth="2"
            />
          ))}
        </g>
        <line
          x1="400"
          x2="400"
          y1="15"
          y2="304"
          stroke="#7a688f"
          strokeDasharray="4 5"
        />
        <circle cx="400" cy="164" r="10" fill="#a28aff" opacity=".15" />
        <circle cx="400" cy="164" r="4" fill="#d0bcff" />
        <rect x="373" y="305" width="54" height="23" rx="5" fill="#30253f" />
        <text x="400" y="321" textAnchor="middle" fontSize="11" fill="#d2bbf9">
          {formatMarketDate(paths.lastDate)}
        </text>
        {[
          [0, formatMarketDate(paths.firstDate)],
          [200, formatMarketDate(paths.middleDate)],
          [540, `+${Math.round(days / 2)}日`],
          [685, `+${days}日`],
        ].map(([x, t]) => (
          <text
            key={t}
            x={Number(x) + 4}
            y="321"
            fontSize="12"
            fill="#777d92"
            textAnchor={Number(x) > 600 ? 'end' : 'start'}
          >
            {t}
          </text>
        ))}
        {hover !== null && (
          <g>
            <line
              x1={hover}
              x2={hover}
              y1="20"
              y2="299"
              stroke="#a79cbe"
              opacity=".4"
            />
            <rect
              x={Math.min(hover + 10, 515)}
              y="30"
              width="167"
              height="36"
              rx="6"
              fill="#252234"
              stroke="#504568"
            />
            <text
              x={Math.min(hover + 22, 527)}
              y="52"
              fontSize="12"
              fill="#e1dbea"
            >
              {hoveredHistorical
                ? `${formatMarketDate(hoveredHistorical.date)} · ${hoveredHistorical.normalized.toFixed(2)}`
                : `${scenarioLabels[scenario]} · 非概率预测`}
            </text>
          </g>
        )}
      </svg>
      <div className="chart-legend">
        <span>
          <i
            style={{ background: '#59d2ad', boxShadow: '0 0 10px #59d2ad66' }}
          />
          上涨情景
        </span>
        <span>
          <i
            style={{ background: '#bd91ff', boxShadow: '0 0 10px #bd91ff66' }}
          />
          震荡情景
        </span>
        <span>
          <i
            style={{ background: '#69aaf5', boxShadow: '0 0 10px #69aaf566' }}
          />
          下跌情景
        </span>
        <small>
          历史收盘数据截至 {marketSnapshotDate.replaceAll('-', '.')} ·
          未来为情景推演
        </small>
      </div>
    </div>
  );
}
export default function Home() {
  const [account, setAccount] = useState<Account>(initialAccount);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const summary = summarize(account),
    assets = summary.assets,
    currentAllocation = summary.riskAllocation;
  const simulationAccount = {
    total: summary.total,
    riskAllocation: currentAllocation,
  };
  const largestPercent = summary.largest?.allocation ?? 0;
  const netValue = drawdown(
    history.length ? history : [{ at: '', total: summary.total }],
  );
  const concentration = summary.largest
    ? `最大持仓 ${summary.largest.name} 占账户 ${largestPercent.toFixed(1)}%。`
    : '当前没有持仓，可先添加资产或维护现金。';
  const [strategySignal, setStrategySignal] = useState('');
  const events = buildEvents(summary);
  if (strategySignal)
    events.unshift({
      title: '回撤规则已触发 · 手动演示',
      type: '策略风控',
      time: '本次演示',
      asset: '模拟对象',
      icon: ShieldCheck,
      desc: strategySignal,
      question: '解释回撤规则的演示结果',
    });
  function trackTotal(total: number) {
    const raw = localStorage.getItem('owlmate-history-v1');
    const list = appendSnapshot(raw ? readSnapshots(raw) : [], total);
    localStorage.setItem('owlmate-history-v1', JSON.stringify(list));
    setHistory(list);
  }
  function updateAccount(next: Account) {
    if (timer.current) clearTimeout(timer.current);
    setPending(false);
    setMessages([]);
    setTriggered(false);
    setHealthSource('');
    setAccount(next);
    setSelected(-1);
    try {
      localStorage.setItem('owlmate-account-v1', JSON.stringify(next));
      window.dispatchEvent(new Event('owlmate-data-change'));
      trackTotal(summarize(next).total);
      setNotice('账户已保存在本机，资产与模拟已更新。现金未自动变动。');
    } catch {
      setNotice('当前页面已更新，但浏览器存储不可用，刷新会丢失修改。');
    }
  }
  const [healthSource, setHealthSource] = useState('');
  const [pressure, setPressure] = useState(false);
  const [selected, setSelected] = useState(-1),
    [allocation, setAllocation] = useState(65),
    [days, setDays] = useState(20),
    [scenario, setScenario] = useState<Scenario>('base'),
    [deposit, setDeposit] = useState(0);
  const [dialog, setDialog] = useState<
      'profile' | 'plan' | 'chart' | 'event' | 'method' | null
    >(null),
    [eventIndex, setEventIndex] = useState(0),
    [triggered, setTriggered] = useState(false),
    [notice, setNotice] = useState('');
  const [input, setInput] = useState(''),
    [messages, setMessages] = useState<Message[]>([]),
    [chatOpen, setChatOpen] = useState(true),
    [pending, setPending] = useState(false),
    [risk, setRisk] = useState('稳健增值'),
    [months, setMonths] = useState('1–3 年'),
    [depositDraft, setDepositDraft] = useState('50000'),
    [userName, setUserName] = useState('演示账户');
  const { profile } = useInvestorProfile();
  const adviceTarget = Math.min(
    currentAllocation,
    profile?.recommendedAllocation ?? 65,
  );
  const chatEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      let stored = initialAccount;
      try {
        const raw = localStorage.getItem('owlmate-account-v1');
        if (raw) stored = parseAccount(raw);
        if (localStorage.getItem(MARKET_VERSION_KEY) !== marketSnapshotDate) {
          stored = applyMarketSnapshot(stored);
          localStorage.setItem('owlmate-account-v1', JSON.stringify(stored));
          localStorage.setItem(MARKET_VERSION_KEY, marketSnapshotDate);
          window.dispatchEvent(new Event('owlmate-data-change'));
        }
        setAccount(stored);
      } catch {
        setNotice('无法读取本机账户，暂用示例数据。原存储未覆盖。');
      }
      try {
        trackTotal(summarize(stored).total);
      } catch {
        setHistory([]);
      }
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);
  const result = forecast(
      allocation,
      days,
      scenario,
      deposit,
      simulationAccount,
    ),
    original = forecast(
      summary.total + deposit
        ? (summary.marketValue / (summary.total + deposit)) * 100
        : 0,
      days,
      scenario,
      deposit,
      simulationAccount,
    );
  const focusName =
    selected < 0 ? '我的组合' : (assets[selected]?.name ?? '我的组合');
  const historySeries = useMemo(
    () =>
      selected < 0
        ? portfolioHistory(account.holdings, account.cash)
        : assetHistory(account.holdings[selected]?.code ?? ''),
    [account, selected],
  );
  const activeEvent = events[Math.min(eventIndex, events.length - 1)];
  const planLibrary = useRef<PlanLibraryHandle>(null);
  useEffect(() => {
    const responsiveTimer = window.setTimeout(() => {
      if (window.matchMedia('(max-width:1050px)').matches) setChatOpen(false);
    }, 0);
    return () => window.clearTimeout(responsiveTimer);
  }, []);
  useEffect(
    () => registerSimulationTools({ setAllocation, setDays, setScenario }),
    [],
  );
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('strategy');
    const strategist = strategists.find((item) => item.id === id);
    if (!strategist) return;
    const t = window.setTimeout(() => {
      setAllocation(strategist.riskAllocation);
      setNotice(
        `已载入${strategist.name}的 ${strategist.riskAllocation}% 风险资产仓位，用于当前情景试算。`,
      );
      window.history.replaceState(null, '', `/#simulation`);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (messages.length)
      chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, pending]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  function save() {
    planLibrary.current?.save();
  }
  function ask(question: string) {
    if (pending || !question.trim()) return;
    setChatOpen(true);
    setMessages((m) => [...m, { role: 'user', text: question.trim() }]);
    setInput('');
    setPending(true);
    let answer = '';
    const match = question.match(/(\d{1,3})\s*[%％]/);
    if (match && /仓位|配置|降到|调到/.test(question)) {
      const n = Number(match[1]);
      if (n <= 100) {
        setAllocation(n);
        answer = `已把组合的风险资产模拟仓位调整到 ${n}%，剩余 ${100 - n}% 保留现金。中央图表与情景结果已同步更新。这是组合级试算，尚未保存，也未修改真实持仓。`;
      } else
        answer =
          '仓位需要在 0% 到 100% 之间。演示版不使用杠杆，请输入范围内的比例。';
    } else if (/下跌|跌了|压力/.test(question)) {
      setPressure(true);
      setScenario('bear');
      answer = `已切换到下跌情景。按当前 ${allocation}% 仓位和 ${days} 个交易日的假设，组合期末变化为 ${money(forecast(allocation, days, 'bear', deposit, simulationAccount).pnl)}。情景由预设资产涨跌假设计算，不代表发生概率，也不包含止损执行保证。`;
    } else if (/保存/.test(question)) {
      answer =
        '你可以点击建议卡的「保存方案」。每次保存新增一套待模拟方案，可在「我的模拟方案」中开始独立模拟。原始持仓不变。';
    } else if (/新闻|事件|发生|科技/.test(question)) {
      answer = `${concentration} 当前事件为虚构演示，并非实时资讯。请结合现有持仓判断关联性，再比较情景。`;
    } else if (/买|资金|万元|万块/.test(question)) {
      setDialog('plan');
      answer =
        '已打开新资金试算。填写新增金额后，会以「当前资产＋新增资金」为基数计算目标配置。这里不直接修改账户余额，也不提供实时选股。';
    } else if (/为什么|风险|建议|持仓|分析/.test(question)) {
      answer = `${focusName}的分析基于当前录入账户。${concentration} 当前风险资产仓位为 ${currentAllocation.toFixed(1)}%，资产基数 ¥${money(summary.total, false)}。模拟仓位 ${allocation}% 是供比较的演示配置，不是凯利计算或真实投资建议。你可以调整仓位，并比较上涨、震荡、下跌情景，判断现金和风险的变化。`;
    } else
      answer =
        '我目前是交互演示助手，支持解释示例持仓、切换下跌情景、按百分比调整组合仓位，以及打开新增资金试算。你可以试试「把组合仓位调到 60%」。开放式研究与实时行情将在后续接入。';
    timer.current = setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
      setPending(false);
    }, 550);
  }
  return (
    <div className="app-shell">
      <AppRail />
      <div className="workspace" id="overview">
        <header className="topbar">
          <div className="wordmark">
            OwlMate<span className="brand-beta">BETA</span>
          </div>
          <span className="header-divider" />
          <span className="workspace-label">个人投资工作台</span>
          <div className="header-right">
            <span className="demo-badge">
              <i />
              交互演示
            </span>
            <span className="snapshot">
              {formatMarketDate(marketSnapshotDate)} · 收盘数据
            </span>
            <OnboardingDemo
              onRegistered={(account) => {
                setUserName(account.username);
                setNotice(`注册成功，欢迎你，${account.username}。`);
              }}
              onComplete={(next) => {
                setUserName(next.username);
                setRisk(next.goal);
                setMonths(next.horizon);
                setAllocation(next.recommendedAllocation);
                setNotice(
                  `画像已建立：${next.riskLabel}，已载入 ${next.recommendedAllocation}% 演示仓位。`,
                );
              }}
            />
            <StrategyCenter
              onSignal={(text) => {
                setStrategySignal(text);
                setNotice('演示提醒已加入事件雷达');
                setMessages((m) => [...m, { role: 'assistant', text }]);
              }}
            />
            <PlanLibrary
              ref={planLibrary}
              draft={{ account, allocation, days, scenario, deposit }}
              notify={setNotice}
            />
            <button
              className="account-button"
              onClick={() => setDialog('profile')}
            >
              <span className="small-avatar">
                {userName.slice(0, 1).toUpperCase()}
              </span>
              <span>{profile?.username ?? userName}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <div className="market-ticker">
          <span className="market-state">
            <i />
            市场快照
          </span>
          {tickerQuotes.map((quote) => (
            <div className="ticker-item" key={quote.code}>
              <span>{quote.name}</span>
              <b>{quote.price.toFixed(3)}</b>
              <em className={quote.change >= 0 ? 'up' : 'down'}>
                {quote.change >= 0 ? '+' : '−'}
                {Math.abs(quote.change).toFixed(2)}%
              </em>
            </div>
          ))}
          <span className="ticker-note">历史文件收盘快照</span>
        </div>
        <main className={'main-layout ' + (!chatOpen ? 'chat-collapsed' : '')}>
          <div className="dashboard">
            <div className="page-heading">
              <div>
                <div className="eyebrow">YOUR INVESTMENT, IN PERSPECTIVE</div>
                <div className="cockpit-title-row">
                  <h1>
                    投资驾驶舱
                    <span className="heading-dot" />
                  </h1>
                  <span className="cockpit-tagline">
                    看清当下的资产，探索未来的每一种可能。
                  </span>
                </div>
              </div>
              <div className="page-heading-actions">
                {deposit > 0 && (
                  <button
                    className="deposit-chip"
                    onClick={() => setDialog('plan')}
                  >
                    <Wallet size={14} />
                    <span>新增模拟资金</span>
                    <b>¥{money(deposit, false)}</b>
                  </button>
                )}
                <button
                  className="primary-button"
                  onClick={() => setDialog('plan')}
                  title="有额外资金准备投入时，比较加入资金后的模拟配置"
                >
                  <Plus size={14} />
                  {deposit > 0 ? '调整试算资金' : '新资金试算'}
                </button>
              </div>
            </div>
            <section className="stats-grid" aria-label="资产摘要">
              <div className="stat-card net-worth">
                <div className="stat-label">
                  总资产 <Wallet size={15} />
                </div>
                <div className="stat-value">
                  <span>¥</span>
                  {money(summary.total, false)}
                </div>
                <div className="stat-foot">
                  <span>持仓市值＋现金</span>
                  <span>手动估值</span>
                </div>
                <div className="tiny-bars" aria-hidden="true">
                  {[
                    10, 15, 12, 21, 18, 26, 22, 28, 25, 35, 31, 38, 34, 43, 39,
                    47,
                  ].map((h, i) => (
                    <i key={i} style={{ height: h }} />
                  ))}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  持仓浮动盈亏 <TrendingUp size={15} />
                </div>
                <div
                  className={'stat-value ' + (summary.pnl >= 0 ? 'up' : 'down')}
                >
                  {summary.pnl >= 0 ? '+' : ''}
                  {money(summary.pnl, false)}
                </div>
                <div className="stat-foot">
                  <span>市值减持仓成本</span>
                  <span>非今日收益</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  风险资产仓位 <Layers3 size={15} />
                </div>
                <div className="stat-value">
                  {currentAllocation.toFixed(1)}
                  <span className="decimal">%</span>
                </div>
                <div className="stat-foot">
                  <span className="allocation-line">
                    <i style={{ width: `${currentAllocation}%` }} />
                  </span>
                  <span>现金 {(100 - currentAllocation).toFixed(1)}%</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">
                  组合当前回撤 <ShieldCheck size={15} />
                </div>
                <div
                  className={
                    'stat-value ' + (netValue.percent > 0 ? 'down' : '')
                  }
                >
                  {netValue.percent > 0 ? '−' : ''}
                  {netValue.percent.toFixed(1)}
                  <span className="decimal">%</span>
                </div>
                <div className="stat-foot">
                  <span>本机峰值 ¥{money(netValue.peak, false)}</span>
                  <span>{history.length} 条净值快照</span>
                </div>
              </div>
            </section>
            <PortfolioHealth
              account={account}
              limit={profile?.recommendedAllocation ?? 65}
              hasProfile={!!profile}
              onSimulate={(target, reason) => {
                setSelected(-1);
                setAllocation(target);
                setScenario('base');
                setDays(20);
                setDeposit(0);
                setNotice(
                  `已载入体检方案：${target.toFixed(1)}% 仓位，可对比并保存。`,
                );
                setHealthSource(reason);
                document
                  .getElementById('simulation')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
            <div className="analysis-grid">
              <HoldingsPanel
                account={account}
                selected={selected}
                onSelect={setSelected}
                onChange={updateAccount}
              />
              <section
                className={`panel simulation-panel scenario-${scenario}`}
                id="simulation"
              >
                <div className="panel-heading">
                  <div>
                    <h2>
                      历史走势与未来推演{' '}
                      <span className="purple-tag">DEMO</span>
                    </h2>
                    <p>
                      历史行情截至 {marketSnapshotDate.replaceAll('-', '.')} ·
                      未来为情景推演
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="放大走势图"
                    onClick={() => setDialog('chart')}
                  >
                    <Expand size={16} />
                  </button>
                </div>
                <div className="chart-toolbar">
                  <button
                    className="text-link"
                    aria-expanded={pressure}
                    onClick={() => {
                      setPressure(!pressure);
                      setScenario('base');
                    }}
                  >
                    {pressure ? '收起情景选项' : '情景假设 · 压力测试'}
                    <ChevronDown size={14} />
                  </button>
                  {pressure && (
                    <Tabs
                      value={scenario}
                      onValueChange={(v) => setScenario(v as Scenario)}
                    >
                      <TabsList className="scenario-tabs">
                        <TabsTrigger value="bull">上涨</TabsTrigger>
                        <TabsTrigger value="base">震荡</TabsTrigger>
                        <TabsTrigger value="bear">下跌</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                  <Tabs
                    value={String(days)}
                    onValueChange={(v) => setDays(Number(v))}
                  >
                    <TabsList className="period-tabs">
                      {[5, 20, 60].map((d) => (
                        <TabsTrigger key={d} value={String(d)}>
                          {d}日
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <Projection
                  allocation={allocation}
                  days={days}
                  scenario={scenario}
                  selected={selected}
                  deposit={deposit}
                  account={simulationAccount}
                  focusName={focusName}
                  historySeries={historySeries}
                />
                {healthSource && (
                  <output className="health-source">
                    来源：{healthSource} 已载入 20
                    日基准情景，新增资金归零；可继续调整并保存方案。
                  </output>
                )}
                <AdviceSummary
                  current={currentAllocation}
                  target={adviceTarget}
                  allocation={allocation}
                  total={summary.total}
                  deposit={deposit}
                  profile={profile}
                  largest={concentration}
                />
                <div className="simulation-control">
                  <div className="allocation-copy">
                    <b>仓位情景试算</b>
                    <span>拖动目标仓位，比较相同市场假设下的账户结果</span>
                  </div>
                  <div className="slider-title compact-allocation-title">
                    <span>
                      <SlidersHorizontal size={14} />
                      目标风险资产仓位
                    </span>
                    <div className="compact-allocation-values">
                      <b>{Number(allocation.toFixed(1))}%</b>
                      <span className="compact-allocation-separator">·</span>
                      <span>
                        {Math.abs(result.riskyDelta) < 0.005
                          ? '投入不变'
                          : result.riskyDelta > 0
                            ? '投入增加'
                            : '投入减少'}{' '}
                        <strong>
                          ¥{money(Math.abs(result.riskyDelta), false)}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="allocation-slider-wrap">
                    <div
                      className="allocation-slider-value"
                      style={{
                        left: `${allocation}%`,
                        transform: `translateX(-${allocation}%)`,
                      }}
                      aria-hidden="true"
                    >
                      {Number(allocation.toFixed(1))}%
                    </div>
                    <Slider
                      value={[allocation]}
                      min={0}
                      max={100}
                      step={5}
                      aria-label="目标风险资产仓位情景试算"
                      onValueChange={(v) =>
                        setAllocation(Array.isArray(v) ? v[0] : v)
                      }
                    />
                  </div>
                  <div className="slider-labels">
                    <span>0% · 全部现金</span>
                    <button onClick={() => setAllocation(currentAllocation)}>
                      当前实际 {currentAllocation.toFixed(1)}%{' '}
                      <RotateCcw size={11} />
                    </button>
                    <span>100%</span>
                  </div>
                </div>
                <div className="forecast-summary">
                  <div>
                    <span>模拟期末资产</span>
                    <strong>¥{money(result.end, false)}</strong>
                  </div>
                  <div>
                    <span>{scenarioLabels[scenario]}下的变化</span>
                    <strong className={result.pnl >= 0 ? 'up' : 'down'}>
                      {result.pnl >= 0 ? '+' : ''}
                      {money(result.pnl)}
                      <small>
                        ({result.percent >= 0 ? '+' : ''}
                        {result.percent.toFixed(2)}%)
                      </small>
                    </strong>
                  </div>
                  <button onClick={() => setDialog('method')}>
                    <CircleHelp size={13} />
                    查看假设
                  </button>
                </div>
              </section>
            </div>
            <ValuationZonePanel
              account={account}
              onChange={updateAccount}
              onSimulate={(holding) => {
                const index = account.holdings.findIndex(
                  (item) => item.id === holding.id,
                );
                setSelected(index);
                setNotice(
                  `已选择${holding.name}，可在下方调整组合目标仓位并比较情景。`,
                );
                document
                  .getElementById('simulation')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
            <StrategyWorkbench
              account={account}
              allocation={allocation}
              days={days}
              scenario={scenario}
              deposit={deposit}
              onSave={save}
            />
            <StrategistSpotlight />
            <section className="lower-grid health-merged-events">
              <div className="panel events-panel" id="events">
                <div className="panel-heading">
                  <h2>
                    <Radio size={17} />
                    事件雷达 <span className="count-pill">{events.length}</span>
                  </h2>
                  <span className="muted-small">与你的持仓有关 · 演示</span>
                </div>
                {events.map((e, i) => (
                  <button
                    className="event-row"
                    key={e.title}
                    onClick={() => {
                      setEventIndex(i);
                      setDialog('event');
                    }}
                  >
                    <span className={'event-icon event-' + i}>
                      <e.icon size={17} />
                    </span>
                    <div>
                      <div className="event-title">{e.title}</div>
                      <div className="event-meta">
                        <span>{e.type}</span>
                        <span>关联：{e.asset}</span>
                      </div>
                    </div>
                    <span className="event-time">{e.time}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </section>
            <footer className="page-footer">
              <span>
                <ShieldCheck size={12} />
                本机账户 · 手动参考价 · 未接入真实交易
              </span>
              <span>OwlMate / Make room for perspective.</span>
            </footer>
          </div>
          {chatOpen ? (
            <aside className="agent-panel" aria-label="OwlMate 投资助手">
              <div className="agent-heading">
                <span className="agent-logo">
                  <Glasses size={23} />
                </span>
                <div>
                  <h2>
                    OwlMate<span>AI</span>
                  </h2>
                  <p>
                    <i />
                    你的投资思考伙伴
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label="收起投资助手"
                  onClick={() => setChatOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="agent-context">
                <Layers3 size={13} />
                正在关注：{focusName}
                <span>演示模式</span>
              </div>
              <div className="agent-scroll">
                <div className="agent-intro">
                  <span className="eyebrow">
                    <Sparkles size={12} /> PORTFOLIO BRIEF
                  </span>
                  <h3>
                    让每一步决策，
                    <br />
                    都有据可循。
                  </h3>
                  <p>
                    {selected < 0
                      ? '我会结合你录入的持仓和现金分析组合。修改持仓后，模拟计算和当前观察会同步更新。'
                      : `已切换到${focusName}。中央走势展示该标的的示意路径，下方仓位试算仍以整个账户为基数。`}
                  </p>
                </div>
                <div className="agent-insight">
                  <span className="insight-label">
                    <span className="small-dot" />
                    当前观察
                  </span>
                  <p>
                    {triggered
                      ? '已触发演示事件，请结合当前持仓重新评估。'
                      : concentration}
                  </p>
                  <div className="source-chips">
                    <span>持仓结构</span>
                    <span>画像约束</span>
                    <span>情景假设</span>
                  </div>
                </div>
                <div className="recommendation">
                  <div className="recommend-heading">
                    <Sparkles size={15} />
                    <b>仓位试算</b>
                    <span>可调整</span>
                  </div>
                  <div className="position-change">
                    <div>
                      <span>当前仓位</span>
                      <strong>
                        {currentAllocation.toFixed(1)}
                        <small>%</small>
                      </strong>
                    </div>
                    <ArrowRight size={22} />
                    <div>
                      <span>模拟仓位</span>
                      <strong>
                        {allocation}
                        <small>%</small>
                      </strong>
                    </div>
                  </div>
                  <div className="position-track">
                    <span style={{ width: `${allocation}%` }} />
                    <i style={{ left: `${currentAllocation}%` }} />
                  </div>
                  <div className="recommend-detail">
                    <span>模拟现金</span>
                    <b>¥{money(result.cash, false)}</b>
                  </div>
                  <div className="recommend-detail">
                    <span>风险资产调整额</span>
                    <b>
                      {result.riskyDelta >= 0 ? '+' : '−'}¥
                      {money(Math.abs(result.riskyDelta), false)}
                    </b>
                  </div>
                  <p className="recommend-note">
                    演示配置，非凯利计算。调整后各风险资产按原比例分配。
                  </p>
                  <button className="save-button" onClick={save}>
                    <Bookmark size={15} />
                    保存方案
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="ask-prompts">
                  <span>继续探索</span>
                  {['为什么建议降低仓位？', '如果市场下跌呢？'].map((q) => (
                    <button key={q} onClick={() => ask(q)} disabled={pending}>
                      {q}
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
                <div className="chat-history" aria-live="polite">
                  {messages.map((m, i) => (
                    <div className={'message ' + m.role} key={i}>
                      {m.role === 'assistant' && (
                        <span className="message-author">
                          <Glasses size={15} />
                          OwlMate · 演示回复
                        </span>
                      )}
                      <p>{m.text}</p>
                    </div>
                  ))}
                  {pending && (
                    <div className="thinking">
                      <i />
                      <i />
                      <i />
                      <span>正在整理试算…</span>
                    </div>
                  )}
                  <div ref={chatEnd} />
                </div>
              </div>
              <form
                className="chat-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
              >
                <div className="composer-box">
                  <textarea
                    ref={inputRef}
                    aria-label="与 OwlMate 交流"
                    placeholder="问问 OwlMate，或试试“仓位调到 60%”"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        ask(input);
                      }
                    }}
                    rows={2}
                  />
                  <div>
                    <span>
                      <Sparkles size={12} />
                      结合当前组合回答
                    </span>
                    <button
                      type="submit"
                      aria-label="发送消息"
                      disabled={!input.trim() || pending}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                </div>
                <p>演示回复与假设推演，不构成实际投资建议</p>
              </form>
            </aside>
          ) : (
            <button
              className="open-chat primary-button"
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare size={18} />
              OwlMate 助手
            </button>
          )}
        </main>
      </div>
      {notice && (
        <output className="notice">
          <Check size={17} />
          {notice}
        </output>
      )}
      <Dialog
        open={dialog !== null}
        onOpenChange={(v) => {
          if (!v) setDialog(null);
        }}
      >
        <DialogContent
          className={'owl-dialog ' + (dialog === 'chart' ? 'chart-dialog' : '')}
        >
          <DialogTitle>
            {
              (
                {
                  profile: '我的投资画像',
                  plan: '新资金配置试算',
                  saved: '已保存的试算方案',
                  chart: `${focusName} · 未来情景推演`,
                  event: '事件详情',
                  method: '数据与模拟说明',
                } as Record<string, string>
              )[dialog ?? 'method']
            }
          </DialogTitle>
          <DialogDescription>
            {dialog === 'chart'
              ? '历史与未来均为示意，非真实行情或预测。'
              : 'OwlMate 首页演示 · 所有资产、行情和事件均为示例'}
          </DialogDescription>
          {dialog === 'profile' && (
            <div className="dialog-body">
              {profile && (
                <div className="profile-summary">
                  <div>
                    <span>用户</span>
                    <b>{profile.username}</b>
                    <small>{profile.phoneMasked}</small>
                  </div>
                  <div>
                    <span>画像类型</span>
                    <b>{profile.riskLabel}</b>
                    <small>建议演示仓位 {profile.recommendedAllocation}%</small>
                  </div>
                  <div>
                    <span>投资经验</span>
                    <b>{profile.experience}</b>
                    <small>{profile.ageRange}</small>
                  </div>
                  <div>
                    <span>资金约束</span>
                    <b>回撤 {profile.maxDrawdown}</b>
                    <small>{profile.liquidity}流动性</small>
                  </div>
                </div>
              )}
              <label>
                投资目标
                <select value={risk} onChange={(e) => setRisk(e.target.value)}>
                  <option>稳健增值</option>
                  <option>长期增长</option>
                  <option>养老准备</option>
                  <option>子女教育</option>
                  <option>短期资金管理</option>
                </select>
              </label>
              <label>
                资金可投资期限
                <select
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                >
                  <option>1 年以内</option>
                  <option>1–3 年</option>
                  <option>3–5 年</option>
                  <option>5 年以上</option>
                </select>
              </label>
              <div className="info-box">
                当前风险资产仓位：{currentAllocation.toFixed(1)}%<br />
                账户基数：¥{money(summary.total, false)}
                <br />
                画像只影响演示建议，不改变真实持仓。
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setAllocation(
                    risk === '短期资金管理' || months === '1 年以内'
                      ? 35
                      : risk === '长期增长' && months === '5 年以上'
                        ? 75
                        : 55,
                  );
                  setDialog(null);
                  setNotice('画像偏好已更新，对应的演示仓位已载入试算。');
                }}
              >
                应用到演示方案
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {dialog === 'plan' && (
            <form
              className="dialog-body"
              onSubmit={(e) => {
                e.preventDefault();
                const amount = Number(depositDraft);
                if (!Number.isFinite(amount) || amount < 0 || amount > 10000000)
                  return;
                setDeposit(amount);
                setDialog(null);
                setNotice(
                  amount > 0
                    ? `已加入 ¥${money(amount, false)} 模拟资金，期末资产、模拟现金和底部方案对比已更新。`
                    : '已清除新增模拟资金，试算已恢复为当前账户基数。',
                );
              }}
            >
              <div className="plan-flow">
                <span>
                  <b>1</b>输入模拟投入
                </span>
                <i />
                <span>
                  <b>2</b>重算仓位与现金
                </span>
                <i />
                <span>
                  <b>3</b>满意后保存方案
                </span>
              </div>
              <label>
                新增模拟资金（元）
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="100"
                  value={depositDraft}
                  onChange={(e) => setDepositDraft(e.target.value)}
                  required
                />
              </label>
              <div className="amount-options">
                {[20000, 50000, 100000].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={depositDraft === String(n) ? 'chosen' : ''}
                    onClick={() => setDepositDraft(String(n))}
                  >
                    {n / 10000} 万元
                  </button>
                ))}
              </div>
              <div className="info-box">
                这笔金额只加入模拟计算，不会修改“我的持仓”和真实现金。提交后会更新未来走势、模拟期末资产、模拟现金与底部方案对比；需要保留结果时，再点击“保存方案”。
              </div>
              <button className="primary-button" type="submit">
                应用到当前试算
                <ArrowRight size={15} />
              </button>
            </form>
          )}
          {dialog === 'chart' && (
            <Projection
              allocation={allocation}
              days={days}
              scenario={scenario}
              selected={selected}
              deposit={deposit}
              account={simulationAccount}
              focusName={focusName}
              historySeries={historySeries}
              large
            />
          )}
          {dialog === 'event' && (
            <div className="dialog-body">
              <span className="purple-tag">
                虚构演示事件 · {activeEvent.time}
              </span>
              <h3>{activeEvent.title}</h3>
              <p>{activeEvent.desc}</p>
              <div className="info-box">
                关联资产：{activeEvent.asset}
                <br />
                证据状态：演示内容，未核实真实市场信息
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setTriggered(true);
                  setDialog(null);
                  ask(activeEvent.question);
                }}
              >
                让 OwlMate 分析影响
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {dialog === 'method' && (
            <div className="dialog-body">
              <p>
                行情快照、历史曲线和事件为虚构示例。资产与浮动盈亏按你维护的数量、成本和参考现价计算。未来图为归一化情景示意，阴影不是概率区间。
              </p>
              <div className="info-box">
                20 日风险资产收益假设：上涨 +8%、震荡 +1.5%、下跌
                −10%。其他周期按复利缩放。现金收益假设为零，模拟换仓成本为调整金额的
                0.1%。
              </div>
              <p>
                组合当前回撤按本机记录的净值快照计算：每次保存持仓时记录一次总资产，回撤为当前总资产相对已记录峰值的跌幅。首次打开时只有一条记录，因此回撤为
                0%。
              </p>
              <p>
                数字试算基于整个组合，风险资产按现有权重同比例调整。{days} 日
                {scenarioLabels[scenario]}
                下，维持现有持仓且将新增资金保留为现金的模拟期末资产为 ¥
                {money(original.end, false)}。
              </p>
              <p>
                凯利仓位、EV 评分、蒙特卡洛概率和真实 AI
                尚未接入。对话使用预设意图响应；策略、画像和资讯仍需后续验证。
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
