import { groupBy } from '../utils/helpers.js';

export const BENFORD_EXP = {
  1: 0.301, 2: 0.176, 3: 0.125, 4: 0.097, 5: 0.079,
  6: 0.067, 7: 0.058, 8: 0.051, 9: 0.046,
};

export const CHI_CRIT = 15.507;

/**
 * Ported unchanged — chi-square goodness-of-fit test per vendor
 * (vendors with fewer than 8 invoices are skipped, matching the original).
 */
export function detectBenford(data) {
  const results = [];
  const byVendor = groupBy(data, 'vendor');

  Object.entries(byVendor).forEach(([vendor, txns]) => {
    if (txns.length < 8) return;

    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    txns.forEach((t) => {
      const digit = parseInt(String(t.amount).replace(/[^0-9]/g, '')[0], 10);
      if (digit >= 1 && digit <= 9) counts[digit]++;
    });

    const n = txns.length;
    let chi2 = 0;
    for (let d = 1; d <= 9; d++) {
      const expected = n * BENFORD_EXP[d];
      chi2 += Math.pow(counts[d] - expected, 2) / expected;
    }

    results.push({ vendor, txns, counts, chi2, flagged: chi2 > CHI_CRIT, n });
  });

  return results.sort((a, b) => b.chi2 - a.chi2);
}

/**
 * Ported unchanged — same finding text and 0.05 significance framing.
 */
export function scoreBenfordFindings(results) {
  return results
    .filter((r) => r.flagged)
    .map((r) => ({
      type: 'benford',
      severity: 'med',
      title: `Benford deviation — ${r.vendor}`,
      sub: `χ² = ${r.chi2.toFixed(1)} (critical: ${CHI_CRIT}) · Digits 7–9 over-represented`,
      txnIds: r.txns.map((t) => t.id),
      evidence: [
        `χ²: ${r.chi2.toFixed(2)}`,
        `n = ${r.n} invoices`,
        `Critical (p=0.05): ${CHI_CRIT}`,
        `Result: statistically significant`,
      ],
      detail: `Benford's Law predicts digit 1 leads ~30% of the time, 7–9 combined ~15.5%. ${r.vendor}'s distribution deviates significantly (χ²=${r.chi2.toFixed(1)}, p<0.05), suggesting possible fabricated invoice amounts.`,
      next: `Request original quotes and documentation for the 10 largest invoices. Look for round numbers or amounts clustering near specific values — those are the fabricated entries distorting the distribution.`,
    }));
}
