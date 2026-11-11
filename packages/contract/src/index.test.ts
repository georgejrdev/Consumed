import { describe, expect, it } from 'vitest';
import type { ItemInput, ValidationError } from './index.js';
import { validateItemInput } from './index.js';

function expectValid(input: unknown): ItemInput {
  const result = validateItemInput(input);

  if (!result.ok) {
    throw new Error(`Esperava input válido, mas veio: ${JSON.stringify(result.errors)}`);
  }

  return result.value;
}

function expectInvalid(input: unknown): ValidationError[] {
  const result = validateItemInput(input);

  if (result.ok) {
    throw new Error(`Esperava input inválido, mas veio: ${JSON.stringify(result.value)}`);
  }

  return result.errors;
}

describe('validateItemInput', () => {
  describe('happy path', () => {
    it('should accept a minimal valid input when only required fields are provided', () => {
      const input = {
        type: 'livro',
        title: 'Dom Casmurro',
      };

      const value = expectValid(input);

      expect(value).toEqual({ ...input, reading_status: 'lido' });
    });

    it('should accept an input with every optional field when all values are valid', () => {
      const input = {
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

      const value = expectValid(input);

      expect(value).toEqual(input);
    });
  });

  describe('boundaries', () => {
    it.each([0, 10])('should accept rating %i when it is inside 0..10', (rating) => {
      const value = expectValid({
        type: 'livro',
        title: 'Livro',
        consumed_on: '2024-01-01',
        rating,
      });

      expect(value.rating).toBe(rating);
    });

    it.each([11, -1, 4.5])(
      'should reject rating %s when it is outside the integer range 0..10',
      (rating) => {
        const errors = expectInvalid({
          type: 'livro',
          title: 'Livro',
          consumed_on: '2024-01-01',
          rating,
        });

        expect(errors.map((error) => error.field)).toContain('rating');
      },
    );

    it('should accept a negative year as a BC date', () => {
      const value = expectValid({
        type: 'livro',
        title: 'A República',
        year: -380,
      });

      expect(value.year).toBe(-380);
    });

    it.each([0, 4.5, '44'])('should reject year %s when it is not a non-zero integer', (year) => {
      const errors = expectInvalid({
        type: 'livro',
        title: 'Livro',
        year,
      });

      expect(errors.map((error) => error.field)).toContain('year');
    });

    it('should reject a title made only of spaces when there is no visible content', () => {
      const errors = expectInvalid({
        type: 'filme',
        title: '   ',
        consumed_on: '2024-01-01',
      });

      expect(errors.map((error) => error.field)).toContain('title');
    });

    it('should accept a title with accents and emoji when it has visible content', () => {
      const title = 'A Ilha Misteriosa 🏝️ — Edição Especial';

      const value = expectValid({
        type: 'livro',
        title,
        consumed_on: '2024-01-01',
      });

      expect(value.title).toBe(title);
    });

    it('should treat a null optional field as absent when the field allows omission', () => {
      const value = expectValid({
        type: 'livro',
        title: 'Livro',
        consumed_on: '2024-01-01',
        notes: null,
        rating: null,
        pages: null,
        author: null,
      });

      expect(value.notes).toBeUndefined();
      expect(value.rating).toBeUndefined();
      expect(value.pages).toBeUndefined();
      expect(value.author).toBeUndefined();
      expect(Object.values(value)).not.toContain(null);
    });
  });

  describe('failure path', () => {
    it('should reject a type outside the enum when the value is unknown', () => {
      const errors = expectInvalid({
        type: 'serie',
        title: 'Série',
        consumed_on: '2024-01-01',
      });

      expect(errors.map((error) => error.field)).toContain('type');
    });

    it.each(['2026-13-01', '2026-02-30', '12/03/2026'])(
      'should reject consumed_on "%s" when it is not a real ISO date',
      (consumedOn) => {
        const errors = expectInvalid({
          type: 'livro',
          title: 'Livro',
          consumed_on: consumedOn,
        });

        expect(errors.map((error) => error.field)).toContain('consumed_on');
      },
    );

    it.each([-1, 1.5])('should reject pages %s when it is not a positive integer', (pages) => {
      const errors = expectInvalid({
        type: 'livro',
        title: 'Livro',
        consumed_on: '2024-01-01',
        pages,
      });

      expect(errors.map((error) => error.field)).toContain('pages');
    });

    describe('reading status and name lists', () => {
      it('should keep an explicit reading status for a book', () => {
        const value = expectValid({
          type: 'livro',
          title: 'Livro',
          reading_status: 'lendo',
        });

        expect(value.reading_status).toBe('lendo');
      });

      it('should reject an unknown reading status', () => {
        const errors = expectInvalid({
          type: 'livro',
          title: 'Livro',
          reading_status: 'abandonado',
        });

        expect(errors.map((error) => error.field)).toContain('reading_status');
      });

      it('should not include a reading status in a film', () => {
        const value = expectValid({
          type: 'filme',
          title: 'Filme',
          consumed_on: '2024-01-01',
          reading_status: 'lido',
        });

        expect(value.reading_status).toBeUndefined();
      });

      it('should require consumed_on for a film', () => {
        const errors = expectInvalid({ type: 'filme', title: 'Filme' });

        expect(errors.map((error) => error.field)).toContain('consumed_on');
      });

      it('should trim, deduplicate and drop empty entries from name lists', () => {
        const value = expectValid({
          type: 'filme',
          title: 'Filme',
          consumed_on: '2024-01-01',
          author: [' Ana ', 'Ana', '', 'Bia'],
        });

        expect(value.author).toEqual(['Ana', 'Bia']);
      });

      it('should reject a non-string entry inside a name list', () => {
        const errors = expectInvalid({
          type: 'livro',
          title: 'Livro',
          author: ['Ana', 42],
        });

        expect(errors.map((error) => error.field)).toContain('author');
      });

      it('should accept a single string for a name list', () => {
        const value = expectValid({
          type: 'livro',
          title: 'Livro',
          author: '  Autora Única  ',
        });

        expect(value.author).toEqual(['Autora Única']);
      });
    });
    it('should reject a non-object input when it cannot be interpreted as an item', () => {
      const errors = expectInvalid('não é um objeto');

      expect(errors.map((error) => error.field)).toContain('input');
    });
  });
});
