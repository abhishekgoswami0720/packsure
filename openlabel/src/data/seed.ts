/**
 * Populate the local database from the bundled seed data.
 *
 * Two independent, version-gated steps:
 *   1. Reference data (ingredients + curated products) — gated by SEED_VERSION.
 *      A bump rebuilds those tables while the user's scan history is preserved.
 *   2. The offline Open Food Facts (India) product set — gated by its own
 *      OFF_INDIA_SEED_VERSION so it can refresh without touching anything else.
 *
 * Both let a data-only update ship in an app release and take effect on next
 * launch with no manual migration.
 */
import { CREATE_STATEMENTS, getDatabase, type Database } from '@/core/db';
import { ingredientRepository } from './ingredients/ingredient.repository';
import { INGREDIENT_SEED, SEED_VERSION } from './ingredients/seed';
import { productRepository } from './products/product.repository';
import { PRODUCT_SEED } from './products/seed';
import { bundledProductRepository } from './off/bundled.repository';
import { Product } from '@/domain/products';

/**
 * Expected version of the bundled OFF-India payload. Keep in sync with
 * OFF_INDIA_VERSION in off/off-india.data.ts — bump both when you regenerate the
 * data (node scripts/build-off-india.mjs). Held here so a version *match* skips
 * loading the multi-MB payload module entirely on every launch after the first.
 */
const OFF_INDIA_SEED_VERSION = 2;

export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();
  await seedReferenceData(db);
  await seedBundledOffIndia(db);
}

async function seedReferenceData(db: Database): Promise<void> {
  const meta = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'seed_version'",
  );
  if (meta?.value === String(SEED_VERSION)) return;

  // Rebuild bundled reference data; `scans`, `off_cache` and `off_bundled` are
  // untouched (they aren't dropped here).
  await db.execAsync('DROP TABLE IF EXISTS ingredients; DROP TABLE IF EXISTS products;');
  await db.execAsync(CREATE_STATEMENTS);

  await ingredientRepository.bulkUpsert(INGREDIENT_SEED);
  await productRepository.bulkUpsert(PRODUCT_SEED);

  await db.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seed_version', ?)",
    String(SEED_VERSION),
  );
}

async function seedBundledOffIndia(db: Database): Promise<void> {
  const meta = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'off_india_version'",
  );
  if (meta?.value === String(OFF_INDIA_SEED_VERSION)) return;

  try {
    // Loaded lazily and only when (re)seeding — on every later launch the
    // version matches above and this multi-MB module is never required.
    const { OFF_INDIA_DATA } = require('./off/off-india.data') as {
      OFF_INDIA_DATA: string;
    };
    const rows = JSON.parse(OFF_INDIA_DATA) as Product[];
    if (!Array.isArray(rows) || rows.length === 0) return;

    await bundledProductRepository.replaceAll(rows);
    await db.runAsync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('off_india_version', ?)",
      String(OFF_INDIA_SEED_VERSION),
    );
  } catch (err) {
    // The offline set is an enhancement — never let it break bootstrap. The app
    // still resolves products via the live OFF lookup and the label scanner.
    console.warn('Bundled OFF-India set unavailable; continuing without it.', err);
  }
}
