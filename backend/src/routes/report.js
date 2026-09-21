import { Router } from 'express';
import { validateReportRequest } from '../utils/validation.js';
import { generateInvestigationReport } from '../services/anthropicClient.js';
import { fmt } from '../utils/helpers.js';

const router = Router();

function buildPrompt(stats, findings) {
  const findingsSummary = findings
    .map((f) => `• [${String(f.severity).toUpperCase()}] ${String(f.type).toUpperCase()} — ${f.title}: ${f.detail}`)
    .join('\n');

  const highSeverityCount = findings.filter((f) => f.severity === 'high').length;
  const period = stats.periodStart && stats.periodEnd
    ? `${stats.periodStart} to ${stats.periodEnd}`
    : 'not specified in source data';

  return `You are a forensic accountant drafting an investigation report based on statistical fraud-risk indicators. This report is a DRAFT for review by a licensed forensic examiner — you must not state that fraud has been proven or confirmed. Describe findings as anomalies or fraud-risk indicators that warrant further investigation.

ANALYSIS SUMMARY:
- Period: ${period}
- Transactions: ${stats.totalTransactions}
- Total AP value: $${fmt(stats.totalValue)}
- Vendors: ${stats.uniqueVendors}
- Findings: ${findings.length} (${highSeverityCount} high severity)

FINDINGS:
${findingsSummary || 'No findings were raised by the automated checks.'}

Write a structured investigation report:
1. EXECUTIVE SUMMARY (3-4 sentences)
2. METHODOLOGY
3. FINDINGS — one paragraph per high-severity finding, referencing specific amounts and transaction IDs. Use language such as "fraud-risk indicator" and "anomaly" — do not assert that fraud is proven.
4. RECOMMENDATIONS — 3-5 numbered action items, including verification by a qualified forensic examiner before any finding is treated as conclusive.

Requirements: Professional formal tone. Reference specific dollar amounts. Use plain section labels. No filler. 400-600 words.`;
}

// POST /api/report — the only route that talks to Anthropic, and only
// with a summary of findings (never a client-supplied API key, never
// raw transaction PII beyond what's already in the findings).
router.post('/', async (req, res) => {
  const validation = validateReportRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { stats, findings } = req.body;
  const prompt = buildPrompt(stats, findings);

  try {
    const result = await generateInvestigationReport(prompt);

    if (result.truncated) {
      console.error('Report generation truncated: Anthropic response hit the max_tokens limit.');
      return res.status(502).json({
        error: 'The generated report was cut off before it finished and has been discarded. Please try again.',
      });
    }

    const labeled = `**DRAFT — AI-GENERATED, REQUIRES PROFESSIONAL REVIEW**\n\n${result.text}`;
    res.json({ report: labeled, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Report generation failed:', err.message);
    if (err.code === 'MISSING_API_KEY') {
      return res.status(500).json({ error: 'AI report generation is not configured on this server.' });
    }
    res.status(502).json({ error: 'Report generation failed. Please try again later.' });
  }
});

export default router;
