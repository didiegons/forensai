import { parseTransactionDate } from './dates.js';

export const HOLIDAYS_2024 = new Set([
  '2024-01-01', '2024-01-15', '2024-02-19', '2024-05-27', '2024-06-19',
  '2024-07-04', '2024-09-02', '2024-10-14', '2024-11-11', '2024-11-28', '2024-12-25',
]);

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] || []).push(item);
    return acc;
  }, {});
}

export function fmt(n) {
  return typeof n === 'number'
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : n;
}

export function daysBetween(a, b) {
  const dateA = parseTransactionDate(a);
  const dateB = parseTransactionDate(b);
  if (!dateA || !dateB) return NaN;
  return Math.round(Math.abs(dateB - dateA) / (1000 * 60 * 60 * 24));
}
