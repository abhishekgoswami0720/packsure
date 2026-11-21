/**
 * Single shared SQLite connection.
 *
 * The database is opened lazily and memoised, so every repository awaits the
 * same connection and migrations run exactly once per app session.
 */
import * as SQLite from 'expo-sqlite';
import { CREATE_STATEMENTS, DB_NAME, SCHEMA_VERSION } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(CREATE_STATEMENTS);
  // Additive column migrations for installs created before the column existed.
  // SQLite has no "ADD COLUMN IF NOT EXISTS", so we attempt and ignore the
  // "duplicate column" error on databases that already have it.
  await db.execAsync('ALTER TABLE scans ADD COLUMN nutrition TEXT;').catch(() => undefined);
  await db.execAsync('ALTER TABLE scans ADD COLUMN is_beverage INTEGER;').catch(() => undefined);
  await db.execAsync('ALTER TABLE off_bundled ADD COLUMN nutrition TEXT;').catch(() => undefined);
  // `user_version` lets us gate future migrations / re-seeds.
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  return db;
}

/** Get (or lazily open) the shared database connection. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((err) => {
      // Reset so a later call can retry a failed open.
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export type Database = SQLite.SQLiteDatabase;
