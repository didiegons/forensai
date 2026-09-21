const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';
// A 400-600 word report is ~800-1000 tokens of output; 2048 gives
// comfortable headroom (including markdown formatting overhead) so a
// normal report never gets cut off mid-sentence.
const MAX_TOKENS = 2048;

/**
 * The only function in this codebase allowed to talk to Anthropic.
 * The API key never leaves the server — it is read from process.env
 * (populated from backend/.env) and never included in any response.
 *
 * Returns { text, truncated }. `truncated` is true when Anthropic's
 * `stop_reason` is "max_tokens" — i.e. the model was still writing when
 * it hit the output limit — so callers can refuse to show a report that
 * ends mid-sentence rather than silently returning a partial one.
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

  return { text: data.content[0].text, truncated: data.stop_reason === 'max_tokens' };
}
