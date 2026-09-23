import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCadence, analyzeRecurringPayment, buildFindingContext } from './contextReview.js';
import { detectDuplicates, detectThresholdSplitting, detectShellCompany, detectWeekendApprovals } from './fraudDetection.js';
import { detectBenford, scoreBenfordFindings } from './benford.js';
import { calcVendorRisk } from './vendorRisk.js';
import { SAMPLE } from '../../../frontend/src/data/sampleData.js';

test('classifyCadence detects weekly, biweekly, monthly, quarterly, and rejects irregular intervals', () => {
  assert.equal(classifyCadence([7, 7]), 'weekly');
  assert.equal(classifyCadence([14, 14]), 'biweekly');
  assert.equal(classifyCadence([31, 29]), 'monthly');
  assert.equal(classifyCadence([91, 91]), 'quarterly');
  assert.equal(classifyCadence([2, 45, 3]), null);
  assert.equal(classifyCadence([]), null);
});

test('analyzeRecurringPayment: identical invoice refs -> Unexplained pattern, acknowledges reused reference numbers', () => {
  const group = [
    { id: 1, date: '2024-01-01', invoice: 'INV-100', vendor: 'V', amount: 500 },
    { id: 2, date: '2024-02-01', invoice: 'INV-100', vendor: 'V', amount: 500 },
  ];
  const result = analyzeRecurringPayment(group);
  assert.equal(result.classification, 'Unexplained pattern');
  assert.match(result.explanation, /reuse a single contract or reference number/);
  assert.equal(result.basis.invoiceReferences, 'identical');
  assert.equal(result.basis.transactionCount, 2);
});

test('analyzeRecurringPayment: different invoices, consistent monthly cadence, 3+ txns -> Potentially recurring/contractual', () => {
  const group = [
    { id: 1, date: '2024-01-01', invoice: 'INV-1', vendor: 'V', amount: 500 },
    { id: 2, date: '2024-02-01', invoice: 'INV-2', vendor: 'V', amount: 500 },
    { id: 3, date: '2024-03-01', invoice: 'INV-3', vendor: 'V', amount: 500 },
  ];
  const result = analyzeRecurringPayment(group);
  assert.equal(result.classification, 'Potentially recurring/contractual');
  assert.equal(result.basis.detectedCadence, 'monthly');
  assert.equal(result.basis.invoiceReferences, 'different');
  assert.deepEqual(result.basis.intervalsDays, [31, 29]);
});

test('analyzeRecurringPayment: different invoices but only 2 txns -> Requires supporting documentation', () => {
  const group = [
    { id: 1, date: '2024-01-01', invoice: 'INV-1', vendor: 'V', amount: 500 },
    { id: 2, date: '2024-02-01', invoice: 'INV-2', vendor: 'V', amount: 500 },
  ];
  const result = analyzeRecurringPayment(group);
  assert.equal(result.classification, 'Requires supporting documentation');
  assert.equal(result.basis.transactionCount, 2);
});

test('analyzeRecurringPayment: different invoices, irregular intervals -> Requires supporting documentation', () => {
  const group = [
    { id: 1, date: '2024-01-01', invoice: 'INV-1', vendor: 'V', amount: 500 },
    { id: 2, date: '2024-01-05', invoice: 'INV-2', vendor: 'V', amount: 500 },
    { id: 3, date: '2024-03-20', invoice: 'INV-3', vendor: 'V', amount: 500 },
  ];
  const result = analyzeRecurringPayment(group);
  assert.equal(result.classification, 'Requires supporting documentation');
  assert.equal(result.basis.detectedCadence, null);
});

test('buildFindingContext resolves duplicate txnIds via the Map and returns null for types without context in this version', () => {
  const txnById = new Map([
    [1, { id: 1, date: '2024-01-01', invoice: 'INV-1', vendor: 'V', amount: 500 }],
    [2, { id: 2, date: '2024-02-01', invoice: 'INV-2', vendor: 'V', amount: 500 }],
  ]);
  const dup = buildFindingContext({ type: 'duplicate', txnIds: [1, 2] }, txnById);
  assert.equal(dup.label, 'Context Check');
  assert.equal(dup.classification, 'Requires supporting documentation');

  assert.equal(buildFindingContext({ type: 'splitting', txnIds: [1, 2] }, txnById), null);
  assert.equal(buildFindingContext({ type: 'benford', txnIds: [1, 2] }, txnById), null);
});

test('buildFindingContext returns static context for shell and timing findings', () => {
  const txnById = new Map();
  const shell = buildFindingContext({ type: 'shell', txnIds: [] }, txnById);
  assert.equal(shell.label, 'Context Check');
  assert.ok(shell.whatToVerify.length > 0);

  const timing = buildFindingContext({ type: 'timing', txnIds: [] }, txnById);
  assert.ok(timing.whatToVerify.length > 0);
});

test('attaching context to the 64-row baseline findings leaves every other field byte-identical', () => {
  const dup = detectDuplicates(SAMPLE);
  const split = detectThresholdSplitting(SAMPLE);
  const shell = detectShellCompany(SAMPLE);
  const benfordResults = detectBenford(SAMPLE);
  const benfordFindings = scoreBenfordFindings(benfordResults);
  const timing = detectWeekendApprovals(SAMPLE);
  const findings = [...dup, ...split, ...shell, ...benfordFindings, ...timing];

  // Snapshot before any context is attached — the exact established
  // baseline (11 findings, byte-identical fields).
  const before = JSON.stringify(findings);

  const txnById = new Map(SAMPLE.map((t) => [t.id, t]));
  findings.forEach((f) => {
    const context = buildFindingContext(f, txnById);
    if (context) f.context = context;
  });

  const afterStripped = JSON.stringify(findings.map(({ context, ...rest }) => rest));
  assert.equal(afterStripped, before, 'every non-context field must remain byte-identical');

  // Context was actually attached where expected (duplicate + shell +
  // timing types only — splitting/benford untouched in this version).
  const withContext = findings.filter((f) => f.context);
  const withoutContext = findings.filter((f) => !f.context);
  assert.ok(withContext.every((f) => ['duplicate', 'shell', 'timing'].includes(f.type)));
  assert.ok(withoutContext.every((f) => ['splitting', 'benford'].includes(f.type)));

  // Existing severities/order/vendorRisk are unaffected by attaching context.
  const vendorRisk = calcVendorRisk(SAMPLE, findings);
  const topScore = Math.max(...Object.values(vendorRisk).map((v) => v.score));
  assert.equal(topScore, 75);
});
