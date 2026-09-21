import { Router } from 'express';
import { validateTransactions } from '../utils/validation.js';
import {
  detectDuplicates,
  detectThresholdSplitting,
  detectShellCompany,
  detectWeekendApprovals,
} from '../services/fraudDetection.js';
import { detectBenford, scoreBenfordFindings } from '../services/benford.js';
import { calcVendorRisk } from '../services/vendorRisk.js';

const router = Router();

// POST /api/analyze — runs all deterministic fraud-detection checks
// on the submitted transactions and returns findings, Benford results,
// vendor risk scores, and summary stats. No AI involved.
router.post('/', (req, res) => {
  const validation = validateTransactions(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const transactions = req.body.transactions;

  const duplicateFindings = detectDuplicates(transactions);
  const splittingFindings = detectThresholdSplitting(transactions);
  const shellFindings = detectShellCompany(transactions);
  const benfordResults = detectBenford(transactions);
  const benfordFindings = scoreBenfordFindings(benfordResults);
  const timingFindings = detectWeekendApprovals(transactions);

  const findings = [
    ...duplicateFindings,
    ...splittingFindings,
    ...shellFindings,
    ...benfordFindings,
    ...timingFindings,
  ];

  const vendorRisk = calcVendorRisk(transactions, findings);

  const totalValue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const uniqueVendors = new Set(transactions.map((t) => t.vendor)).size;
  const sortedDates = transactions.map((t) => t.date).filter(Boolean).sort();

  res.json({
    stats: {
      totalTransactions: transactions.length,
      totalValue,
      uniqueVendors,
      flagCount: findings.length,
      periodStart: sortedDates[0] || null,
      periodEnd: sortedDates[sortedDates.length - 1] || null,
    },
    findings,
    benford: benfordResults,
    vendorRisk,
  });
});

export default router;
