import type { CustomStrategy } from './investment-strategies';

export type StrategyEdits = {
  name: string;
  description: string;
  assetScope: string;
  rebalance: string;
  entryRules: string;
  riskControls: string;
};

function field(value: string, label: string, maximum: number) {
  const clean = value.trim();
  if (!clean || clean.length > maximum)
    throw new Error(`${label}需填写 1–${maximum} 个字符。`);
  return clean;
}
function rules(value: string, label: string) {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (
    !lines.length ||
    lines.length > 8 ||
    lines.some((line) => line.length > 240)
  ) {
    throw new Error(`${label}需填写 1–8 条，每条不超过 240 字。`);
  }
  return lines;
}
export function editPersonalStrategy(
  original: CustomStrategy,
  edits: StrategyEdits,
): CustomStrategy {
  if (original.origin === 'community')
    throw new Error('收藏的社区策略保留来源，请创建自己的策略后编辑。');
  const description = field(edits.description, '策略描述', 1200);
  return {
    ...original,
    name: field(edits.name, '策略名称', 40),
    description,
    summary:
      description.length > 86 ? `${description.slice(0, 86)}…` : description,
    assetScope: field(edits.assetScope, '适用资产', 100),
    rebalance: field(edits.rebalance, '复核频率', 100),
    entryRules: rules(edits.entryRules, '入场规则'),
    riskControls: rules(edits.riskControls, '风险控制'),
  };
}
export function upsertPersonalStrategy(
  list: CustomStrategy[],
  strategy: CustomStrategy,
) {
  const existing = list.find((item) => item.id === strategy.id);
  if (existing?.origin === 'community')
    throw new Error('不能覆盖收藏策略的来源。');
  if (!existing && list.length >= 30)
    throw new Error('策略库已达到 30 条上限，请先整理现有策略。');
  return existing
    ? list.map((item) =>
        item.id === strategy.id
          ? { ...strategy, createdAt: existing.createdAt }
          : item,
      )
    : [strategy, ...list];
}
