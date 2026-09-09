export type Holding={id:string;code:string;name:string;quantity:number;cost:number;price:number;color:string};
export type Account={holdings:Holding[];cash:number};
export const initialAccount:Account={cash:257280,holdings:[
{id:'nasdaq',code:'513100',name:'纳指 ETF',quantity:207200,cost:1.7,price:1.862,color:'#9f8bff'},
{id:'csi300',code:'510300',name:'沪深 300 ETF',quantity:62900,cost:3.9,price:4.086,color:'#79adff'},
{id:'chinext',code:'159915',name:'创业板 ETF',quantity:98900,cost:2.5,price:2.341,color:'#52ccb9'},
{id:'gold',code:'518880',name:'黄金 ETF',quantity:21200,cost:6.8,price:7.258,color:'#e3bb76'}]};
export function validateHolding(h:Holding,others:Holding[]=[]):string{
 if(!/^[0-9]{6}$/.test(h.code))return '请输入 6 位证券代码。';
 if(!h.name.trim()||h.name.length>40)return '名称不能为空，且最多 40 个字符。';
 if(others.some(x=>x.id!==h.id&&x.code===h.code))return '该证券已存在，请编辑已有持仓。';
 if(!Number.isSafeInteger(h.quantity)||h.quantity<=0||h.quantity>100000000)return '持有数量必须是 1 至 100,000,000 的整数。';
 if(!Number.isFinite(h.cost)||h.cost<0||h.cost>1000000)return '成本均价应为 0 至 1,000,000 元。';
 if(!Number.isFinite(h.price)||h.price<=0||h.price>1000000)return '参考现价应大于 0，且不超过 1,000,000 元。';
 return '';
}
export function summarize(a:Account){
 const marketValue=a.holdings.reduce((sum,h)=>sum+h.quantity*h.price,0);
 const cost=a.holdings.reduce((sum,h)=>sum+h.quantity*h.cost,0);
 const total=marketValue+a.cash;
 const assets=a.holdings.map(h=>({...h,allocation:total?h.quantity*h.price/total*100:0,value:h.quantity*h.price,pnl:(h.price-h.cost)*h.quantity}));
 const largest=assets.reduce<(typeof assets)[number]|null>((max,h)=>!max||h.value>max.value?h:max,null);
 return {total,marketValue,cost,pnl:marketValue-cost,riskAllocation:total?marketValue/total*100:0,assets,largest};
}
export function parseAccount(raw:string):Account{
 const a=JSON.parse(raw);
 if(!a||!Array.isArray(a.holdings)||a.holdings.length>100||!Number.isFinite(a.cash)||a.cash<0||a.cash>1e12)throw new Error('Invalid account');
 const ids=new Set<string>(),codes=new Set<string>();
 for(const h of a.holdings){if(!h||typeof h.id!=='string'||!h.id||typeof h.name!=='string'||typeof h.code!=='string'||typeof h.color!=='string'||!/^#[a-fA-F0-9]{6}$/.test(h.color)||validateHolding(h)||ids.has(h.id)||codes.has(h.code))throw new Error('Invalid holding');ids.add(h.id);codes.add(h.code);}
 return {cash:a.cash,holdings:a.holdings};
}
