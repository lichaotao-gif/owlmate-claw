export type StrategistStyle = '稳健' | '均衡' | '成长' | '轮动';

export type Strategist = {
  id: string;
  name: string;
  role: string;
  style: StrategistStyle;
  avatar: string;
  accent: string;
  thesis: string;
  return90: number;
  benchmark: number;
  maxDrawdown: number;
  riskAllocation: number;
  cash: number;
  updated: string;
  latestAction: string;
  path: number[];
  holdings: {
    name: string;
    code: string;
    weight: number;
    returnRate: number;
  }[];
};

export const strategists: Strategist[] = [
  {
    id: 'beichen',
    name: '北辰',
    role: '防守型配置 Agent',
    style: '稳健',
    avatar: '/avatars/beichen.jpg',
    accent: '#72d1c0',
    thesis: '优先控制回撤，在黄金、红利资产与现金之间寻找稳定性。',
    return90: 6.8,
    benchmark: 3.9,
    maxDrawdown: -2.7,
    riskAllocation: 82,
    cash: 18,
    updated: '今天 14:20',
    latestAction: '红利低波提高 3%，现金降至 18%',
    path: [
      100, 101, 100.6, 102.2, 102.8, 102.1, 103.7, 104.5, 104.1, 105.8, 106.8,
    ],
    holdings: [
      { name: '红利低波 ETF', code: '512890', weight: 28, returnRate: 7.4 },
      { name: '黄金 ETF', code: '518880', weight: 22, returnRate: 8.1 },
      { name: '沪深 300 ETF', code: '510300', weight: 20, returnRate: 5.2 },
      { name: '中短债基金', code: '稳健仓', weight: 12, returnRate: 1.8 },
    ],
  },
  {
    id: 'chihu',
    name: '赤狐',
    role: '趋势成长 Agent',
    style: '成长',
    avatar: '/avatars/chihu.jpg',
    accent: '#ef9b9d',
    thesis: '跟随强势趋势，但在波动抬升时主动收缩单一赛道暴露。',
    return90: 14.6,
    benchmark: 8.7,
    maxDrawdown: -7.9,
    riskAllocation: 86,
    cash: 14,
    updated: '今天 13:48',
    latestAction: '纳指 ETF 从 42% 降至 36%',
    path: [100, 102, 101, 104, 106, 104, 109, 108, 112, 111, 114.6],
    holdings: [
      { name: '纳指 ETF', code: '513100', weight: 36, returnRate: 18.5 },
      { name: '半导体 ETF', code: '512480', weight: 24, returnRate: 15.2 },
      { name: '创业板 ETF', code: '159915', weight: 16, returnRate: 9.8 },
      { name: '黄金 ETF', code: '518880', weight: 10, returnRate: 6.1 },
    ],
  },
  {
    id: 'shanhai',
    name: '山海',
    role: '价值均衡 Agent',
    style: '均衡',
    avatar: '/avatars/shanhai.jpg',
    accent: '#7eb7ed',
    thesis: '把估值、盈利质量与资产分散放在同一套决策框架中。',
    return90: 9.2,
    benchmark: 5.6,
    maxDrawdown: -4.5,
    riskAllocation: 84,
    cash: 16,
    updated: '今天 11:35',
    latestAction: '沪深 300 提高 4%，消费保持观察',
    path: [
      100, 100.5, 102, 101.4, 103.6, 104.2, 103.8, 105.9, 106.4, 108.2, 109.2,
    ],
    holdings: [
      { name: '沪深 300 ETF', code: '510300', weight: 30, returnRate: 10.1 },
      { name: '红利 ETF', code: '510880', weight: 20, returnRate: 8.7 },
      { name: '消费 ETF', code: '159928', weight: 12, returnRate: 5.3 },
      { name: '黄金 ETF', code: '518880', weight: 10, returnRate: 7.2 },
      { name: '中短债基金', code: '稳健仓', weight: 12, returnRate: 1.9 },
    ],
  },
  {
    id: 'chaoxi',
    name: '潮汐',
    role: '行业轮动 Agent',
    style: '轮动',
    avatar: '/avatars/chaoxi.jpg',
    accent: '#b89aef',
    thesis: '根据相对强弱切换行业，限制换手并保留明确的退出规则。',
    return90: 12.1,
    benchmark: 6.4,
    maxDrawdown: -6.8,
    riskAllocation: 82,
    cash: 18,
    updated: '昨天 15:02',
    latestAction: '医药降至 8%，增加新能源配置',
    path: [
      100, 101.8, 103.6, 102.4, 106, 104.8, 107.2, 109.5, 108.2, 110.9, 112.1,
    ],
    holdings: [
      { name: '半导体 ETF', code: '512480', weight: 27, returnRate: 16.8 },
      { name: '新能源 ETF', code: '516160', weight: 23, returnRate: 12.4 },
      { name: '通信 ETF', code: '515880', weight: 18, returnRate: 10.2 },
      { name: '医药 ETF', code: '512010', weight: 8, returnRate: 3.1 },
      { name: '沪深 300 ETF', code: '510300', weight: 6, returnRate: 5.4 },
    ],
  },
  {
    id: 'changfeng',
    name: '长风',
    role: '全球配置 Agent',
    style: '均衡',
    avatar: '/avatars/changfeng.jpg',
    accent: '#e2bd7d',
    thesis: '跨市场分散风险，用再平衡纪律替代对单一市场的方向押注。',
    return90: 8.7,
    benchmark: 5.2,
    maxDrawdown: -3.9,
    riskAllocation: 88,
    cash: 12,
    updated: '昨天 10:18',
    latestAction: '全球科技获利再平衡至黄金',
    path: [
      100, 100.8, 101.9, 102.8, 102.2, 104.1, 105.6, 105.1, 106.9, 107.5, 108.7,
    ],
    holdings: [
      { name: '标普 500 ETF', code: '513500', weight: 26, returnRate: 11.8 },
      { name: '纳指 ETF', code: '513100', weight: 22, returnRate: 14.1 },
      { name: '沪深 300 ETF', code: '510300', weight: 14, returnRate: 6.2 },
      { name: '黄金 ETF', code: '518880', weight: 12, returnRate: 8.4 },
      { name: '中短债基金', code: '稳健仓', weight: 14, returnRate: 2.1 },
    ],
  },
  {
    id: 'shouyeren',
    name: '守夜人',
    role: '风险预算 Agent',
    style: '稳健',
    avatar: '/avatars/shouyeren.jpg',
    accent: '#8ca5c9',
    thesis: '先定义可承受损失，再动态调整风险资产与现金的比例。',
    return90: 5.9,
    benchmark: 3.7,
    maxDrawdown: -1.9,
    riskAllocation: 70,
    cash: 30,
    updated: '前天 16:10',
    latestAction: '波动升高，现金提高至 30%',
    path: [
      100, 100.4, 101.2, 100.9, 102, 102.7, 102.4, 103.6, 104.2, 105.1, 105.9,
    ],
    holdings: [
      { name: '红利低波 ETF', code: '512890', weight: 22, returnRate: 6.8 },
      { name: '黄金 ETF', code: '518880', weight: 16, returnRate: 7.9 },
      { name: '中短债基金', code: '稳健仓', weight: 12, returnRate: 1.9 },
      { name: '沪深 300 ETF', code: '510300', weight: 10, returnRate: 4.8 },
      { name: '货币基金', code: '流动性仓', weight: 10, returnRate: 1.2 },
    ],
  },
];

export const featuredStrategists = strategists.slice(0, 3);
