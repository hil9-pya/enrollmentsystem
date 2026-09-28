import test from 'node:test';
import assert from 'node:assert/strict';
import { apiUrl } from '../src/utils/apiUrl.js';

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
