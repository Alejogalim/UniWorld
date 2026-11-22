const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthNumber(name: string): number | null {
  return MONTHS[name.toLowerCase()] ?? null;
}

/**
 * First unambiguous calendar date in a deadline text, as YYYY-MM-DD, or null.
 * Accepts ISO, "15 January 2027", "January 15, 2027", and "15/01/2027" or "01/15/2027"
 * only when one of the two numbers is above 12 (so the order is certain).
 */
export function parseDeadline(text: string | null): string | null {
  if (!text) return null;
  const candidates: { index: number; date: string }[] = [];
  const add = (index: number, date: string | null) => {
    if (date) candidates.push({ index, date });
  };

  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    add(m.index, iso(Number(m[1]), Number(m[2]), Number(m[3])));
  }
  for (const m of text.matchAll(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g)) {
    const month = monthNumber(m[2]);
    if (month) add(m.index, iso(Number(m[3]), month, Number(m[1])));
  }
  for (const m of text.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g)) {
    const month = monthNumber(m[1]);
    if (month) add(m.index, iso(Number(m[3]), month, Number(m[2])));
  }
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = Number(m[3]);
    if (a > 12 && b <= 12) add(m.index, iso(year, b, a)); // DD/MM/YYYY
    else if (b > 12 && a <= 12) add(m.index, iso(year, a, b)); // MM/DD/YYYY
  }

  if (candidates.length === 0) return null;
  candidates.sort((x, y) => x.index - y.index);
  return candidates[0].date;
}

/** A deadline is urgent when it is still ahead and within 30 days. */
export function isUrgent(days: number): boolean {
  return days >= 0 && days < 30;
}

/** Format an ISO date (YYYY-MM-DD) in the UI language, e.g. "Nov 22, 2026". */
export function formatDeadline(isoDate: string, uiLang: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat(uiLang, { dateStyle: 'medium' }).format(date);
}

/** Whole days from `today` to the ISO date (negative when past). Both are local calendar dates. */
export function daysUntil(isoDate: string, today: Date | string = new Date()): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  let t: number;
  if (typeof today === 'string') {
    const [ty, tm, td] = today.split('-').map(Number);
    t = Date.UTC(ty, tm - 1, td);
  } else {
    t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  }
  return Math.round((target - t) / 86_400_000);
}
