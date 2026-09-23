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
import { buildMoneyTrail } from '../services/moneyTrail.js';
import { parseTransactionDate } from '../utils/dates.js';
import { buildFindingContext } from '../services/contextReview.js';

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
  const moneyTrail = buildMoneyTrail(transactions, findings, vendorRisk);

  // Contextual-review enrichment — computed only after every detector and
  // vendorRisk/moneyTrail have already run, so it can never influence
  // their output. Purely additive: attaches an optional `context` field,
  // never changes type/severity/txnIds/evidence on any finding.
  const txnById = new Map(transactions.map((t) => [t.id, t]));
  findings.forEach((f) => {
    const context = buildFindingContext(f, txnById);
    if (context) f.context = context;
  });

  const totalValue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const uniqueVendors = new Set(transactions.map((t) => t.vendor)).size;
  const sortedDates = transactions
    .map((t) => t.date)
    .filter(Boolean)
    .sort((a, b) => (parseTransactionDate(a)?.getTime() ?? Infinity) - (parseTransactionDate(b)?.getTime() ?? Infinity));

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
    moneyTrail,
  });
});

export default router;
