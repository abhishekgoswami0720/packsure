/**
 * A packaged product keyed by its barcode. OpenLabel ships a small offline
 * catalogue so a barcode scan resolves to an ingredient list without a network
 * call. Unknown barcodes fall back to the "scan the label instead" flow.
 */
export interface Product {
  /** EAN/UPC barcode digits. */
  barcode: string;
  name: string;
  brand?: string;
  /** Shelf category, e.g. "Soft drink", shown as context on the result. */
  category?: string;
  /** Raw ingredient phrases exactly as printed on the pack. */
  ingredients: string[];
  /** Nutrition + processing facts (from Open Food Facts; barcode products only). */
  nutrition?: ProductNutrition;
}

/**
 * The handful of nutrition signals that actually drive a buy/skip decision —
 * how processed it is, the three things to limit (sugar/salt/saturated fat),
 * and the two worth having (fibre/protein). All optional; many products only
 * carry some. Amounts are grams per 100g unless noted.
 */
export interface ProductNutrition {
  /** NOVA processing group: 1 unprocessed … 4 ultra-processed. */
  novaGroup?: 1 | 2 | 3 | 4;
  sugars100g?: number;
  salt100g?: number;
  saturatedFat100g?: number;
  fiber100g?: number;
  proteins100g?: number;
  energyKcal100g?: number;
  /**
   * Grams eaten in a typical serving. Nutrients are scored per this amount rather
   * than a flat 100g, so a food eaten by the spoonful (a chutney, a masala) isn't
   * judged as if you ate 100g of it. Undefined ⇒ 100g (i.e. per-100g, unchanged).
   */
  referenceGrams?: number;
}
