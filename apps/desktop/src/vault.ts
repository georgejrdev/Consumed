import { closeSync, existsSync, mkdirSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function ensureVault(dir: string): void {
  mkdirSync(join(dir, 'imagens'), { recursive: true });

  const dbPath = join(dir, 'consumed.db');

  if (!existsSync(dbPath)) {
    closeSync(openSync(dbPath, 'a'));
  }
}

export function isUsableVault(dir: string): boolean {
  const probePath = join(dir, `.consumed-write-probe-${process.pid}-${Date.now()}`);

  try {
    ensureVault(dir);
    writeFileSync(probePath, '');
    rmSync(probePath, { force: true });
    return true;
  } catch {
    return false;
  }
}
