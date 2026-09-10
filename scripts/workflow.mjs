import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_BRANCH = 'main';
const PREVIEW_URL = 'http://localhost:3018/';
const DEV_SERVER_FILE = resolve('.owlmate-dev-server.json');
const EXPECTED_REMOTES = new Set([
  'git@github.com:lichaotao-gif/owlmate-claw.git',
  'https://github.com/lichaotao-gif/owlmate-claw.git',
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }
  return options.capture ? (result.stdout ?? '').trim() : result.status;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function verifyRepository() {
  const branch = run('git', ['branch', '--show-current'], { capture: true });
  const remote = run('git', ['remote', 'get-url', 'origin'], { capture: true });

  if (branch !== EXPECTED_BRANCH) {
    fail(`当前分支是 ${branch || '未知'}，请切换到 ${EXPECTED_BRANCH} 后重试。`);
  }
  if (!EXPECTED_REMOTES.has(remote)) {
    fail(`当前 origin 是 ${remote || '未知'}，不是 OwlMate 的 GitHub 仓库。`);
  }
}

function workingTreeStatus() {
  return run('git', ['status', '--porcelain'], { capture: true });
}

function ensureDependencies() {
  if (existsSync(resolve('node_modules/.bin/vinext'))) {
    console.log('项目依赖已经就绪。');
    return;
  }

  console.log('检测到缺少依赖，正在按照 pnpm-lock.yaml 安装…');
  run('pnpm', ['install', '--frozen-lockfile']);
}

function syncDown() {
  verifyRepository();
  if (workingTreeStatus()) {
    fail('检测到尚未同步的本机修改。请先运行 npm run sync:up -- "本次修改说明"，或自行处理这些修改。');
  }

  console.log('\n正在同步 OwlMate main 分支…');
  run('git', ['-c', 'http.version=HTTP/1.1', 'pull', '--ff-only', 'origin', EXPECTED_BRANCH]);

  console.log('\n正在检查项目依赖…');
  ensureDependencies();
}

function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const status = run(command, args, { allowFailure: true });
  if (status !== 0) console.warn(`未能自动打开浏览器，请手动访问 ${url}`);
}

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForPreview(child) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) fail(`开发服务提前退出，退出码：${child.exitCode}`);
    try {
      const response = await fetch(PREVIEW_URL);
      if (response.ok) return;
    } catch {
      // 开发服务尚未就绪，继续等待。
    }
    await delay(500);
  }
  child.kill('SIGTERM');
  fail(`首页在 60 秒内未能正常加载：${PREVIEW_URL}`);
}

function removeDevServerFile() {
  if (existsSync(DEV_SERVER_FILE)) unlinkSync(DEV_SERVER_FILE);
}

function stopDevServer() {
  if (!existsSync(DEV_SERVER_FILE)) {
    console.log('没有检测到由 work:start 启动的开发服务。');
    return;
  }

  let pid;
  try {
    ({ pid } = JSON.parse(readFileSync(DEV_SERVER_FILE, 'utf8')));
  } catch {
    removeDevServerFile();
    console.warn('开发服务记录无效，已清理。');
    return;
  }

  const command = run('ps', ['-p', String(pid), '-o', 'command='], { capture: true, allowFailure: true });
  if (!command.includes('npm run dev')) {
    removeDevServerFile();
    console.warn('开发服务记录已失效，未终止任何进程。');
    return;
  }

  try {
    process.kill(process.platform === 'win32' ? pid : -pid, 'SIGTERM');
    console.log(`已停止本次工作启动的开发服务（PID ${pid}）。`);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  } finally {
    removeDevServerFile();
  }
}

async function startWork() {
  syncDown();

  console.log(`\n正在启动 OwlMate 本地预览：${PREVIEW_URL}\n`);
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '3018', '--strictPort'], {
    cwd: process.cwd(),
    detached: process.platform !== 'win32',
    stdio: 'inherit',
  });
  child.once('exit', removeDevServerFile);
  writeFileSync(DEV_SERVER_FILE, `${JSON.stringify({ pid: child.pid, url: PREVIEW_URL })}\n`);

  const stopChild = (signal) => {
    try {
      process.kill(process.platform === 'win32' ? child.pid : -child.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  process.once('SIGINT', () => stopChild('SIGINT'));
  process.once('SIGTERM', () => stopChild('SIGTERM'));

  await waitForPreview(child);
  console.log(`\n首页加载检查通过：${PREVIEW_URL}`);
  openBrowser(PREVIEW_URL);
  console.log('开发服务将保持运行；结束工作时会自动停止。\n');

  if (child.exitCode === null) await new Promise((resolveExit) => child.once('exit', resolveExit));
}

function syncWork() {
  verifyRepository();
  const message = process.argv.slice(3).join(' ').trim();
  if (!message) {
    fail('请填写本次修改说明，例如：npm run sync:up -- "优化首页布局"');
  }

  console.log('\n正在检查 TypeScript…');
  run('npx', ['tsc', '--noEmit']);

  if (workingTreeStatus()) {
    run('git', ['add', '-A']);
    run('git', ['diff', '--cached', '--check']);
    run('git', ['commit', '-m', message]);
  } else {
    console.log('本机没有新的文件修改，将同步已有提交。');
  }

  console.log('\n正在合并 GitHub main 的最新提交…');
  run('git', ['-c', 'http.version=HTTP/1.1', 'pull', '--rebase', 'origin', EXPECTED_BRANCH]);

  console.log('\n正在推送到 GitHub main…');
  run('git', ['-c', 'http.version=HTTP/1.1', 'push', 'origin', EXPECTED_BRANCH]);
  stopDevServer();
  console.log('\n同步完成。可以安全切换到其他电脑。\n');
}

const action = process.argv[2];
if (action === 'start') await startWork();
else if (action === 'down') syncDown();
else if (action === 'sync') syncWork();
else fail('未知命令。请使用 npm run work:start、npm run sync:down 或 npm run sync:up -- "本次修改说明"。');
