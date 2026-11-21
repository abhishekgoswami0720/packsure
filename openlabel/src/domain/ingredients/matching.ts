/**
 * The ingredient matching engine.
 *
 * Given the raw phrases off a label (or a product's ingredient list) it
 * resolves each one to a known {@link Ingredient}, tolerating:
 *   - E-numbers / INS-numbers ("E951", "INS 951", "951")
 *   - aliases ("Ajinomoto" -> Monosodium glutamate)
 *   - accents and punctuation
 *   - common OCR slips ("Aspartarne" -> "Aspartame")
 *
 * It is deliberately pure: pass in the known ingredient set, get matches back.
 * No database, no I/O — so it runs the same on device and in a unit test.
 */
import {
  extractAdditiveNumber,
  normalizeToken,
  ocrCanonical,
  similarity,
} from '@/shared/utils/text';
import { Ingredient } from './types';

export type MatchMethod = 'exact' | 'alias' | 'additive' | 'fuzzy' | 'none';

export interface TokenMatch {
  /** The phrase exactly as it appeared on the label. */
  raw: string;
  ingredient: Ingredient | null;
  /** 0..1 — how sure we are this is the right ingredient. */
  confidence: number;
  method: MatchMethod;
}

interface IndexEntry {
  ingredient: Ingredient;
  /** Whether this key came from the canonical name (vs. an alias). */
  primary: boolean;
}

export interface IngredientIndex {
  /** normalised name/alias -> entry */
  byName: Map<string, IndexEntry>;
  /** OCR-folded name/alias -> entry (lossy, lower priority) */
  byOcr: Map<string, IndexEntry>;
  /** additive number ("951", "150d") -> ingredient */
  byAdditive: Map<string, Ingredient>;
  /** flat list of [normalisedKey, entry] for fuzzy scanning */
  keys: Array<[string, IndexEntry]>;
}

/** Minimum similarity for a fuzzy (edit-distance) match to be trusted. */
const FUZZY_THRESHOLD = 0.84;
/** Below this length fuzzy matching is too noisy, so we skip it. */
const FUZZY_MIN_LENGTH = 4;

/** Pre-compute the lookup structures once per ingredient set. */
export function buildIngredientIndex(ingredients: Ingredient[]): IngredientIndex {
  const byName = new Map<string, IndexEntry>();
  const byOcr = new Map<string, IndexEntry>();
  const byAdditive = new Map<string, Ingredient>();

  const addName = (key: string, entry: IndexEntry) => {
    const norm = normalizeToken(key);
    if (norm && !byName.has(norm)) byName.set(norm, entry);
    const folded = ocrCanonical(norm);
    if (folded && !byOcr.has(folded)) byOcr.set(folded, entry);
  };

  for (const ingredient of ingredients) {
    addName(ingredient.name, { ingredient, primary: true });
    for (const alias of ingredient.aliases) {
      addName(alias, { ingredient, primary: false });
    }
    if (ingredient.eNumber) byAdditive.set(ingredient.eNumber.toLowerCase(), ingredient);
    if (ingredient.insNumber) byAdditive.set(ingredient.insNumber.toLowerCase(), ingredient);
  }

  return { byName, byOcr, byAdditive, keys: [...byName.entries()] };
}

/** Resolve a single raw phrase against the index. */
export function matchToken(raw: string, index: IngredientIndex): TokenMatch {
  const none = (): TokenMatch => ({ raw, ingredient: null, confidence: 0, method: 'none' });

  const trimmed = raw.trim();
  if (!trimmed) return none();

  // 1. Additive number — the strongest signal on an Indian label.
  const additive = extractAdditiveNumber(trimmed);
  if (additive) {
    const hit = index.byAdditive.get(additive);
    if (hit) return { raw, ingredient: hit, confidence: 0.99, method: 'additive' };
  }

  // 2. Exact normalised name or alias.
  const norm = normalizeToken(trimmed);
  if (norm) {
    const exact = index.byName.get(norm);
    if (exact) {
      return {
        raw,
        ingredient: exact.ingredient,
        confidence: exact.primary ? 1 : 0.95,
        method: exact.primary ? 'exact' : 'alias',
      };
    }

    // 3. OCR-folded exact match (handles "Aspartarne", "C0lour").
    const folded = ocrCanonical(norm);
    const ocrHit = index.byOcr.get(folded);
    if (ocrHit) {
      return { raw, ingredient: ocrHit.ingredient, confidence: 0.9, method: 'fuzzy' };
    }

    // 4. Fuzzy edit-distance against every known key. Skip very short tokens.
    if (norm.length >= FUZZY_MIN_LENGTH) {
      let best: { entry: IndexEntry; score: number } | null = null;
      for (const [key, entry] of index.keys) {
        if (Math.abs(key.length - norm.length) > 3) continue;
        const score = similarity(norm, key);
        if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) {
          best = { entry, score };
        }
      }
      if (best) {
        return {
          raw,
          ingredient: best.entry.ingredient,
          confidence: best.score,
          method: 'fuzzy',
        };
      }
    }
  }

  return none();
}

/** Resolve every phrase, de-duplicating repeated ingredient hits. */
export function matchTokens(rawTokens: string[], index: IngredientIndex): TokenMatch[] {
  const matches: TokenMatch[] = [];
  const seenIngredients = new Set<string>();

  for (const raw of rawTokens) {
    const match = matchToken(raw, index);
    if (match.ingredient) {
      if (seenIngredients.has(match.ingredient.id)) continue;
      seenIngredients.add(match.ingredient.id);
    }
    matches.push(match);
  }
  return matches;
}

/** Just the resolved, distinct ingredients (drops the misses). */
export function resolvedIngredients(matches: TokenMatch[]): Ingredient[] {
  return matches
    .filter((m): m is TokenMatch & { ingredient: Ingredient } => m.ingredient !== null)
    .map((m) => m.ingredient);
}
