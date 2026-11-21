/**
 * Open Food Facts API types — only the fields OpenLabel actually reads.
 *
 * OFF is a free, crowd-sourced product database (~3M products, ODbL licensed).
 * We request a narrow `fields` set to keep responses small and fast. See
 * https://openfoodfacts.github.io/openfoodfacts-server/api/ for the full schema.
 */

/** A single product as returned under the `product` key of the v2 endpoint. */
export interface OffProduct {
  code: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  /** Ingredient list as printed, in the product's local language. */
  ingredients_text?: string;
  /** English ingredient list when contributors have provided one. */
  ingredients_text_en?: string;
  /** Pre-tagged additives, e.g. ["en:e322", "en:e322i"]. Our richest signal. */
  additives_tags?: string[];
  categories?: string;
  categories_tags?: string[];
  quantity?: string;
  /** NOVA processing group, 1–4. */
  nova_group?: number;
  /** Per-100g nutrition values, keyed e.g. "sugars_100g", "salt_100g". */
  nutriments?: Record<string, number | string | undefined>;
}

/** Envelope of the v2 `/product/{barcode}.json` endpoint. */
export interface OffResponse {
  code: string;
  /** 1 = found, 0 = not found. */
  status: 0 | 1;
  status_verbose?: string;
  product?: OffProduct;
}

/** Fields we ask OFF for — keep in sync with what the mapper consumes. */
export const OFF_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'ingredients_text',
  'ingredients_text_en',
  'additives_tags',
  'categories',
  'categories_tags',
  'quantity',
  'nova_group',
  'nutriments',
] as const;
