import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Item, ItemInput, MediaType, Result } from '@consumed/contract';
import { validateItemInput } from '@consumed/contract';
import { applyMigrations, SchemaTooNewError } from './migrations';

export interface ListOptions {
  type?: MediaType;
  q?: string;
  limit?: number;
  offset?: number;
  /** Considera apenas filmes e livros com estado "lido". */
  onlyConsumed?: boolean;
}

export interface ItemSuggestions {
  authors: string[];
  publishers: string[];
  directors: string[];
  screenplayBy: string[];
  producedBy: string[];
  distributedBy: string[];
  languages: string[];
}

export type RepositoryErrorCode =
  'DATABASE_UNAVAILABLE' | 'MIGRATION_FAILED' | 'READ_FAILED' | 'WRITE_FAILED';

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;

  constructor(code: RepositoryErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'RepositoryError';
    this.code = code;
  }
}

type SqlValue = string | number | null;

interface ItemRow {
  id: string;
  type: string;
  title: string;
  year: number | null;
  rating: number | null;
  consumed_on: string;
  notes: string | null;
  language: string | null;
  image_path: string | null;
  author: string | null;
  publisher: string | null;
  pages: number | null;
  isbn: string | null;
  reading_status: string | null;
  director: string | null;
  runtime_min: number | null;
  screenplay_by: string | null;
  produced_by: string | null;
  distributed_by: string | null;
  started_on: string | null;
  finished_on: string | null;
  created_at: string;
  updated_at: string;
}

const INSERT_SQL = `
INSERT INTO item (
  id, type, title, year, rating, consumed_on, notes, language, image_path,
  author, publisher, pages, isbn, reading_status, director, runtime_min, screenplay_by,
  produced_by, distributed_by, started_on, finished_on, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPDATE_SQL = `
UPDATE item SET
  type = ?, title = ?, year = ?, rating = ?, consumed_on = ?, notes = ?,
  language = ?, image_path = ?, author = ?, publisher = ?, pages = ?, isbn = ?,
  reading_status = ?, director = ?, runtime_min = ?, screenplay_by = ?, produced_by = ?,
  distributed_by = ?, started_on = ?, finished_on = ?, updated_at = ?
WHERE id = ?
`;

const SELECT_COLUMNS = `
  id, type, title, year, rating, consumed_on, notes, language, image_path,
  author, publisher, pages, isbn, reading_status, director, runtime_min, screenplay_by,
  produced_by, distributed_by, started_on, finished_on, created_at, updated_at
`;

function serializeNameList(names: string[] | undefined): SqlValue {
  if (names === undefined || names.length === 0) {
    return null;
  }

  return JSON.stringify(names);
}

function parseNameList(value: string | null): string[] | undefined {
  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed === '') {
    return undefined;
  }

  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        const names = parsed
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter((entry) => entry !== '');

        return names.length === 0 ? undefined : names;
      }
    } catch {
      // valor legado em texto puro; cai no split abaixo
    }
  }

  const names = trimmed
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

  return names.length === 0 ? undefined : names;
}

function todayIso(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function withDerivedConsumedOn(input: ItemInput, fallback?: string): ItemInput {
  if (input.type !== 'livro' || input.consumed_on !== undefined) {
    return input;
  }

  const derived = input.finished_on ?? input.started_on ?? fallback ?? todayIso();

  return { ...input, consumed_on: derived };
}

function toSqlValues(input: ItemInput): SqlValue[] {
  return [
    input.type,
    input.title,
    input.year ?? null,
    input.rating ?? null,
    input.consumed_on ?? todayIso(),
    input.notes ?? null,
    input.language ?? null,
    input.image_path ?? null,
    serializeNameList(input.author),
    input.publisher ?? null,
    input.pages ?? null,
    input.isbn ?? null,
    input.reading_status ?? null,
    input.director ?? null,
    input.runtime_min ?? null,
    serializeNameList(input.screenplay_by),
    serializeNameList(input.produced_by),
    serializeNameList(input.distributed_by),
    input.started_on ?? null,
    input.finished_on ?? null,
  ];
}

function toItem(row: ItemRow): Item {
  const item: Item = {
    id: row.id,
    type: row.type === 'filme' ? 'filme' : 'livro',
    title: row.title,
    consumed_on: row.consumed_on,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.year !== null) {
    item.year = row.year;
  }
  if (row.rating !== null) {
    item.rating = row.rating;
  }
  if (row.notes !== null) {
    item.notes = row.notes;
  }
  if (row.language !== null) {
    item.language = row.language;
  }
  if (row.image_path !== null) {
    item.image_path = row.image_path;
  }
  const author = parseNameList(row.author);
  if (author !== undefined) {
    item.author = author;
  }
  if (row.publisher !== null) {
    item.publisher = row.publisher;
  }
  if (row.pages !== null) {
    item.pages = row.pages;
  }
  if (row.isbn !== null) {
    item.isbn = row.isbn;
  }
  if (row.director !== null) {
    item.director = row.director;
  }
  if (row.runtime_min !== null) {
    item.runtime_min = row.runtime_min;
  }
  const screenplayBy = parseNameList(row.screenplay_by);
  if (screenplayBy !== undefined) {
    item.screenplay_by = screenplayBy;
  }
  const producedBy = parseNameList(row.produced_by);
  if (producedBy !== undefined) {
    item.produced_by = producedBy;
  }
  const distributedBy = parseNameList(row.distributed_by);
  if (distributedBy !== undefined) {
    item.distributed_by = distributedBy;
  }
  if (
    row.reading_status === 'nao_lido' ||
    row.reading_status === 'lendo' ||
    row.reading_status === 'lido'
  ) {
    item.reading_status = row.reading_status;
  }
  if (row.started_on !== null) {
    item.started_on = row.started_on;
  }
  if (row.finished_on !== null) {
    item.finished_on = row.finished_on;
  }

  return item;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export class ItemRepository {
  private readonly db: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;

    try {
      this.db = new Database(dbPath);
    } catch (error) {
      throw new RepositoryError(
        'DATABASE_UNAVAILABLE',
        `Não foi possível abrir o banco de dados em "${dbPath}". Verifique as permissões da pasta.`,
        error,
      );
    }
  }

  migrate(): void {
    try {
      applyMigrations(this.db, this.dbPath);
    } catch (error) {
      if (error instanceof SchemaTooNewError) {
        throw new RepositoryError('MIGRATION_FAILED', error.message, error);
      }

      throw new RepositoryError(
        'MIGRATION_FAILED',
        'Não foi possível preparar o banco de dados do cofre.',
        error,
      );
    }
  }

  create(input: unknown): Result<Item> {
    const validation = validateItemInput(input);

    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    try {
      this.db
        .prepare(INSERT_SQL)
        .run(id, ...toSqlValues(withDerivedConsumedOn(validation.value)), now, now);
    } catch (error) {
      throw new RepositoryError('WRITE_FAILED', 'Não foi possível salvar o item.', error);
    }

    const created = this.get(id);

    if (created === null) {
      throw new RepositoryError(
        'WRITE_FAILED',
        'O item foi gravado mas não pôde ser lido de volta.',
      );
    }

    return { ok: true, value: created };
  }

  get(id: string): Item | null {
    let row: ItemRow | undefined;

    try {
      row = this.db.prepare(`SELECT ${SELECT_COLUMNS} FROM item WHERE id = ?`).get(id) as
        ItemRow | undefined;
    } catch (error) {
      throw new RepositoryError('READ_FAILED', 'Não foi possível ler o item.', error);
    }

    return row === undefined ? null : toItem(row);
  }

  list(options: ListOptions = {}): Item[] {
    const conditions: string[] = [];
    const params: SqlValue[] = [];

    if (options.type !== undefined) {
      conditions.push('type = ?');
      params.push(options.type);
    }

    if (options.onlyConsumed === true) {
      conditions.push("(type = 'filme' OR reading_status = 'lido')");
    }

    const where = conditions.length === 0 ? '' : `WHERE ${conditions.join(' AND ')}`;
    const sql = `SELECT ${SELECT_COLUMNS} FROM item ${where} ORDER BY consumed_on DESC, created_at DESC`;

    let rows: ItemRow[];

    try {
      rows = this.db.prepare(sql).all(...params) as ItemRow[];
    } catch (error) {
      throw new RepositoryError('READ_FAILED', 'Não foi possível listar os itens.', error);
    }

    let items = rows.map(toItem);
    const query = options.q?.trim();

    if (query !== undefined && query !== '') {
      const needle = normalizeText(query);
      items = items.filter((item) => {
        const haystack = [
          item.title,
          item.publisher,
          item.director,
          ...(item.author ?? []),
          ...(item.screenplay_by ?? []),
          ...(item.produced_by ?? []),
          ...(item.distributed_by ?? []),
        ];

        return haystack.some(
          (value) => value !== undefined && normalizeText(value).includes(needle),
        );
      });
    }

    const start = Math.max(0, options.offset ?? 0);
    const limit = options.limit === undefined ? undefined : Math.max(0, options.limit);

    return limit === undefined ? items.slice(start) : items.slice(start, start + limit);
  }

  update(id: string, input: unknown): Result<Item> {
    const validation = validateItemInput(input);

    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }

    const existing = this.get(id);

    if (existing === null) {
      return {
        ok: false,
        errors: [{ field: 'id', message: 'Item não encontrado para atualização.' }],
      };
    }

    const now = new Date().toISOString();

    try {
      this.db
        .prepare(UPDATE_SQL)
        .run(
          ...toSqlValues(withDerivedConsumedOn(validation.value, existing.consumed_on)),
          now,
          id,
        );
    } catch (error) {
      throw new RepositoryError('WRITE_FAILED', 'Não foi possível atualizar o item.', error);
    }

    const updated = this.get(id);

    if (updated === null) {
      throw new RepositoryError(
        'WRITE_FAILED',
        'O item foi atualizado mas não pôde ser lido de volta.',
      );
    }

    return { ok: true, value: updated };
  }

  delete(id: string): Result<{ id: string }> {
    if (this.get(id) === null) {
      return {
        ok: false,
        errors: [{ field: 'id', message: 'Item não encontrado para exclusão.' }],
      };
    }

    try {
      this.db.prepare('DELETE FROM item WHERE id = ?').run(id);
    } catch (error) {
      throw new RepositoryError('WRITE_FAILED', 'Não foi possível excluir o item.', error);
    }

    return { ok: true, value: { id } };
  }

  suggestions(type: MediaType): ItemSuggestions {
    let rows: ItemRow[];

    try {
      rows = this.db
        .prepare(`SELECT ${SELECT_COLUMNS} FROM item WHERE type = ?`)
        .all(type) as ItemRow[];
    } catch (error) {
      throw new RepositoryError('READ_FAILED', 'Não foi possível ler os valores já usados.', error);
    }

    const single = (selector: (row: ItemRow) => string | null): string[] => {
      const unique = new Set<string>();

      for (const row of rows) {
        const value = selector(row);

        if (value !== null && value.trim() !== '') {
          unique.add(value.trim());
        }
      }

      return [...unique].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    };

    const list = (selector: (row: ItemRow) => string | null): string[] => {
      const unique = new Set<string>();

      for (const row of rows) {
        for (const value of parseNameList(selector(row)) ?? []) {
          unique.add(value);
        }
      }

      return [...unique].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    };

    return {
      authors: list((row) => row.author),
      publishers: single((row) => row.publisher),
      directors: single((row) => row.director),
      screenplayBy: list((row) => row.screenplay_by),
      producedBy: list((row) => row.produced_by),
      distributedBy: list((row) => row.distributed_by),
      languages: single((row) => row.language),
    };
  }

  close(): void {
    this.db.close();
  }
}
