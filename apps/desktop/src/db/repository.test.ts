import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ItemInput } from '@consumed/contract';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LATEST_SCHEMA_VERSION } from './migrations';
import { ItemRepository, RepositoryError } from './repository';
import { SCHEMA_SQL } from './schema';

const FULL_INPUT: ItemInput = {
  type: 'filme',
  title: 'Cidade de Deus',
  year: 2002,
  rating: 10,
  consumed_on: '2024-01-05',
  notes: 'Reassistido com comentários.',
  language: 'pt-BR',
  image_path: 'imagens/cidade-de-deus.jpg',
  author: ['Paulo Lins'],
  publisher: 'Companhia das Letras',
  pages: 500,
  isbn: '978-85-359-0145-8',
  director: 'Fernando Meirelles',
  runtime_min: 130,
  screenplay_by: ['Bráulio Mantovani'],
  produced_by: ['Andrea Barata Ribeiro'],
  distributed_by: ['Globo Filmes'],
  started_on: '2023-12-25',
  finished_on: '2024-01-05',
};

let tempDir: string;
let repository: ItemRepository | null;

function openRepository(): ItemRepository {
  const instance = new ItemRepository(join(tempDir, 'consumed.db'));
  instance.migrate();
  repository = instance;
  return instance;
}

function validInput(overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    type: 'livro',
    title: 'A Ilha Misteriosa',
    consumed_on: '2024-02-10',
    ...overrides,
  };
}

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'consumed-repository-'));
  repository = null;
});

afterEach(() => {
  repository?.close();
  repository = null;
  chmodSync(tempDir, 0o755);
  rmSync(tempDir, { recursive: true, force: true });
});

describe('ItemRepository', () => {
  describe('happy path', () => {
    it('should create and read back every field when the input is complete', () => {
      const repo = openRepository();

      const result = repo.create(FULL_INPUT);

      if (!result.ok) {
        throw new Error(`Esperava sucesso: ${JSON.stringify(result.errors)}`);
      }

      const created = result.value;
      const loaded = repo.get(created.id);

      expect(loaded).toEqual(created);
      expect(created.title).toBe(FULL_INPUT.title);
      expect(created.author).toEqual(FULL_INPUT.author);
      expect(created.director).toBe(FULL_INPUT.director);
      expect(created.rating).toBe(10);
      expect(created.pages).toBe(500);
      expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(created.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should list items ordered by consumed_on descending when several dates exist', () => {
      const repo = openRepository();
      repo.create(validInput({ title: 'Janeiro', consumed_on: '2024-01-01' }));
      repo.create(validInput({ title: 'Março', consumed_on: '2024-03-01' }));
      repo.create(validInput({ title: 'Fevereiro', consumed_on: '2024-02-01' }));

      const items = repo.list();

      expect(items.map((item) => item.title)).toEqual(['Março', 'Fevereiro', 'Janeiro']);
    });

    it('should update an existing item and keep created_at when the input is valid', () => {
      const repo = openRepository();
      const created = repo.create(validInput());

      if (!created.ok) {
        throw new Error('Esperava criação bem-sucedida.');
      }

      const result = repo.update(created.value.id, validInput({ title: 'Título novo' }));

      if (!result.ok) {
        throw new Error(`Esperava atualização: ${JSON.stringify(result.errors)}`);
      }

      expect(result.value.title).toBe('Título novo');
      expect(result.value.created_at).toBe(created.value.created_at);
    });
  });

  describe('boundaries', () => {
    it('should filter by type when both media types exist', () => {
      const repo = openRepository();
      repo.create(validInput({ type: 'filme', title: 'Filme' }));
      repo.create(validInput({ type: 'livro', title: 'Livro' }));

      const films = repo.list({ type: 'filme' });

      expect(films.map((item) => item.title)).toEqual(['Filme']);
    });

    it('should filter by title and author ignoring case and accents when q is provided', () => {
      const repo = openRepository();
      repo.create(validInput({ title: 'A Ilha Misteriosa', author: ['José Saramago'] }));
      repo.create(validInput({ title: 'Outro livro', author: ['Machado de Assis'] }));

      expect(repo.list({ q: 'ILHA' }).map((item) => item.title)).toEqual(['A Ilha Misteriosa']);
      expect(repo.list({ q: 'jose' }).map((item) => item.title)).toEqual(['A Ilha Misteriosa']);
    });

    it('should remove the item and return null from get when delete succeeds', () => {
      const repo = openRepository();
      const created = repo.create(validInput());

      if (!created.ok) {
        throw new Error('Esperava criação bem-sucedida.');
      }

      const result = repo.delete(created.value.id);

      expect(result.ok).toBe(true);
      expect(repo.get(created.value.id)).toBeNull();
      expect(repo.list()).toHaveLength(0);
    });
  });

  describe('migrations', () => {
    const CREATED_AT = '2025-01-01T00:00:00.000Z';

    function insertLegacyItem(db: Database.Database, status?: string): void {
      if (status === undefined) {
        db.prepare(
          `INSERT INTO item (id, type, title, consumed_on, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run('legacy-1', 'livro', 'Livro antigo', '2025-01-01', CREATED_AT, CREATED_AT);
        return;
      }

      db.prepare(
        `INSERT INTO item (
           id, type, title, consumed_on, reading_status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run('legacy-1', 'livro', 'Livro antigo', '2025-01-01', status, CREATED_AT, CREATED_AT);
    }

    it('should mark a new database with the latest schema version', () => {
      openRepository();

      const db = new Database(join(tempDir, 'consumed.db'));

      try {
        expect(db.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
      } finally {
        db.close();
      }
    });

    it('should add reading_status and backfill lido for a pre-versioned database', () => {
      const dbPath = join(tempDir, 'consumed.db');
      const legacy = new Database(dbPath);

      legacy.exec(SCHEMA_SQL);
      legacy.exec('ALTER TABLE item DROP COLUMN reading_status');
      insertLegacyItem(legacy);
      legacy.pragma('user_version = 0');
      legacy.close();

      const repo = new ItemRepository(dbPath);
      repository = repo;
      repo.migrate();

      expect(repo.get('legacy-1')?.reading_status).toBe('lido');
      expect(readdirSync(join(tempDir, 'backups'))).toHaveLength(1);

      const db = new Database(dbPath);

      try {
        expect(db.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
      } finally {
        db.close();
      }
    });

    it('should preserve an existing reading_status when upgrading a pre-versioned database', () => {
      const dbPath = join(tempDir, 'consumed.db');
      const legacy = new Database(dbPath);

      legacy.exec(SCHEMA_SQL);
      insertLegacyItem(legacy, 'lendo');
      legacy.pragma('user_version = 0');
      legacy.close();

      const repo = new ItemRepository(dbPath);
      repository = repo;
      repo.migrate();

      expect(repo.get('legacy-1')?.reading_status).toBe('lendo');
    });

    it('should refuse to open a database created by a newer schema', () => {
      const dbPath = join(tempDir, 'consumed.db');
      const newer = new Database(dbPath);

      newer.exec(SCHEMA_SQL);
      newer.pragma('user_version = 999');
      newer.close();

      const repo = new ItemRepository(dbPath);
      repository = repo;

      expect(() => repo.migrate()).toThrow(RepositoryError);
      expect(() => repo.migrate()).toThrow(/versão mais nova/);
    });
  });

  describe('failure path', () => {
    it('should reject an empty title and write nothing when create is called', () => {
      const repo = openRepository();

      const result = repo.create(validInput({ title: '   ' }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.field === 'title')).toBe(true);
      }
      expect(repo.list()).toHaveLength(0);
    });

    it('should reject rating 11 and write nothing when create is called', () => {
      const repo = openRepository();

      const result = repo.create(validInput({ rating: 11 }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.field === 'rating')).toBe(true);
      }
      expect(repo.list()).toHaveLength(0);
    });

    it('should reject an invalid consumed_on date when create is called', () => {
      const repo = openRepository();

      const result = repo.create(validInput({ consumed_on: '2026-02-30' }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.field === 'consumed_on')).toBe(true);
      }
      expect(repo.list()).toHaveLength(0);
    });

    it('should report a clear error when updating an id that does not exist', () => {
      const repo = openRepository();

      const result = repo.update('id-inexistente', validInput());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((error) => error.field === 'id')).toBe(true);
      }
    });

    it('should throw a handled error when the vault directory is read-only', () => {
      const readonlyDir = join(tempDir, 'readonly');
      mkdirSync(readonlyDir);
      chmodSync(readonlyDir, 0o555);

      try {
        expect(() => {
          const repo = new ItemRepository(join(readonlyDir, 'consumed.db'));
          repo.migrate();
        }).toThrow(RepositoryError);
        expect(existsSync(join(readonlyDir, 'consumed.db'))).toBe(false);
      } finally {
        chmodSync(readonlyDir, 0o755);
      }
    });
  });

  describe('consumption rules', () => {
    it('should derive consumed_on from finished_on when a book omits the date', () => {
      const repo = openRepository();
      const result = repo.create(
        validInput({ consumed_on: undefined, started_on: '2024-02-01', finished_on: '2024-02-20' }),
      );

      if (!result.ok) {
        throw new Error(`Esperava sucesso: ${JSON.stringify(result.errors)}`);
      }

      expect(result.value.consumed_on).toBe('2024-02-20');
    });

    it('should derive consumed_on from started_on when finished_on is absent', () => {
      const repo = openRepository();
      const result = repo.create(validInput({ consumed_on: undefined, started_on: '2024-03-05' }));

      if (!result.ok) {
        throw new Error(`Esperava sucesso: ${JSON.stringify(result.errors)}`);
      }

      expect(result.value.consumed_on).toBe('2024-03-05');
    });

    it('should preserve consumed_on when a book is updated without a date', () => {
      const repo = openRepository();
      const created = repo.create(validInput({ title: 'Original', consumed_on: '2024-01-10' }));

      if (!created.ok) {
        throw new Error(`Esperava sucesso: ${JSON.stringify(created.errors)}`);
      }

      const updated = repo.update(created.value.id, {
        type: 'livro',
        title: 'Editado',
      });

      if (!updated.ok) {
        throw new Error(`Esperava sucesso: ${JSON.stringify(updated.errors)}`);
      }

      expect(updated.value.consumed_on).toBe('2024-01-10');
    });

    it('should list only films and read books when onlyConsumed is true', () => {
      const repo = openRepository();
      const created = [
        repo.create(validInput({ type: 'filme', title: 'Filme', consumed_on: '2024-01-01' })),
        repo.create(validInput({ type: 'livro', title: 'Lido', reading_status: 'lido' })),
        repo.create(validInput({ type: 'livro', title: 'Lendo', reading_status: 'lendo' })),
        repo.create(validInput({ type: 'livro', title: 'Não lido', reading_status: 'nao_lido' })),
      ];

      for (const item of created) {
        if (!item.ok) {
          throw new Error(`Esperava sucesso: ${JSON.stringify(item.errors)}`);
        }
      }

      const titles = repo.list({ onlyConsumed: true }).map((item) => item.title);

      expect(titles).toContain('Filme');
      expect(titles).toContain('Lido');
      expect(titles).not.toContain('Lendo');
      expect(titles).not.toContain('Não lido');
    });

    it('should return unique sorted suggestions for the requested type', () => {
      const repo = openRepository();
      const first = repo.create(
        validInput({
          title: 'Um',
          author: ['Ana', 'Bia'],
          publisher: 'Zeta',
          language: 'Português',
        }),
      );
      const second = repo.create(validInput({ title: 'Dois', author: ['Ana'], publisher: 'Alfa' }));

      if (!first.ok || !second.ok) {
        throw new Error('Esperava que os itens fossem criados.');
      }

      const suggestions = repo.suggestions('livro');

      expect(suggestions.authors).toEqual(['Ana', 'Bia']);
      expect(suggestions.publishers).toEqual(['Alfa', 'Zeta']);
      expect(suggestions.languages).toEqual(['Português']);
    });
  });
});
