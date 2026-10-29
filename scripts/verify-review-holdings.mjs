import test from 'node:test';
import assert from 'node:assert/strict';
import { collectReviewHoldings, trustedReviewParent } from '../lib/review-holdings.ts';

await test('only trusted parent origins receive holdings', () => {
  const own = 'https://lab.example.com';
  assert.equal(trustedReviewParent(own, own, undefined, false), true);
  assert.equal(trustedReviewParent('http://localhost:3000', own, undefined, true), true);
  assert.equal(trustedReviewParent('http://localhost:3000', own, undefined, false), false);
  assert.equal(trustedReviewParent('https://console.example.com', own, 'https://console.example.com/', false), true);
  assert.equal(trustedReviewParent('https://evil.example.com', own, 'https://console.example.com', false), false);
  assert.equal(trustedReviewParent('https://console.example.com', own, 'https://console.example.com/untrusted-path', false), false);
  assert.equal(trustedReviewParent('https://console.example.com.evil.test', own, 'https://console.example.com', false), false);
});

await test('only nonzero securities and their names are exported', () => {
  const channels = [{ id: 'experiment-one', name: '趋势实验', assets: [
    { id: 'cash', kind: 'cash', name: '现金', amount: 50000 },
    { id: 'one', kind: 'security', name: '苹果', code: 'AAPL', amount: 30000 },
    { id: 'zero', kind: 'security', name: '零持仓', amount: 0 },
    { id: 'one', kind: 'security', name: '重复记录', amount: 100 },
  ], trades: [{ reason: 'private data' }] }];
  assert.deepEqual(collectReviewHoldings(channels), [{ id: 'experiment-one:one', name: '苹果', code: 'AAPL', experimentName: '趋势实验' }]);
  assert.equal(channels[0].assets.length, 4);
});

await test('the same security in different experiments remains distinguishable', () => {
  const asset = { id: 'aapl', kind: 'security', name: '苹果', code: 'AAPL', amount: 1 };
  assert.deepEqual(collectReviewHoldings([{ id: 'a', name: '实验一', assets: [asset] }, { id: 'b', name: '实验二', assets: [asset] }]).map((item) => item.experimentName), ['实验一', '实验二']);
});
