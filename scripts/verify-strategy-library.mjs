import test from 'node:test';
import assert from 'node:assert/strict';
import {
  editPersonalStrategy,
  upsertPersonalStrategy,
} from '../lib/strategy-library.ts';
import { runStrategyGeneration } from '../lib/strategy-generation.ts';

const strategy = {
  id: 'personal-abcdef01',
  name: '原策略',
  description: '每周检查 ETF 趋势及回撤控制。',
  summary: '原摘要',
  tags: ['个人策略'],
  assetScope: 'ETF',
  rebalance: '每周',
  entryRules: ['收盘后核对趋势'],
  riskControls: ['核对最大回撤'],
  createdAt: '2026-10-27T08:00:00.000Z',
  origin: 'personal',
};
const edits = {
  name: '更新策略',
  description: '每月检查自选 ETF 的趋势及回撤。',
  assetScope: '自选 ETF',
  rebalance: '每月',
  entryRules: '核对趋势\n\n收盘后确认',
  riskControls: '核对回撤',
};

await test('editing keeps experiment references and creation time stable without mutating history', () => {
  const changed = editPersonalStrategy(strategy, edits);
  assert.equal(changed.id, strategy.id);
  assert.equal(changed.createdAt, strategy.createdAt);
  assert.equal(changed.name, '更新策略');
  assert.deepEqual(changed.entryRules, ['核对趋势', '收盘后确认']);
  assert.equal(strategy.name, '原策略');
});
await test('saving an edit replaces exactly one record and repeated saves do not duplicate it', () => {
  const changed = editPersonalStrategy(strategy, edits);
  const second = { ...strategy, id: 'personal-abcdef02' };
  const list = upsertPersonalStrategy([strategy, second], changed);
  assert.equal(list.length, 2);
  assert.equal(list[1], second);
  assert.equal(upsertPersonalStrategy(list, changed).length, 2);
  assert.equal(
    upsertPersonalStrategy(list, { ...changed, createdAt: 'new' })[0].createdAt,
    strategy.createdAt,
  );
});
await test('capacity limits new strategies while still allowing edits at capacity', () => {
  const list = Array.from({ length: 30 }, (_, index) => ({
    ...strategy,
    id: `personal-item-${index}`,
  }));
  assert.throws(() => upsertPersonalStrategy(list, strategy), /30/);
  assert.equal(
    upsertPersonalStrategy(list, { ...list[0], name: '修改' }).length,
    30,
  );
});
await test('community provenance and bounded nonempty rules are protected', () => {
  const community = { ...strategy, origin: 'community' };
  assert.throws(() => editPersonalStrategy(community, edits));
  assert.throws(() => upsertPersonalStrategy([community], strategy));
  for (const bad of [
    { name: '' },
    { description: 'x'.repeat(1201) },
    { entryRules: '' },
    { entryRules: Array(9).fill('规则').join('\n') },
    { riskControls: 'x'.repeat(241) },
  ]) {
    assert.throws(() => editPersonalStrategy(strategy, { ...edits, ...bad }));
  }
});
await test('generation stages advance in order and complete only once', () => {
  const jobs = [],
    steps = [];
  let completed = 0;
  runStrategyGeneration(
    (step) => steps.push(step),
    () => completed++,
    (callback, delay) => {
      jobs.push({ callback, delay });
      return () => {};
    },
  );
  for (const job of jobs.toSorted((a, b) => a.delay - b.delay)) job.callback();
  jobs.at(-1).callback();
  assert.deepEqual(steps, [0, 1, 2]);
  assert.equal(completed, 1);
});
await test('cancelling generation clears timers and suppresses any queued completion', () => {
  const callbacks = [],
    steps = [];
  let cancelled = 0,
    completed = false;
  const cancel = runStrategyGeneration(
    (step) => steps.push(step),
    () => {
      completed = true;
    },
    (callback) => {
      callbacks.push(callback);
      return () => cancelled++;
    },
  );
  cancel();
  callbacks.forEach((callback) => callback());
  assert.equal(cancelled, 3);
  assert.equal(completed, false);
  assert.deepEqual(steps, [0]);
});
