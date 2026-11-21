/**
 * Compact, collision-resistant id generator for scan records.
 * Combines a time component with randomness — good enough for local rows.
 */
export function createId(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  const id = `${time}${rand}`;
  return prefix ? `${prefix}_${id}` : id;
}
