import { spawnSync } from 'node:child_process';

const EXPECTED_BRANCH = 'main';
const EXPECTED_REMOTE = 'git@github.com:lichaotao-gif/owlmate-claw.git';

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
  if (remote !== EXPECTED_REMOTE) {
    fail(`当前 origin 是 ${remote || '未知'}，不是 OwlMate 仓库 ${EXPECTED_REMOTE}。`);
  }
}

function workingTreeStatus() {
  return run('git', ['status', '--porcelain'], { capture: true });
}

function startWork() {
  verifyRepository();
  if (workingTreeStatus()) {
    fail('检测到尚未同步的本机修改。请先运行 npm run sync:up -- "本次修改说明"，或自行处理这些修改。');
  }

  console.log('\n正在同步 OwlMate main 分支…');
  run('git', ['pull', '--ff-only', 'origin', EXPECTED_BRANCH]);

  console.log('\n正在检查项目依赖…');
  run('npm', ['install']);

  console.log('\nOwlMate 本地预览：http://localhost:3018/\n');
  run('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '3018']);
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
    run('git', ['commit', '-m', message]);
  } else {
    console.log('本机没有新的文件修改，将同步已有提交。');
  }

  console.log('\n正在合并 GitHub main 的最新提交…');
  run('git', ['pull', '--rebase', 'origin', EXPECTED_BRANCH]);

  console.log('\n正在推送到 GitHub main…');
  run('git', ['push', 'origin', EXPECTED_BRANCH]);
  console.log('\n同步完成。可以安全切换到其他电脑。\n');
}

const action = process.argv[2];
if (action === 'start') startWork();
else if (action === 'sync') syncWork();
else fail('未知命令。请使用 npm run work:start 或 npm run sync:up -- "本次修改说明"。');
