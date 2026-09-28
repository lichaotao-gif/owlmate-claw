export type AgentCreditStatus = '已完成' | '失败';

export type AgentCreditEntry = {
  id: string;
  createdAt: string;
  agentName: string;
  feature: string;
  action: string;
  cost: number;
  status: AgentCreditStatus;
};

export const AGENT_CREDITS_KEY = 'owlmate-agent-credit-history-v1';
export const AGENT_CREDITS_EVENT = 'owlmate-agent-credit-history-change';
export const AGENT_CREDIT_ALLOWANCE = 5000;

const demoEntries: AgentCreditEntry[] = [
  {
    id: 'credit-demo-1',
    createdAt: '2026-09-28T09:42:00.000Z',
    agentName: 'OwlMate 策略 Agent',
    feature: '策略广场',
    action: '生成红利低波策略草案',
    cost: 48,
    status: '已完成',
  },
  {
    id: 'credit-demo-2',
    createdAt: '2026-09-27T14:18:00.000Z',
    agentName: '组合分析 Agent',
    feature: '投资工作台',
    action: '分析组合集中度与下跌情景',
    cost: 24,
    status: '已完成',
  },
  {
    id: 'credit-demo-3',
    createdAt: '2026-09-26T10:06:00.000Z',
    agentName: '风险预算 Agent',
    feature: '估值区间',
    action: '解释目标区间与风险预算依据',
    cost: 18,
    status: '已完成',
  },
  {
    id: 'credit-demo-4',
    createdAt: '2026-09-25T16:32:00.000Z',
    agentName: '多 Agent 复核',
    feature: '实验室',
    action: '复核 ETF 轮动实验策略条件',
    cost: 64,
    status: '已完成',
  },
  {
    id: 'credit-demo-5',
    createdAt: '2026-09-24T11:20:00.000Z',
    agentName: 'OwlMate 策略 Agent',
    feature: '新建实验',
    action: '生成数字货币轮动策略草案',
    cost: 48,
    status: '已完成',
  },
  {
    id: 'credit-demo-6',
    createdAt: '2026-09-23T08:55:00.000Z',
    agentName: '组合分析 Agent',
    feature: '投资工作台',
    action: '请求超时，未扣除积分',
    cost: 0,
    status: '失败',
  },
];

function isAgentCreditEntry(value: unknown): value is AgentCreditEntry {
  if (!value || typeof value !== 'object') return false;
  const item = value as AgentCreditEntry;
  return (
    typeof item.id === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.agentName === 'string' &&
    typeof item.feature === 'string' &&
    typeof item.action === 'string' &&
    Number.isFinite(item.cost) &&
    item.cost >= 0 &&
    (item.status === '已完成' || item.status === '失败')
  );
}

export function readAgentCreditHistory(raw: string | null) {
  if (!raw) return demoEntries;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isAgentCreditEntry)) {
    throw new Error('Invalid agent credit history');
  }
  return parsed.slice(0, 200);
}

export function recordAgentCreditUsage(
  entry: Omit<AgentCreditEntry, 'id' | 'createdAt'>,
) {
  const current = readAgentCreditHistory(
    localStorage.getItem(AGENT_CREDITS_KEY),
  );
  const next: AgentCreditEntry[] = [
    {
      ...entry,
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `credit-${Date.now()}`,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ].slice(0, 200);
  localStorage.setItem(AGENT_CREDITS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(AGENT_CREDITS_EVENT));
}

export function agentCreditTotal(entries: AgentCreditEntry[]) {
  return entries.reduce((total, entry) => total + entry.cost, 0);
}
