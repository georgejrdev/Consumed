import type { Item } from './bridge';

export interface MonthBucket {
  month: number;
  label: string;
  items: number;
  pages: number;
}

export interface Statistics {
  year: number;
  items: number;
  pages: number;
  averageRating: number | null;
  topPublisher: string | null;
  months: MonthBucket[];
}

const MONTH_LABELS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const;

const CONSUMED_ON_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface ParsedDate {
  year: number;
  month: number;
}

function parseConsumedOn(value: string | undefined): ParsedDate | null {
  if (value === undefined) {
    return null;
  }

  const match = CONSUMED_ON_PATTERN.exec(value);

  if (match === null) {
    return null;
  }

  const [, rawYear = '', rawMonth = '', rawDay = ''] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);

  if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month };
}

function emptyMonths(): MonthBucket[] {
  return MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    items: 0,
    pages: 0,
  }));
}

function pickTopPublisher(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestCount = 0;

  for (const [publisher, count] of counts) {
    if (
      best === null ||
      count > bestCount ||
      (count === bestCount && publisher.localeCompare(best, 'pt-BR') < 0)
    ) {
      best = publisher;
      bestCount = count;
    }
  }

  return best;
}

export function availableYears(items: Item[]): number[] {
  const years = new Set<number>();

  for (const item of items) {
    const parsed = parseConsumedOn(item.consumed_on);

    if (parsed !== null) {
      years.add(parsed.year);
    }
  }

  return [...years].sort((left, right) => right - left);
}

export function computeStatistics(items: Item[], year: number): Statistics {
  const months = emptyMonths();
  const ratings: number[] = [];
  const publishers = new Map<string, number>();
  let itemCount = 0;

  for (const item of items) {
    const parsed = parseConsumedOn(item.consumed_on);

    if (parsed === null || parsed.year !== year) {
      continue;
    }

    itemCount += 1;

    const bucket = months[parsed.month - 1];

    if (bucket === undefined) {
      continue;
    }

    bucket.items += 1;

    if (item.type === 'livro' && item.pages !== undefined) {
      bucket.pages += item.pages;
    }

    if (item.rating !== undefined) {
      ratings.push(item.rating);
    }

    if (item.type === 'livro') {
      const publisher = item.publisher?.trim() ?? '';

      if (publisher !== '') {
        publishers.set(publisher, (publishers.get(publisher) ?? 0) + 1);
      }
    }
  }

  const pages = months.reduce((total, bucket) => total + bucket.pages, 0);
  const averageRating =
    ratings.length === 0
      ? null
      : Math.round((ratings.reduce((total, rating) => total + rating, 0) / ratings.length) * 10) /
        10;

  return {
    year,
    items: itemCount,
    pages,
    averageRating,
    topPublisher: pickTopPublisher(publishers),
    months,
  };
}
