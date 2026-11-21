/**
 * Reference amount (grams) for a product — the realistic quantity eaten in one
 * sitting. Nutrients are scored per this amount rather than a flat 100g, so foods
 * eaten by the spoonful (condiments, pickles, spice blends) aren't unfairly
 * tanked by their per-100g concentration: a chutney is salty per 100g, but you
 * only eat ~15g of it.
 *
 * Deliberately narrow and conservative. Only clearly small-serving *savoury*
 * groups get a reduced amount; sweets, spreads, oils, snacks, drinks and
 * everything else keep 100g. This means the adjustment can only ever lift the
 * specific salt/serving distortion it targets — it can never make a sugary or
 * fatty product look better than per-100g scoring already rates it. Amounts
 * follow the US FDA reference-amount tables (RACC), rounded sensibly.
 */

/** Small-serving savoury groups → grams. First match wins; default is 100g. */
const GROUPS: { test: RegExp; grams: number }[] = [
  // Condiments, sauces, pickles, savoury pastes — eaten ~1 tablespoon.
  {
    test: /\b(condiment|sauce|ketchup|chutney|dip|dressing|mayonnaise|mayo|relish|salsa|pickle|achaar|achar|paste|vinegar|mustard|marinade)\b/i,
    grams: 15,
  },
  // Dry spices, masalas, seasonings — eaten by the pinch or spoon.
  {
    test: /\b(spice|spices|masala|seasoning|curry[\s-]?powder|herb|herbs)\b/i,
    grams: 8,
  },
];

const DEFAULT_GRAMS = 100;

/** The reference amount for a product's shelf category (100g when unknown). */
export function referenceAmountFor(category: string | undefined): number {
  if (!category) return DEFAULT_GRAMS;
  for (const group of GROUPS) {
    if (group.test.test(category)) return group.grams;
  }
  return DEFAULT_GRAMS;
}
