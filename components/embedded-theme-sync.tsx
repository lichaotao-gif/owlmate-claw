'use client';

import { useEffect } from 'react';

export function EmbeddedThemeSync() {
  useEffect(() => {
    if (window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (event.source !== window.parent || !/^https?:\/\//.test(event.origin)) return;
      if (event.data?.type !== 'owlmate:theme' ||
          !['light', 'dark'].includes(event.data.theme)) return;
      const root = document.documentElement;
      root.dataset.hostTheme = 'true';
      root.dataset.theme = event.data.theme;
      root.classList.toggle('dark', event.data.theme === 'dark');
      root.style.colorScheme = event.data.theme;
    };
    window.addEventListener('message', receive);
    // Only an initialization signal is sent; no profile or account data crosses origins.
    window.parent.postMessage({ type: 'owlmate:theme-ready' }, '*');
    return () => window.removeEventListener('message', receive);
  }, []);
  return null;
}
