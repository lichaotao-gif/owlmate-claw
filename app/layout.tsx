import type { Metadata } from 'next';
import './globals.css';
import { EmbeddedThemeSync } from '@/components/embedded-theme-sync';
export const metadata: Metadata = {
  title: '策略实验室 · 量化策略仿真',
  description: '用独立虚拟资产运行和复盘量化策略实验。',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "if(window.self!==window.top){document.documentElement.dataset.embedded='true'}",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('owlmate-theme-preference');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})();`,
          }}
        />
      </head>
      <body><EmbeddedThemeSync />{children}</body>
    </html>
  );
}
