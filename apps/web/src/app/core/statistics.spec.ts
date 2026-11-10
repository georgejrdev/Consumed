import type { Item } from './bridge';
import { availableYears, computeStatistics } from './statistics';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    type: 'filme',
    title: 'Item de teste',
    consumed_on: '2026-01-05',
    created_at: '2026-01-05T00:00:00.000Z',
    updated_at: '2026-01-05T00:00:00.000Z',
    ...overrides,
  };
}

describe('availableYears', () => {
  it('should return distinct years in descending order', () => {
    const items = [
      makeItem({ id: 'a', consumed_on: '2025-03-01' }),
      makeItem({ id: 'b', consumed_on: '2026-01-01' }),
      makeItem({ id: 'c', consumed_on: '2026-12-31' }),
    ];

    expect(availableYears(items)).toEqual([2026, 2025]);
  });

  it('should return an empty list when there are no items', () => {
    expect(availableYears([])).toEqual([]);
  });

  it('should ignore items with invalid consumed_on', () => {
    const items = [
      makeItem({ id: 'a', consumed_on: '2026-01-01' }),
      makeItem({ id: 'b', consumed_on: 'ontem' }),
      makeItem({ id: 'c', consumed_on: '2026-13-01' }),
    ];

    expect(availableYears(items)).toEqual([2026]);
  });
});

describe('computeStatistics', () => {
  it('should count items per month with January and February records (AC-17)', () => {
    const items = [
      makeItem({ id: 'jan-1', consumed_on: '2026-01-03' }),
      makeItem({ id: 'jan-2', consumed_on: '2026-01-31' }),
      makeItem({ id: 'fev-1', consumed_on: '2026-02-14' }),
    ];

    const statistics = computeStatistics(items, 2026);

    expect(statistics.items).toBe(3);
    expect(statistics.months).toHaveLength(12);
    expect(statistics.months[0]).toEqual({ month: 1, label: 'JAN', items: 2, pages: 0 });
    expect(statistics.months[1]).toEqual({ month: 2, label: 'FEV', items: 1, pages: 0 });
    expect(statistics.months[2]?.items).toBe(0);
    expect(statistics.months[11]?.label).toBe('DEZ');
  });

  it('should sum pages only for books of each month (AC-18)', () => {
    const items = [
      makeItem({
        id: 'livro-jan',
        type: 'livro',
        consumed_on: '2026-01-10',
        pages: 100,
      }),
      makeItem({
        id: 'filme-jan',
        type: 'filme',
        consumed_on: '2026-01-20',
        pages: 999,
      }),
      makeItem({
        id: 'livro-fev',
        type: 'livro',
        consumed_on: '2026-02-10',
      }),
    ];

    const statistics = computeStatistics(items, 2026);

    expect(statistics.months[0]?.pages).toBe(100);
    expect(statistics.months[1]?.pages).toBe(0);
    expect(statistics.pages).toBe(100);
  });

  it('should average the ratings that are present and round to one decimal (AC-19)', () => {
    const twoRatings = [
      makeItem({ id: 'a', consumed_on: '2026-01-01', rating: 8 }),
      makeItem({ id: 'b', consumed_on: '2026-01-02', rating: 9 }),
    ];

    expect(computeStatistics(twoRatings, 2026).averageRating).toBe(8.5);

    const withMissing = [...twoRatings, makeItem({ id: 'c', consumed_on: '2026-01-03' })];

    expect(computeStatistics(withMissing, 2026).averageRating).toBe(8.5);

    expect(computeStatistics([], 2026).averageRating).toBeNull();

    const repeating = [
      makeItem({ id: 'd', consumed_on: '2026-01-01', rating: 8 }),
      makeItem({ id: 'e', consumed_on: '2026-01-02', rating: 9 }),
      makeItem({ id: 'f', consumed_on: '2026-01-03', rating: 9 }),
    ];

    expect(computeStatistics(repeating, 2026).averageRating).toBe(8.7);
  });

  it('should pick the most frequent publisher and break ties alphabetically (AC-20)', () => {
    const items = [
      makeItem({ id: 'a', type: 'livro', publisher: 'Beta', consumed_on: '2026-01-01' }),
      makeItem({ id: 'b', type: 'livro', publisher: 'Alpha', consumed_on: '2026-01-02' }),
    ];

    expect(computeStatistics(items, 2026).topPublisher).toBe('Alpha');

    const repeated = [
      ...items,
      makeItem({ id: 'c', type: 'livro', publisher: 'Alpha', consumed_on: '2026-02-01' }),
    ];

    expect(computeStatistics(repeated, 2026).topPublisher).toBe('Alpha');

    const withoutPublisher = [
      makeItem({ id: 'd', type: 'livro', consumed_on: '2026-01-01' }),
      makeItem({ id: 'e', type: 'livro', publisher: '   ', consumed_on: '2026-01-02' }),
    ];

    expect(computeStatistics(withoutPublisher, 2026).topPublisher).toBeNull();
  });

  it('should return zeros and nulls for an empty list without throwing (AC-21)', () => {
    const statistics = computeStatistics([], 2026);

    expect(statistics.year).toBe(2026);
    expect(statistics.items).toBe(0);
    expect(statistics.pages).toBe(0);
    expect(statistics.averageRating).toBeNull();
    expect(statistics.topPublisher).toBeNull();
    expect(statistics.months).toHaveLength(12);
    expect(statistics.months.every((month) => month.items === 0 && month.pages === 0)).toBe(true);
  });

  it('should ignore items from other years and invalid consumed_on', () => {
    const items = [
      makeItem({ id: 'a', consumed_on: '2025-12-31', rating: 10 }),
      makeItem({ id: 'b', consumed_on: '2026-01-01', rating: 8 }),
      makeItem({ id: 'c', consumed_on: '01/01/2026', rating: 10 }),
      makeItem({ id: 'd', consumed_on: '2026-00-10', rating: 10 }),
    ];

    const statistics = computeStatistics(items, 2026);

    expect(statistics.items).toBe(1);
    expect(statistics.averageRating).toBe(8);
    expect(statistics.months[0]?.items).toBe(1);
  });
});
