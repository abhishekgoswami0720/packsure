/**
 * SQLite schema for the local, offline-first store.
 *
 * Three tables: the bundled ingredient knowledge base, the barcode product
 * catalogue, and the user's scan history. List-shaped columns (aliases,
 * references, ingredient ids) are stored as JSON text — the volumes are tiny
 * and it keeps the mapping layer trivial.
 */
export const DB_NAME = 'openlabel.db';

/** Bumped whenever the bundled seed data changes so devices re-seed. */
export const SCHEMA_VERSION = 5;

export const CREATE_STATEMENTS = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  purpose TEXT NOT NULL,
  e_number TEXT,
  ins_number TEXT,
  aliases TEXT NOT NULL,
  regulations TEXT,
  regulatory_status TEXT,
  countries_restricted TEXT,
  scientific_summary TEXT,
  refs TEXT,
  score_penalty INTEGER
);

CREATE TABLE IF NOT EXISTS products (
  barcode TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  ingredients TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  product_name TEXT,
  barcode TEXT,
  raw_text TEXT,
  score INTEGER NOT NULL,
  verdict_kind TEXT NOT NULL,
  matched_count INTEGER NOT NULL,
  concern_count INTEGER NOT NULL,
  ingredient_ids TEXT NOT NULL,
  unresolved TEXT NOT NULL,
  nutrition TEXT,
  is_beverage INTEGER
);

CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans (created_at DESC);

-- Products fetched from Open Food Facts, cached so a re-scan works offline.
-- Kept separate from the bundled \`products\` catalogue so a seed-data rebuild
-- never wipes a user's looked-up products.
CREATE TABLE IF NOT EXISTS off_cache (
  barcode TEXT PRIMARY KEY NOT NULL,
  product TEXT NOT NULL,
  cached_at INTEGER NOT NULL
);

-- Bundled offline Open Food Facts (India) product set, shipped with the app so
-- the common case — a popular Indian product — resolves instantly with no
-- network. Re-seeded only when its data version bumps (see seed.ts); the user's
-- looked-up \`off_cache\` and \`scans\` are never touched by that.
CREATE TABLE IF NOT EXISTS off_bundled (
  barcode TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  ingredients TEXT NOT NULL,
  nutrition TEXT
);
`;
