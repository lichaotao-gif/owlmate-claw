'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Library, TrendingUp } from 'lucide-react';
import {
  CUSTOM_STRATEGIES_EVENT,
  CUSTOM_STRATEGIES_KEY,
  defaultInvestmentStrategyId,
  getInvestmentStrategy,
  investmentStrategies,
  readCustomStrategies,
  strategySignal,
  type CustomStrategy,
} from '@/lib/investment-strategies';

export function StrategySelector({
  value,
  focusCode,
  focusName,
  onChange,
}: {
  value: string;
  focusCode?: string;
  focusName: string;
  onChange: (value: string) => void;
}) {
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>(
    [],
  );
  useEffect(() => {
    function load() {
      try {
        setCustomStrategies(
          readCustomStrategies(localStorage.getItem(CUSTOM_STRATEGIES_KEY)),
        );
      } catch {
        setCustomStrategies([]);
      }
    }
    load();
    window.addEventListener(CUSTOM_STRATEGIES_EVENT, load);
    return () => window.removeEventListener(CUSTOM_STRATEGIES_EVENT, load);
  }, []);
  const custom = customStrategies.find((strategy) => strategy.id === value);
  const active = custom
    ? { type: custom.origin === 'community' ? '社区引用' : '我的策略' }
    : getInvestmentStrategy(
        investmentStrategies.some((strategy) => strategy.id === value)
          ? (value as (typeof investmentStrategies)[number]['id'])
          : defaultInvestmentStrategyId,
      );
  const signal = strategySignal(value, focusCode, customStrategies);
  return (
    <div className="strategy-selector">
      <div className="strategy-selector-control">
        <span className="strategy-selector-icon" aria-hidden="true">
          <Library size={15} />
        </span>
        <label htmlFor="simulation-strategy">
          <small>{focusName}当前采用</small>
          <select
            id="simulation-strategy"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          >
            <optgroup label="情景分析基线">
              {investmentStrategies.map((strategy) => (
                <option value={strategy.id} key={strategy.id}>
                  {strategy.shortName}
                </option>
              ))}
            </optgroup>
            {customStrategies.length > 0 && (
              <optgroup label="我的策略">
                {customStrategies.map((strategy) => (
                  <option value={strategy.id} key={strategy.id}>
                    {strategy.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <span className="strategy-type">{active.type}</span>
      </div>
      <output className={`strategy-current-signal ${signal.tone}`}>
        {signal.tone === 'positive' || signal.tone === 'personal' ? (
          <CheckCircle2 size={15} />
        ) : (
          <TrendingUp size={15} />
        )}
        <span>
          <b>{signal.headline}</b>
          <small>{signal.detail}</small>
        </span>
      </output>
    </div>
  );
}
