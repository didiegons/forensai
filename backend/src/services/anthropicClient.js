const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';
// A 400-600 word report is ~800-1000 tokens of output; 2048 gives
// comfortable headroom (including markdown formatting overhead) so a
// normal report never gets cut off mid-sentence.
const MAX_TOKENS = 2048;

// Anthropic's `content` array can include non-text blocks (e.g. `thinking`)
// ahead of the actual answer — the text block is not guaranteed to be at
// index 0. This extracts every `text`-type block, in order, and joins
// them. `thinking` (or any other) block content is never read, returned,
// or logged.
function extractResponseText(data) {
  if (!Array.isArray(data?.content)) return '';
  return data.content
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();
}

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
  const text = extractResponseText(data);

  if (!response.ok || !data || data.error || !text) {
    // Diagnostic detail for server-side logging only — the route handler
    // logs these fields and then returns a generic message to the client.
    // Never includes the API key, Authorization header, prompt, or any
    // block content (including `thinking` blocks).
    const err = new Error('Anthropic API request failed.');
    err.code = 'UPSTREAM_ERROR';
    err.status = response.status;
    err.model = MODEL;
    err.upstreamError = data?.error ? { type: data.error.type, message: data.error.message } : null;
    throw err;
  }

  return { text, truncated: data.stop_reason === 'max_tokens' };
}
