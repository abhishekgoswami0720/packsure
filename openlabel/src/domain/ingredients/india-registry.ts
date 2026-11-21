/**
 * Curated India (FSSAI) regulatory overrides, keyed by INS / E number.
 *
 * Baseline rule (applied in india.ts when an additive isn't listed here): any
 * INS-numbered additive is permitted under FSSAI by definition — the INS list is
 * India's permitted-additive framework (Food Safety & Standards (Food Products
 * Standards and Food Additives) Regulations, 2011).
 *
 * This table records the EXCEPTIONS and the high-signal cases — what's banned,
 * restricted, or allowed only with limits — because those are the facts a
 * shopper actually needs. Each entry reflects well-established FSSAI rules; the
 * note is the plain-language condition shown in the UI.
 *
 * This is consumer guidance, not a compliance reference. Surfaced alongside the
 * app's standing "general information, not medical/dietary advice" disclaimer.
 */
import { RegulatoryStatus } from './types';

export interface IndiaReg {
  status: RegulatoryStatus;
  note: string;
}

export const INDIA_ADDITIVE_REGS: Record<string, IndiaReg> = {
  // ── Banned / non-permitted in India ──────────────────────────────────────
  '924': { status: 'banned', note: 'Banned in India since 2016' },
  '927a': { status: 'banned', note: 'Not permitted in any food in India' },
  '952': { status: 'banned', note: 'Cyclamate — dropped from permitted list (2016)' },
  '123': { status: 'banned', note: 'Amaranth — banned in India' },
  '443': { status: 'banned', note: 'BVO — not permitted in India' },
  // Coal-tar colours outside India's permitted list of eight.
  '104': { status: 'banned', note: 'Not a permitted colour in India' },
  '129': { status: 'banned', note: 'Allura Red — not a permitted colour in India' },
  '151': { status: 'banned', note: 'Not a permitted colour in India' },

  // ── Restricted — narrow use only ─────────────────────────────────────────
  '142': { status: 'restricted', note: 'Not in India’s permitted colour list' },
  '155': { status: 'restricted', note: 'Not in India’s permitted colour list' },
  '235': { status: 'restricted', note: 'Surface of cheese/sausage only' },
  '249': { status: 'restricted', note: 'Cured/processed meats only, low limits' },
  '250': { status: 'restricted', note: 'Cured/processed meats only, low limits' },
  '251': { status: 'restricted', note: 'Cured meats & some cheese only' },
  '252': { status: 'restricted', note: 'Cured meats & some cheese only' },

  // ── Permitted synthetic colours — the only eight India allows, with limits ─
  '102': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '110': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '122': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '124': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '127': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '132': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '133': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '143': { status: 'permitted_with_limits', note: 'Permitted colour — specified foods & limits' },
  '160b': { status: 'permitted_with_limits', note: 'Natural colour — limits in specified foods' },

  // ── Sweeteners — permitted with limits (specified foods / max levels) ─────
  '950': { status: 'permitted_with_limits', note: 'Permitted sweetener — max limits' },
  '951': { status: 'permitted_with_limits', note: 'Limits; phenylketonuric warning required' },
  '954': { status: 'permitted_with_limits', note: 'Permitted sweetener — max limits' },
  '955': { status: 'permitted_with_limits', note: 'Permitted sweetener — max limits' },
  '960': { status: 'permitted_with_limits', note: 'Specified foods only; not in chocolate' },
  '961': { status: 'permitted_with_limits', note: 'Permitted — tight limits' },

  // ── Preservatives — permitted with limits ────────────────────────────────
  '200': { status: 'permitted_with_limits', note: 'Permitted preservative — max limits' },
  '202': { status: 'permitted_with_limits', note: 'Permitted preservative — max limits' },
  '203': { status: 'permitted_with_limits', note: 'Permitted preservative — max limits' },
  '210': { status: 'permitted_with_limits', note: 'Permitted preservative — max limits' },
  '211': { status: 'permitted_with_limits', note: 'Permitted preservative — max limits' },
  '212': { status: 'permitted_with_limits', note: 'Permitted preservative — max limits' },
  '220': { status: 'permitted_with_limits', note: 'Sulphite — declared above 10 ppm' },
  '223': { status: 'permitted_with_limits', note: 'Sulphite — declared above 10 ppm' },
  '224': { status: 'permitted_with_limits', note: 'Sulphite — declared above 10 ppm' },

  // ── Antioxidants — permitted with limits ─────────────────────────────────
  '319': { status: 'permitted_with_limits', note: 'TBHQ — limits in fats/oils' },
  '320': { status: 'permitted_with_limits', note: 'BHA — limits in fats/oils' },
  '321': { status: 'permitted_with_limits', note: 'BHT — limits in fats/oils' },

  // ── Flavour enhancers — permitted, with declaration ──────────────────────
  '621': { status: 'permitted_with_limits', note: 'MSG — declared; not for infant food' },
  '627': { status: 'permitted_with_limits', note: 'Flavour enhancer — not for infant food' },
  '631': { status: 'permitted_with_limits', note: 'Flavour enhancer — not for infant food' },
  '635': { status: 'permitted_with_limits', note: 'Flavour enhancer — not for infant food' },

  // ── Thickeners & phosphates — permitted with limits ──────────────────────
  '407': { status: 'permitted_with_limits', note: 'Limits; restricted in infant formula' },
  '339': { status: 'permitted_with_limits', note: 'Phosphate — max levels in specified foods' },
  '340': { status: 'permitted_with_limits', note: 'Phosphate — max levels in specified foods' },
  '341': { status: 'permitted_with_limits', note: 'Phosphate — max levels in specified foods' },
  '450': { status: 'permitted_with_limits', note: 'Phosphate — max levels in specified foods' },
  '451': { status: 'permitted_with_limits', note: 'Phosphate — max levels in specified foods' },
  '452': { status: 'permitted_with_limits', note: 'Phosphate — max levels in specified foods' },

  // ── Permitted (no general numeric cap) — notable cases worth confirming ───
  '917': { status: 'permitted_with_limits', note: 'Bread only ~50 ppm; under review' },
  '171': { status: 'permitted', note: 'Permitted in India (banned in the EU)' },
};

/** Look up India's stance for an INS/E number, if we have a curated entry. */
export function indiaRegOverride(
  insNumber?: string,
  eNumber?: string,
): IndiaReg | undefined {
  return (
    (insNumber ? INDIA_ADDITIVE_REGS[insNumber] : undefined) ??
    (eNumber ? INDIA_ADDITIVE_REGS[eNumber] : undefined)
  );
}
