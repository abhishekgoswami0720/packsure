/** Human-friendly relative time, e.g. "Just now", "12m ago", "3d ago". */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

/** Day header used to group history, e.g. "Today", "Yesterday", "18 Jun". */
export function dayLabel(timestamp: number, now: number = Date.now()): string {
  const start = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((start(now) - start(timestamp)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: start(now) - start(timestamp) > 365 * 86_400_000 ? 'numeric' : undefined,
  });
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `${count} ${singular}`;
  return `${count} ${plural ?? `${singular}s`}`;
}

/** Divide by 10 and drop a trailing ".0" (e.g. 82 -> "8.2", 90 -> "9", -40 -> "-4"). */
function tenths(value: number): string {
  const v = value / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** The headline score presented out of 10, e.g. 82 -> "8.2". Internally 0–100. */
export function formatScore(score: number): string {
  return tenths(Math.max(0, Math.min(100, score)));
}

/** A score deduction shown out of 10, e.g. -8 -> "-0.8". */
export function formatPoints(points: number): string {
  return tenths(points);
}
