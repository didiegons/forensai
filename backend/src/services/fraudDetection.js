import { groupBy, fmt, daysBetween, HOLIDAYS_2024 } from '../utils/helpers.js';
import { parseTransactionDate, toISODateString } from '../utils/dates.js';

/**
 * Ported unchanged from original-forensai.html — same grouping key,
 * same duplicate criteria (vendor + exact amount).
 */
export function detectDuplicates(data) {
  const findings = [];
  const groups = {};

  data.forEach((t) => {
    const key = `${t.vendor.toLowerCase().trim()}|${t.amount}`;
    (groups[key] = groups[key] || []).push(t);
  });

  Object.values(groups).forEach((group) => {
    if (group.length < 2) return;
    findings.push({
      type: 'duplicate',
      severity: 'high',
      title: `Duplicate invoice — ${group[0].vendor}`,
      sub: `$${fmt(group[0].amount)} submitted ${group.length}× · ${group.map((t) => t.invoice).join(' & ')}`,
      txnIds: group.map((t) => t.id),
      evidence: group.map((t) => `${t.invoice} · ${t.date} · $${fmt(t.amount)}`),
      detail: `Invoice ${group.map((t) => t.invoice).join(' and ')} share the same vendor and exact amount ($${fmt(group[0].amount)}). The ${daysBetween(group[0].date, group[group.length - 1].date)}-day interval and suffix modification are inconsistent with administrative error.`,
      next: `Request original purchase order and delivery confirmation for both dates. If only one delivery is documented, you have recoverable funds and a clear evidence chain.`,
    });
  });

  return findings;
}

/**
 * Ported unchanged — same thresholds and 5% band as the original.
 */
export function detectThresholdSplitting(data, thresholds = [5000, 10000, 25000, 50000]) {
  const findings = [];
  const byVendor = groupBy(data, 'vendor');

  Object.entries(byVendor).forEach(([vendor, txns]) => {
    thresholds.forEach((t) => {
      const band = txns.filter((x) => x.amount > t * 0.95 && x.amount < t);
      if (band.length < 3) return;
      findings.push({
        type: 'splitting',
        severity: 'high',
        title: `Threshold splitting — ${vendor}`,
        sub: `${band.length} invoices $${fmt(t * 0.95)}–$${fmt(t)} · Approval limit: $${fmt(t)}`,
        txnIds: band.map((x) => x.id),
        evidence: band.map((x) => `${x.invoice} · $${fmt(x.amount)}`),
        detail: `${band.length} invoices from ${vendor} fall just below the $${fmt(t)} approval threshold. The probability of ${band.length} consecutive invoices naturally landing in this 5% band is less than 0.001% — statistically incompatible with chance.`,
        next: `Pull the original engagement letter. If work was recurring, why were invoices not consolidated? The approver on all ${band.length} invoices (${band[0].approved_by}) either participated or failed to notice a pattern visible on any bank statement.`,
      });
    });
  });

  return findings;
}

/**
 * Ported unchanged — same scoring weights (PO Box +40, no EIN +30,
 * new vendor >$10k in first 90 days +25, total exposure +5) and the
 * same >=50 flag threshold.
 */
export function detectShellCompany(data) {
  const findings = [];
  const byVendor = groupBy(data, 'vendor');
  const firstSeen = {};

  // Unparseable dates sort last so garbage data never becomes a spurious
  // "first seen" reference date.
  const dateSortKey = (dateStr) => parseTransactionDate(dateStr)?.getTime() ?? Infinity;

  Object.entries(byVendor).forEach(([vendor, txns]) => {
    firstSeen[vendor] = [...txns].sort((a, b) => dateSortKey(a.date) - dateSortKey(b.date))[0].date;
  });

  const earliestOverall = Object.values(firstSeen).sort((a, b) => dateSortKey(a) - dateSortKey(b))[0];

  Object.entries(byVendor).forEach(([vendor, txns]) => {
    let score = 0;
    const signals = [];
    const sample = txns[0];

    if (/po box/i.test(sample.address || '')) {
      score += 40;
      signals.push('PO Box address');
    }
    if (!sample.ein || sample.ein.trim() === '') {
      score += 30;
      signals.push('No EIN on file');
    }
    if (daysBetween(earliestOverall, firstSeen[vendor]) < 90) {
      const total = txns.reduce((a, t) => a + t.amount, 0);
      if (total > 10000) {
        score += 25;
        signals.push(`New vendor · $${fmt(total)} in first 90 days`);
      }
    }
    const total = txns.reduce((a, t) => a + t.amount, 0);
    if (txns.length >= 2 && total > 20000 && score > 0) {
      score += 5;
      signals.push(`$${fmt(total)} total exposure`);
    }

    if (score >= 50) {
      findings.push({
        type: 'shell',
        severity: 'high',
        title: `Shell company indicators — ${vendor}`,
        sub: `Risk score: ${score}/100 · ${signals.slice(0, 2).join(' · ')}`,
        txnIds: txns.map((t) => t.id),
        evidence: signals,
        detail: `${vendor} exhibits ${signals.length} shell company indicators with composite risk score ${score}/100. The combination of ${signals.join(', ')} is consistent with a fictitious vendor scheme.`,
        next: `Pull the W-9 on file and request a contract or SOW. Cross-reference the payment destination account with other known vendors. If the approving manager has any relationship to the payee account holder, escalate immediately.`,
        sc: score,
      });
    }
  });

  return findings;
}

/**
 * Ported unchanged — same weekend/holiday detection and >=2 grouping by approver.
 */
export function detectWeekendApprovals(data) {
  const flagged = data.filter((t) => {
    const d = parseTransactionDate(t.date);
    if (!d) return false;
    const day = d.getDay();
    return day === 0 || day === 6 || HOLIDAYS_2024.has(toISODateString(d));
  });

  if (!flagged.length) return [];

  const findings = [];
  Object.entries(groupBy(flagged, 'approved_by')).forEach(([approver, txns]) => {
    if (txns.length < 2) return;
    const total = txns.reduce((s, t) => s + t.amount, 0);
    findings.push({
      type: 'timing',
      severity: 'med',
      title: `Off-hours approvals — ${txns.length} invoices by ${approver}`,
      sub: `${txns.length} approvals on weekends/holidays · $${fmt(total)} total`,
      txnIds: txns.map((t) => t.id),
      evidence: txns.map((t) => `${t.invoice} (${t.vendor}) · ${t.date} · $${fmt(t.amount)}`),
      detail: `${txns.length} invoices totaling $${fmt(total)} were approved outside standard business hours by ${approver}. All fall on weekends or federal holidays — consistent with approvals processed while oversight is reduced.`,
      next: `Cross-check approver system login logs. If the approver was not in the office, how was approval granted? Review whether any invoices correspond to vendors with other flags in this analysis.`,
    });
  });

  return findings;
}
