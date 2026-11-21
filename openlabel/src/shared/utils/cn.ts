export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[];

/**
 * Minimal class-name combiner (clsx-style) tuned for NativeWind.
 * Flattens arrays and drops falsy values so conditional classes read cleanly.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) out.push(nested);
    } else {
      out.push(String(input));
    }
  }
  return out.join(' ');
}
