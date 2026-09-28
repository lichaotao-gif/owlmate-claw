'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { AppRail } from '@/components/app-rail';
import { ThemeSelector } from '@/components/theme-selector';
import {
  AGENT_CREDIT_ALLOWANCE,
  AGENT_CREDITS_EVENT,
  AGENT_CREDITS_KEY,
  agentCreditTotal,
  readAgentCreditHistory,
  type AgentCreditEntry,
} from '@/lib/agent-credits';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export default function CreditsPage() {
  const [entries, setEntries] = useState<AgentCreditEntry[]>([]);
  const [agentFilter, setAgentFilter] = useState('全部 Agent');
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    function loadHistory() {
      try {
        setEntries(
          readAgentCreditHistory(localStorage.getItem(AGENT_CREDITS_KEY)),
        );
        setLoadError('');
      } catch {
        setEntries(readAgentCreditHistory(null));
        setLoadError('本机积分流水读取失败，当前展示演示记录。');
      }
    }
    loadHistory();
    window.addEventListener(AGENT_CREDITS_EVENT, loadHistory);
    return () => window.removeEventListener(AGENT_CREDITS_EVENT, loadHistory);
  }, []);

  const agents = useMemo(
    () => ['全部 Agent', ...new Set(entries.map((entry) => entry.agentName))],
    [entries],
  );
  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return entries.filter(
      (entry) =>
        (agentFilter === '全部 Agent' || entry.agentName === agentFilter) &&
        (!normalized ||
          `${entry.agentName} ${entry.feature} ${entry.action}`
            .toLowerCase()
            .includes(normalized)),
    );
  }, [agentFilter, entries, query]);
  const total = agentCreditTotal(entries);
  const remaining = Math.max(0, AGENT_CREDIT_ALLOWANCE - total);
  const successfulCalls = entries.filter(
    (entry) => entry.status === '已完成',
  ).length;

  return (
    <div className="app-shell credits-shell">
      <AppRail />
      <div className="workspace credits-workspace">
        <header className="topbar">
          <div className="wordmark">
            OwlMate<span className="brand-beta">BETA</span>
          </div>
          <span className="header-divider" />
          <span className="workspace-label">积分消耗</span>
          <div className="header-right">
            <span className="credits-header-badge">
              <Coins size={14} aria-hidden="true" />{' '}
              {remaining.toLocaleString()}
              积分可用
            </span>
            <ThemeSelector />
          </div>
        </header>

        <main className="credits-main">
          <section className="credits-hero">
            <div>
              <span className="eyebrow">
                <Zap size={13} aria-hidden="true" /> AGENT USAGE LEDGER
              </span>
              <h1>
                每一次 Agent 调用，都清楚可查
                <span className="heading-dot" />
              </h1>
              <p>
                记录调用来源、使用的
                Agent、完成状态与积分消耗。失败的调用会留下记录，但不扣除积分。
              </p>
            </div>
            <div className="credits-allowance">
              <span>本月剩余</span>
              <strong>{remaining.toLocaleString()}</strong>
              <small>/ {AGENT_CREDIT_ALLOWANCE.toLocaleString()} 积分</small>
              <i aria-hidden="true">
                <b
                  style={{
                    width: `${Math.min(100, (total / AGENT_CREDIT_ALLOWANCE) * 100)}%`,
                  }}
                />
              </i>
            </div>
          </section>

          {loadError && (
            <p className="credits-load-error" role="alert">
              {loadError}
            </p>
          )}

          <section className="credits-summary" aria-label="积分使用概览">
            <article>
              <span>
                <Coins size={16} aria-hidden="true" /> 累计消耗
              </span>
              <b>{total.toLocaleString()}</b>
              <small>本机已记录 Agent 调用</small>
            </article>
            <article>
              <span>
                <Bot size={16} aria-hidden="true" /> 成功调用
              </span>
              <b>{successfulCalls}</b>
              <small>共 {entries.length} 条调用记录</small>
            </article>
            <article>
              <span>
                <Sparkles size={16} aria-hidden="true" /> 平均消耗
              </span>
              <b>{successfulCalls ? Math.round(total / successfulCalls) : 0}</b>
              <small>积分 / 次成功调用</small>
            </article>
          </section>

          <section className="credits-history" aria-labelledby="credits-title">
            <div className="credits-history-heading">
              <div>
                <span>USAGE HISTORY</span>
                <h2 id="credits-title">积分消耗历史</h2>
              </div>
              <div className="credits-filters">
                <label>
                  <span className="sr-only">搜索调用记录</span>
                  <Search size={15} aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索功能或操作"
                  />
                </label>
                <select
                  aria-label="按 Agent 筛选"
                  value={agentFilter}
                  onChange={(event) => setAgentFilter(event.target.value)}
                >
                  {agents.map((agent) => (
                    <option key={agent}>{agent}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="credits-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>Agent</th>
                    <th>调用内容</th>
                    <th>来源</th>
                    <th>状态</th>
                    <th>消耗</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td data-label="时间">
                        <span className="credits-time">
                          <Clock3 size={13} aria-hidden="true" />
                          {formatDate(entry.createdAt)}
                        </span>
                      </td>
                      <td data-label="Agent">
                        <b className="credits-agent-name">{entry.agentName}</b>
                      </td>
                      <td data-label="调用内容">{entry.action}</td>
                      <td data-label="来源">
                        <span className="credits-feature">{entry.feature}</span>
                      </td>
                      <td data-label="状态">
                        <span
                          className={`credits-status ${entry.status === '已完成' ? 'success' : 'failed'}`}
                        >
                          {entry.status === '已完成' ? (
                            <CheckCircle2 size={13} aria-hidden="true" />
                          ) : (
                            <XCircle size={13} aria-hidden="true" />
                          )}
                          {entry.status}
                        </span>
                      </td>
                      <td data-label="消耗">
                        <strong className="credits-cost">
                          {entry.cost ? `−${entry.cost}` : '0'}
                          <small>积分</small>
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredEntries.length && (
                <div className="credits-empty">
                  <Search size={21} aria-hidden="true" />
                  <b>没有符合条件的调用记录</b>
                  <span>试试清除搜索词或切换 Agent。</span>
                </div>
              )}
            </div>
          </section>

          <footer className="page-footer credits-footer">
            <span>
              <ShieldCheck size={12} aria-hidden="true" />
              当前流水保存在本机浏览器中
            </span>
            <span>失败调用记录为 0 积分，不计入消耗。</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
