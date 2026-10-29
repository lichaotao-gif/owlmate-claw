import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'outputs', 'OwlMate-单文件参考.html');
const entryId = '\0owlmate-export-entry';
const routerId = '\0owlmate-export-router';
const pages = ['holdings', 'strategies', 'credits', 'help', 'profile', 'simulation', 'plans', 'events', 'zones', 'strategists'];
const assets = new Map();
const sources = {};

async function collect(directory, asset = false) {
  for (const item of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${item.name}`;
    if (item.isDirectory()) await collect(relative, asset);
    else if (asset) {
      const mime = item.name.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
      assets.set(`/${relative.slice('public/'.length)}`, `data:${mime};base64,${(await readFile(path.join(root, relative))).toString('base64')}`);
    } else if (/\.(tsx?|css|json)$/.test(item.name)) {
      sources[relative] = await readFile(path.join(root, relative), 'utf8');
    }
  }
}
await collect('public', true);
for (const directory of ['app', 'components', 'hooks', 'lib']) await collect(directory);

const router = `
import React, { useSyncExternalStore } from 'react';
export function usePathname() {
  return useSyncExternalStore(callback => {
    window.addEventListener('popstate', callback);
    return () => window.removeEventListener('popstate', callback);
  }, () => new URLSearchParams(window.location.search).get('owlmate-page') || '/', () => '/');
}
function localUrl(href) {
  const target = new URL(href, 'https://owlmate.invalid');
  const result = new URL(window.location.href);
  result.search = target.search;
  result.searchParams.set('owlmate-page', target.pathname);
  result.hash = target.hash;
  return result.href;
}
export function navigate(href, replace = false) {
  history[replace ? 'replaceState' : 'pushState'](null, '', localUrl(href));
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
window.__owlmateNavigate = navigate;
export function useRouter() {
  return { push: navigate, replace: href => navigate(href, true), back: () => history.back(), refresh: () => location.reload(), prefetch: () => {} };
}
export default function Link({ href, onClick, children, prefetch, replace, ...props }) {
  const value = typeof href === 'string' ? href : href.pathname;
  return <a {...props} href={localUrl(value)} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(value, replace);
  }}>{children}</a>;
}
`;
const entry = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { usePathname } from 'next/navigation';
import Home from ${JSON.stringify(path.join(root, 'app/page.tsx'))};
${pages.map((page, index) => `import Page${index} from ${JSON.stringify(path.join(root, `app/${page}/page.tsx`))};`).join('\n')}
import ${JSON.stringify(path.join(root, 'app/globals.css'))};
const routes = { '/': Home, ${pages.map((page, index) => `${JSON.stringify(`/${page}`)}: Page${index}`).join(', ')} };
function App() {
  const pathname = usePathname();
  const Page = routes[pathname] || Home;
  return <Page key={pathname} />;
}
createRoot(document.getElementById('root')).render(<App />);
`;

const result = await build({
  root,
  configFile: false,
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: { alias: { '@': root } },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [{
    name: 'owlmate-single-file',
    resolveId(id) {
      if (id === 'owlmate-export-entry' || id === path.join(root, 'owlmate-export-entry')) return entryId;
      if (id === 'next/link' || id === 'next/navigation') return routerId;
    },
    load(id) {
      if (id === entryId) return entry;
      if (id === routerId) return router;
    },
    transform(code, id) {
      if (id === entryId || id === routerId) return { code, map: null, moduleType: 'jsx' };
      if (!id.startsWith(root + '/') || id.includes('/node_modules/') || !/\.[jt]sx?$/.test(id)) return;
      let next = code.replaceAll('window.location.assign(', 'window.__owlmateNavigate(');
      for (const [url, data] of assets) next = next.replaceAll(url, data);
      return next === code ? undefined : { code: next, map: null };
    },
  }, react()],
  build: {
    write: false,
    minify: true,
    cssMinify: false,
    cssCodeSplit: false,
    lib: { entry: 'owlmate-export-entry', name: 'OwlMateReference', formats: ['iife'] },
  },
});
const bundles = Array.isArray(result) ? result : [result];
const files = bundles.flatMap(bundle => bundle.output);
const javascript = files.filter(file => file.type === 'chunk').map(file => file.code).join('\n');
const css = files.filter(file => file.type === 'asset' && file.fileName.endsWith('.css')).map(file => file.source).join('\n');
if (!javascript || !css) throw new Error('导出缺少脚本或样式');
const escapeScript = value => value.replace(/<\/script/gi, '<\\/script');
const theme = `(function(){try{var p=localStorage.getItem('owlmate-theme-preference');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})();`;
const html = `<!DOCTYPE html>
<!-- OwlMate 单文件复刻参考：直接打开即可。页面、样式、图片、运行脚本均内嵌。
     给 Codex：请忠实复用本文件现有布局、尺寸、间距、字体、颜色及交互，分别核对深浅主题和移动端。
     原始源码位于下方 id="owlmate-reference-sources" 的 JSON 中；先阅读对应页面、组件和 app/globals.css。
     这是前端演示，本机数据独立保存，不包含实际账户数据、环境变量或后端服务。 -->
<html lang="zh-CN" class="dark"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OwlMate 实验室 · 单文件复刻参考</title>
<link rel="icon" href="${assets.get('/favicon.svg')}">
<script>${theme}</script><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>
<body><div id="root"></div>
<script type="application/json" id="owlmate-reference-sources">${escapeScript(JSON.stringify({ instructions: '以原始源码和实际渲染为准复刻，保持现有布局及交互。next/link 与 next/navigation 在单文件运行时被适配为本地路由，原项目无需此适配。', files: sources }))}</script>
<script>${escapeScript(javascript)}</script></body></html>`;
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html);
console.log(`单文件 HTML 已生成：${output}（${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB）`);
