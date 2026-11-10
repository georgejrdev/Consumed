import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const DEV_SERVER_URL = 'http://localhost:4200';
const READY_TIMEOUT_MS = 90_000;

const children = new Set();

function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

function shutdown(code) {
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(code);
}

async function waitForServer(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // servidor ainda não subiu
    }
    await sleep(300);
  }

  return false;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const server = run('npm', ['run', 'start', '--workspace', '@consumed/web', '--', '--port', '4200']);

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`O servidor de desenvolvimento terminou com código ${code}.`);
    shutdown(code ?? 1);
  }
});

const ready = await waitForServer(DEV_SERVER_URL, READY_TIMEOUT_MS);

if (!ready) {
  console.error(`O Angular não respondeu em ${DEV_SERVER_URL} dentro do tempo limite.`);
  shutdown(1);
}

const electron = run('node_modules/.bin/electron', ['apps/desktop']);

electron.on('exit', (code) => shutdown(code ?? 0));
