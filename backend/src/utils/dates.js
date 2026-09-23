// Shared transaction-date parser. Supports ISO (YYYY-MM-DD), DD/MM/YYYY,
// and MM/DD/YYYY, each with an optional HH:mm time. Never throws — returns
// null for anything unparseable or structurally impossible (e.g. 31/02),
// so callers can treat "unknown date" the same way they already treat it.
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;
const SLASH_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/;

export function parseTransactionDate(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const s = raw.trim();

  const iso = ISO_RE.exec(s);
  if (iso) {
    const [, y, mo, d, h = '12', mi = '00'] = iso;
    return toDateOrNull(+y, +mo - 1, +d, +h, +mi);
  }

  const slash = SLASH_RE.exec(s);
  if (slash) {
    const [, p1, p2, y, h = '12', mi = '00'] = slash;
    const a = +p1;
    const b = +p2;
    let day, month;
    if (a > 12 && b <= 12) {
      day = a;
      month = b; // unambiguous DD/MM
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b; // unambiguous MM/DD
    } else if (a <= 12 && b <= 12) {
      // Ambiguous — both parts could be a valid month. Default to
      // DD/MM/YYYY (international convention, matches the dataset that
      // surfaced this gap), applied consistently rather than guessed
      // per row.
      day = a;
      month = b;
    } else {
      return null; // neither part is a valid month
    }
    return toDateOrNull(+y, month - 1, day, +h, +mi);
  }

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// Constructs a Date from explicit components and rejects any result where
// JS's rollover behavior silently changed what was asked for (e.g.
// new Date(2024, 1, 31) silently becomes March 2 instead of failing).
function toDateOrNull(y, monthIndex, d, h, mi) {
  const date = new Date(y, monthIndex, d, h, mi);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== d ||
    date.getHours() !== h ||
    date.getMinutes() !== mi
  ) {
    return null;
  }
  return date;
}

export function toISODateString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
