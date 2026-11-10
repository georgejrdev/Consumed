export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS item (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('filme', 'livro')),
  title TEXT NOT NULL,
  year INTEGER,
  rating INTEGER CHECK (rating IS NULL OR (rating BETWEEN 0 AND 10 AND rating = CAST(rating AS INTEGER))),
  consumed_on TEXT NOT NULL,
  notes TEXT,
  language TEXT,
  image_path TEXT,
  author TEXT,
  publisher TEXT,
  pages INTEGER,
  isbn TEXT,
  reading_status TEXT CHECK (reading_status IS NULL OR reading_status IN ('nao_lido', 'lendo', 'lido')),
  director TEXT,
  runtime_min INTEGER,
  screenplay_by TEXT,
  produced_by TEXT,
  distributed_by TEXT,
  started_on TEXT,
  finished_on TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_item_consumed_on ON item (consumed_on DESC);
CREATE INDEX IF NOT EXISTS idx_item_type ON item (type);
CREATE INDEX IF NOT EXISTS idx_item_title ON item (title COLLATE NOCASE);
`;
