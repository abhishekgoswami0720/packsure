/**
 * Barcode → product resolution, in priority order:
 *
 *   1. bundled catalogue   (curated, instant, always offline)
 *   2. OFF cache           (previously looked up, offline)
 *   3. Open Food Facts API (online; result is cached for next time)
 *
 * The result type lets the UI tell apart the three "no product" situations:
 * genuinely unknown, found-but-no-ingredients, and couldn't-reach-the-network.
 */
import { Product } from '@/domain/products';
import { productRepository } from '../products/product.repository';
import { fetchOffProduct, OffNetworkError } from './off.client';
import { offToProduct } from './off.mapper';
import { offRepository } from './off.repository';
import { bundledProductRepository } from './bundled.repository';

export type ProductLookup =
  | { status: 'found'; product: Product; fromOff: boolean }
  | { status: 'not_found' }
  | { status: 'offline' };

export async function lookupProductByBarcode(barcode: string): Promise<ProductLookup> {
  const code = barcode.trim();
  if (!code) return { status: 'not_found' };

  // 1. Curated offline catalogue.
  const catalogued = await productRepository.getByBarcode(code);
  if (catalogued) return { status: 'found', product: catalogued, fromOff: false };

  // 2. Bundled offline OFF-India set (no network — the common case for Indian
  //    shoppers resolves instantly).
  const bundled = await bundledProductRepository.getByBarcode(code);
  if (bundled) return { status: 'found', product: bundled, fromOff: true };

  // 3. Previously fetched OFF product (offline cache).
  const cached = await offRepository.getCached(code);
  if (cached) return { status: 'found', product: cached, fromOff: true };

  // 4. Live Open Food Facts lookup.
  try {
    const off = await fetchOffProduct(code);
    if (!off) return { status: 'not_found' };
    const product = offToProduct(off);
    await offRepository.cache(product);
    return { status: 'found', product, fromOff: true };
  } catch (err) {
    if (err instanceof OffNetworkError) return { status: 'offline' };
    throw err;
  }
}
