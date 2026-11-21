/**
 * Build the bundled offline Open Food Facts (India) product set.
 *
 * Pages the OFF search API for products sold in India, most-scanned first, keeps
 * the ones that carry a usable ingredient signal (printed list and/or tagged
 * additives), maps them to OpenLabel's Product shape exactly the way the live
 * lookup does, and writes a compact JSON payload the app seeds into SQLite.
 *
 * "Most-scanned first" matters: a few thousand of the products people actually
 * scan covers far more real-world scans than a random slice of the long tail.
 *
 * Usage:  node scripts/build-off-india.mjs [maxPages]
 * Output: src/data/off/off-india.data.ts   (regenerate any time; it's derived)
 *
 * Data © Open Food Facts contributors, licensed under ODbL. OpenLabel shows the
 * attribution on every result built from this data.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/off/off-india.data.ts');

const USER_AGENT = 'OpenLabel/1.0 (food additive scanner)';
const PAGE_SIZE = 100; // the legacy search endpoint caps here anyway
const MAX_PAGES = Number(process.argv[2] ?? 200); // cover as much of India as OFF allows
const REQUEST_DELAY_MS = 8000; // gentle on OFF — deep pagination 503s if pushed
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_CONSECUTIVE_FAILURES = 8; // give up only after OFF is clearly refusing
const PAGE_ATTEMPTS = 6; // search.pl flaps 503/HTML ~half the time; retry through it
const DATA_VERSION = 3; // v3 = also keeps named products that carry nutrition (no ingredient list needed)

const FIELDS = [
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
].join(',');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function searchUrl(page) {
  const params = new URLSearchParams({
    action: 'process',
    json: '1',
    tagtype_0: 'countries',
    tag_contains_0: 'contains',
    tag_0: 'india',
    sort_by: 'unique_scans_n',
    page_size: String(PAGE_SIZE),
    page: String(page),
    fields: FIELDS,
  });
  return `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;
}

async function fetchPage(page, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(searchUrl(page), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 429) {
      if (attempt >= 4) throw new Error('rate-limited too many times');
      const backoff = 30_000 * (attempt + 1);
      console.warn(`  429 on page ${page} — backing off ${backoff / 1000}s`);
      await sleep(backoff);
      return fetchPage(page, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // search.pl intermittently answers 200 with an HTML "temporarily
    // unavailable" page; JSON.parsing that is what silently killed earlier runs.
    // Read as text and verify it's actually JSON before trusting it.
    const body = await res.text();
    if (!body.trimStart().startsWith('{')) {
      throw new Error('non-JSON body (HTML error page)');
    }
    return JSON.parse(body);
  } catch (err) {
    if (attempt < PAGE_ATTEMPTS - 1) {
      const backoff = 4000 * (attempt + 1);
      console.warn(
        `  page ${page} failed (${err.message}) — retry ${attempt + 1}/${PAGE_ATTEMPTS - 1} in ${backoff / 1000}s`,
      );
      await sleep(backoff);
      return fetchPage(page, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Mapping (mirrors src/data/off/off.mapper.ts) ──────────────────────────────

function additiveTagToToken(tag) {
  const match = String(tag).match(/e(\d{3}[a-z]?)$/i);
  return match ? `E${match[1].toLowerCase()}` : null;
}

/** Coerce an OFF nutriment value (sometimes a numeric string) to a number. */
function num(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return isFinite(n) ? n : undefined;
}

/**
 * Pull the few nutrition signals we score/show. Mirrors nutritionOf() in
 * src/data/off/off.mapper.ts so a bundled product scores identically to a live
 * lookup. Returns undefined when OFF carries none (keeps the bundle compact).
 */
function nutritionOf(p) {
  const n = p.nutriments ?? {};
  const nova =
    p.nova_group && [1, 2, 3, 4].includes(Number(p.nova_group))
      ? Number(p.nova_group)
      : undefined;
  // OFF gives salt and sodium; prefer salt, else derive salt = sodium × 2.5.
  const salt =
    num(n['salt_100g']) ??
    (num(n['sodium_100g']) !== undefined ? num(n['sodium_100g']) * 2.5 : undefined);

  const out = {
    novaGroup: nova,
    sugars100g: num(n['sugars_100g']),
    salt100g: salt,
    saturatedFat100g: num(n['saturated-fat_100g']),
    fiber100g: num(n['fiber_100g']),
    proteins100g: num(n['proteins_100g']),
    energyKcal100g: num(n['energy-kcal_100g']),
  };

  // Drop undefined keys so the serialised payload stays small.
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return Object.keys(out).length ? out : undefined;
}

function firstSegment(value) {
  const first = value?.split(',')[0]?.trim();
  return first ? first : undefined;
}

function categoryOf(p) {
  if (p.categories) return firstSegment(p.categories);
  const tag = p.categories_tags?.[p.categories_tags.length - 1];
  return tag ? tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ') : undefined;
}

/**
 * Map an OFF product to our Product. We keep the printed ingredient text intact
 * (the app's parser splits it the same way it splits a manual entry, preserving
 * "Colour (INS 110)" structure) and append machine-tagged additive codes.
 * Returns null when there's no usable ingredient signal — those are useless
 * offline and would only bloat the bundle.
 */
function mapProduct(p) {
  if (!p.code) return null;

  const text = (p.ingredients_text_en || p.ingredients_text || '').trim();
  const additives = (p.additives_tags ?? [])
    .map(additiveTagToToken)
    .filter(Boolean);
  const nutrition = nutritionOf(p);
  const realName = (p.product_name_en || p.product_name || '').trim();

  const hasIngredientSignal = text.length >= 3 || additives.length > 0;
  // Keep a product if it carries a usable ingredient signal, OR if it's a named
  // product with nutrition — the barcode still resolves to a name + Nutri-Score,
  // which is a useful result now that scoring works from nutrition alone.
  if (!hasIngredientSignal && !(nutrition && realName)) return null;

  const ingredients = [];
  if (text) ingredients.push(text);
  for (const a of additives) ingredients.push(a);

  const name =
    realName ||
    [firstSegment(p.brands), p.quantity].filter(Boolean).join(' ') ||
    'Unnamed product';

  const row = { barcode: String(p.code), name, ingredients };
  const brand = firstSegment(p.brands);
  const category = categoryOf(p);
  if (brand) row.brand = brand;
  if (category) row.category = category;
  if (nutrition) row.nutrition = nutrition;
  return row;
}

/** Load any previously-built set so re-runs only ever grow coverage. */
async function loadExisting() {
  try {
    const text = await readFile(OUT, 'utf8');
    const match = text.match(/OFF_INDIA_DATA = (".*");/s);
    if (!match) return [];
    const jsonString = JSON.parse(match[1]); // unwrap the TS string literal
    const rows = JSON.parse(jsonString);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Fetching India products (most-scanned first), page size ${PAGE_SIZE}…`);
  const byBarcode = new Map();

  const existing = await loadExisting();
  for (const row of existing) {
    if (row?.barcode) byBarcode.set(String(row.barcode), row);
  }
  if (existing.length) console.log(`Starting from ${existing.length} previously-saved products.`);

  let lastPage = MAX_PAGES;
  let consecutiveFailures = 0;

  for (let page = 1; page <= lastPage; page++) {
    let json;
    try {
      json = await fetchPage(page);
      consecutiveFailures = 0;
    } catch (err) {
      consecutiveFailures++;
      console.warn(
        `  page ${page} failed permanently (${err.message}) — skipping ` +
          `(${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES} in a row).`,
      );
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn('OFF is refusing repeatedly — stopping and keeping what we have.');
        break;
      }
      await sleep(REQUEST_DELAY_MS);
      continue;
    }
    if (page === 1 && typeof json.count === 'number') {
      const pagesForAll = Math.ceil(json.count / PAGE_SIZE);
      lastPage = Math.min(MAX_PAGES, pagesForAll);
      console.log(
        `OFF reports ${json.count} India products — ${lastPage} pages to cover them.`,
      );
    }
    const products = Array.isArray(json.products) ? json.products : [];
    if (products.length === 0) {
      console.log('No more products returned — done.');
      break;
    }
    let kept = 0;
    let enriched = 0;
    for (const p of products) {
      const row = mapProduct(p);
      if (!row) continue;
      const prev = byBarcode.get(row.barcode);
      // Newest data wins: a re-fetch upgrades an older (e.g. v1, nutrition-less)
      // row in place, so re-runs both grow coverage AND backfill nutrition.
      byBarcode.set(row.barcode, row);
      if (!prev) kept++;
      else if (!prev.nutrition && row.nutrition) enriched++;
    }
    console.log(
      `  page ${page}/${lastPage}: ${products.length} fetched, ${kept} new, ${enriched} nutrition-enriched (running ${byBarcode.size})`,
    );
    if (page < lastPage) await sleep(REQUEST_DELAY_MS);
  }

  const rows = [...byBarcode.values()];
  // Stable order (most-scanned first is already roughly preserved by insertion).
  const json = JSON.stringify(rows);
  const file =
    `/**\n` +
    ` * AUTO-GENERATED by scripts/build-off-india.mjs — do not edit by hand.\n` +
    ` *\n` +
    ` * Offline Open Food Facts (India) product set, most-scanned first.\n` +
    ` * ${rows.length} products. Data © Open Food Facts contributors, ODbL licensed.\n` +
    ` * Stored as a JSON string and parsed once at seed time (cheaper than a giant\n` +
    ` * object literal) so it doesn't cost startup after the first launch.\n` +
    ` */\n` +
    `export const OFF_INDIA_VERSION = ${DATA_VERSION};\n` +
    `export const OFF_INDIA_COUNT = ${rows.length};\n` +
    `export const OFF_INDIA_DATA = ${JSON.stringify(json)};\n`;

  await writeFile(OUT, file, 'utf8');
  console.log(`\nWrote ${rows.length} products → ${OUT}`);
  console.log(`Payload size: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
