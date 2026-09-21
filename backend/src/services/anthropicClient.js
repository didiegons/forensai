const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1200;

/**
 * The only function in this codebase allowed to talk to Anthropic.
 * The API key never leaves the server — it is read from process.env
 * (populated from backend/.env) and never included in any response.
 */
export async function generateInvestigationReport(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const err = new Error('ANTHROPIC_API_KEY is not configured on the server.');
    err.code = 'MISSING_API_KEY';
    throw err;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.error || !data.content?.[0]?.text) {
    const err = new Error('Anthropic API request failed.');
    err.code = 'UPSTREAM_ERROR';
    throw err;
  }

  return data.content[0].text;
}
