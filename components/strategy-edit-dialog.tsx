'use client';

import { useState, type SubmitEvent } from 'react';
import { Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CustomStrategy } from '@/lib/investment-strategies';
import {
  editPersonalStrategy,
  type StrategyEdits,
} from '@/lib/strategy-library';

export function StrategyEditDialog({
  strategy,
  onClose,
  onSave,
}: {
  strategy: CustomStrategy;
  onClose: () => void;
  onSave: (strategy: CustomStrategy) => void;
}) {
  const [values, setValues] = useState<StrategyEdits>(() => ({
    name: strategy.name,
    description: strategy.description,
    assetScope: strategy.assetScope,
    rebalance: strategy.rebalance,
    entryRules: strategy.entryRules.join('\n'),
    riskControls: strategy.riskControls.join('\n'),
  }));
  const [error, setError] = useState('');
  function change(key: keyof StrategyEdits, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  }
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      onSave(editPersonalStrategy(strategy, values));
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : '保存未完成，请重试。',
      );
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="owl-dialog my-strategy-edit-dialog">
        <DialogTitle>编辑策略</DialogTitle>
        <DialogDescription>
          修改会更新策略库，已创建实验的历史记录保持不变。
        </DialogDescription>
        <form onSubmit={submit} className="my-strategy-edit-form">
          <label>
            策略名称
            <input
              value={values.name}
              maxLength={40}
              required
              onChange={(event) => change('name', event.target.value)}
            />
          </label>
          <label>
            策略描述
            <textarea
              rows={3}
              value={values.description}
              maxLength={1200}
              required
              onChange={(event) => change('description', event.target.value)}
            />
          </label>
          <div className="my-strategy-edit-pair">
            <label>
              适用资产
              <input
                value={values.assetScope}
                maxLength={100}
                required
                onChange={(event) => change('assetScope', event.target.value)}
              />
            </label>
            <label>
              复核频率
              <input
                value={values.rebalance}
                maxLength={100}
                required
                onChange={(event) => change('rebalance', event.target.value)}
              />
            </label>
          </div>
          <label>
            候选与入场规则
            <textarea
              rows={4}
              value={values.entryRules}
              maxLength={1930}
              required
              onChange={(event) => change('entryRules', event.target.value)}
            />
            <small>每行一条，最多 8 条，每条 240 字。</small>
          </label>
          <label>
            风险控制
            <textarea
              rows={4}
              value={values.riskControls}
              maxLength={1930}
              required
              onChange={(event) => change('riskControls', event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="strategy-agent-error">
              {error}
            </p>
          )}
          <div className="my-strategy-edit-actions">
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="strategy-create-submit">
              <Save size={16} />
              保存修改
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
