import test from 'node:test';
import assert from 'node:assert/strict';
import { getApiRateLimitMax } from '../rateLimitConfig.js';

test('uses a higher global API limit for production demos', () => {
  assert.equal(getApiRateLimitMax('production'), 500);
  assert.equal(getApiRateLimitMax('development'), 2000);
});
