/**
 * Ingredient repository — the only code that knows how an {@link Ingredient}
 * is stored. Domain and presentation layers depend on this interface, never on
 * SQLite directly (repository pattern).
 */
import { getDatabase } from '@/core/db';
import {
  Ingredient,
  IngredientCategory,
  IngredientReference,
  RegionRegulation,
  RiskLevel,
} from '@/domain/ingredients/types';

interface IngredientRow {
  id: string;
  name: string;
  category: string;
  risk_level: string;
  purpose: string;
  e_number: string | null;
  ins_number: string | null;
  aliases: string;
  regulations: string | null;
  regulatory_status: string | null;
  countries_restricted: string | null;
  scientific_summary: string | null;
  refs: string | null;
  score_penalty: number | null;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toIngredient(row: IngredientRow): Ingredient {
  const regulations = row.regulations
    ? parseJson<RegionRegulation[]>(row.regulations, [])
    : undefined;
  const countriesRestricted = row.countries_restricted
    ? parseJson<string[]>(row.countries_restricted, [])
    : undefined;
  const references = row.refs ? parseJson<IngredientReference[]>(row.refs, []) : undefined;

  return {
    id: row.id,
    name: row.name,
    category: row.category as IngredientCategory,
    riskLevel: row.risk_level as RiskLevel,
    purpose: row.purpose,
    eNumber: row.e_number ?? undefined,
    insNumber: row.ins_number ?? undefined,
    aliases: parseJson<string[]>(row.aliases, []),
    regulations: regulations && regulations.length ? regulations : undefined,
    regulatoryStatus: row.regulatory_status ?? undefined,
    countriesRestricted,
    scientificSummary: row.scientific_summary ?? undefined,
    references,
    scorePenalty: row.score_penalty ?? undefined,
  };
}

export const ingredientRepository = {
  async count(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM ingredients');
    return row?.n ?? 0;
  },

  async getAll(): Promise<Ingredient[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<IngredientRow>('SELECT * FROM ingredients ORDER BY name');
    return rows.map(toIngredient);
  },

  async getById(id: string): Promise<Ingredient | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<IngredientRow>('SELECT * FROM ingredients WHERE id = ?', id);
    return row ? toIngredient(row) : null;
  },

  /** Insert (or replace) a batch of ingredients in one transaction. */
  async bulkUpsert(ingredients: Ingredient[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      for (const ing of ingredients) {
        await db.runAsync(
          `INSERT OR REPLACE INTO ingredients
            (id, name, category, risk_level, purpose, e_number, ins_number, aliases,
             regulations, regulatory_status, countries_restricted, scientific_summary,
             refs, score_penalty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ing.id,
          ing.name,
          ing.category,
          ing.riskLevel,
          ing.purpose,
          ing.eNumber ?? null,
          ing.insNumber ?? null,
          JSON.stringify(ing.aliases),
          ing.regulations ? JSON.stringify(ing.regulations) : null,
          ing.regulatoryStatus ?? null,
          ing.countriesRestricted ? JSON.stringify(ing.countriesRestricted) : null,
          ing.scientificSummary ?? null,
          ing.references ? JSON.stringify(ing.references) : null,
          ing.scorePenalty ?? null,
        );
      }
    });
  },
};
