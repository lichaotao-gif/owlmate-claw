'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

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

  return (
    <label className="theme-selector">
      <Icon size={15} aria-hidden="true" />
      <span className="sr-only">外观模式</span>
      <select
        aria-label="外观模式"
        value={preference}
        onChange={(event) => {
          const next = event.target.value as ThemePreference;
          setPreference(next);
          localStorage.setItem(THEME_KEY, next);
          applyTheme(next);
        }}
      >
        <option value="system">跟随系统</option>
        <option value="light">日间模式</option>
        <option value="dark">夜间模式</option>
      </select>
    </label>
  );
}
