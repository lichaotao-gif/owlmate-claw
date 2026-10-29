export type StrategyGuideMode = 'lab' | 'market';

export const strategyGuideSteps = {
  lab: [
    {
      title: '创建实验',
      body: '点击右上角「新建实验」，为研究想法命名。每个实验的策略、资产和操作记录相互独立。',
      short: '建立独立通道',
    },
    {
      title: '选择策略',
      body: '选择投资类型，再挑选对应策略。也可以用文字或语音创建规则，并检查入场条件、复核频率和风险控制。',
      short: '核对规则与风控',
    },
    {
      title: '配置资产',
      body: '选择现金、持仓或混合资产作为起点，填写初始金额与持仓信息，确认后启动实验。',
      short: '设置初始资金',
    },
    {
      title: '观察与复盘',
      body: '查看净值曲线、持仓 K 线和操作日志。需要调整时暂停实验，复核规则后再继续；结果仅用于研究。',
      short: '回看曲线与记录',
    },
  ],
  market: [
    {
      title: '添加策略',
      body: '点击「创建策略」，用文字或语音描述想法；广场有社区内容时，也可以先查看并引用规则。',
      short: '创建或引用规则',
    },
    {
      title: '检查规则',
      body: '核对适用资产、候选条件和风险控制，再保存到「我的策略」。个人策略可以继续编辑。',
      short: '保存到我的策略',
    },
    {
      title: '创建实验',
      body: '从策略卡片选择「进入回测」或「创建策略实验」，将选中的策略带入实验室。',
      short: '带入选中的策略',
    },
    {
      title: '配置并观察',
      body: '填写初始资金与持仓，运行后查看净值和操作记录。测试入口不会直接生成通用历史回测结果。',
      short: '查看结果与复盘',
    },
  ],
} as const;

export function nextGuideStep(current: number, direction: -1 | 1) {
  return Math.max(0, Math.min(3, current + direction));
}

export function pickFeaturedStrategy<T extends { featured?: boolean }>(
  items: readonly T[],
): T | undefined {
  return items.find((item) => item.featured) ?? items[0];
}
