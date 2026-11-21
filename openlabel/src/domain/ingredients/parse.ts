/**
 * Turn a raw ingredient-label string (as typed, pasted, produced by OCR, or
 * joined from a product's fields) into a clean list of candidate ingredient
 * tokens ready for matching.
 *
 * Real labels are messy: nested parentheses, "Contains: ...", percentages,
 * functional-class words ("Preservative", "Colour"), roman-numeral variant
 * suffixes ("(ii)"), and trailing allergen notes. We split conservatively,
 * drop the obvious noise, and let the matching engine resolve the rest.
 */

const NOISE_PREFIXES =
  /^(ingredients?|contains?|composition|made (?:from|with)|may contain)\s*[:\-]?\s*/i;

/** Allergen / marketing trailers that are never ingredients themselves. */
const TRAILER =
  /\b(allergen advice|for allergens?|store in a cool|best before|net (?:weight|wt)|mfg|manufactured|marketed|nutritional information).*$/i;

/**
 * Functional-class words that label an additive's role rather than naming it.
 * The specific additive usually follows in parentheses ("Colour (INS 110)"),
 * so dropping the class word keeps the "also contains" list meaningful.
 */
const STOPWORDS = new Set([
  'colour',
  'color',
  'colours',
  'colors',
  'preservative',
  'preservatives',
  'emulsifier',
  'emulsifiers',
  'stabiliser',
  'stabilisers',
  'stabilizer',
  'stabilizers',
  'thickener',
  'thickeners',
  'antioxidant',
  'antioxidants',
  'sweetener',
  'sweeteners',
  'flavour enhancer',
  'flavour enhancers',
  'flavor enhancer',
  'flavor enhancers',
  'acidity regulator',
  'acidity regulators',
  'raising agent',
  'raising agents',
  'anticaking agent',
  'humectant',
  'class ii preservative',
  'added flavours',
  'added flavour',
  'added flavors',
  'added flavor',
  'natural and artificial flavours',
  'permitted synthetic food colour',
  'and',
  'or',
]);

const ROMAN = /^(i{1,3}|iv|v|vi{0,3})$/i;

/** Split a raw label into individual ingredient phrases. */
export function splitIngredientList(raw: string): string[] {
  if (!raw) return [];

  let text = raw.replace(/\r/g, ' ').replace(/\n/g, ', ');
  text = text.replace(NOISE_PREFIXES, '');
  text = text.replace(TRAILER, '');

  const tokens: string[] = [];
  let current = '';

  const flush = () => {
    const cleaned = cleanPhrase(current);
    if (cleaned) tokens.push(cleaned);
    current = '';
  };

  for (const char of text) {
    // A parenthesis boundary separates the class word from its contents:
    // "Colour (INS 110)" -> "Colour", "INS 110".
    if (char === '(' || char === '[') {
      flush();
      continue;
    }
    if (char === ')' || char === ']') {
      flush();
      continue;
    }
    if (char === ',' || char === ';') {
      flush();
      continue;
    }
    current += char;
  }
  flush();

  // Break "x and y" / "x or y" that survived inside one cell.
  const expanded = tokens.flatMap((t) =>
    t.split(/\b(?:and\/or|and|or)\b/i).map((s) => cleanPhrase(s)),
  );

  // Drop noise (stopwords, roman-numeral variant suffixes, 1-char crumbs) and
  // de-duplicate while preserving order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of expanded) {
    const key = t.toLowerCase();
    if (!t || t.length < 2) continue;
    if (ROMAN.test(t)) continue;
    if (STOPWORDS.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function cleanPhrase(phrase: string): string {
  return phrase
    .replace(/\d+(\.\d+)?\s*%/g, ' ') // strip "12%" percentages
    .replace(/\*+/g, ' ')
    .replace(/[.]+$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
