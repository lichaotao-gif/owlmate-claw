'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CircleHelp,
  Coins,
  FlaskConical,
  LogIn,
  LogOut,
  ShieldCheck,
  Store,
  UserRound,
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
  {
    href: '/holdings',
    label: 'OwlMate 实验室',
    short: '实验通道',
    icon: FlaskConical,
  },
  { href: '/strategies', label: '策略广场', short: '策略广场', icon: Store },
  { href: '/credits', label: '积分消耗', short: '积分消耗', icon: Coins },
] as const;

export function navigateWithPageLoad(
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  event.preventDefault();
  window.location.assign(href);
}

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
      <Link
        href="/holdings"
        className="brand-symbol"
        aria-label="OwlMate 实验室"
        onClick={(event) => navigateWithPageLoad(event, '/holdings')}
      >
        <OwlLogo />
      </Link>
      <div className="rail-links">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          const linkProps = {
            className: `rail-item${active ? ' active' : ''}`,
            'aria-label': item.label,
            'aria-current': active ? ('page' as const) : undefined,
            'data-label': item.short,
          };
          return (
            <Link
              href={item.href}
              {...linkProps}
              key={item.href}
              onClick={(event) => navigateWithPageLoad(event, item.href)}
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
        onClick={(event) => navigateWithPageLoad(event, '/help')}
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
