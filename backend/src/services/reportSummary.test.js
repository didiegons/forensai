import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReportSummary,
  formatSummaryForPrompt,
  pickRepresentativeExamples,
  MAX_EXAMPLES_PER_TYPE,
  MAX_EXAMPLE_CHARS,
  MAX_TOP_VENDORS,
  MAX_SUMMARY_CHARS,
} from './reportSummary.js';

function makeFinding(overrides = {}) {
  return {
    type: 'duplicate',
    severity: 'high',
    title: 'Duplicate invoice — Vendor',
    sub: '$500.00 submitted 2x',
    txnIds: [1, 2],
    evidence: [],
    detail: 'Two invoices share the same vendor and amount.',
    next: 'Verify.',
    ...overrides,
  };
}

const STATS = {
  totalTransactions: 64,
  totalValue: 291652.84,
  uniqueVendors: 11,
  periodStart: '2024-01-01',
  periodEnd: '2024-07-31',
};

test('1. normal small input is summarized correctly', () => {
  const findings = [
    makeFinding({ type: 'duplicate', severity: 'high', title: 'Dup A' }),
    makeFinding({ type: 'duplicate', severity: 'high', title: 'Dup B' }),
    makeFinding({ type: 'shell', severity: 'high', title: 'Shell A' }),
    makeFinding({ type: 'timing', severity: 'med', title: 'Timing A' }),
  ];
  const summary = buildReportSummary({ stats: STATS, findings });

  assert.equal(summary.overview.totalFindings, 4);
  assert.equal(summary.overview.highSeverityCount, 3);
  assert.equal(summary.overview.medSeverityCount, 1);
  assert.equal(summary.overview.totalTransactions, 64);

  const dup = summary.byType.find((t) => t.type === 'duplicate');
  assert.equal(dup.count, 2);
  assert.equal(dup.severity, 'high');
  assert.equal(dup.examples.length, 2);
  assert.equal(dup.additionalCount, 0);

  const timing = summary.byType.find((t) => t.type === 'timing');
  assert.equal(timing.severity, 'med');
});

test('2. representative examples are selected across the finding population, not just the first N', () => {
  const findings = Array.from({ length: 20 }, (_, i) =>
    makeFinding({ type: 'duplicate', title: `Dup #${i}`, detail: `Detail #${i}` })
  );
  const picked = pickRepresentativeExamples(findings, 5);

  assert.equal(picked.length, 5);
  // First and last of the population must be represented.
  assert.equal(picked[0].title, 'Dup #0');
  assert.equal(picked[picked.length - 1].title, 'Dup #19');
  // Spread across the population, not clustered at the start.
  const indices = picked.map((f) => Number(f.title.replace('Dup #', '')));
  assert.ok(indices[1] > 3, `expected spread, got indices ${indices}`);
  assert.ok(indices[2] > 8, `expected spread, got indices ${indices}`);
  assert.ok(new Set(indices).size === 5, 'no duplicate picks');
});

test('2b. small type (<=5 findings) includes every finding as an example', () => {
  const findings = Array.from({ length: 3 }, (_, i) => makeFinding({ type: 'shell', title: `Shell #${i}` }));
  const summary = buildReportSummary({ stats: STATS, findings });
  const shell = summary.byType.find((t) => t.type === 'shell');
  assert.equal(shell.examples.length, 3);
  assert.equal(shell.additionalCount, 0);
});

test('3. 10,000+ findings across realistic type counts still produce a bounded summary', () => {
  const types = ['duplicate', 'splitting', 'shell', 'benford', 'timing'];
  const findings = Array.from({ length: 12000 }, (_, i) =>
    makeFinding({ type: types[i % types.length], title: `Finding #${i}`, detail: `Detail #${i}`.repeat(1) })
  );

  const summary = buildReportSummary({ stats: STATS, findings });
  assert.equal(summary.overview.totalFindings, 12000);
  assert.equal(summary.byType.length, types.length);
  summary.byType.forEach((t) => {
    assert.ok(t.examples.length <= MAX_EXAMPLES_PER_TYPE);
    assert.equal(t.count + 0, t.additionalCount + t.examples.length);
  });

  const { findingsSection } = formatSummaryForPrompt(summary);
  // Bounded by type count (5 types), not by 12,000 findings.
  assert.ok(findingsSection.length < 5000, `expected a small bounded section, got ${findingsSection.length} chars`);
});

test('3b. a pathologically large number of distinct types still hits the hard defensive ceiling', () => {
  const findings = Array.from({ length: 2000 }, (_, i) =>
    makeFinding({ type: `synthetic-type-${i % 200}`, title: `Finding #${i}`, detail: `Detail #${i}` })
  );
  const summary = buildReportSummary({ stats: STATS, findings });
  assert.equal(summary.byType.length, 200);

  const { findingsSection } = formatSummaryForPrompt(summary);
  // Ceiling + a small fixed-size truncation note appended after it.
  assert.ok(
    findingsSection.length <= MAX_SUMMARY_CHARS + 100,
    `expected the hard ceiling to engage, got ${findingsSection.length} chars`
  );
  assert.ok(findingsSection.includes('truncated for brevity'));
});

test('one unusually long finding does not make the prompt unbounded', () => {
  const findings = [makeFinding({ type: 'shell', detail: 'X'.repeat(50000) })];
  const summary = buildReportSummary({ stats: STATS, findings });
  const shell = summary.byType.find((t) => t.type === 'shell');
  assert.ok(shell.examples[0].length <= MAX_EXAMPLE_CHARS);
});

test('4. missing vendorRisk remains valid — topVendors is empty, no throw', () => {
  const findings = [makeFinding()];
  const summary = buildReportSummary({ stats: STATS, findings });
  assert.deepEqual(summary.topVendors, []);

  const { vendorSection } = formatSummaryForPrompt(summary);
  assert.equal(vendorSection, '');
});

test('5. supplied vendorRisk includes only the top 5 entries, highest score first', () => {
  const vendorRisk = {
    'Vendor A': { score: 40, flags: ['duplicate'] },
    'Vendor B': { score: 90, flags: ['shell'] },
    'Vendor C': { score: 10, flags: [] },
    'Vendor D': { score: 75, flags: ['timing'] },
    'Vendor E': { score: 60, flags: [] },
    'Vendor F': { score: 55, flags: [] },
    'Vendor G': { score: 5, flags: [] },
  };
  const findings = [makeFinding()];
  const summary = buildReportSummary({ stats: STATS, findings, vendorRisk });

  assert.equal(summary.topVendors.length, MAX_TOP_VENDORS);
  assert.deepEqual(
    summary.topVendors.map((v) => v.vendor),
    ['Vendor B', 'Vendor D', 'Vendor E', 'Vendor F', 'Vendor A']
  );
  assert.equal(summary.topVendors[0].score, 90);
});

test('raw transactions are never part of the summary builder input or output shape', () => {
  const findings = [makeFinding()];
  const summary = buildReportSummary({ stats: STATS, findings });
  assert.equal(JSON.stringify(summary).includes('transactions'), false);
});
