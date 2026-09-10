'use client';
import {useEffect,useState} from 'react';
import {Layers3,Plus,Check,Settings2} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from './ui/dialog';

const modules=[
 {id:'drawdown',name:'最大回撤提醒',group:'风控工具',desc:'从净值高点计算回撤；达到阈值时生成复核提醒。',needs:'手动输入假设回撤，可立即演示规则触发。',ready:true},
 {id:'sharpe',name:'夏普比率周报',group:'表现分析',desc:'比较指定历史窗口内的风险调整表现。',needs:'待接入连续收益序列、无风险利率及统一计算窗口。'},
 {id:'mc',name:'蒙特卡洛月报',group:'方案验证',desc:'计划模拟 1 万条路径，比较不同配置的结果分布。',needs:'待接入收益模型、波动率及资产相关性；目前不生成模拟报告。'},
 {id:'ev',name:'EV 评分监控',group:'收益评估',desc:'每月复核预期收益与损失，解释评分变化。',needs:'待定义评分口径、收益损失分布及估计数据。'},
 {id:'kelly',name:'凯利参考仓位',group:'仓位工具',desc:'在风险预算与仓位上限内评估参考配置。',needs:'待接入收益分布估计和组合约束；未生成凯利仓位。'},
 {id:'breakout',name:'突破与加仓提醒',group:'条件提醒',desc:'突破条件满足后生成候选信号，优先检查风控限制。',needs:'待定义阻力位、确认条件、加仓步长及退出规则。'},
 {id:'etf1',name:'猫头鹰 ETF 1 号',group:'主策略',desc:'大类资产 ETF 轮动策略。',needs:'待补充选池、排序、调仓及退出规则。'},
 {id:'etf2',name:'猫头鹰 ETF 2 号',group:'主策略',desc:'大类资产 ETF 轮动策略。',needs:'待补充选池、排序、调仓及退出规则。'},
];
type Config={ids:string[];single:number;portfolio:number};
const initial:Config={ids:['drawdown'],single:30,portfolio:20};
export function StrategyCenter({onSignal}:{onSignal:(text:string)=>void}){
 const [open,setOpen]=useState(false),[config,setConfig]=useState<Config>(initial),[saved,setSaved]=useState(''),[sample,setSample]=useState('22'),[scope,setScope]=useState('portfolio'),[result,setResult]=useState('');
 useEffect(()=>{const timer=window.setTimeout(()=>{try{const raw=localStorage.getItem('owlmate-modules-v1');if(raw){const c=JSON.parse(raw);if(Array.isArray(c.ids)&&c.ids.every((id:unknown)=>typeof id==='string'&&modules.some(m=>m.id===id))&&[c.single,c.portfolio].every(n=>Number.isFinite(n)&&n>=1&&n<=100))setConfig(c)}}catch{setSaved('无法读取本机设置，暂用默认配置。')}},0);return()=>window.clearTimeout(timer)},[]);
 function save(next:Config){setConfig(next);setResult('');try{localStorage.setItem('owlmate-modules-v1',JSON.stringify(next));setSaved('已保存在本机 · 无后台定时任务')}catch{setSaved('仅当前页面生效，浏览器保存失败')}}
 function toggle(id:string){save({...config,ids:config.ids.includes(id)?config.ids.filter(x=>x!==id):[...config.ids,id]})}
 function simulate(){const n=Number(sample);if(!sample.trim()||!Number.isFinite(n)||n<0||n>100){setResult('请输入 0–100 的假设回撤百分比。');return}const limit=scope==='portfolio'?config.portfolio:config.single;const text=`${scope==='portfolio'?'组合':'单股'}假设回撤 ${n}% ${n>=limit?'达到':'未达到'}阈值 ${limit}%。${n>=limit?'风控优先：建议暂停新增风险暴露并复核配置。':'本次不触发回撤警报。'}此为手动演示，不是当前账户实际回撤。`;setResult(text);if(n>=limit)onSignal(text)}
 return <><button className="strategy-center-trigger" onClick={()=>setOpen(true)}><Layers3 size={15}/><span>策略中心</span><small>{config.ids.length}</small></button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="owl-dialog strategy-center-dialog"><DialogTitle>策略中心</DialogTitle><DialogDescription>为整个组合添加分析与风控模块。演示版只保存设置与手动触发，不会定时推送或改变持仓。</DialogDescription>
 <div className="strategy-center-overview"><div><b>{config.ids.includes('drawdown')?'基础风险观察已启用':'基础风险观察未启用'}</b><small>{config.ids.length} 个已添加 · 主策略待规则补充</small></div><span>风控限制 → 主策略 → 辅助信号</span></div>
 <div className="strategy-module-grid">{modules.map(m=>{const added=config.ids.includes(m.id);return <article key={m.id} className={'strategy-module '+(added?'added':'')}><div><span>{m.group}</span><small>{m.ready?'可手动演示':'待补充数据 / 规则'}</small></div><h3>{m.name}</h3><p>{m.desc}</p><small>{m.needs}</small><button onClick={()=>toggle(m.id)}>{added?<Check size={14}/>:<Plus size={14}/>} {added?'已添加 · 点击移除':m.ready?'添加到组合':'添加关注'}</button></article>})}</div>
 {config.ids.includes('drawdown')&&<section className="strategy-settings"><h3><Settings2 size={16}/>回撤规则与触发预览</h3><p>回撤按历史净值高点计算，达到或超过阈值即触发；单股默认 30%，组合默认 20%，均为可修改的演示阈值。</p><div className="strategy-settings-fields">{(['single','portfolio'] as const).map(key=><label key={key}>{key==='single'?'单股':'组合'}阈值 (%)<input type="number" min="1" max="100" value={config[key]} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=1&&n<=100)save({...config,[key]:n})}}/></label>)}<label>演示对象<select value={scope} onChange={e=>{setScope(e.target.value);setResult('')}}><option value="portfolio">整个组合</option><option value="single">单股示例</option></select></label><label>假设回撤 (%)<input type="number" min="0" max="100" value={sample} onChange={e=>{setSample(e.target.value);setResult('')}}/></label></div><button className="primary-button" onClick={simulate}>预览规则触发</button>{result&&<output className="strategy-preview">{result}</output>}</section>}
 <output className="strategy-save-status">{saved||'设置保存在当前浏览器；周报和月报尚未接入计算与调度。'}</output>
 </DialogContent></Dialog></>;
}
