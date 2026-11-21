/**
 * Read access to the bundled offline Open Food Facts (India) product set.
 *
 * This is the "works without a network" tier: a popular Indian product resolves
 * straight from SQLite, no request, no spinner. The table is populated by the
 * seeder from the generated {@link file://./off-india.data.ts} payload.
 */
import { getDatabase } from '@/core/db';
import { Product, ProductNutrition } from '@/domain/products';

interface BundledRow {
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  ingredients: string;
  nutrition: string | null;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toProduct(row: BundledRow): Product {
  const nutrition = row.nutrition
    ? parseJson<ProductNutrition | null>(row.nutrition, null)
    : null;
  return {
    barcode: row.barcode,
    name: row.name,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
    ingredients: parseJson<string[]>(row.ingredients, []),
    nutrition: nutrition ?? undefined,
  };
}

export const bundledProductRepository = {
  async count(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM off_bundled');
    return row?.n ?? 0;
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<BundledRow>(
      'SELECT * FROM off_bundled WHERE barcode = ?',
      barcode,
    );
    return row ? toProduct(row) : null;
  },

  /** Whether a barcode is in the bundled OFF set — this data is OFF too, so it
   *  drives the same ODbL credit as a live lookup. */
  async has(barcode: string | null | undefined): Promise<boolean> {
    if (!barcode) return false;
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM off_bundled WHERE barcode = ?',
      barcode,
    );
    return (row?.n ?? 0) > 0;
  },

  /** Replace the whole set in one transaction (used by the version-gated seed). */
  async replaceAll(products: Product[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM off_bundled');
      for (const p of products) {
        await db.runAsync(
          `INSERT OR REPLACE INTO off_bundled (barcode, name, brand, category, ingredients, nutrition)
           VALUES (?, ?, ?, ?, ?, ?)`,
          p.barcode,
          p.name,
          p.brand ?? null,
          p.category ?? null,
          JSON.stringify(p.ingredients),
          p.nutrition ? JSON.stringify(p.nutrition) : null,
        );
      }
    });
  },
};
