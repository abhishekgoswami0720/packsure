/**
 * Map an Open Food Facts product onto OpenLabel's domain {@link Product}.
 *
 * Two ingredient signals are merged, in priority order:
 *   1. `ingredients_text` (English when available) — split into phrases by the
 *      same parser the manual-entry path uses.
 *   2. `additives_tags` (e.g. "en:e322") — appended as bare E-number tokens.
 *
 * The additive tags are the reliable part: they're machine-tagged by OFF and
 * resolve straight through the matching engine's additive index, so a product
 * with a messy or non-English ingredient string still scores its additives.
 */
import { splitIngredientList } from '@/domain/ingredients/parse';
import { Product, ProductNutrition } from '@/domain/products';
import { OffProduct } from './off.types';

/** Coerce an OFF nutriment value (sometimes a numeric string) to a number. */
function num(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return isFinite(n) ? n : undefined;
}

/** Pull the few nutrition signals we score/show; undefined when OFF has none. */
function nutritionOf(p: OffProduct): ProductNutrition | undefined {
  const n = p.nutriments ?? {};
  const nova =
    p.nova_group && [1, 2, 3, 4].includes(Number(p.nova_group))
      ? (Number(p.nova_group) as 1 | 2 | 3 | 4)
      : undefined;
  // OFF gives salt and sodium; prefer salt, else derive salt = sodium × 2.5.
  const salt = num(n['salt_100g']) ?? (num(n['sodium_100g']) !== undefined ? num(n['sodium_100g'])! * 2.5 : undefined);

  const out: ProductNutrition = {
    novaGroup: nova,
    sugars100g: num(n['sugars_100g']),
    salt100g: salt,
    saturatedFat100g: num(n['saturated-fat_100g']),
    fiber100g: num(n['fiber_100g']),
    proteins100g: num(n['proteins_100g']),
    energyKcal100g: num(n['energy-kcal_100g']),
  };

  const hasAny = Object.values(out).some((v) => v !== undefined);
  return hasAny ? out : undefined;
}

/** "en:e322" / "en:e150d" -> "E322" / "E150d". Anything else -> null. */
function additiveTagToToken(tag: string): string | null {
  const match = tag.match(/e(\d{3}[a-z]?)$/i);
  return match ? `E${match[1].toLowerCase()}` : null;
}

function firstSegment(value: string | undefined): string | undefined {
  const first = value?.split(',')[0]?.trim();
  return first ? first : undefined;
}

/** Pick the most human category label OFF offers. */
function categoryOf(p: OffProduct): string | undefined {
  if (p.categories) return firstSegment(p.categories);
  const tag = p.categories_tags?.[p.categories_tags.length - 1];
  return tag ? tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ') : undefined;
}

export function offToProduct(p: OffProduct): Product {
  const name =
    (p.product_name_en || p.product_name || '').trim() ||
    [firstSegment(p.brands), p.quantity].filter(Boolean).join(' ') ||
    'Unnamed product';

  const text = (p.ingredients_text_en || p.ingredients_text || '').trim();
  const fromText = splitIngredientList(text);
  const fromAdditives = (p.additives_tags ?? [])
    .map(additiveTagToToken)
    .filter((t): t is string => t !== null);

  // Merge text phrases + additive codes, de-duplicating case-insensitively.
  const seen = new Set<string>();
  const ingredients: string[] = [];
  for (const token of [...fromText, ...fromAdditives]) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ingredients.push(token);
  }

  return {
    barcode: p.code,
    name,
    brand: firstSegment(p.brands),
    category: categoryOf(p),
    ingredients,
    nutrition: nutritionOf(p),
  };
}
