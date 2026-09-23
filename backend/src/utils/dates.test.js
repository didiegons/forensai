import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTransactionDate, toISODateString } from './dates.js';

test('ISO date without time defaults to noon (matches pre-existing weekend-check behavior)', () => {
  const d = parseTransactionDate('2024-01-08');
  assert.equal(d.getFullYear(), 2024);
  assert.equal(d.getMonth(), 0);
  assert.equal(d.getDate(), 8);
  assert.equal(d.getHours(), 12);
  assert.equal(d.getMinutes(), 0);
});

test('ISO date with time is preserved', () => {
  const d = parseTransactionDate('2024-01-08T09:15');
  assert.equal(d.getHours(), 9);
  assert.equal(d.getMinutes(), 15);
});

test('unambiguous DD/MM/YYYY (day part > 12)', () => {
  const d = parseTransactionDate('25/04/2024 00:00');
  assert.equal(d.getFullYear(), 2024);
  assert.equal(d.getMonth(), 3); // April, 0-indexed
  assert.equal(d.getDate(), 25);
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
});

test('unambiguous MM/DD/YYYY (second part > 12)', () => {
  const d = parseTransactionDate('06/25/2024');
  assert.equal(d.getMonth(), 5); // June
  assert.equal(d.getDate(), 25);
});

test('ambiguous slash date defaults to DD/MM/YYYY, with time', () => {
  const d = parseTransactionDate('06/01/2024 14:30');
  assert.equal(d.getFullYear(), 2024);
  assert.equal(d.getMonth(), 0); // January (day=6, month=1 under DD/MM default)
  assert.equal(d.getDate(), 6);
  assert.equal(d.getHours(), 14);
  assert.equal(d.getMinutes(), 30);
});

test('ambiguous slash date policy example from the diagnosis (05/06/2024 -> 5 June)', () => {
  const d = parseTransactionDate('05/06/2024');
  assert.equal(d.getMonth(), 5); // June
  assert.equal(d.getDate(), 5);
});

test('impossible date (31 February) is rejected, not silently rolled forward', () => {
  assert.equal(parseTransactionDate('31/02/2024'), null);
  assert.equal(parseTransactionDate('2024-02-31'), null);
});

test('neither slash component is a valid month -> null', () => {
  assert.equal(parseTransactionDate('13/13/2024'), null);
});

test('empty, non-string, and garbage input -> null', () => {
  assert.equal(parseTransactionDate(''), null);
  assert.equal(parseTransactionDate(undefined), null);
  assert.equal(parseTransactionDate('not a date'), null);
});

test('toISODateString round-trips a parsed date for Set lookups', () => {
  const d = parseTransactionDate('01/01/2024');
  assert.equal(toISODateString(d), '2024-01-01');
});

test('toISODateString returns null for non-dates', () => {
  assert.equal(toISODateString(null), null);
  assert.equal(toISODateString(new Date('invalid')), null);
});
