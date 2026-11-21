/**
 * Product repository — barcode lookups against the local catalogue.
 */
import { getDatabase } from '@/core/db';
import { Product } from '@/domain/products';

interface ProductRow {
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  ingredients: string;
}

function toProduct(row: ProductRow): Product {
  let ingredients: string[] = [];
  try {
    ingredients = JSON.parse(row.ingredients);
  } catch {
    ingredients = [];
  }
  return {
    barcode: row.barcode,
    name: row.name,
    brand: row.brand ?? undefined,
    category: row.category ?? undefined,
    ingredients,
  };
}

export const productRepository = {
  async count(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM products');
    return row?.n ?? 0;
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ProductRow>(
      'SELECT * FROM products WHERE barcode = ?',
      barcode,
    );
    return row ? toProduct(row) : null;
  },

  async bulkUpsert(products: Product[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const p of products) {
        await db.runAsync(
          `INSERT OR REPLACE INTO products (barcode, name, brand, category, ingredients)
           VALUES (?, ?, ?, ?, ?)`,
          p.barcode,
          p.name,
          p.brand ?? null,
          p.category ?? null,
          JSON.stringify(p.ingredients),
        );
      }
    });
  },
};
