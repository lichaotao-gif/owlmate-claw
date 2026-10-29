import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverStrategies } from '../lib/strategy-discovery.ts';
const items = [
 { id:'dividend-balance',title:'红利组合',authorName:'甲',description:'低波ETF',tags:['红利','低波'],price:0,referenceCount:2 },
 { id:'growth-pulse',title:'成长趋势',authorName:'乙',description:'跨市场',tags:['成长','趋势'],price:10,referenceCount:8 },
];
const options = { query:'', category:'全部', market:'全部市场', access:'全部获取方式', sort:'精选顺序' };
await test('strategy filters intersect category, market, access and query', () => {
 assert.equal(discoverStrategies(items,{...options,query:'红利',market:'A股相关',access:'免费'}).length,1);
 assert.equal(discoverStrategies(items,{...options,category:'趋势',access:'免费'}).length,0);
 assert.equal(discoverStrategies(items,{...options,market:'跨市场'})[0].id,'growth-pulse');
});
await test('sorting preserves the source catalog', () => {
 assert.equal(discoverStrategies(items,{...options,sort:'引用人数'})[0].referenceCount,8);
 assert.equal(items[0].referenceCount,2);
 assert.equal(discoverStrategies(items,{...options,query:'不存在'}).length,0);
});
