import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectDuplicates, detectThresholdSplitting, detectShellCompany, detectWeekendApprovals } from './fraudDetection.js';
import { detectBenford, scoreBenfordFindings } from './benford.js';
import { calcVendorRisk } from './vendorRisk.js';
// Single source of truth for the 64-row baseline dataset — avoids a
// second, driftable copy living only in the backend.
import { SAMPLE } from '../../../frontend/src/data/sampleData.js';

test('64-row sample regression baseline is unchanged by the date-parsing fix', () => {
  const dup = detectDuplicates(SAMPLE);
  const split = detectThresholdSplitting(SAMPLE);
  const shell = detectShellCompany(SAMPLE);
  const benfordResults = detectBenford(SAMPLE);
  const benfordFindings = scoreBenfordFindings(benfordResults);
  const timing = detectWeekendApprovals(SAMPLE);
  const findings = [...dup, ...split, ...shell, ...benfordFindings, ...timing];

  assert.equal(findings.length, 11);

  // All three Benford-evaluated vendors, not just the flagged ones —
  // Office Depot's 3.98 is below the critical value and stays unflagged,
  // same as the established baseline.
  assert.deepEqual(
    benfordResults.map((b) => Number(b.chi2.toFixed(2))),
    [83.78, 23.81, 3.98]
  );
  assert.deepEqual(
    benfordResults.map((b) => b.flagged),
    [true, true, false]
  );

  const vendorRisk = calcVendorRisk(SAMPLE, findings);
  const topScore = Math.max(...Object.values(vendorRisk).map((v) => v.score));
  assert.equal(topScore, 75);
});

test('detectWeekendApprovals flags UK-format (DD/MM/YYYY) weekend dates — the exact bug the York dataset hit', () => {
  // 13/04/2024 and 20/04/2024 are both Saturdays; day part (13, 20) > 12
  // so the DD/MM reading is unambiguous either way.
  const ukFormat = [
    { id: 1, date: '13/04/2024 00:00', vendor: 'Test Vendor A', invoice: 'A-1', amount: 100, approved_by: 'Test Approver' },
    { id: 2, date: '20/04/2024 00:00', vendor: 'Test Vendor B', invoice: 'B-1', amount: 200, approved_by: 'Test Approver' },
  ];
  const findings = detectWeekendApprovals(ukFormat);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'timing');
  assert.deepEqual(findings[0].txnIds.sort(), [1, 2]);
});

test('detectWeekendApprovals produces an identical finding for the ISO equivalent of the same dates', () => {
  const isoFormat = [
    { id: 1, date: '2024-04-13', vendor: 'Test Vendor A', invoice: 'A-1', amount: 100, approved_by: 'Test Approver' },
    { id: 2, date: '2024-04-20', vendor: 'Test Vendor B', invoice: 'B-1', amount: 200, approved_by: 'Test Approver' },
  ];
  const findings = detectWeekendApprovals(isoFormat);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].sub, '2 approvals on weekends/holidays · $300.00 total');
});

test('detectShellCompany correctly orders UK-format dates for the 90-day new-vendor signal', () => {
  const data = [
    // Establishes the earliest date across the dataset.
    { id: 1, date: '01/01/2024', vendor: 'Vendor Old', invoice: 'OLD-1', amount: 500, ein: '12-3456789', address: '' },
    // New vendor, first seen 45 days later (unambiguous: day=15 > 12),
    // no EIN, $25,000 total in first 90 days -> should score
    // 30 (no EIN) + 25 (new vendor > $10k in 90 days) + 5 (total exposure) = 60.
    { id: 2, date: '15/02/2024', vendor: 'Vendor New Shell', invoice: 'NEW-1', amount: 12500, ein: '', address: '' },
    { id: 3, date: '16/02/2024', vendor: 'Vendor New Shell', invoice: 'NEW-2', amount: 12500, ein: '', address: '' },
  ];
  const findings = detectShellCompany(data);
  const shellFinding = findings.find((f) => f.title.includes('Vendor New Shell'));
  assert.ok(shellFinding, 'expected a shell-company finding for Vendor New Shell');
  assert.equal(shellFinding.sc, 60);
});
