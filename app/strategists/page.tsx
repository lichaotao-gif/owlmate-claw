'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bot, CircleHelp, FlaskConical, LayoutDashboard, Radio, ShieldCheck, Users, Wallet } from 'lucide-react';
import { OwlLogo } from '@/components/owl-logo';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { StrategistAvatar, StrategistSparkline } from '@/components/strategist-card';
import { strategists, type Strategist, type StrategistStyle } from '@/lib/strategists';

const filters: Array<'全部' | StrategistStyle> = ['全部', '稳健', '均衡', '成长', '轮动'];

export default function StrategistsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('全部');
  const [selected, setSelected] = useState<Strategist | null>(null);
  const [comparing, setComparing] = useState(false);
  const visible = useMemo(() => filter === '全部' ? strategists : strategists.filter(item => item.style === filter), [filter]);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    const match = strategists.find(item => item.id === id);
    if (!match) return;
    const timer = window.setTimeout(() => setSelected(match), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openStrategist(strategist: Strategist) {
    setSelected(strategist); setComparing(false);
    window.history.replaceState(null, '', `#${strategist.id}`);
  }

  return <div className="app-shell strategists-shell">
    <nav className="icon-rail" aria-label="页面区域"><Link href="/" className="brand-symbol" aria-label="OwlMate 首页"><OwlLogo/></Link><div className="rail-links"><Link href="/" className="rail-item" aria-label="投资驾驶舱" data-label="驾驶舱"><LayoutDashboard/></Link><Link href="/#holdings" className="rail-item" aria-label="我的持仓" data-label="我的持仓"><Wallet/></Link><Link href="/#simulation" className="rail-item" aria-label="仓位情景试算" data-label="情景试算"><FlaskConical/></Link><Link href="/strategists" className="rail-item active" aria-label="策略达人" data-label="策略达人"><Users/></Link><Link href="/#events" className="rail-item" aria-label="事件雷达" data-label="事件雷达"><Radio/></Link></div><Link href="/" className="rail-item rail-bottom" aria-label="返回投资驾驶舱" data-label="返回驾驶舱"><ArrowLeft/></Link><span className="avatar" aria-label="演示账户">O</span></nav>
    <div className="workspace strategist-workspace"><header className="topbar"><div className="wordmark">OwlMate<span className="brand-beta">BETA</span></div><span className="header-divider"/><span className="workspace-label">AI 策略实验室</span><div className="header-right"><span className="demo-badge"><i/>模拟运行中</span><span className="snapshot">6 位 Agent · 示例数据</span><Link href="/" className="back-cockpit"><ArrowLeft size={14}/>返回驾驶舱</Link></div></header>
      <div className="strategist-main"><section className="strategist-hero"><div><span className="eyebrow"><Bot size={13}/> MULTI-AGENT STRATEGY LAB</span><h1>策略达人<span className="heading-dot"/></h1><p>观察不同 AI Agent 如何配置资产、应对波动，并把它们的决策放进同一套风险尺度。</p></div><div className="strategist-hero-stat"><span>近90日表现领先基准</span><strong>6 / 6</strong><small>平台精选模拟组合</small></div></section>
      <aside className="strategist-trust"><ShieldCheck size={18}/><div><b>这是策略实验场，不是收益排行榜</b><p>所有身份、持仓与收益均为虚构模拟；每条曲线保留真实感的震荡和回撤，历史表现不代表未来结果。</p></div></aside>
      <div className="strategist-toolbar"><div aria-label="按策略风格筛选">{filters.map(item=><button key={item} aria-pressed={filter===item} onClick={()=>setFilter(item)}>{item}</button>)}</div><span>{visible.length} 位策略达人</span></div>
      <section className="strategist-grid" aria-label="策略达人列表">{visible.map(strategist=><article id={strategist.id} className="strategist-card" key={strategist.id} style={{'--agent-accent': strategist.accent} as React.CSSProperties}>
        <div className="strategist-card-head"><StrategistAvatar strategist={strategist}/><div><h2>{strategist.name}<span>{strategist.style}</span></h2><p>{strategist.role}</p></div><span className="curated-tag">平台精选</span></div>
        <p className="strategist-thesis">{strategist.thesis}</p><StrategistSparkline strategist={strategist}/>
        <div className="strategist-kpis"><div><span>近90日</span><b>+{strategist.return90.toFixed(1)}%</b></div><div><span>同期基准</span><b>+{strategist.benchmark.toFixed(1)}%</b></div><div><span>最大回撤</span><b>{strategist.maxDrawdown.toFixed(1)}%</b></div></div>
        <div className="strategist-allocation"><div><span>投资仓位 {strategist.riskAllocation}%</span><span>现金 {strategist.cash}%</span></div><i><b style={{width:`${strategist.riskAllocation}%`}}/></i></div>
        <div className="strategist-action"><span>最新动作 · {strategist.updated}</span><p>{strategist.latestAction}</p></div>
        <button className="strategist-detail-button" onClick={()=>openStrategist(strategist)}>查看组合与决策 <ArrowRight size={14}/></button>
      </article>)}</section>
      <footer className="page-footer"><span><ShieldCheck size={12}/>AI Agent 模拟组合 · 未接入真实交易</span><span>OwlMate / Strategies in perspective.</span></footer></div>
    </div>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open){setSelected(null);setComparing(false);window.history.replaceState(null,'',window.location.pathname)}}}><DialogContent className="owl-dialog strategist-dialog"><DialogTitle>{selected?.name} · 模拟组合</DialogTitle><DialogDescription>{selected?.role} · 最近更新 {selected?.updated}</DialogDescription>{selected&&<div className="strategist-detail"><div className="strategist-detail-intro"><StrategistAvatar strategist={selected}/><div><span className="purple-tag">{selected.style}策略</span><p>{selected.thesis}</p></div></div><StrategistSparkline strategist={selected} large/><div className="strategist-detail-kpis"><span>近90日模拟收益 <b>+{selected.return90.toFixed(1)}%</b></span><span>同期基准 <b>+{selected.benchmark.toFixed(1)}%</b></span><span>最大回撤 <b>{selected.maxDrawdown.toFixed(1)}%</b></span></div><div className="strategist-holding-table"><div className="strategist-holding-head"><span>当前持仓</span><span>占比</span><span>区间收益</span></div>{selected.holdings.map(item=><div key={item.code}><span><b>{item.name}</b><small>{item.code}</small></span><span>{item.weight}%</span><span className={item.returnRate>=0?'up':'down'}>{item.returnRate>=0?'+':''}{item.returnRate.toFixed(1)}%</span></div>)}</div><div className="strategist-decision-log"><span>Agent 最新决策</span><p>{selected.latestAction}</p><small>决策依据为演示规则，不代表实时市场判断。</small></div>{comparing&&<div className="strategist-compare"><div><span>我的示例组合</span><b>80% 投资仓位</b><small>最大回撤 0.0%</small></div><ArrowRight size={18}/><div><span>{selected.name}</span><b>{selected.riskAllocation}% 投资仓位</b><small>最大回撤 {selected.maxDrawdown.toFixed(1)}%</small></div></div>}<div className="strategist-dialog-actions"><button className="secondary-button" onClick={()=>setComparing(true)}>与我的组合对比</button><Link className="primary-button" href={`/?strategy=${selected.id}#simulation`}>加入情景试算 <FlaskConical size={14}/></Link></div><p className="strategist-dialog-note"><CircleHelp size={13}/>模拟组合不构成投资建议，历史表现不代表未来收益。</p></div>}</DialogContent></Dialog>
  </div>;
}
