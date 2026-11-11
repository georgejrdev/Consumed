import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  VAULT_META_FILE,
  classifyVersionChange,
  compareVersions,
  isValidVersion,
  readVaultUsage,
  recordVaultUsage,
} from './vault-meta';

const created: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'consumed-meta-'));
  created.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('compareVersions', () => {
  it('should compare numeric parts instead of strings', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  it('should treat a release as newer than a pre-release', () => {
    expect(compareVersions('1.0.0', '1.0.0-beta')).toBe(1);
    expect(compareVersions('1.0.0-beta.2', '1.0.0-beta.1')).toBe(1);
  });

  it('should validate semver values', () => {
    expect(isValidVersion('0.1.0')).toBe(true);
    expect(isValidVersion('v1.2.3')).toBe(true);
    expect(isValidVersion('1.2')).toBe(false);
    expect(isValidVersion('versão')).toBe(false);
  });
});

describe('classifyVersionChange', () => {
  it('should classify upgrade, downgrade and unchanged versions', () => {
    expect(classifyVersionChange('0.1.0', '0.0.9')).toBe('upgrade');
    expect(classifyVersionChange('0.1.0', '0.2.0')).toBe('downgrade');
    expect(classifyVersionChange('0.1.0', '0.1.0')).toBeNull();
    expect(classifyVersionChange('0.1.0', null)).toBeNull();
  });

  it('should ignore an invalid previous version', () => {
    expect(classifyVersionChange('0.1.0', 'ontem')).toBeNull();
  });
});

describe('vault usage metadata', () => {
  it('should treat a missing file as first use', () => {
    expect(readVaultUsage(tempDir())).toEqual({ lastAppVersion: null });
  });

  it('should write and read the last app version', () => {
    const dir = tempDir();

    recordVaultUsage(dir, '0.1.0');

    expect(readVaultUsage(dir).lastAppVersion).toBe('0.1.0');

    const raw = JSON.parse(readFileSync(join(dir, VAULT_META_FILE), 'utf-8')) as {
      last_opened_at?: unknown;
    };

    expect(typeof raw.last_opened_at).toBe('string');
  });

  it('should ignore an invalid metadata file', () => {
    const dir = tempDir();
    writeFileSync(join(dir, VAULT_META_FILE), '{"last_app_version":"ontem"}', 'utf-8');

    expect(readVaultUsage(dir)).toEqual({ lastAppVersion: null });
  });
});
