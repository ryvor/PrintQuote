import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
function start(name, args, env = {}) {
  const child = spawn(npm, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  children.push(child);
  child.on('error', err => { console.error(`${name} failed:`, err.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 0); });
}
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  setTimeout(() => process.exit(code), 250).unref();
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
start('API', ['run', 'dev:api'], { SQLITE_PATH: path.join(root, 'server', 'printquote-dev.sqlite') });
start('Vue', ['run', 'dev:frontend']);
