// Deterministic contextual-review layer. Purely additive: this module
// never reads or changes a finding's type, severity, txnIds, or evidence,
// and never touches detection/scoring logic in fraudDetection.js,
// benford.js, or vendorRisk.js. It only attaches a `context` object that
// helps an investigator interpret a finding — it never asserts a
// transaction is legitimate or fraudulent.
import { parseTransactionDate } from '../utils/dates.js';
import { daysBetween } from '../utils/helpers.js';

const CADENCE_BANDS = [
  { name: 'weekly', center: 7, tolerance: 2 },
  { name: 'biweekly', center: 14, tolerance: 3 },
  { name: 'monthly', center: 30, tolerance: 5 },
  { name: 'quarterly', center: 90, tolerance: 10 },
];

// Classifies a list of day-intervals against known recurring-payment
// cadences. Returns null when nothing fits within tolerance.
export function classifyCadence(intervals) {
  if (!intervals.length) return null;
  const avg = intervals.reduce((s, i) => s + i, 0) / intervals.length;
  const maxDeviation = Math.max(...intervals.map((i) => Math.abs(i - avg)));
  const band = CADENCE_BANDS.find(
    (b) => Math.abs(avg - b.center) <= b.tolerance && maxDeviation <= b.tolerance * 1.5
  );
  return band ? band.name : null;
}

// Analyzes the specific transactions already grouped by one `duplicate`
// finding (same vendor, exact same amount — guaranteed by
// detectDuplicates's grouping key, so "same/similar amount" is already
// satisfied by construction; this does not re-scan the vendor's broader
// history for near-amount matches). Classifies the timing pattern without
// ever concluding the payments are legitimate or fraudulent.
export function analyzeRecurringPayment(group) {
  const sorted = [...group].sort((a, b) => {
    const da = parseTransactionDate(a.date)?.getTime() ?? Infinity;
    const db = parseTransactionDate(b.date)?.getTime() ?? Infinity;
    return da - db;
  });

  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const d = daysBetween(sorted[i - 1].date, sorted[i].date);
    if (!Number.isNaN(d)) intervals.push(d);
  }

  const invoiceRefsDiffer = new Set(group.map((t) => t.invoice)).size === group.length;
  const cadence = classifyCadence(intervals);

  const basis = {
    transactionCount: group.length,
    invoiceReferences: invoiceRefsDiffer ? 'different' : 'identical',
    intervalsDays: intervals,
    detectedCadence: cadence,
  };

  if (!invoiceRefsDiffer) {
    return {
      classification: 'Unexplained pattern',
      explanation:
        'These transactions share an identical invoice or reference number. This can occur with a duplicate submission, but some vendors or AP systems also reuse a single contract or reference number for recurring charges billed under the same agreement — the transaction data alone cannot distinguish between these. Review the underlying invoice or contract documents to determine which applies.',
      whatToVerify: [
        'Whether this is a duplicate submission or a recurring charge billed under a shared contract/reference number',
        'The original contract or engagement letter, if one exists, and how it structures invoicing',
        'Whether both payments actually cleared, and whether a refund or credit was issued for either',
      ],
      basis,
    };
  }

  if (cadence && group.length >= 3) {
    return {
      classification: 'Potentially recurring/contractual',
      explanation: `These payments recur at a consistent ~${cadence} interval (day-gaps of ${intervals.join(', ')}) and use different invoice/reference numbers, which is consistent with a recurring service or contract billing cycle. This is not a determination that the payments are legitimate — supporting documentation should still confirm it.`,
      whatToVerify: [
        'The underlying contract or service agreement, to confirm a recurring billing schedule at this cadence',
        'Whether the billed amount matches the contracted price for each cycle',
        'Confirmation the vendor actually provided the service for each billing cycle (e.g. delivery or completion records)',
      ],
      basis,
    };
  }

  return {
    classification: 'Requires supporting documentation',
    explanation:
      'There are too few transactions, or the interval between them does not consistently match a standard recurring billing cadence, to classify this pattern from the transaction data alone.',
    whatToVerify: [
      'Invoice or contract documentation for these specific transactions',
      "Whether this vendor's other transactions (outside this cluster) show a clearer recurring pattern",
      'The business relationship and billing terms directly with the vendor or contract owner',
    ],
    basis,
  };
}

// Static context, identical for every finding of the type — no per-finding
// computation is possible or needed for these; they're reminders of what
// to check before treating the flag as more than a starting point.
export const SHELL_CONTEXT = {
  label: 'Context Check',
  explanation:
    'Recently onboarded vendors and incomplete identifying details are not inherently signs of fraud — legitimate businesses can be new, small, or have incomplete records on file for ordinary administrative reasons. This flag means the vendor record warrants independent verification, not that the vendor is fictitious.',
  whatToVerify: [
    'Vendor onboarding date, and who created/approved the vendor record',
    'Incorporation or business registration records',
    'W-9 or W-8 on file',
    "Contract or engagement start date relative to the vendor's first invoice",
    'Beneficial ownership information, if available',
    'Banking details and address, cross-checked against employees and other vendors',
    'Who approved payments to this vendor',
  ],
};

export const TIMING_CONTEXT = {
  label: 'Context Check',
  explanation:
    'Weekend or holiday approvals are not inherently irregular — some organizations run emergency operations, designate after-hours approvers, or have departments that routinely operate on weekends. This flag means authorization should be verified, not that wrongdoing occurred.',
  whatToVerify: [
    'Whether emergency or after-hours approval was authorized for this transaction',
    'Whether a designated after-hours approver policy exists and covers this approver',
    'Whether the department or operation routinely works weekends/holidays',
    'Approval timestamps and access/login logs, if available',
    'Whether this timing pattern is routine for this approver or unusual',
  ],
};

export const APPROVER_CONCENTRATION_CONTEXT = {
  label: 'Context Check',
  explanation:
    "A single approver handling many vendors can reflect a legitimate role (e.g. a department head or centralized AP function) rather than a conflict of interest. This flag means the approver's scope and authorization should be verified, not that a conflict exists.",
  whatToVerify: [
    "Whether this approver's role and authorization level covers all these vendors",
    'Whether the organization intentionally centralizes approval with this role',
    'Whether any of these vendors share other overlapping identifiers with each other or with this approver',
  ],
};

// Dispatches by finding type. Returns null for any type without context in
// this version (e.g. splitting, benford) — those findings are simply left
// unchanged, exactly as before.
export function buildFindingContext(finding, txnById) {
  if (finding.type === 'duplicate') {
    const group = finding.txnIds.map((id) => txnById.get(id)).filter(Boolean);
    if (group.length < 2) return null;
    return { label: 'Context Check', ...analyzeRecurringPayment(group) };
  }
  if (finding.type === 'shell') return SHELL_CONTEXT;
  if (finding.type === 'timing') return TIMING_CONTEXT;
  return null;
}
