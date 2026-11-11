import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..');
const rendererDir = join(repoRoot, 'apps/web/dist/web/browser');
const appVersion = (
  JSON.parse(readFileSync(join(repoRoot, 'apps/desktop/package.json'), 'utf-8')) as {
    version: string;
  }
).version;

const apps: ElectronApplication[] = [];
const tempDirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function launch(
  options: { vault?: string; storedVault?: string; storedVersion?: string } = {},
): Promise<ElectronApplication> {
  const userData = tempDir('consumed-userdata-');

  if (options.storedVault !== undefined) {
    writeFileSync(
      join(userData, 'vault.json'),
      JSON.stringify({ path: options.storedVault }),
      'utf-8',
    );
  }

  if (options.vault !== undefined && options.storedVersion !== undefined) {
    writeFileSync(
      join(options.vault, '.consumed-meta.json'),
      JSON.stringify({ last_app_version: options.storedVersion }),
      'utf-8',
    );
  }

  const app = await electron.launch({
    args: ['apps/desktop', '--no-sandbox', `--user-data-dir=${userData}`],
    cwd: repoRoot,
    env: {
      ...process.env,
      CONSUMED_RENDERER_DIR: rendererDir,
      CONSUMED_VAULT_DIR: options.vault ?? '',
    },
  });

  apps.push(app);
  return app;
}

test.afterEach(async () => {
  for (const app of apps.splice(0)) {
    await app.close();
  }

  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('primeira execução pede a pasta do cofre', async () => {
  const app = await launch();
  const window = await app.firstWindow();

  await expect(window.getByRole('button', { name: 'Escolher pasta do cofre' })).toBeVisible();
  await expect(window.getByRole('heading', { name: 'Bem-vindo ao Consumed' })).toBeVisible();
});

test('cofre salvo apagado pede uma nova pasta sem recriar a antiga', async () => {
  const deleted = join(tempDir('consumed-gone-'), 'cofre-apagado');
  const app = await launch({ storedVault: deleted });
  const window = await app.firstWindow();

  await expect(window.getByRole('button', { name: 'Escolher pasta do cofre' })).toBeVisible();
  await expect(window.getByRole('alert')).toContainText('não existe mais');
  expect(existsSync(deleted)).toBe(false);
});

test('avisa quando o cofre foi usado por uma versão anterior', async () => {
  const vault = tempDir('consumed-vault-');
  const app = await launch({ vault, storedVersion: '0.0.0' });
  const window = await app.firstWindow();
  const notice = window.locator('.version-notice');

  await expect(notice).toBeVisible();
  await expect(notice).toContainText('0.0.0');
  await expect(notice).toContainText(appVersion);

  await window.getByRole('button', { name: 'Entendi' }).click();
  await expect(notice).toHaveCount(0);
});

test('cadastra um livro com ano a.C. e exibe o sufixo no card e no detalhe', async () => {
  const vault = tempDir('consumed-vault-');
  const app = await launch({ vault });
  const window = await app.firstWindow();

  await window.getByRole('button', { name: '+ Adicionar' }).click();

  const dialog = window.getByRole('dialog');
  await dialog.getByLabel('Tipo').selectOption('livro');
  await dialog.getByLabel('Título').fill('A República');
  await dialog.getByLabel('Ano').fill('-380');

  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toBeHidden();

  await expect(window.locator('app-item-card').filter({ hasText: '380 a.C.' })).toBeVisible();

  await window.locator('app-item-card').filter({ hasText: 'A República' }).click();

  await expect(window.getByText('380 a.C.')).toBeVisible();
});

test('cadastra, abre, edita e exclui um livro pelo aplicativo', async () => {
  const vault = tempDir('consumed-vault-');
  const app = await launch({ vault });
  const window = await app.firstWindow();

  await expect(window.getByText('ÚLTIMOS 5 LIVROS LIDOS')).toBeVisible();
  await expect(window.getByText('Nenhum livro registrado ainda.')).toBeVisible();

  await window.getByRole('button', { name: '+ Adicionar' }).click();

  const dialog = window.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Tipo').selectOption('livro');
  await dialog.getByLabel('Título').fill('A Ilha Misteriosa');
  await dialog.getByLabel('Estado').selectOption('lido');
  await dialog.getByLabel('Início da leitura').fill('2026-04-20');
  await dialog.getByLabel('Fim da leitura').fill('2026-05-01');

  const author = dialog.getByLabel('Autor');
  await author.fill('Júlio Verne');
  await author.press('Enter');

  await dialog.getByLabel('Editora').fill('Principis');
  await dialog.getByLabel('Páginas').fill('303');
  await dialog.getByLabel('Nota').selectOption('9');

  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toBeHidden();

  await expect(window.locator('.shelf').filter({ hasText: 'A Ilha Misteriosa' })).toBeVisible();

  await window.locator('app-item-card').filter({ hasText: 'A Ilha Misteriosa' }).click();

  await expect(window.getByRole('heading', { name: 'A Ilha Misteriosa' })).toBeVisible();
  await expect(window.getByText('Júlio Verne')).toBeVisible();
  await expect(window.getByText('Início da leitura:')).toBeVisible();
  await expect(window.getByText('Fim da leitura:')).toBeVisible();
  await expect(window.getByText('01/05/2026')).toBeVisible();
  await expect(window.getByText('Lido em:')).toHaveCount(0);

  await window.getByRole('button', { name: 'Editar' }).click();
  const editDialog = window.getByRole('dialog');
  await editDialog.getByLabel('Título').fill('A Ilha Misteriosa (edição)');
  await editDialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(window.getByRole('heading', { name: 'A Ilha Misteriosa (edição)' })).toBeVisible();

  await window.getByRole('button', { name: 'Excluir' }).click();
  await window.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();

  await expect(window.getByText('Nenhum item encontrado.')).toBeVisible();
  await expect(window.getByText('A Ilha Misteriosa (edição)')).toHaveCount(0);
});
