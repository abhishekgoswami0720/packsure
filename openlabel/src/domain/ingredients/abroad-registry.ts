/**
 * How other countries regulate an additive — the "banned in the USA / EU" signal.
 *
 * For an Indian shopper this is more concrete than an abstract score: an additive
 * permitted here may be banned or restricted elsewhere. This table records that
 * per country, verified against regulator sources (FDA, EUR-Lex, EFSA, UK FSA,
 * Health Canada, FSANZ).
 *
 * Keyed by INS/E number. Only notable statuses are recorded (banned, restricted,
 * or an EU "warning label" requirement) — plain "permitted" is omitted. Consumer
 * guidance, shown with the app's standing not-medical-advice disclaimer.
 */
import { Ingredient } from './types';

export type AbroadRegion = 'US' | 'EU' | 'UK' | 'CA' | 'AU';
export type AbroadStatus = 'banned' | 'restricted' | 'warning_label';

export interface AbroadReg {
  status: AbroadStatus;
  /** Short qualifier, e.g. a year or condition. */
  note?: string;
}

/** Short country label used in the flag, e.g. "Banned in the USA". */
export const ABROAD_REGION_LABEL: Record<AbroadRegion, string> = {
  US: 'the USA',
  EU: 'the EU',
  UK: 'the UK',
  CA: 'Canada',
  AU: 'Australia',
};

type RegMap = Partial<Record<AbroadRegion, AbroadReg>>;

export const ABROAD_ADDITIVE_REGS: Record<string, RegMap> = {
  // Potassium bromate — banned across the EU/UK/Canada/Australia; still legal in the US.
  '924': { EU: { status: 'banned', note: '1990' }, UK: { status: 'banned' }, CA: { status: 'banned' }, AU: { status: 'banned' } },
  // BVO — FDA revoked authorisation in 2024; long banned in the EU/UK/Australia.
  '443': { US: { status: 'banned', note: '2024' }, EU: { status: 'banned' }, UK: { status: 'banned' }, AU: { status: 'banned' } },
  // Erythrosine / Red 3 — FDA banned for food in 2025; EU allows only in cherries.
  '127': { US: { status: 'banned', note: '2025' }, EU: { status: 'restricted', note: 'cherries only' } },
  // Titanium dioxide — banned as a food additive in the EU since 2022.
  '171': { EU: { status: 'banned', note: '2022' } },
  // Azodicarbonamide — not authorised in the EU or Australia.
  '927a': { EU: { status: 'banned' }, AU: { status: 'banned' } },
  // Potassium iodate — not permitted as a flour treatment in the EU/Canada/Australia.
  '917': { EU: { status: 'banned' }, CA: { status: 'banned' }, AU: { status: 'banned' } },
  // Cyclamate — banned in the US since 1970.
  '952': { US: { status: 'banned', note: '1970' } },
  // Southampton dyes — EU/UK warning label "may affect children's attention".
  '102': { EU: { status: 'warning_label' }, UK: { status: 'warning_label' } },
  '110': { EU: { status: 'warning_label' }, UK: { status: 'warning_label' } },
  '129': { EU: { status: 'warning_label' }, UK: { status: 'warning_label' } },
  // These three also aren't FDA-approved for food in the US.
  '104': { EU: { status: 'warning_label' }, UK: { status: 'warning_label' }, US: { status: 'banned', note: 'not FDA-approved' } },
  '122': { EU: { status: 'warning_label' }, UK: { status: 'warning_label' }, US: { status: 'banned', note: 'not FDA-approved' } },
  '124': { EU: { status: 'warning_label' }, UK: { status: 'warning_label' }, US: { status: 'banned', note: 'not FDA-approved' } },
};

function regsFor(ingredient: Ingredient): RegMap | undefined {
  return (
    (ingredient.insNumber ? ABROAD_ADDITIVE_REGS[ingredient.insNumber] : undefined) ??
    (ingredient.eNumber ? ABROAD_ADDITIVE_REGS[ingredient.eNumber] : undefined)
  );
}

/** Regions where this additive is outright banned. */
export function abroadBanRegions(ingredient: Ingredient): AbroadRegion[] {
  const map = regsFor(ingredient);
  if (!map) return [];
  return (Object.keys(map) as AbroadRegion[]).filter((r) => map[r]?.status === 'banned');
}

/** Join region labels naturally: ["the EU","the UK","Canada"] -> "the EU, the UK & Canada". */
function joinRegions(regions: AbroadRegion[]): string {
  const names = regions.map((r) => ABROAD_REGION_LABEL[r]);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** Punchy flag for a banned-abroad additive, e.g. "Banned in the EU & USA". Null if none. */
export function abroadBanSummary(ingredient: Ingredient): string | null {
  const regions = abroadBanRegions(ingredient);
  if (!regions.length) return null;
  return `Banned in ${joinRegions(regions)}`;
}
