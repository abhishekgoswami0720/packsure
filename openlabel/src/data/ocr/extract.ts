/**
 * Isolate the ingredients list from a full-label OCR dump.
 *
 * On-device OCR returns *everything* it sees on the pack — brand name, taglines,
 * the nutrition table, storage notes, MRP, FSSAI licence, customer-care lines.
 * Feeding all of that into the matching engine produces a wall of unresolved
 * noise. Real labels almost always print the list under an "INGREDIENTS" header
 * and end it before a clearly different section (nutrition, allergens, storage,
 * manufacturer). We grab the text between those two landmarks.
 *
 * This is best-effort and conservative: if we can't find a header, we return the
 * text unchanged so the user can still review and edit it in the sheet.
 */

import type { TextRecognitionResult } from './textRecognition';

/** A recognised line reduced to its text and its box on the pack. */
interface Line {
  text: string;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/** The header that introduces the list. Tolerates OCR spacing and a trailing colon/dash. */
const HEADER =
  /ingredient(?:s|\(s\))?(?:\s*list)?(?:\s*\(in descending order(?:\s*by weight)?\))?\s*[:\-–—.]?\s*/i;

/** A line whose *start* is the ingredients header — a reliable header-line test. */
const HEADER_LINE = /^\W*ingredient(?:s|\(s\))?\b/i;

/**
 * Sections that reliably come *after* the ingredient list. The first one we hit
 * marks the end of the list. (We deliberately don't cut on "contains" — it's
 * commonly part of the list itself, e.g. "contains permitted colours".)
 */
// Section headers that reliably follow the ingredient list. We deliberately do
// NOT terminate on bare nutrient words ("protein", "fat", "energy") — those
// legitimately appear inside ingredients (soy protein, milk fat).
const TERMINATOR =
  /\b(nutrition(?:al)?\s*(?:information|facts|value)?|per\s*100\s*g|per\s*serv|allergen|allergy advice|best before|use by|store in|storage|keep refrigerated|manufactured\s*(?:by|&|and)|mfd\b|mfg\b|marketed by|packed by|imported by|net\s*(?:weight|wt|qty|quantity|content)|mrp\b|m\.r\.p|fssai|lic(?:ence|ense)?\s*no|customer care|consumer care|directions|how to (?:use|prepare)|serving size|shelf life|batch\s*(?:no|code)|date of|for queries)\b/i;

/**
 * A nutrition-table row: a nutrient label immediately followed by a number.
 * The number is what separates it from the ingredient "Sugar," or "Milk Fat" —
 * a bare nutrient word is fine, but "Sugars 45 g" is the table starting.
 */
const NUTRITION_LINE =
  /\b(energy|proteins?|carbohydrates?|total\s*fat|saturated\s*fat|trans\s*fat|sugars?|sodium|dietary\s*fib(?:re|er)|cholesterol|calories)\b[^a-z\n]{0,8}\d/i;

/** Packaging boilerplate / stray values that are never part of the list. */
const NOISE_LINE =
  /\b(mrp|m\.r\.p|fssai|lic(?:ence|ense)?\s*no|net\s*(?:wt|weight|qty|quantity)|batch|mfd|mfg|\bexp\b|best before|use by|manufactured|marketed|packed|imported|customer care|consumer care|toll\s*free|\bltd\b|\bpvt\b)\b|www\.|https?:|©|^[\s\d.,:/-]+$|^\s*\d+(?:\.\d+)?\s*(?:g|mg|kg|kcal|kj|ml|%)\s*$/i;

export interface IngredientRead {
  /** The isolated ingredient text (or the whole dump when nothing could be isolated). */
  text: string;
  /**
   * True when we located a real "INGREDIENTS" section and it reads like a list.
   * The scanner uses this to skip the review editor and go straight to results —
   * a low-confidence read still opens the editor so a bad scan is never analysed
   * blind.
   */
  confident: boolean;
}

/**
 * Pull the ingredients portion out of a raw OCR string and judge how sure we are.
 *
 * Confident means: an "ingredients" header was found, the slice up to the next
 * section (nutrition/storage/MRP…) is non-trivial, and it looks like an actual
 * list (has separators or real length). Anything else hands back the best text
 * we have with `confident: false` so the caller falls back to manual review.
 */
export function readIngredients(raw: string): IngredientRead {
  if (!raw) return { text: '', confident: false };
  const text = raw.replace(/\r/g, '\n');

  const header = HEADER.exec(text);
  // No "ingredients" landmark — hand back the whole dump for the user to review.
  if (!header) return { text: collapse(raw), confident: false };

  let section = text.slice(header.index + header[0].length);

  const end = TERMINATOR.exec(section);
  if (end && end.index > 0) {
    section = section.slice(0, end.index);
  }

  const cleaned = collapse(section);
  // A stray header with no list under it — fall back to the full text to edit.
  if (cleaned.length < 3) return { text: collapse(raw), confident: false };

  // We isolated a real section; trust it when it reads like a list.
  const confident = /[,;]/.test(cleaned) || cleaned.length >= 12;
  return { text: cleaned, confident };
}

/**
 * Isolate the ingredient list from the OCR *layout*, not just the flat text.
 *
 * ML Kit gives every line a box on the pack. We find the "INGREDIENTS" line and
 * follow only the lines that flow from it — same column, top-to-bottom — stopping
 * at the nutrition table or a new section. That spatial walk is what keeps the
 * read on the list instead of sweeping in text from around it. Falls back to the
 * flat-text path when there's no usable geometry or header.
 */
export function readIngredientsFromBlocks(result: TextRecognitionResult): IngredientRead {
  const lines: Line[] = [];
  for (const block of result.blocks ?? []) {
    for (const ln of block.lines ?? []) {
      const f = ln.frame;
      const text = ln.text?.trim();
      if (!f || !text) continue;
      lines.push({
        text,
        top: f.top,
        left: f.left,
        right: f.left + f.width,
        bottom: f.top + f.height,
      });
    }
  }
  if (lines.length === 0) return readIngredients(result.text ?? '');

  const headerLine = lines.find((l) => HEADER_LINE.test(l.text));
  if (!headerLine) return readIngredients(result.text ?? '');

  const pageWidth = Math.max(...lines.map((l) => l.right)) || 1;
  const lineH = Math.max(8, headerLine.bottom - headerLine.top);
  const headerMid = (headerLine.top + headerLine.bottom) / 2;

  const kept: string[] = [];
  const inline = afterHeader(headerLine.text);
  if (inline) kept.push(inline);

  // Lines sitting below the header, walked in reading order.
  const below = lines
    .filter((l) => l !== headerLine && (l.top + l.bottom) / 2 > headerMid)
    .sort((a, b) => a.top - b.top || a.left - b.left);

  let colLeft = headerLine.left;
  let prevBottom = headerLine.bottom;
  for (const l of below) {
    if (TERMINATOR.test(l.text) || NUTRITION_LINE.test(l.text)) break; // section boundary
    if (l.top - prevBottom > lineH * 2.4) break; // large vertical gap = new section
    if (l.left > colLeft + pageWidth * 0.45) continue; // a different column (e.g. nutrition)
    if (NOISE_LINE.test(l.text)) continue; // boilerplate line — skip, keep scanning
    kept.push(l.text);
    colLeft = Math.min(colLeft, l.left);
    prevBottom = l.bottom;
  }

  // Space-join: the printed commas delimit items; line breaks are just wrapping.
  const cleaned = collapse(kept.join(' '));
  if (cleaned.length < 3) return readIngredients(result.text ?? '');

  const confident = /[,;]/.test(cleaned) || cleaned.length >= 12;
  return { text: cleaned, confident };
}

/** The ingredient text after the header word on the header's own line. */
function afterHeader(line: string): string {
  const m = HEADER.exec(line);
  return m ? line.slice(m.index + m[0].length).trim() : '';
}

/** Flatten line breaks into comma separators and squeeze whitespace. */
function collapse(s: string): string {
  return s
    .replace(/\r/g, '\n')
    .replace(/\n+/g, ', ')
    .replace(/\s*,\s*(?:,\s*)+/g, ', ') // collapse runs of commas
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:.\-–—]+/, '')
    .replace(/[\s,;:]+$/, '')
    .trim();
}
