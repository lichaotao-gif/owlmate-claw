'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'owlmate-theme-preference';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function applyTheme(preference: ThemePreference) {
  const resolved =
    preference === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeSelector() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const initial = isThemePreference(stored) ? stored : 'system';
    const timer = window.setTimeout(() => setPreference(initial), 0);
    applyTheme(initial);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncWithSystem = () => {
      const current = localStorage.getItem(THEME_KEY);
      if (!isThemePreference(current) || current === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', syncWithSystem);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener('change', syncWithSystem);
    };
  }, []);

  const Icon =
    preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;
  const currentLabel =
    preference === 'light'
      ? '日间模式'
      : preference === 'dark'
        ? '夜间模式'
        : '跟随系统';

  function changePreference(value: string) {
    if (!isThemePreference(value)) return;
    setPreference(value);
    localStorage.setItem(THEME_KEY, value);
    applyTheme(value);
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className="theme-selector"
        aria-label={`外观模式：${currentLabel}`}
        title={currentLabel}
      >
        <Icon size={17} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="theme-menu"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <span className="theme-menu-title">外观模式</span>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={changePreference}
        >
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden="true" /> 跟随系统
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden="true" /> 日间模式
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden="true" /> 夜间模式
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
