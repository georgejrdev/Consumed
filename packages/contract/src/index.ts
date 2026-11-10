export type MediaType = 'filme' | 'livro';

export type ReadingStatus = 'nao_lido' | 'lendo' | 'lido';

export interface Item {
  id: string;
  type: MediaType;
  title: string;
  year?: number | undefined;
  rating?: number | undefined;
  consumed_on: string;
  notes?: string | undefined;
  language?: string | undefined;
  image_path?: string | undefined;
  reading_status?: ReadingStatus | undefined;
  author?: string[] | undefined;
  publisher?: string | undefined;
  pages?: number | undefined;
  isbn?: string | undefined;
  director?: string | undefined;
  runtime_min?: number | undefined;
  screenplay_by?: string[] | undefined;
  produced_by?: string[] | undefined;
  distributed_by?: string[] | undefined;
  started_on?: string | undefined;
  finished_on?: string | undefined;
  created_at: string;
  updated_at: string;
}

export interface ItemInput {
  type: MediaType;
  title: string;
  year?: number | undefined;
  rating?: number | undefined;
  consumed_on?: string | undefined;
  notes?: string | undefined;
  language?: string | undefined;
  image_path?: string | undefined;
  reading_status?: ReadingStatus | undefined;
  author?: string[] | undefined;
  publisher?: string | undefined;
  pages?: number | undefined;
  isbn?: string | undefined;
  director?: string | undefined;
  runtime_min?: number | undefined;
  screenplay_by?: string[] | undefined;
  produced_by?: string[] | undefined;
  distributed_by?: string[] | undefined;
  started_on?: string | undefined;
  finished_on?: string | undefined;
}

export interface ValidationError {
  field: string;
  message: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; errors: ValidationError[] };

type RawInput = Record<string, unknown>;

function isRecord(value: unknown): value is RawInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptional(raw: RawInput, field: string): unknown {
  const value = raw[field];
  return value === null ? undefined : value;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return DAYS_IN_MONTH[month - 1] ?? 0;
}

export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match === null) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= daysInMonth(year, month);
}

function readOptionalString(
  raw: RawInput,
  field: string,
  errors: ValidationError[],
): string | undefined {
  const value = readOptional(raw, field);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    errors.push({ field, message: `O campo "${field}" deve ser um texto.` });
    return undefined;
  }

  return value.trim() === '' ? undefined : value;
}

function readOptionalNameList(
  raw: RawInput,
  field: string,
  errors: ValidationError[],
): string[] | undefined {
  const value = readOptional(raw, field);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.trim() === '' ? undefined : [value.trim()];
  }

  if (!Array.isArray(value)) {
    errors.push({ field, message: `O campo "${field}" deve ser uma lista de nomes.` });
    return undefined;
  }

  if (value.some((entry) => typeof entry !== 'string')) {
    errors.push({ field, message: `O campo "${field}" deve conter apenas nomes.` });
    return undefined;
  }

  const names = value.map((entry: string) => entry.trim()).filter((entry) => entry !== '');

  if (names.length === 0) {
    return undefined;
  }

  return [...new Set(names)];
}

function readOptionalPositiveInteger(
  raw: RawInput,
  field: string,
  message: string,
  errors: ValidationError[],
): number | undefined {
  const value = readOptional(raw, field);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    errors.push({ field, message });
    return undefined;
  }

  return value;
}

export function validateItemInput(input: unknown): Result<ItemInput> {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ field: 'input', message: 'Os dados do item devem ser um objeto.' }],
    };
  }

  const errors: ValidationError[] = [];

  const rawType = input['type'];
  let type: MediaType | undefined;
  if (rawType === 'filme' || rawType === 'livro') {
    type = rawType;
  } else {
    errors.push({ field: 'type', message: 'O tipo deve ser "filme" ou "livro".' });
  }

  const rawTitle = input['title'];
  let title: string | undefined;
  if (typeof rawTitle !== 'string' || rawTitle.trim() === '') {
    errors.push({ field: 'title', message: 'O título é obrigatório e não pode ficar em branco.' });
  } else {
    title = rawTitle.trim();
  }

  const rawConsumedOn = readOptional(input, 'consumed_on');
  let consumedOn: string | undefined;
  if (rawConsumedOn !== undefined) {
    if (typeof rawConsumedOn !== 'string' || !isValidIsoDate(rawConsumedOn)) {
      errors.push({
        field: 'consumed_on',
        message: 'A data de consumo deve ser uma data válida no formato aaaa-mm-dd.',
      });
    } else {
      consumedOn = rawConsumedOn;
    }
  }

  const rawStatus = readOptional(input, 'reading_status');
  let readingStatus: ReadingStatus | undefined;
  if (rawStatus !== undefined) {
    if (rawStatus === 'nao_lido' || rawStatus === 'lendo' || rawStatus === 'lido') {
      readingStatus = rawStatus;
    } else {
      errors.push({
        field: 'reading_status',
        message: 'O estado de leitura deve ser "nao_lido", "lendo" ou "lido".',
      });
    }
  }

  const year = readOptionalPositiveInteger(
    input,
    'year',
    'O ano deve ser um número inteiro positivo.',
    errors,
  );

  const rawRating = readOptional(input, 'rating');
  let rating: number | undefined;
  if (rawRating !== undefined) {
    if (
      typeof rawRating !== 'number' ||
      !Number.isInteger(rawRating) ||
      rawRating < 0 ||
      rawRating > 10
    ) {
      errors.push({
        field: 'rating',
        message: 'A nota deve ser um número inteiro entre 0 e 10.',
      });
    } else {
      rating = rawRating;
    }
  }

  const notes = readOptionalString(input, 'notes', errors);
  const language = readOptionalString(input, 'language', errors);
  const imagePath = readOptionalString(input, 'image_path', errors);
  const author = readOptionalNameList(input, 'author', errors);
  const publisher = readOptionalString(input, 'publisher', errors);

  const pages = readOptionalPositiveInteger(
    input,
    'pages',
    'O número de páginas deve ser um número inteiro positivo.',
    errors,
  );

  const isbn = readOptionalString(input, 'isbn', errors);
  const director = readOptionalString(input, 'director', errors);

  const runtimeMin = readOptionalPositiveInteger(
    input,
    'runtime_min',
    'A duração deve ser um número inteiro positivo em minutos.',
    errors,
  );

  const screenplayBy = readOptionalNameList(input, 'screenplay_by', errors);
  const producedBy = readOptionalNameList(input, 'produced_by', errors);
  const distributedBy = readOptionalNameList(input, 'distributed_by', errors);
  const startedOn = readOptionalString(input, 'started_on', errors);
  const finishedOn = readOptionalString(input, 'finished_on', errors);

  if (startedOn !== undefined && !isValidIsoDate(startedOn)) {
    errors.push({
      field: 'started_on',
      message: 'A data de início deve ser uma data válida no formato aaaa-mm-dd.',
    });
  }

  if (finishedOn !== undefined && !isValidIsoDate(finishedOn)) {
    errors.push({
      field: 'finished_on',
      message: 'A data de término deve ser uma data válida no formato aaaa-mm-dd.',
    });
  }

  if (type === 'filme' && consumedOn === undefined) {
    errors.push({
      field: 'consumed_on',
      message: 'A data em que o filme foi assistido é obrigatória.',
    });
  }

  if (type === 'livro' && readingStatus === undefined) {
    readingStatus = 'lido';
  }

  if (errors.length > 0 || type === undefined || title === undefined) {
    return { ok: false, errors };
  }

  const value: ItemInput = {
    type,
    title,
  };

  if (consumedOn !== undefined) {
    value.consumed_on = consumedOn;
  }
  if (type === 'livro' && readingStatus !== undefined) {
    value.reading_status = readingStatus;
  }

  if (year !== undefined) {
    value.year = year;
  }
  if (rating !== undefined) {
    value.rating = rating;
  }
  if (notes !== undefined) {
    value.notes = notes;
  }
  if (language !== undefined) {
    value.language = language;
  }
  if (imagePath !== undefined) {
    value.image_path = imagePath;
  }
  if (author !== undefined) {
    value.author = author;
  }
  if (publisher !== undefined) {
    value.publisher = publisher;
  }
  if (pages !== undefined) {
    value.pages = pages;
  }
  if (isbn !== undefined) {
    value.isbn = isbn;
  }
  if (director !== undefined) {
    value.director = director;
  }
  if (runtimeMin !== undefined) {
    value.runtime_min = runtimeMin;
  }
  if (screenplayBy !== undefined) {
    value.screenplay_by = screenplayBy;
  }
  if (producedBy !== undefined) {
    value.produced_by = producedBy;
  }
  if (distributedBy !== undefined) {
    value.distributed_by = distributedBy;
  }
  if (startedOn !== undefined) {
    value.started_on = startedOn;
  }
  if (finishedOn !== undefined) {
    value.finished_on = finishedOn;
  }

  return { ok: true, value };
}
