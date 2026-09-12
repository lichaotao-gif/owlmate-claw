'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bookmark,
  CircleGauge,
  CircleHelp,
  FlaskConical,
  LayoutDashboard,
  LogIn,
  LogOut,
  Radio,
  ShieldCheck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { OwlLogo } from '@/components/owl-logo';
import { initialAccount, parseAccount } from '@/lib/holdings';
import { readPlans } from '@/lib/plans';
import { platformIdentity } from '@/lib/platform-identity';
import {
  readDemoSession,
  readProfile,
  resumeDemoSession,
  signOutDemoSession,
  useInvestorProfile,
} from '@/lib/profile-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const router = useRouter();
  const { profile } = useInvestorProfile();
  const [level, setLevel] = useState(1);
  const [session, setSession] =
    useState<ReturnType<typeof readDemoSession>>(null);
  const [canResume, setCanResume] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  useEffect(() => {
    const refresh = () => {
      try {
        const accountRaw = localStorage.getItem('owlmate-account-v1');
        const plansRaw = localStorage.getItem('owlmate-plans-v2');
        const account = accountRaw ? parseAccount(accountRaw) : initialAccount;
        const plans = plansRaw ? readPlans(plansRaw).length : 0;
        const nextSession = readDemoSession();
        setSession(nextSession);
        setCanResume(Boolean(nextSession?.username || readProfile()?.username));
        setLevel(platformIdentity(profile, account, plans).level);
      } catch {
        setSession(null);
        setCanResume(false);
        setLevel(profile ? 2 : 1);
      }
    };
    refresh();
    window.addEventListener('owlmate-data-change', refresh);
    window.addEventListener('owlmate-session-change', refresh);
    return () => {
      window.removeEventListener('owlmate-data-change', refresh);
      window.removeEventListener('owlmate-session-change', refresh);
    };
  }, [profile]);

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
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`avatar${pathname === '/profile' ? ' active' : ''}`}
          aria-label="打开个人账户菜单"
          data-label="个人账户"
        >
          <UserRound aria-hidden="true" />
          <span className="avatar-level">{level}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="account-menu"
          side="right"
          align="end"
          sideOffset={12}
        >
          <div className="account-menu-profile">
            <span className="account-menu-avatar">
              <UserRound aria-hidden="true" />
            </span>
            <div>
              <b>
                {session?.signedIn === false
                  ? '未登录'
                  : (profile?.username ?? '访客账户')}
              </b>
              <small>
                {profile
                  ? `LV${level} · ${profile.riskLabel}`
                  : '完善画像后生成身份'}
              </small>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <ShieldCheck aria-hidden="true" />
            账户与画像
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {session?.signedIn === false ? (
            <DropdownMenuItem
              onClick={() => {
                if (!resumeDemoSession()) router.push('/');
              }}
            >
              <LogIn aria-hidden="true" />
              {canResume ? '重新登录' : '前往登录'}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut aria-hidden="true" />
              退出登录
            </DropdownMenuItem>
          )}
          <p className="account-menu-note">
            退出后保留本机持仓、画像和模拟方案。
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="account-logout-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>退出当前账户？</AlertDialogTitle>
            <AlertDialogDescription>
              只结束当前登录状态，本机持仓、投资画像和模拟方案都会保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                signOutDemoSession();
                setLogoutOpen(false);
                router.push('/');
              }}
            >
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
