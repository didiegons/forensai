// Deterministic, bounded report-input builder. Replaces "list every
// finding" with "aggregate by type, show a few representative examples."
// Prompt size scales with the number of distinct finding TYPES (bounded —
// there are only a handful of detectors), not with total finding count,
// so this stays safe whether the dataset has 64 or 620,000 transactions.
// Never reads raw transactions — only the already-generated
// stats/findings/vendorRisk summary objects.

export const MAX_EXAMPLES_PER_TYPE = 5;
export const MAX_EXAMPLE_CHARS = 300;
export const MAX_TOP_VENDORS = 5;
// Hard defensive ceiling on the whole findings section, independent of
// the "bounded by type count" assumption above — a safety net in case
// the number of distinct types is ever unexpectedly large.
export const MAX_SUMMARY_CHARS = 20000;

function truncate(str, max) {
  if (typeof str !== 'string') return '';
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
}

// Picks up to `n` findings evenly spaced across the population (including
// the first and last), rather than just the first `n` — so the sample
// reflects the whole population, not just whichever vendor grouped first.
export function pickRepresentativeExamples(items, n = MAX_EXAMPLES_PER_TYPE) {
  const count = items.length;
  if (count <= n) return items;
  if (n <= 1) return [items[0]];

  const indices = [];
  for (let i = 0; i < n; i++) {
    indices.push(Math.round((i * (count - 1)) / (n - 1)));
  }
  return [...new Set(indices)].map((idx) => items[idx]);
}

function formatExample(f) {
  return truncate(`[${String(f.severity).toUpperCase()}] ${f.title}: ${f.detail}`, MAX_EXAMPLE_CHARS);
}

// Builds the structured, bounded summary. Never touches detection logic —
// operates purely on findings/stats/vendorRisk already computed elsewhere.
export function buildReportSummary({ stats, findings, vendorRisk }) {
  const bySeverity = { high: 0, med: 0, low: 0 };
  findings.forEach((f) => {
    if (bySeverity[f.severity] !== undefined) bySeverity[f.severity]++;
  });

  const byTypeMap = new Map();
  findings.forEach((f) => {
    if (!byTypeMap.has(f.type)) byTypeMap.set(f.type, []);
    byTypeMap.get(f.type).push(f);
  });

  const byType = [...byTypeMap.entries()].map(([type, typeFindings]) => {
    const severityCounts = {};
    typeFindings.forEach((f) => {
      severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
    });
    const dominantSeverity = Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0][0];

    const examples = pickRepresentativeExamples(typeFindings, MAX_EXAMPLES_PER_TYPE).map(formatExample);

    return {
      type,
      count: typeFindings.length,
      severity: dominantSeverity,
      examples,
      additionalCount: Math.max(0, typeFindings.length - examples.length),
    };
  });

  let topVendors = [];
  if (vendorRisk && typeof vendorRisk === 'object' && !Array.isArray(vendorRisk)) {
    topVendors = Object.entries(vendorRisk)
      .map(([vendor, risk]) => ({ vendor, score: risk?.score ?? 0, flags: risk?.flags ?? [] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_TOP_VENDORS);
  }

  return {
    overview: {
      totalTransactions: stats.totalTransactions,
      totalValue: stats.totalValue,
      uniqueVendors: stats.uniqueVendors,
      periodStart: stats.periodStart ?? null,
      periodEnd: stats.periodEnd ?? null,
      totalFindings: findings.length,
      highSeverityCount: bySeverity.high,
      medSeverityCount: bySeverity.med,
      lowSeverityCount: bySeverity.low,
    },
    byType,
    topVendors,
  };
}

// Turns the structured summary into the text block used in the prompt.
export function formatSummaryForPrompt(summary) {
  const { overview, byType, topVendors } = summary;

  const period = overview.periodStart && overview.periodEnd
    ? `${overview.periodStart} to ${overview.periodEnd}`
    : 'not specified in source data';

  const typeBlocks = byType.map((t) => {
    const header = `${t.type.toUpperCase()} (${t.severity} severity): ${t.count} total`;
    const exampleLines = t.examples.map((e) => `  • ${e}`).join('\n');
    const additionalLine = t.additionalCount > 0
      ? `  ...and ${t.additionalCount} additional ${t.type} finding${t.additionalCount === 1 ? '' : 's'} not individually listed.`
      : '';
    return [header, exampleLines, additionalLine].filter(Boolean).join('\n');
  });

  let findingsSection = typeBlocks.join('\n\n') || 'No findings were raised by the automated checks.';
  if (findingsSection.length > MAX_SUMMARY_CHARS) {
    findingsSection = `${findingsSection.slice(0, MAX_SUMMARY_CHARS)}\n...[additional finding types truncated for brevity]`;
  }

  const vendorSection = topVendors.length
    ? `\n\nTOP VENDORS BY RISK SCORE:\n${topVendors
        .map((v) => `  • ${v.vendor} — score ${v.score}/100${v.flags.length ? ` (${v.flags.join(', ')})` : ''}`)
        .join('\n')}`
    : '';

  return { period, findingsSection, vendorSection };
}
