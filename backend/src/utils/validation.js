export function validateTransactions(body) {
  if (!body || !Array.isArray(body.transactions)) {
    return { valid: false, error: 'Request body must include a "transactions" array.' };
  }
  if (body.transactions.length === 0) {
    return { valid: false, error: 'The "transactions" array must not be empty.' };
  }

  for (const [index, txn] of body.transactions.entries()) {
    if (!txn || typeof txn.vendor !== 'string' || !txn.vendor.trim()) {
      return { valid: false, error: `Transaction at index ${index} is missing a valid "vendor".` };
    }
    if (typeof txn.amount !== 'number' || !Number.isFinite(txn.amount) || txn.amount <= 0) {
      return { valid: false, error: `Transaction at index ${index} is missing a valid positive "amount".` };
    }
    if (typeof txn.date !== 'string' || !txn.date.trim()) {
      return { valid: false, error: `Transaction at index ${index} is missing a valid "date".` };
    }
  }

  return { valid: true };
}

export function validateReportRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required.' };
  }

  const { stats, findings, vendorRisk } = body;

  if (!stats || typeof stats !== 'object') {
    return { valid: false, error: 'Request body must include a "stats" object.' };
  }
  if (!Array.isArray(findings)) {
    return { valid: false, error: 'Request body must include a "findings" array.' };
  }
  if (vendorRisk !== undefined && (typeof vendorRisk !== 'object' || vendorRisk === null || Array.isArray(vendorRisk))) {
    return { valid: false, error: '"vendorRisk", if provided, must be an object.' };
  }

  const requiredStatsFields = ['totalTransactions', 'totalValue', 'uniqueVendors'];
  for (const field of requiredStatsFields) {
    if (typeof stats[field] !== 'number') {
      return { valid: false, error: `"stats.${field}" must be a number.` };
    }
  }

  return { valid: true };
}
