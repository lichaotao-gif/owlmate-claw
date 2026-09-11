'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bookmark,
  CircleGauge,
  CircleHelp,
  FlaskConical,
  LayoutDashboard,
  Radio,
  Users,
  Wallet,
} from 'lucide-react';
import { OwlLogo } from '@/components/owl-logo';

const items = [
  { href: '/', label: '投资驾驶舱', short: '驾驶舱', icon: LayoutDashboard },
  { href: '/holdings', label: '我的持仓', short: '我的持仓', icon: Wallet },
  {
    href: '/zones',
    label: '持仓区间雷达',
    short: '区间雷达',
    icon: CircleGauge,
  },
  {
    href: '/simulation',
    label: '仓位情景试算',
    short: '情景试算',
    icon: FlaskConical,
  },
  { href: '/strategists', label: '策略达人', short: '策略达人', icon: Users },
  { href: '/events', label: '事件雷达', short: '事件雷达', icon: Radio },
  { href: '/plans', label: '我的模拟方案', short: '我的方案', icon: Bookmark },
] as const;

export function AppRail() {
  const pathname = usePathname();

  return (
    <nav className="icon-rail" aria-label="主要功能">
      <Link href="/" className="brand-symbol" aria-label="OwlMate 首页">
        <OwlLogo />
      </Link>
      <div className="rail-links">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              href={item.href}
              className={`rail-item${active ? ' active' : ''}`}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              data-label={item.short}
              key={item.href}
            >
              <Icon />
            </Link>
          );
        })}
      </div>
      <Link
        href="/help"
        className={`rail-item rail-bottom${pathname === '/help' ? ' active' : ''}`}
        aria-label="帮助中心"
        aria-current={pathname === '/help' ? 'page' : undefined}
        data-label="帮助中心"
      >
        <CircleHelp />
      </Link>
      <Link
        href="/profile"
        className={`avatar${pathname === '/profile' ? ' active' : ''}`}
        aria-label="账户与画像"
        aria-current={pathname === '/profile' ? 'page' : undefined}
        data-label="账户与画像"
      >
        O
      </Link>
    </nav>
  );
}
