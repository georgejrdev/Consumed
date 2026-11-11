import type Database from 'better-sqlite3';
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { SCHEMA_SQL } from './schema';

export interface Migration {
  version: number;
  description: string;
  up(db: Database.Database): void;
}

/**
 * Lista append-only. Nunca edite uma migração já publicada; acrescente a próxima.
 * Cada passo deve preservar os dados da versão anterior.
 */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'adiciona reading_status a cofres anteriores ao versionamento',
    up(db): void {
      const columns = db.prepare('PRAGMA table_info(item)').all() as { name: string }[];

      if (!columns.some((column) => column.name === 'reading_status')) {
        db.exec('ALTER TABLE item ADD COLUMN reading_status TEXT');
      }

      db.exec(
        "UPDATE item SET reading_status = 'lido' WHERE type = 'livro' AND reading_status IS NULL",
      );
    },
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (latest, migration) => Math.max(latest, migration.version),
  0,
);

const BACKUP_LIMIT = 3;

export class SchemaTooNewError extends Error {
  constructor(version: number) {
    super(
      `Este cofre foi usado por uma versão mais nova do Consumed (schema ${version}). Atualize o aplicativo para continuar.`,
    );
    this.name = 'SchemaTooNewError';
  }
}

function hasItemTable(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'item'")
    .get() as { name: string } | undefined;

  return row !== undefined;
}

function schemaVersion(db: Database.Database): number {
  const value = db.pragma('user_version', { simple: true });

  return typeof value === 'number' ? value : 0;
}

function setSchemaVersion(db: Database.Database, version: number): void {
  db.pragma(`user_version = ${version}`);
}

function pruneBackups(backupDir: string): void {
  const backups = readdirSync(backupDir)
    .filter((name) => name.endsWith('.db'))
    .sort()
    .reverse();

  for (const name of backups.slice(BACKUP_LIMIT)) {
    rmSync(join(backupDir, name), { force: true });
  }
}

function backupBeforeMigration(
  db: Database.Database,
  dbPath: string,
  from: number,
  to: number,
): void {
  db.pragma('wal_checkpoint(TRUNCATE)');

  const backupDir = join(dirname(dbPath), 'backups');
  mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `${basename(dbPath, '.db')}-v${from}-to-v${to}-${stamp}.db`;

  copyFileSync(dbPath, join(backupDir, name));
  pruneBackups(backupDir);
}

export function applyMigrations(db: Database.Database, dbPath: string): void {
  const existed = hasItemTable(db);
  const current = schemaVersion(db);

  if (existed && current > LATEST_SCHEMA_VERSION) {
    throw new SchemaTooNewError(current);
  }

  db.exec(SCHEMA_SQL);

  if (!existed) {
    setSchemaVersion(db, LATEST_SCHEMA_VERSION);
    return;
  }

  if (current === LATEST_SCHEMA_VERSION) {
    return;
  }

  backupBeforeMigration(db, dbPath, current, LATEST_SCHEMA_VERSION);

  const pending = MIGRATIONS.filter((migration) => migration.version > current).sort(
    (left, right) => left.version - right.version,
  );

  db.transaction(() => {
    for (const migration of pending) {
      migration.up(db);
      setSchemaVersion(db, migration.version);
    }
  })();

  const check = db.pragma('quick_check', { simple: true });

  if (check !== 'ok') {
    throw new Error('A verificação de integridade do banco falhou após a migração.');
  }
}
