import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureVault, isUsableVault } from './vault';

const created: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'consumed-vault-'));
  created.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    try {
      chmodSync(dir, 0o755);
    } catch {
      // diretório já removido ou sem permissão para alterar
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('ensureVault', () => {
  it('cria a pasta de imagens e o banco numa pasta vazia', () => {
    const dir = tempDir();

    ensureVault(dir);

    expect(existsSync(join(dir, 'imagens'))).toBe(true);
    expect(existsSync(join(dir, 'consumed.db'))).toBe(true);
  });

  it('não trunca o banco existente ao ser chamado de novo', () => {
    const dir = tempDir();

    ensureVault(dir);
    ensureVault(dir);

    expect(existsSync(join(dir, 'consumed.db'))).toBe(true);
  });
});

describe('isUsableVault', () => {
  it('aceita uma pasta em que se pode escrever e já prepara o cofre', () => {
    const dir = tempDir();

    expect(isUsableVault(dir)).toBe(true);
    expect(existsSync(join(dir, 'consumed.db'))).toBe(true);
  });

  it('rejeita um caminho que é um arquivo, não uma pasta', () => {
    const dir = tempDir();
    const filePath = join(dir, 'arquivo-em-vez-de-pasta');

    writeFileSync(filePath, '');

    expect(isUsableVault(filePath)).toBe(false);
  });
});
