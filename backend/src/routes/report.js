import { Router } from 'express';
import { validateReportRequest } from '../utils/validation.js';
import { generateInvestigationReport } from '../services/anthropicClient.js';
import { fmt } from '../utils/helpers.js';
import { buildReportSummary, formatSummaryForPrompt } from '../services/reportSummary.js';

const router = Router();

function buildPrompt(stats, findings, vendorRisk) {
  const summary = buildReportSummary({ stats, findings, vendorRisk });
  const { overview } = summary;
  const { period, findingsSection, vendorSection } = formatSummaryForPrompt(summary);

  return `You are a forensic accountant drafting an investigation report based on statistical fraud-risk indicators. This report is a DRAFT for review by a licensed forensic examiner — you must not state that fraud has been proven or confirmed. Describe findings as anomalies or fraud-risk indicators that warrant further investigation.

ANALYSIS SUMMARY:
- Period: ${period}
- Transactions: ${overview.totalTransactions}
- Total AP value: $${fmt(overview.totalValue)}
- Vendors: ${overview.uniqueVendors}
- Findings: ${overview.totalFindings} (${overview.highSeverityCount} high severity, ${overview.medSeverityCount} medium, ${overview.lowSeverityCount} low)

FINDINGS BY TYPE (representative examples shown; counts reflect the full dataset):
${findingsSection}${vendorSection}

Write a structured investigation report:
1. EXECUTIVE SUMMARY (3-4 sentences)
2. METHODOLOGY
3. FINDINGS — one paragraph per high-severity finding type, referencing the representative examples and total counts provided, with specific amounts and transaction IDs where given. Use language such as "fraud-risk indicator" and "anomaly" — do not assert that fraud is proven.
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

  const { stats, findings, vendorRisk } = req.body;
  const prompt = buildPrompt(stats, findings, vendorRisk);

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
    // Full diagnostic detail server-side only — status/code/upstream error
    // body/model. Never the API key, Authorization header, prompt, or
    // stack trace, and never any of this in the client-facing response.
    console.error('Report generation failed:', {
      status: err.status,
      code: err.code,
      model: err.model,
      upstreamError: err.upstreamError,
      message: err.message,
    });
    if (err.code === 'MISSING_API_KEY') {
      return res.status(500).json({ error: 'AI report generation is not configured on this server.' });
    }
    res.status(502).json({ error: 'Report generation failed. Please try again later.' });
  }
});

export default router;
