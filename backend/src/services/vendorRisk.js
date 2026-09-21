import { groupBy } from '../utils/helpers.js';

/**
 * Ported unchanged — same point weights (high=35, med=20, low=10),
 * each finding type counted once per vendor, capped at 100.
 */
export function calcVendorRisk(data, findings) {
  const byVendor = groupBy(data, 'vendor');
  const risk = {};

  Object.keys(byVendor).forEach((vendor) => {
    risk[vendor] = {
      score: 0,
      flags: [],
      total: byVendor[vendor].reduce((s, t) => s + t.amount, 0),
      count: byVendor[vendor].length,
    };
  });

  findings.forEach((f) => {
    f.txnIds.forEach((id) => {
      const txn = data.find((t) => t.id === id);
      if (!txn) return;
      const vendor = txn.vendor;
      if (!risk[vendor]) return;
      const points = f.severity === 'high' ? 35 : f.severity === 'med' ? 20 : 10;
      if (!risk[vendor].flags.includes(f.type)) {
        risk[vendor].score = Math.min(100, risk[vendor].score + points);
        risk[vendor].flags.push(f.type);
      }
    });
  });

  return risk;
}
