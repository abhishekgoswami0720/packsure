/**
 * Cache repository for Open Food Facts lookups.
 *
 * Every product successfully fetched from OFF is stored here as JSON so a later
 * scan of the same barcode resolves instantly and offline. This table is never
 * touched by the seed rebuild, so the user's looked-up products persist across
 * app updates.
 */
import { getDatabase } from '@/core/db';
import { Product } from '@/domain/products';

interface OffCacheRow {
  barcode: string;
  product: string;
  cached_at: number;
}

function parse(row: OffCacheRow): Product | null {
  try {
    return JSON.parse(row.product) as Product;
  } catch {
    return null;
  }
}

export const offRepository = {
  async getCached(barcode: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<OffCacheRow>(
      'SELECT * FROM off_cache WHERE barcode = ?',
      barcode,
    );
    return row ? parse(row) : null;
  },

  async has(barcode: string | null | undefined): Promise<boolean> {
    if (!barcode) return false;
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM off_cache WHERE barcode = ?',
      barcode,
    );
    return (row?.n ?? 0) > 0;
  },

  async cache(product: Product): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO off_cache (barcode, product, cached_at) VALUES (?, ?, ?)',
      product.barcode,
      JSON.stringify(product),
      Date.now(),
    );
  },
};
