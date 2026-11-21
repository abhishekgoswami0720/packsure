/**
 * India (FSSAI) permissibility, surfaced at the moment of decision.
 *
 * For an everyday shopper the most useful, actionable fact about an additive
 * isn't its chemistry — it's "is this even allowed in my food here, and are
 * there limits?". This derives that single signal per ingredient.
 *
 * Source of truth, in order:
 *   1. Curated dossier data for region IN (researched, with a note/condition).
 *   2. The curated India additive registry (bans, restrictions, limits) keyed
 *      by INS/E number — the high-signal exceptions.
 *   3. Otherwise: any additive identified by a valid INS / E number is permitted
 *      under FSSAI by definition — India's permitted-additive framework *is* the
 *      INS list (Food Safety & Standards Regulations, 2011). Flagged `inferred`.
 *   4. Plain foods (sugar, oils, no additive number) get no regulatory flag.
 *
 * Note on dosage: printed labels don't state additive quantities, so we can't
 * verify a product against numeric limits. What we *can* tell the user plainly
 * is the permissibility status and any usage condition — which is the decision
 * that actually matters at the shelf.
 */
import { Ingredient, RegulatoryStatus } from './types';
import { indiaRegOverride } from './india-registry';

export interface IndiaRegulation {
  status: RegulatoryStatus;
  note?: string;
  /** True when derived from the INS baseline rather than a researched/curated fact. */
  inferred: boolean;
}

export function indiaRegulationFor(ingredient: Ingredient): IndiaRegulation | null {
  const dossier = ingredient.regulations?.find((r) => r.region === 'IN');
  if (dossier) return { status: dossier.status, note: dossier.note, inferred: false };

  const override = indiaRegOverride(ingredient.insNumber, ingredient.eNumber);
  if (override) return { status: override.status, note: override.note, inferred: false };

  if (ingredient.insNumber || ingredient.eNumber) {
    return { status: 'permitted', inferred: true };
  }
  return null;
}

/** Statuses worth calling out at a glance (the rest — plain "permitted" — stay quiet). */
export function isIndiaWatchout(reg: IndiaRegulation | null): reg is IndiaRegulation {
  return (
    !!reg &&
    (reg.status === 'banned' ||
      reg.status === 'restricted' ||
      reg.status === 'permitted_with_limits')
  );
}

/** The strongest, scariest statuses — these drive the headline flag. */
export function isIndiaSevere(reg: IndiaRegulation | null): reg is IndiaRegulation {
  return !!reg && (reg.status === 'banned' || reg.status === 'restricted');
}

/** Compact India badge label, e.g. "Banned · India". */
export function indiaBadgeLabel(reg: IndiaRegulation): string {
  switch (reg.status) {
    case 'banned':
      return 'Banned · India';
    case 'restricted':
      return 'Restricted · India';
    case 'permitted_with_limits':
      return 'Usage limits · India';
    case 'permitted':
      return 'Permitted · India';
    default:
      return 'Not evaluated';
  }
}

/** Verdict tone used to colour the India badge. */
export function indiaBadgeTone(reg: IndiaRegulation): 'danger' | 'warning' | 'success' {
  if (reg.status === 'banned' || reg.status === 'restricted') return 'danger';
  if (reg.status === 'permitted_with_limits') return 'warning';
  return 'success';
}
