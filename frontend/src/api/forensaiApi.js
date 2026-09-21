// All communication with our backend lives here. The frontend never
// talks to Anthropic directly and never handles an API key.
const BASE_URL = '/api';

async function postJSON(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed.`);
  }

  return data;
}

export function analyzeTransactions(transactions) {
  return postJSON('/analyze', { transactions });
}

export function generateReport({ stats, findings }) {
  return postJSON('/report', { stats, findings });
}
