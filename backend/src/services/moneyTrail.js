import { groupBy, fmt } from '../utils/helpers.js';

/**
 * Deterministic, evidence-based relationship graph for the Money Trail
 * Explorer tab. Pure function of transactions/findings/vendorRisk that
 * ForensAI already computes — no AI, no network calls, no invented
 * relationships. A relationship only appears here if the underlying
 * field is actually present and actually matches across 2+ vendors.
 *
 * Language throughout is deliberately hedged ("shares", "associated
 * with", "warrants review") — nothing here asserts fraud is proven.
 */

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

function slug(s) {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'unknown';
}

function riskLevelFor(score) {
  return score >= 60 ? 'high' : score >= 30 ? 'med' : 'low';
}

// Which optional CSV/sample-data fields can produce a "shared identifier"
// node, and the wording used to describe that relationship.
const SHARED_FIELD_CONFIG = [
  { field: 'bank_account', type: 'bankAccount', noun: 'bank account', verb: 'uses' },
  { field: 'address', type: 'address', noun: 'address', verb: 'located at' },
  { field: 'email', type: 'email', noun: 'email address', verb: 'contactable at' },
  { field: 'phone', type: 'phone', noun: 'phone number', verb: 'contactable at' },
];

export function buildMoneyTrail(transactions, findings, vendorRisk) {
  const nodes = [];
  const edges = [];
  const summary = [];
  let edgeSeq = 0;
  const nextEdgeId = () => `e${++edgeSeq}`;
  const vendorNodeId = (vendor) => `vendor:${slug(vendor)}`;
  const findNode = (id) => nodes.find((n) => n.id === id);

  const byVendor = groupBy(transactions, 'vendor');
  const vendorNames = Object.keys(byVendor);

  // Which (de-duplicated) finding types touch each vendor, for the
  // evidence panel's "known flags" list.
  const findingsByVendor = {};
  findings.forEach((f) => {
    f.txnIds.forEach((id) => {
      const txn = transactions.find((t) => t.id === id);
      if (!txn) return;
      const list = (findingsByVendor[txn.vendor] = findingsByVendor[txn.vendor] || []);
      if (!list.some((existing) => existing.type === f.type)) list.push(f);
    });
  });

  nodes.push({ id: 'company', type: 'company', label: 'Your Company', data: {} });

  vendorNames.forEach((vendor) => {
    const txns = byVendor[vendor];
    const risk = vendorRisk[vendor] || { score: 0, flags: [], total: 0, count: txns.length };
    const approvers = [...new Set(txns.map((t) => t.approved_by).filter(Boolean))];
    const vendorFindings = findingsByVendor[vendor] || [];

    nodes.push({
      id: vendorNodeId(vendor),
      type: 'vendor',
      label: vendor,
      data: {
        vendor,
        totalPaid: risk.total,
        txnCount: risk.count,
        riskScore: risk.score,
        riskLevel: riskLevelFor(risk.score),
        hasFindings: vendorFindings.length > 0,
        flags: risk.flags,
        approvers,
        sharedIdentifiers: [], // populated below once shared groups are known
        findingTitles: vendorFindings.map((f) => f.title),
        txnIds: txns.map((t) => t.id),
      },
    });

    edges.push({
      id: nextEdgeId(),
      source: 'company',
      target: vendorNodeId(vendor),
      type: 'paid',
      label: 'paid',
      data: {
        reviewNote: `Your company issued ${txns.length} payment${txns.length === 1 ? '' : 's'} totaling $${fmt(risk.total)} to ${vendor}.`,
        txnIds: txns.map((t) => t.id),
      },
    });
  });

  // Approver nodes — shown for every approver (not just shared ones);
  // there are only ever a handful, so this doesn't clutter the graph,
  // and "which vendors does this approver touch" is useful on its own.
  const byApprover = groupBy(transactions.filter((t) => t.approved_by), 'approved_by');
  Object.entries(byApprover).forEach(([approver, txns]) => {
    const vendorsForApprover = [...new Set(txns.map((t) => t.vendor))];
    const emphasized = vendorsForApprover.length >= 3;

    nodes.push({
      id: `approver:${slug(approver)}`,
      type: 'approver',
      label: approver,
      shared: emphasized,
      data: { approver, vendorCount: vendorsForApprover.length, vendors: vendorsForApprover, txnIds: txns.map((t) => t.id) },
    });

    vendorsForApprover.forEach((vendor) => {
      const vendorTxns = txns.filter((t) => t.vendor === vendor);
      edges.push({
        id: nextEdgeId(),
        source: vendorNodeId(vendor),
        target: `approver:${slug(approver)}`,
        type: 'approvedBy',
        label: 'approved by',
        suspicious: emphasized,
        data: {
          reviewNote: `${vendor} invoices were approved by ${approver}.`,
          txnIds: vendorTxns.map((t) => t.id),
        },
      });
    });

    if (emphasized) {
      summary.push({
        text: `${approver} approved payments to ${vendorsForApprover.length} vendors: ${vendorsForApprover.join(', ')}. A common approver relationship is not evidence of wrongdoing on its own, but may warrant review alongside other indicators.`,
        severity: 'med',
      });
    }
  });

  // Shared-identifier nodes: bank account / address / email / phone.
  // A node is only created when 2+ distinct vendors share the exact
  // (trimmed, case-insensitive) value — a unique value isn't an overlap.
  SHARED_FIELD_CONFIG.forEach(({ field, type, noun, verb }) => {
    const byValue = {};
    vendorNames.forEach((vendor) => {
      const raw = byVendor[vendor][0][field];
      const norm = normalize(raw);
      if (!norm) return;
      (byValue[norm] = byValue[norm] || { raw, vendors: [] }).vendors.push(vendor);
    });

    Object.values(byValue).forEach(({ raw, vendors }) => {
      if (vendors.length < 2) return;

      const nodeId = `${type}:${slug(raw)}`;
      nodes.push({ id: nodeId, type, label: raw, shared: true, data: { value: raw, sharedBy: vendors } });

      vendors.forEach((vendor) => {
        edges.push({
          id: nextEdgeId(),
          source: vendorNodeId(vendor),
          target: nodeId,
          type: `uses-${field}`,
          label: verb,
          suspicious: true,
          data: {
            reviewNote: `${vendor} shares this ${noun} with ${vendors.filter((v) => v !== vendor).join(', ')} — a shared ${noun} is a fraud-risk indicator that warrants review.`,
            supportingValue: raw,
            txnIds: byVendor[vendor].map((t) => t.id),
          },
        });

        const label = noun.charAt(0).toUpperCase() + noun.slice(1);
        findNode(vendorNodeId(vendor)).data.sharedIdentifiers.push(
          `${label} ${raw} (also used by ${vendors.filter((v) => v !== vendor).join(', ')})`
        );
      });

      summary.push({
        text: `Shared ${noun} detected: ${vendors.join(' and ')} share ${noun} ${raw}.`,
        severity: 'high',
      });
    });
  });

  // Beneficiary nodes: only when present AND different from the vendor
  // name itself (the "paid to X, beneficiary on file is Y" pattern).
  // If 2+ vendors happen to share a beneficiary value, they converge on
  // the same node, same as the shared-identifier fields above.
  const byBeneficiary = {};
  vendorNames.forEach((vendor) => {
    const raw = byVendor[vendor][0].beneficiary;
    const norm = normalize(raw);
    if (!norm || norm === normalize(vendor)) return;
    (byBeneficiary[norm] = byBeneficiary[norm] || { raw, vendors: [] }).vendors.push(vendor);
  });

  Object.values(byBeneficiary).forEach(({ raw, vendors }) => {
    const nodeId = `beneficiary:${slug(raw)}`;
    nodes.push({ id: nodeId, type: 'beneficiary', label: raw, shared: vendors.length >= 2, data: { value: raw, vendors } });

    vendors.forEach((vendor) => {
      edges.push({
        id: nextEdgeId(),
        source: vendorNodeId(vendor),
        target: nodeId,
        type: 'associatedWith',
        label: 'associated with',
        suspicious: true,
        data: {
          reviewNote: `Payments to ${vendor} list a beneficiary ("${raw}") that differs from the vendor name on file — worth confirming who actually receives these funds.`,
          supportingValue: raw,
          txnIds: byVendor[vendor].map((t) => t.id),
        },
      });
      findNode(vendorNodeId(vendor)).data.sharedIdentifiers.push(`Beneficiary on file: ${raw} (differs from vendor name)`);
    });

    summary.push({
      text: `Vendor/beneficiary mismatch: payments to ${vendors.join(', ')} list beneficiary "${raw}", which differs from the vendor name on file.`,
      severity: 'high',
    });
  });

  return { nodes, edges, summary };
}
