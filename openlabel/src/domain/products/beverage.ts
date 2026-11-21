import { Product } from './types';

/**
 * Whether a product is a drink, from its category. Beverages are scored on the
 * stricter Nutri-Score beverage table — the reason a sugary soft drink correctly
 * lands at grade E even though its per-100g sugar looks modest.
 *
 * Deliberately avoids bare "milk" so "milk chocolate" (a solid) isn't caught.
 */
const BEVERAGE_HINTS =
  /\b(beverage|drink|soda|soft.?drink|cola|carbonate|juice|nectar|squash|cordial|smoothie|lemonade|iced.?tea|energy.?drink|sports.?drink|milkshake|shake|lassi|buttermilk|kombucha|sharbat|sherbet)\b/i;

export function isBeverageProduct(product: Pick<Product, 'category'>): boolean {
  return product.category ? BEVERAGE_HINTS.test(product.category) : false;
}
