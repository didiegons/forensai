import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateInvestigationReport } from './anthropicClient.js';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_API_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env.ANTHROPIC_API_KEY = ORIGINAL_API_KEY;
});

function fakeResponse({ ok = true, status = 200, body }) {
  return { ok, status, json: async () => body };
}

test('text-only response: extracts the text block', async () => {
  globalThis.fetch = async () =>
    fakeResponse({
      body: { type: 'message', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hello world' }] },
    });

  const result = await generateInvestigationReport('prompt');
  assert.equal(result.text, 'Hello world');
  assert.equal(result.truncated, false);
});

test('thinking + text response: text block is found even when not at index 0, thinking content is never returned', async () => {
  globalThis.fetch = async () =>
    fakeResponse({
      body: {
        type: 'message',
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', thinking: 'SECRET internal reasoning that must never surface' },
          { type: 'text', text: 'Final answer.' },
        ],
      },
    });

  const result = await generateInvestigationReport('prompt');
  assert.equal(result.text, 'Final answer.');
  assert.ok(!result.text.includes('SECRET'));
});

test('thinking + multiple text blocks: joined in order, thinking excluded', async () => {
  globalThis.fetch = async () =>
    fakeResponse({
      body: {
        type: 'message',
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', thinking: 'internal reasoning' },
          { type: 'text', text: 'Part one.' },
          { type: 'text', text: ' Part two.' },
        ],
      },
    });

  const result = await generateInvestigationReport('prompt');
  assert.equal(result.text, 'Part one. Part two.');
});

test('successful HTTP 200 with no text block is treated as a failure, not a crash', async () => {
  globalThis.fetch = async () =>
    fakeResponse({
      body: {
        type: 'message',
        stop_reason: 'end_turn',
        content: [{ type: 'thinking', thinking: 'reasoning only, no answer' }],
      },
    });

  await assert.rejects(
    () => generateInvestigationReport('prompt'),
    (err) => {
      assert.equal(err.code, 'UPSTREAM_ERROR');
      assert.equal(err.status, 200);
      assert.equal(err.upstreamError, null);
      assert.equal(err.model, 'claude-sonnet-5');
      return true;
    }
  );
});

test('Anthropic non-2xx error: status/upstream error surfaced on the thrown error, not swallowed', async () => {
  globalThis.fetch = async () =>
    fakeResponse({
      ok: false,
      status: 400,
      body: { type: 'error', error: { type: 'invalid_request_error', message: 'model: claude-sonnet-5 not found' } },
    });

  await assert.rejects(
    () => generateInvestigationReport('prompt'),
    (err) => {
      assert.equal(err.code, 'UPSTREAM_ERROR');
      assert.equal(err.status, 400);
      assert.deepEqual(err.upstreamError, { type: 'invalid_request_error', message: 'model: claude-sonnet-5 not found' });
      return true;
    }
  );
});

test('truncated is true when stop_reason is max_tokens, even with a valid text block', async () => {
  globalThis.fetch = async () =>
    fakeResponse({
      body: { type: 'message', stop_reason: 'max_tokens', content: [{ type: 'text', text: 'Cut off mid' }] },
    });

  const result = await generateInvestigationReport('prompt');
  assert.equal(result.truncated, true);
  assert.equal(result.text, 'Cut off mid');
});

test('missing API key throws before any network call', async () => {
  process.env.ANTHROPIC_API_KEY = '';
  globalThis.fetch = async () => {
    throw new Error('fetch should not have been called');
  };

  await assert.rejects(
    () => generateInvestigationReport('prompt'),
    (err) => {
      assert.equal(err.code, 'MISSING_API_KEY');
      return true;
    }
  );
});
