/**
 * Scan repository — persists and reads the user's scan history.
 */
import { getDatabase } from '@/core/db';
import { ProductNutrition } from '@/domain/products';
import { ScanRecord, ScanSource } from '@/domain/scans';
import { VerdictKind } from '@/domain/scoring/types';

interface ScanRow {
  id: string;
  created_at: number;
  source: string;
  product_name: string | null;
  barcode: string | null;
  raw_text: string | null;
  score: number;
  verdict_kind: string;
  matched_count: number;
  concern_count: number;
  ingredient_ids: string;
  unresolved: string;
  nutrition: string | null;
  is_beverage: number | null;
}

function toScan(row: ScanRow): ScanRecord {
  const parse = (v: string): string[] => {
    try {
      return JSON.parse(v);
    } catch {
      return [];
    }
  };
  return {
    id: row.id,
    createdAt: row.created_at,
    source: row.source as ScanSource,
    productName: row.product_name,
    barcode: row.barcode,
    rawText: row.raw_text,
    score: row.score,
    verdictKind: row.verdict_kind as VerdictKind,
    matchedCount: row.matched_count,
    concernCount: row.concern_count,
    ingredientIds: parse(row.ingredient_ids),
    unresolved: parse(row.unresolved),
    nutrition: row.nutrition ? (safeParse(row.nutrition) as ProductNutrition | null) : null,
    isBeverage: row.is_beverage === 1,
  };
}

function safeParse(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export const scanRepository = {
  async insert(scan: ScanRecord): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO scans
        (id, created_at, source, product_name, barcode, raw_text, score, verdict_kind,
         matched_count, concern_count, ingredient_ids, unresolved, nutrition, is_beverage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      scan.id,
      scan.createdAt,
      scan.source,
      scan.productName,
      scan.barcode,
      scan.rawText,
      scan.score,
      scan.verdictKind,
      scan.matchedCount,
      scan.concernCount,
      JSON.stringify(scan.ingredientIds),
      JSON.stringify(scan.unresolved),
      scan.nutrition ? JSON.stringify(scan.nutrition) : null,
      scan.isBeverage ? 1 : 0,
    );
  },

  async getById(id: string): Promise<ScanRecord | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ScanRow>('SELECT * FROM scans WHERE id = ?', id);
    return row ? toScan(row) : null;
  },

  async list(limit = 100): Promise<ScanRecord[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ScanRow>(
      'SELECT * FROM scans ORDER BY created_at DESC LIMIT ?',
      limit,
    );
    return rows.map(toScan);
  },

  async remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM scans WHERE id = ?', id);
  },

  async clear(): Promise<void> {
    const db = await getDatabase();
    await db.execAsync('DELETE FROM scans');
  },
};
