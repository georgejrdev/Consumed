import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

export function ensureVault(dir: string): void {
  mkdirSync(join(dir, 'imagens'), { recursive: true });

  const dbPath = join(dir, 'consumed.db');

  if (!existsSync(dbPath)) {
    closeSync(openSync(dbPath, 'a'));
  }
}

export function vaultExists(dir: string): boolean {
  try {
    if (!statSync(dir).isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }

  return existsSync(join(dir, 'consumed.db'));
}

export function isWritableDirectory(dir: string): boolean {
  const probePath = join(dir, `.consumed-write-probe-${process.pid}-${Date.now()}`);

  try {
    if (!statSync(dir).isDirectory()) {
      return false;
    }

    writeFileSync(probePath, '');
    rmSync(probePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

export function isUsableVault(dir: string): boolean {
  return vaultExists(dir) && isWritableDirectory(dir);
}
