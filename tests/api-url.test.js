import test from 'node:test';
import assert from 'node:assert/strict';
import { apiFetch, apiUrl } from '../src/utils/apiUrl.js';

test('keeps local API paths unchanged when no production origin is configured', () => {
  assert.equal(apiUrl('/api/health', ''), '/api/health');
});

test('joins configured API origins without duplicate slashes', () => {
  assert.equal(apiUrl('/api/health', 'https://example.onrender.com'), 'https://example.onrender.com/api/health');
  assert.equal(apiUrl('/api/health', 'https://example.onrender.com/'), 'https://example.onrender.com/api/health');
});

test('does not rewrite external URLs or non-API paths', () => {
  assert.equal(apiUrl('https://example.com/file.pdf', 'https://example.onrender.com'), 'https://example.com/file.pdf');
  assert.equal(apiUrl('/images/logo.png', 'https://example.onrender.com'), '/images/logo.png');
});

test('aborts API requests after the shared timeout', async () => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;
  AbortSignal.timeout = () => AbortSignal.abort(new DOMException('expired', 'TimeoutError'));
  globalThis.fetch = async (_url, options = {}) => {
    if (!options.signal) throw new Error('missing timeout signal');
    throw options.signal.reason;
  };
  try {
    await assert.rejects(apiFetch('/api/health'), /Server took too long/);
  } finally {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
  }
});

test('keeps caller cancellation when adding the shared timeout', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  controller.abort(new DOMException('cancelled by caller', 'AbortError'));
  globalThis.fetch = async (_url, options = {}) => { throw options.signal.reason; };
  try {
    await assert.rejects(apiFetch('/api/health', { signal: controller.signal }), /cancelled by caller/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
