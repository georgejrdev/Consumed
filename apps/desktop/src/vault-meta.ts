import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const VAULT_META_FILE = '.consumed-meta.json';

export type VersionChange = 'upgrade' | 'downgrade';

interface ParsedVersion {
  core: [number, number, number];
  prerelease: string[];
}

interface VaultMetaFile {
  last_app_version?: unknown;
}

export interface VaultUsage {
  lastAppVersion: string | null;
}

function parseVersion(value: string): ParsedVersion | null {
  const trimmed = value.trim().replace(/^v/i, '');
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(trimmed);

  if (match === null) {
    return null;
  }

  const [, major = '0', minor = '0', patch = '0', prerelease] = match;
  const core: [number, number, number] = [Number(major), Number(minor), Number(patch)];

  if (core.some((part) => !Number.isSafeInteger(part))) {
    return null;
  }

  return {
    core,
    prerelease: prerelease === undefined ? [] : prerelease.split('.'),
  };
}

export function isValidVersion(value: string): boolean {
  return parseVersion(value) !== null;
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }

  // Sem pré-lançamento é sempre maior que com pré-lançamento (1.0.0 > 1.0.0-beta).
  if (left.length === 0) {
    return 1;
  }

  if (right.length === 0) {
    return -1;
  }

  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];

    if (leftPart === undefined) {
      return -1;
    }

    if (rightPart === undefined) {
      return 1;
    }

    if (leftPart === rightPart) {
      continue;
    }

    const leftNumber = /^\d+$/.test(leftPart) ? Number(leftPart) : null;
    const rightNumber = /^\d+$/.test(rightPart) ? Number(rightPart) : null;

    if (leftNumber !== null && rightNumber !== null) {
      return leftNumber < rightNumber ? -1 : 1;
    }

    if (leftNumber !== null) {
      return -1;
    }

    if (rightNumber !== null) {
      return 1;
    }

    return leftPart.localeCompare(rightPart, 'en');
  }

  return 0;
}

export function compareVersions(left: string, right: string): number {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);

  if (leftVersion === null || rightVersion === null) {
    return left.localeCompare(right, 'en');
  }

  for (let index = 0; index < 3; index += 1) {
    const leftPart = leftVersion.core[index] ?? 0;
    const rightPart = rightVersion.core[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart < rightPart ? -1 : 1;
    }
  }

  return comparePrerelease(leftVersion.prerelease, rightVersion.prerelease);
}

export function classifyVersionChange(
  current: string,
  previous: string | null,
): VersionChange | null {
  if (previous === null || !isValidVersion(current) || !isValidVersion(previous)) {
    return null;
  }

  const comparison = compareVersions(current, previous);

  if (comparison > 0) {
    return 'upgrade';
  }

  if (comparison < 0) {
    return 'downgrade';
  }

  return null;
}

export function readVaultUsage(vault: string): VaultUsage {
  try {
    const raw = readFileSync(join(vault, VAULT_META_FILE), 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed === 'object' && parsed !== null) {
      const version = (parsed as VaultMetaFile).last_app_version;

      if (typeof version === 'string' && isValidVersion(version)) {
        return { lastAppVersion: version.trim() };
      }
    }
  } catch {
    // Arquivo ausente ou inválido: trata como primeiro uso do cofre.
  }

  return { lastAppVersion: null };
}

export function recordVaultUsage(vault: string, appVersion: string): void {
  try {
    writeFileSync(
      join(vault, VAULT_META_FILE),
      `${JSON.stringify(
        {
          last_app_version: appVersion,
          last_opened_at: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      'utf-8',
    );
  } catch {
    // O metadado é informativo e não deve impedir o uso do cofre.
  }
}
