import { Router } from 'express';

const router = Router();

// A server-rendered, JavaScript-free HTML page. Some AI/web-fetch tools
// can reach the deployed URL but cannot execute a single-page app, so
// they only ever see the static HTML shell (an empty <div id="root">).
// This page exists so those tools — and any human skimming curl output —
// can understand and verify what ForensAI does without running the SPA.
const REVIEW_PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ForensAI — Text-Only Review Page</title>
<meta name="description" content="A server-rendered, JavaScript-free overview of ForensAI — an AP fraud-risk detection and investigation tool — for reviewers and tools that cannot execute the React application.">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{--bg:#0d1117;--surface:#161b22;--surface2:#1c2128;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--muted2:#6e7681;--accent:#58a6ff;--accent-bg:rgba(88,166,255,.1);--high:#f85149;--high-bg:rgba(248,81,73,.12);}
  *{box-sizing:border-box}
  body{background:var(--bg);color:var(--text);font-family:'Instrument Sans',system-ui,sans-serif;font-size:15px;line-height:1.65;max-width:760px;margin:0 auto;padding:32px 20px 60px}
  h1,h2{font-family:'Syne',sans-serif;font-weight:800;letter-spacing:-.02em}
  h1{font-size:26px;margin:0 0 6px}
  h2{font-size:16px;margin:32px 0 10px;padding-top:20px;border-top:1px solid var(--border)}
  p{margin:0 0 12px}
  ul{margin:0 0 12px;padding-left:22px}
  li{margin-bottom:6px}
  code{font-family:'DM Mono',monospace;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:1px 6px;font-size:13px}
  a{color:var(--accent)}
  .eyebrow{font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
  .notice{background:var(--accent-bg);border:1px solid var(--accent);border-radius:8px;padding:14px 16px;margin:18px 0;font-size:14px}
  .responsible{background:var(--high-bg);border:1px solid var(--high);border-radius:8px;padding:14px 16px;margin:18px 0;font-size:14px}
  .links{list-style:none;padding:0;display:flex;flex-direction:column;gap:8px}
  .links a{font-family:'DM Mono',monospace;font-size:14px}
  footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--border);color:var(--muted2);font-size:12px}
</style>
</head>
<body>

<div class="eyebrow">Text-only review page</div>
<h1>ForensAI</h1>
<p>An AI-assisted accounts payable (AP) fraud-risk detection and investigation tool.</p>

<div class="notice">
  This page is plain, server-rendered HTML with no client-side JavaScript. It exists specifically
  for reviewers and automated tools that can fetch a URL but cannot execute a React application —
  see <a href="#app-note">"About the main application"</a> below.
</div>

<h2>Purpose</h2>
<p>
  ForensAI turns a routine accounts-payable ledger into a set of deterministic, statistically
  grounded fraud-risk checks, a relationship graph tracing connections between vendors and shared
  identifiers, and an optional AI-drafted narrative report — replacing work that would otherwise be
  done by hand in a spreadsheet and a word processor.
</p>

<h2>Target audience</h2>
<p>
  Independent forensic accountants, Certified Fraud Examiners (CFEs), and small forensic
  accounting firms who currently perform AP fraud analysis manually and need traceable,
  evidence-linked output suitable for a professional engagement.
</p>

<h2>The AP fraud-analysis workflow</h2>
<p>
  A user loads AP transaction data — either the bundled sample dataset or an uploaded CSV mapped to
  ForensAI's fields — and the backend runs every deterministic check against the full transaction
  set in one pass. The results (findings, vendor risk scores, a relationship graph, and summary
  statistics) are returned together and explored across several views: a ranked findings list,
  template-based "next steps" investigative guidance, a Benford's Law breakdown, a vendor risk
  table, and an interactive money-trail graph. An AI-drafted narrative report can then be generated
  from that same evidence, entirely optionally.
</p>

<h2>Key features</h2>
<ul>
  <li><strong>Benford's Law + chi-square analysis</strong> — tests each vendor's leading-digit distribution against the naturally expected distribution, flagging statistically significant deviations.</li>
  <li><strong>Duplicate invoice detection</strong> — flags invoices sharing the same vendor and exact dollar amount.</li>
  <li><strong>Threshold splitting detection</strong> — flags invoices clustering just under an approval limit, a pattern consistent with deliberately avoiding a higher approval tier.</li>
  <li><strong>Vendor / shell-company risk scoring</strong> — a composite score from signals such as a PO Box address, a missing tax ID, and unusually large early-vendor spend.</li>
  <li><strong>Findings and Next Steps</strong> — every finding is grouped by type with deterministic, template-based investigative guidance (documents to request, questions to ask, verification steps).</li>
  <li><strong>Money Trail Explorer</strong> — an interactive relationship graph connecting vendors, approvers, and shared identifiers (bank accounts, addresses) so overlaps that are invisible in a table become visible.</li>
  <li><strong>AI-generated investigation report</strong> — an optional narrative report drafted from the findings, always labeled as a draft requiring professional review.</li>
</ul>

<div class="responsible">
  <strong>Responsible-AI statement:</strong> every finding, relationship, and AI-drafted report
  produced by ForensAI is a statistical fraud-risk indicator or anomaly — not proof of fraud. All
  output requires verification by a qualified forensic examiner before any conclusion is drawn, and
  AI-generated reports are explicitly labeled as drafts for that review.
</div>

<h2>Technology stack</h2>
<ul>
  <li>Frontend: React (Vite build)</li>
  <li>Backend: Node.js with Express</li>
  <li>AI report drafting: Anthropic's Claude API, called only from the backend — no key is ever sent to the browser</li>
  <li>Relationship graph: @xyflow/react</li>
  <li>Deployment: a single Node process serves both the API and the built frontend</li>
</ul>

<h2 id="app-note">About the main application</h2>
<p>
  The main ForensAI application is a React single-page application (SPA). It requires JavaScript to
  render — a tool or browser that cannot execute JavaScript will only see an empty page shell there.
  This <code>/review</code> page is the JavaScript-free alternative for understanding and verifying
  what the application does.
</p>

<h2>Try it</h2>
<p>
  In the main application, open the <strong>Data</strong> tab and click
  <strong>"Load sample dataset (64 transactions)"</strong> — no upload or account needed. Then
  explore the <strong>Benford's Law</strong>, <strong>Findings</strong>, <strong>Next Steps</strong>,
  <strong>Money Trail</strong>, and <strong>Vendor Risk</strong> tabs to see the analysis, and
  optionally generate a draft report from the <strong>Report</strong> tab.
</p>

<h2>Links</h2>
<ul class="links">
  <li><a href="/">Open the ForensAI application →</a></li>
  <li><a href="/api/health">Check API health (/api/health) →</a></li>
</ul>

<footer>ForensAI — server-rendered review page, generated at request time by Express.</footer>

</body>
</html>
`;

// GET /review
router.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(REVIEW_PAGE_HTML);
});

export default router;
