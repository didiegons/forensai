// Deterministic, template-based investigation guidance per finding type.
// No LLM/API call is involved — this is static text selected purely by
// `finding.type`, the same type value the backend detectors already set.
// Nothing here determines whether fraud occurred; it only suggests what
// a professional would typically want to look at next.

export const INVESTIGATION_GUIDANCE = {
  duplicate: {
    label: 'Duplicate invoice',
    whyReview:
      'Two or more invoices share the same vendor and exact dollar amount, which is inconsistent with normal administrative processing and is a common pattern in duplicate-payment and invoice-manipulation schemes.',
    documents: [
      'Both source invoices',
      'Purchase order and delivery/receiving confirmation',
      'Proof of payment for both invoices (bank or AP system record)',
      'Approval history for both submissions',
    ],
    questions: [
      'Was the vendor legitimately issuing two separate invoices, or is one a resubmission?',
      'Why does the invoice number or suffix differ between the two submissions?',
      'Did the same person approve both payments?',
    ],
    verification: [
      'Confirm whether both payments actually cleared.',
      'Ask the vendor whether both invoices were legitimately issued.',
      'Determine whether a refund or credit was received for the duplicate.',
    ],
  },

  splitting: {
    label: 'Threshold splitting',
    whyReview:
      'Multiple invoices from the same vendor cluster just below an approval threshold, which is a statistically improbable pattern consistent with deliberately dividing a purchase to avoid a higher level of approval.',
    documents: [
      'Purchase order',
      'The full set of invoices in the cluster',
      'Approval policy for the relevant threshold',
      'Related correspondence between vendor and approver',
    ],
    questions: [
      'Do these transactions relate to the same purchase or project?',
      'Who submitted and who approved each payment?',
      'Why was the transaction divided into multiple invoices instead of one?',
    ],
    verification: [
      'Review transactions occurring near the approval threshold across the full dataset, not just this vendor.',
      'Confirm whether the same approver authorized all invoices in the cluster.',
      'Determine whether a single, consolidated invoice would have required a different approval level.',
    ],
  },

  timing: {
    label: 'Weekend/holiday approval',
    whyReview:
      'These invoices were approved outside standard business hours (a weekend or federal holiday), which is consistent with approvals processed while normal oversight is reduced.',
    documents: [
      'Approval timestamps from the AP system',
      'Access or login logs for the approver, if available',
      'Any after-hours or emergency-approval authorization on file',
    ],
    questions: [
      'Was emergency or after-hours approval authorized for this transaction?',
      'Was the approver in the office, or was approval granted remotely?',
      'Is off-hours approval a routine pattern for this approver, or unusual?',
    ],
    verification: [
      'Verify the approval timestamps against the AP system record.',
      "Review access logs if available to confirm the approver's location/session.",
      'Interview the approver if the timing is unusual for their normal work pattern.',
    ],
  },

  shell: {
    label: 'Vendor / shell-company risk',
    whyReview:
      'This vendor exhibits multiple indicators associated with fictitious or shell vendors — such as a PO Box address, a missing tax ID, or a large volume of business concentrated shortly after onboarding — which together warrant independent verification that the vendor is a legitimate, operating business.',
    documents: [
      'W-9 or W-8 on file',
      'Incorporation / business registration documents',
      'Vendor onboarding records',
      'Address, EIN/tax ID, and banking instructions on file',
      'Beneficial ownership information, if available',
    ],
    questions: [
      'Who created and who approved this vendor in the system?',
      'Does the vendor address, phone number, or bank account match any employee or other vendor?',
      'What business need justified onboarding this vendor?',
    ],
    verification: [
      'Verify the business exists using independent public records.',
      'Compare vendor address, phone, bank account, and ownership details against employees and other vendors for overlap.',
      'Review who created and approved the vendor record for any conflict of interest.',
    ],
  },

  benford: {
    label: "Benford's Law deviation",
    whyReview:
      "This vendor's leading-digit distribution deviates from what Benford's Law predicts for naturally occurring financial data. A statistical deviation is a starting point for review, not evidence of fabrication on its own.",
    documents: [
      'Source documents (quotes, contracts, invoices) for the largest transactions from this vendor',
      'A listing of all transactions contributing to the deviation',
    ],
    questions: [
      'Which specific transactions contribute most strongly to the deviation?',
      'Is there a legitimate business reason for round numbers or repeated amounts (e.g. fixed monthly fees, contract minimums)?',
      'Is this transaction population appropriate for Benford analysis (sufficient volume, naturally varying amounts)?',
    ],
    verification: [
      'Do not treat the statistical anomaly as proof of fraud.',
      'Identify and review source documents for the transactions contributing most strongly to the deviation.',
      'Compare the result against expected business patterns for this vendor and transaction type.',
      'Determine whether the dataset size and composition are appropriate for Benford analysis before drawing any conclusion.',
    ],
  },
};

// Fallback for any finding type without a dedicated entry above. Deliberately
// generic — it does not invent type-specific recommendations.
export const DEFAULT_GUIDANCE = {
  label: 'Other Investigation Indicator',
  whyReview:
    'This finding was flagged by an automated check that does not yet have tailored guidance in this version of ForensAI. It should still be reviewed on its own facts before any conclusion is drawn.',
  documents: [
    'Source documents and correspondence related to the flagged transactions',
    'Any policy or approval documentation relevant to this finding',
  ],
  questions: [
    'What is the business explanation for this pattern?',
    'Who was involved in creating, approving, or processing these transactions?',
  ],
  verification: [
    'Confirm the underlying facts directly against the relevant records.',
    'Determine whether independent corroboration is available.',
  ],
};

export function getGuidanceForType(type) {
  return INVESTIGATION_GUIDANCE[type] || DEFAULT_GUIDANCE;
}
