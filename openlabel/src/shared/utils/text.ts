/**
 * Text normalisation utilities shared by the ingredient-matching engine.
 * Kept pure and dependency-free so they are trivially unit-testable.
 */

/** Strip accents/diacritics (é -> e) without pulling in a library. */
export function stripDiacritics(input: string): string {
  return input.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Canonical normalisation for matching:
 * lower-case, strip diacritics, drop anything that isn't a-z/0-9, collapse space.
 */
export function normalizeToken(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(ins|e)\s*no\b/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Fold the most common OCR confusions so a slightly mis-read label still
 * resolves. Applied to an already-normalised token. Deliberately conservative.
 */
export function ocrCanonical(normalized: string): string {
  return normalized
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/5/g, 's')
    .replace(/8/g, 'b')
    .replace(/\brn\b/g, 'm')
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a bare additive number from a token that looks like an
 * E-number or INS-number reference. Returns just the digits (+ optional
 * lowercase letter suffix), or null.
 *
 *   "E 951"   -> "951"
 *   "INS-951" -> "951"
 *   "e150d"   -> "150d"
 */
export function extractAdditiveNumber(input: string): string | null {
  const cleaned = stripDiacritics(input).toLowerCase().replace(/[\s.\-_]/g, '');
  const match = cleaned.match(/^(?:ins|e)(\d{3}[a-z]?)$/);
  if (match) return match[1];
  // Bare 3-digit additive number (102, 951, 150d) — common on Indian labels.
  const bare = cleaned.match(/^(\d{3}[a-z]?)$/);
  if (bare) return bare[1];
  return null;
}

/** Classic iterative Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Normalised similarity in [0,1] derived from edit distance. */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}
