/**
 * Open Food Facts network client.
 *
 * One job: given a barcode, return the OFF product (or null if OFF genuinely
 * doesn't have it). Network/timeout problems surface as {@link OffNetworkError}
 * so the caller can distinguish "we're offline" from "this product is unknown"
 * and show the right message.
 *
 * OFF asks every app to send a descriptive User-Agent; we comply.
 */
import { OFF_FIELDS, OffProduct, OffResponse } from './off.types';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const USER_AGENT = 'OpenLabel/1.0 (food additive scanner)';
// Kept short so a slow connection falls through to the "scan the label" path
// quickly rather than leaving the user staring at a spinner in a shop aisle.
// A genuinely offline device fails fast anyway (fetch rejects immediately).
const TIMEOUT_MS = 8_000;

/** A connectivity / server problem — distinct from a clean "not found". */
export class OffNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OffNetworkError';
  }
}

/**
 * Look a barcode up on Open Food Facts.
 *
 * @returns the product, or `null` when OFF responded but has no such product.
 * @throws  {@link OffNetworkError} on timeout, offline, or a non-2xx response.
 */
export async function fetchOffProduct(barcode: string): Promise<OffProduct | null> {
  const code = barcode.trim();
  if (!code) return null;

  const url =
    `${BASE_URL}/${encodeURIComponent(code)}.json` + `?fields=${OFF_FIELDS.join(',')}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });

    // OFF returns 404 for some unknown barcodes (others come back 200 with
    // status: 0). Both mean "no such product" — a clean not-found, not an error.
    if (res.status === 404) return null;

    if (!res.ok) {
      throw new OffNetworkError(`Open Food Facts returned ${res.status}`);
    }

    const json = (await res.json()) as OffResponse;
    if (json.status !== 1 || !json.product) return null;
    return json.product;
  } catch (err) {
    if (err instanceof OffNetworkError) throw err;
    // AbortError, TypeError (offline), JSON parse — all "couldn't reach OFF".
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new OffNetworkError(message);
  } finally {
    clearTimeout(timer);
  }
}
