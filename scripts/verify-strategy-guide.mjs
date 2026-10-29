import test from 'node:test';
import assert from 'node:assert/strict';
import { nextGuideStep, pickFeaturedStrategy } from '../lib/strategy-guide.ts';

await test('an empty marketplace has no featured strategy to dereference', () => {
  assert.equal(pickFeaturedStrategy([]), undefined);
});

await test('a marketplace without a featured flag uses its first item without mutating it', () => {
  const items = Object.freeze([
    Object.freeze({ id: 'first' }),
    Object.freeze({ id: 'second' }),
  ]);
  assert.equal(pickFeaturedStrategy(items), items[0]);
  assert.equal(items.length, 2);
});

await test('an explicitly featured strategy takes precedence over the first item', () => {
  const items = [{ id: 'first' }, { id: 'featured', featured: true }];
  assert.equal(pickFeaturedStrategy(items), items[1]);
});

await test('guide navigation stays inside four steps in either direction', () => {
  let step = 0;
  for (let index = 0; index < 8; index++) step = nextGuideStep(step, 1);
  assert.equal(step, 3);
  assert.equal(nextGuideStep(1, 1), 2);
  for (let index = 0; index < 8; index++) step = nextGuideStep(step, -1);
  assert.equal(step, 0);
});
