import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron';
import { randomUUID } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Item, Result, ValidationError } from '@consumed/contract';
import { ItemRepository, RepositoryError } from './db/repository';
import type { ListOptions, VaultInfo } from './types';
import { ensureVault, isUsableVault, isWritableDirectory, vaultExists } from './vault';
import {
  classifyVersionChange,
  readVaultUsage,
  recordVaultUsage,
  type VersionChange,
} from './vault-meta';

const DEV_SERVER_URL = 'http://localhost:4200';

const MEDIA_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

let currentVaultPath: string | null = null;
let currentVaultInfo: VaultInfo | null = null;
let currentRepository: ItemRepository | null = null;
let bootVaultError: string | null = null;

function touchVaultUsage(): void {
  if (currentVaultPath !== null) {
    recordVaultUsage(currentVaultPath, app.getVersion());
  }
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

function failure(field: string, message: string): { ok: false; errors: ValidationError[] } {
  return { ok: false, errors: [{ field, message }] };
}

function messageOf(error: unknown): string {
  if (error instanceof RepositoryError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocorreu um erro inesperado.';
}

function repositoryOrFailure(): Result<ItemRepository> {
  if (currentRepository === null) {
    return failure('vault', 'Escolha a pasta do cofre primeiro.');
  }
  return success(currentRepository);
}

function vaultConfigPath(): string {
  return join(app.getPath('userData'), 'vault.json');
}

function readStoredVault(): string | null {
  try {
    const raw = readFileSync(vaultConfigPath(), 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed === 'object' && parsed !== null && 'path' in parsed) {
      const path = parsed.path;
      return typeof path === 'string' && path !== '' ? path : null;
    }

    return null;
  } catch {
    return null;
  }
}

function persistVault(dir: string): void {
  mkdirSync(app.getPath('userData'), { recursive: true });
  writeFileSync(vaultConfigPath(), JSON.stringify({ path: dir }), 'utf-8');
}

interface OpenVaultOptions {
  create?: boolean;
  persist?: boolean;
}

function openVault(dir: string, options: OpenVaultOptions = {}): Result<VaultInfo> {
  const create = options.create ?? true;
  const persist = options.persist ?? true;

  if (!create) {
    if (!vaultExists(dir)) {
      return failure('vault', 'A pasta do cofre salva não existe mais. Escolha outra pasta.');
    }

    if (!isUsableVault(dir)) {
      return failure('vault', 'A pasta do cofre salva não permite escrita. Escolha outra pasta.');
    }
  } else if (!isWritableDirectory(dir)) {
    return failure('vault', 'A pasta escolhida não permite escrita. Escolha outra pasta.');
  }

  const appVersion = app.getVersion();
  const usage = readVaultUsage(dir);
  const versionChange: VersionChange | null = classifyVersionChange(
    appVersion,
    usage.lastAppVersion,
  );
  let next: ItemRepository | null = null;

  try {
    ensureVault(dir);
    next = new ItemRepository(join(dir, 'consumed.db'));
    next.migrate();

    if (persist) {
      persistVault(dir);
    }

    const previous = currentRepository;
    currentRepository = next;
    currentVaultPath = dir;
    currentVaultInfo = {
      path: dir,
      appVersion,
      previousAppVersion: usage.lastAppVersion,
      versionChange,
    };
    bootVaultError = null;
    next = null;
    previous?.close();
    recordVaultUsage(dir, appVersion);

    return success(currentVaultInfo);
  } catch (error) {
    next?.close();
    return failure('vault', messageOf(error));
  }
}

function readListOptions(value: unknown): ListOptions {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const options: ListOptions = {};

  if (raw['type'] === 'filme' || raw['type'] === 'livro') {
    options.type = raw['type'];
  }
  if (typeof raw['q'] === 'string' && raw['q'].trim() !== '') {
    options.q = raw['q'];
  }
  if (typeof raw['limit'] === 'number' && Number.isInteger(raw['limit']) && raw['limit'] > 0) {
    options.limit = raw['limit'];
  }
  if (typeof raw['offset'] === 'number' && Number.isInteger(raw['offset']) && raw['offset'] >= 0) {
    options.offset = raw['offset'];
  }
  if (raw['onlyConsumed'] === true) {
    options.onlyConsumed = true;
  }

  return options;
}

async function handleMediaRequest(request: Request): Promise<Response> {
  try {
    const vault = currentVaultPath;

    if (vault === null) {
      return new Response('Cofre não configurado.', { status: 404 });
    }

    const url = new URL(request.url);
    const imagensDir = resolve(vault, 'imagens');
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');

    if (url.hostname !== 'vault') {
      return new Response('Arquivo não encontrado.', { status: 404 });
    }

    if (relative === '') {
      return new Response('Arquivo não encontrado.', { status: 404 });
    }

    const target = resolve(imagensDir, relative);

    if (!target.startsWith(imagensDir + sep)) {
      return new Response('Acesso negado.', { status: 403 });
    }

    const realDir = realpathSync(imagensDir);
    const realTarget = realpathSync(target);

    if (!realTarget.startsWith(realDir + sep)) {
      return new Response('Acesso negado.', { status: 403 });
    }

    const contents = await readFile(realTarget);
    const contentType =
      MEDIA_MIME_TYPES[extname(realTarget).toLowerCase()] ?? 'application/octet-stream';

    return new Response(new Uint8Array(contents), {
      status: 200,
      headers: { 'content-type': contentType },
    });
  } catch {
    return new Response('Arquivo não encontrado.', { status: 404 });
  }
}

function removeVaultImage(vault: string, imagePath: string | undefined): void {
  if (imagePath === undefined) {
    return;
  }

  const imagensDir = resolve(vault, 'imagens');
  const target = resolve(vault, imagePath);

  if (!target.startsWith(imagensDir + sep)) {
    return;
  }

  try {
    unlinkSync(target);
  } catch {
    // imagem já ausente; nada a fazer
  }
}

function registerMediaProtocol(): void {
  protocol.handle('media', (request) => handleMediaRequest(request));
}

function registerIpcHandlers(): void {
  ipcMain.handle('vault:choose', async (): Promise<Result<VaultInfo | null>> => {
    const selection = await dialog.showOpenDialog({ properties: ['openDirectory'] });

    if (selection.canceled) {
      return success(null);
    }

    const dir = selection.filePaths[0];

    if (dir === undefined) {
      return success(null);
    }

    return openVault(dir);
  });

  ipcMain.handle('vault:current', (): Result<VaultInfo | null> => {
    if (currentVaultInfo === null) {
      if (bootVaultError !== null) {
        return failure('vault', bootVaultError);
      }

      return success(null);
    }

    return success(currentVaultInfo);
  });

  ipcMain.handle('items:list', (_event, query: unknown): Result<Item[]> => {
    const repository = repositoryOrFailure();

    if (!repository.ok) {
      return repository;
    }

    try {
      return success(repository.value.list(readListOptions(query)));
    } catch (error) {
      return failure('database', messageOf(error));
    }
  });

  ipcMain.handle('items:get', (_event, id: unknown): Result<Item | null> => {
    if (typeof id !== 'string' || id === '') {
      return failure('id', 'Identificador inválido.');
    }

    const repository = repositoryOrFailure();

    if (!repository.ok) {
      return repository;
    }

    try {
      return success(repository.value.get(id));
    } catch (error) {
      return failure('database', messageOf(error));
    }
  });

  ipcMain.handle('items:create', (_event, input: unknown): Result<Item> => {
    const repository = repositoryOrFailure();

    if (!repository.ok) {
      return repository;
    }

    try {
      const result = repository.value.create(input);

      if (result.ok) {
        touchVaultUsage();
      }

      return result;
    } catch (error) {
      return failure('database', messageOf(error));
    }
  });

  ipcMain.handle('items:update', (_event, id: unknown, input: unknown): Result<Item> => {
    if (typeof id !== 'string' || id === '') {
      return failure('id', 'Identificador inválido.');
    }

    const repository = repositoryOrFailure();

    if (!repository.ok) {
      return repository;
    }

    const previousImage = repository.value.get(id)?.image_path;

    try {
      const result = repository.value.update(id, input);

      if (result.ok) {
        if (
          currentVaultPath !== null &&
          previousImage !== undefined &&
          previousImage !== result.value.image_path
        ) {
          removeVaultImage(currentVaultPath, previousImage);
        }

        touchVaultUsage();
      }

      return result;
    } catch (error) {
      return failure('database', messageOf(error));
    }
  });

  ipcMain.handle('items:suggestions', (_event, type: unknown): Result<Record<string, string[]>> => {
    if (type !== 'filme' && type !== 'livro') {
      return failure('type', 'O tipo deve ser "filme" ou "livro".');
    }

    const repository = repositoryOrFailure();

    if (!repository.ok) {
      return repository;
    }

    try {
      return success({ ...repository.value.suggestions(type) });
    } catch (error) {
      return failure('database', messageOf(error));
    }
  });

  ipcMain.handle('items:delete', (_event, id: unknown): Result<{ id: string }> => {
    if (typeof id !== 'string' || id === '') {
      return failure('id', 'Identificador inválido.');
    }

    const repository = repositoryOrFailure();

    if (!repository.ok) {
      return repository;
    }

    const existing = repository.value.get(id);

    try {
      const result = repository.value.delete(id);

      if (result.ok) {
        if (currentVaultPath !== null) {
          removeVaultImage(currentVaultPath, existing?.image_path);
        }

        touchVaultUsage();
      }

      return result;
    } catch (error) {
      return failure('database', messageOf(error));
    }
  });

  ipcMain.handle('items:importImage', async (): Promise<Result<{ path: string } | null>> => {
    const repository = repositoryOrFailure();

    if (!repository.ok) {
      return repository;
    }

    const vault = currentVaultPath;

    if (vault === null) {
      return failure('vault', 'Escolha a pasta do cofre primeiro.');
    }

    const selection = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    });

    if (selection.canceled) {
      return success(null);
    }

    const source = selection.filePaths[0];

    if (source === undefined) {
      return success(null);
    }

    try {
      const imagensDir = join(vault, 'imagens');
      mkdirSync(imagensDir, { recursive: true });

      const fileName = `${randomUUID()}${extname(source).toLowerCase()}`;
      copyFileSync(source, join(imagensDir, fileName));
      touchVaultUsage();

      return success({ path: join('imagens', fileName) });
    } catch (error) {
      return failure('image', messageOf(error));
    }
  });
}

function isAllowedNavigation(url: string): boolean {
  if (!app.isPackaged && url.startsWith(DEV_SERVER_URL)) {
    return true;
  }

  const root =
    process.env['CONSUMED_RENDERER_DIR'] ??
    (app.isPackaged ? join(process.resourcesPath, 'renderer') : null);

  if (root === null) {
    return false;
  }

  const prefix = pathToFileURL(root).href.replace(/\/?$/, '/');

  return url.startsWith(prefix);
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
    }
  });
  window.webContents.on('will-frame-navigate', (event) => {
    if (!isAllowedNavigation(event.url)) {
      event.preventDefault();
    }
  });

  const rendererDir = process.env['CONSUMED_RENDERER_DIR'];

  if (rendererDir !== undefined) {
    void window.loadFile(join(rendererDir, 'index.html'));
    return;
  }

  if (app.isPackaged) {
    void window.loadFile(join(process.resourcesPath, 'renderer', 'index.html'));
    return;
  }

  void window.loadURL(DEV_SERVER_URL);
}

void app.whenReady().then(() => {
  const envVault = process.env['CONSUMED_VAULT_DIR'];
  let bootResult: Result<VaultInfo | null> = success(null);

  if (envVault !== undefined && envVault.trim() !== '') {
    // Usado por testes E2E e por quem quer abrir um cofre específico sem passar pelo diálogo.
    bootResult = openVault(envVault.trim(), { persist: false });
  } else {
    const storedVault = readStoredVault();

    if (storedVault !== null) {
      bootResult = openVault(storedVault, { create: false });
    }
  }

  if (!bootResult.ok) {
    bootVaultError =
      bootResult.errors[0]?.message ?? 'Não foi possível abrir a pasta do cofre salva.';
  }

  registerMediaProtocol();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  currentRepository?.close();
  currentRepository = null;
});
