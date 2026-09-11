import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve('.');
const PREVIEW_URL = 'http://localhost:3018/';
const DEV_SERVER_FILE = resolve('.owlmate-dev-server.json');
const DEV_COMMAND_MARKERS = ['npm run dev', '127.0.0.1', '3018'];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) process.exit(result.status ?? 1);
  if (options.capture) return (result.stdout ?? '').trim();
  return result.status ?? 1;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

function currentBranch() {
  const branch = run('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], { capture: true, allowFailure: true });
  if (!branch) fail('当前不在可同步的本地分支上，已停止。');
  return branch;
}

function workingTreeStatus() {
  return run('git', ['status', '--porcelain'], { capture: true });
}

function ensureSshOrigin() {
  const remote = run('git', ['remote', 'get-url', 'origin'], { capture: true, allowFailure: true });
  if (!remote) fail('当前项目没有 origin 远程仓库，已停止。');

  if (/^git@github\.com:[^/\s]+\/[^/\s]+\.git$/.test(remote)) {
    console.log(`GitHub SSH：${remote}`);
    return remote;
  }

  const match = remote.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
  if (!match) fail(`origin 不是受支持的 GitHub 地址：${remote}`);

  const sshRemote = `git@github.com:${match[1]}/${match[2]}.git`;
  run('git', ['remote', 'set-url', 'origin', sshRemote]);
  console.log(`已将 origin 转换为 SSH：${sshRemote}`);
  return sshRemote;
}

function ensureDependencies() {
  if (existsSync(resolve('node_modules/.bin/vinext'))) {
    console.log('项目依赖已经就绪。');
    return;
  }

  console.log('检测到缺少依赖，正在按照 pnpm-lock.yaml 安装锁定版本…');
  run('pnpm', ['install', '--frozen-lockfile']);
}

function syncDown() {
  const branch = currentBranch();
  if (workingTreeStatus()) {
    fail('检测到未提交修改，已停止同步。请先运行 npm run sync:up -- "本次修改说明"，或自行处理这些修改。');
  }

  ensureSshOrigin();
  console.log(`\n正在通过 SSH 同步 ${branch} 分支…`);
  run('git', ['pull', '--ff-only', 'origin', branch]);
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

function removeDevServerFile() {
  if (existsSync(DEV_SERVER_FILE)) unlinkSync(DEV_SERVER_FILE);
}

function readDevServerRecord() {
  if (!existsSync(DEV_SERVER_FILE)) return null;
  try {
    const record = JSON.parse(readFileSync(DEV_SERVER_FILE, 'utf8'));
    if (!Number.isInteger(record.pid) || record.pid <= 1) throw new Error('invalid pid');
    return record;
  } catch {
    removeDevServerFile();
    console.warn('开发服务记录无效，已清理；未终止任何进程。');
    return null;
  }
}

function processWorkingDirectory(pid) {
  const procCwd = `/proc/${pid}/cwd`;
  try {
    if (existsSync(procCwd)) return resolve(readlinkSync(procCwd));
  } catch {
    return '';
  }

  const result = spawnSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status !== 0) return '';
  const line = (result.stdout ?? '').split('\n').find((item) => item.startsWith('n'));
  return line ? resolve(line.slice(1)) : '';
}

function confirmedDevProcess(record) {
  if (!record || (record.projectRoot && resolve(record.projectRoot) !== PROJECT_ROOT)) return false;
  const command = run('ps', ['-p', String(record.pid), '-o', 'command='], { capture: true, allowFailure: true });
  if (!DEV_COMMAND_MARKERS.every((marker) => command.includes(marker))) return false;
  return processWorkingDirectory(record.pid) === PROJECT_ROOT;
}

async function waitForPreview(child) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null) fail(`开发服务提前退出，退出码：${child.exitCode}`);
    try {
      const response = await fetch(PREVIEW_URL);
      if (response.ok) return;
    } catch {
      // 服务尚未就绪，继续等待。
    }
    await delay(500);
  }
  if (child) process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGTERM');
  fail(`首页在 60 秒内未能正常加载：${PREVIEW_URL}`);
}

async function startWork() {
  syncDown();

  const existing = readDevServerRecord();
  if (existing && confirmedDevProcess(existing)) {
    await waitForPreview();
    console.log(`\n本项目开发服务已在运行（PID ${existing.pid}）。`);
  } else {
    if (existing) {
      removeDevServerFile();
      console.warn('旧的进程记录无法确认属于本项目，已忽略；未终止任何进程。');
    }

    console.log(`\n正在启动 OwlMate 本地预览：${PREVIEW_URL}\n`);
    const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '3018', '--strictPort'], {
      cwd: PROJECT_ROOT,
      detached: process.platform !== 'win32',
      stdio: 'inherit',
    });
    child.once('exit', removeDevServerFile);
    writeFileSync(DEV_SERVER_FILE, `${JSON.stringify({ pid: child.pid, url: PREVIEW_URL, projectRoot: PROJECT_ROOT, startedAt: new Date().toISOString() })}\n`);

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
  }

  console.log(`\n首页加载检查通过：${PREVIEW_URL}`);
  openBrowser(PREVIEW_URL);
  console.log('开发服务将保持运行；结束工作时会自动停止。\n');
}

function stagedUnsafeFiles() {
  const output = run('git', ['diff', '--cached', '--name-only', '-z'], { capture: true });
  const files = output.split('\0').filter(Boolean);
  const unsafe = /(^|\/)(\.env(?:\.[^/]*)?|node_modules|dist|coverage|\.next|\.work|\.playwright-cli|\.owlmate-dev-server\.json)(\/|$)|(^|\/)[^/]*\.(?:pem|key|p12|pfx)$|(^|\/)(?:credentials|secrets?)(?:\.|\/|$)/i;
  return files.filter((file) => unsafe.test(file));
}

function stopDevServer() {
  const record = readDevServerRecord();
  if (!record) {
    console.log('没有检测到由本项目 work:start 启动的开发服务。');
    return;
  }

  if (!confirmedDevProcess(record)) {
    console.warn(`无法确认 PID ${record.pid} 属于当前项目，未停止任何进程。`);
    return;
  }

  const pgid = Number(run('ps', ['-p', String(record.pid), '-o', 'pgid='], { capture: true, allowFailure: true }));
  try {
    if (process.platform !== 'win32' && pgid === record.pid) process.kill(-record.pid, 'SIGTERM');
    else process.kill(record.pid, 'SIGTERM');
    console.log(`已精确停止本次工作启动的开发服务（PID ${record.pid}）。`);
    removeDevServerFile();
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
    removeDevServerFile();
  }
}

function syncWork() {
  const branch = currentBranch();
  ensureSshOrigin();
  const message = process.argv.slice(3).join(' ').trim();
  if (!message) fail('请填写本次中文修改说明，例如：npm run sync:up -- "优化首页布局"');
  if (!/[\u3400-\u9fff]/u.test(message)) fail('Git 提交说明必须包含中文。');

  console.log('\n正在执行代码检查…');
  run('npm', ['run', 'lint']);
  console.log('\n正在检查 TypeScript…');
  run('npx', ['tsc', '--noEmit']);
  console.log('\n正在执行生产构建…');
  run('npm', ['run', 'build']);

  if (workingTreeStatus()) {
    run('git', ['add', '-A']);
    const unsafeFiles = stagedUnsafeFiles();
    if (unsafeFiles.length) {
      console.error('\n发现不应提交的敏感文件、缓存或构建产物：');
      console.error(unsafeFiles.join('\n'));
      fail('已停止提交，请检查文件并补充 .gitignore。');
    }
    run('git', ['diff', '--cached', '--check']);
    run('git', ['commit', '-m', message]);
  } else {
    console.log('本机没有新的文件修改，不创建空提交。');
  }

  console.log(`\n正在通过 SSH 合并 GitHub ${branch} 的最新提交…`);
  run('git', ['pull', '--rebase', 'origin', branch]);
  console.log(`\n正在通过 SSH 推送到 GitHub ${branch}…`);
  run('git', ['push', 'origin', branch]);

  const commit = run('git', ['rev-parse', '--short', 'HEAD'], { capture: true });
  console.log(`\n同步完成：${commit} 已推送到 origin/${branch}。`);
  stopDevServer();
  console.log('可以安全切换到其他电脑。\n');
}

const action = process.argv[2];
if (action === 'start') await startWork();
else if (action === 'down') syncDown();
else if (action === 'sync') syncWork();
else if (action === 'stop') stopDevServer();
else fail('未知命令。请使用 npm run work:start、npm run sync:down 或 npm run sync:up -- "本次修改说明"。');
