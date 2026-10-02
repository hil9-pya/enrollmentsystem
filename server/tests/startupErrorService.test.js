import test from 'node:test';
import assert from 'node:assert/strict';
import { startupErrorMessages } from '../services/startupErrorService.js';

test('reports port conflicts as port conflicts', () => {
  const error = Object.assign(new Error('listen failed'), { code: 'EADDRINUSE' });
  assert.deepEqual(startupErrorMessages(error, 5000), [
    'FATAL ERROR: Port 5000 is already in use.',
    'Stop the process using that port, or change PORT.',
  ]);
});

test('reports non-database startup failures accurately', () => {
  assert.deepEqual(startupErrorMessages(new Error('Demo applicant collision'), 5000), [
    'Server startup failed: Demo applicant collision',
    'Review service configuration and startup logs.',
  ]);
});

test('redacts credentials embedded in MongoDB startup errors', () => {
  const messages = startupErrorMessages(new Error('connect mongodb+srv://dbuser:secret@cluster.example/test failed'), 5000).join(' ');
  assert.doesNotMatch(messages, /dbuser|secret/);
  assert.match(messages, /mongodb\+srv:\/\/\[redacted\]@cluster\.example/);
});

test('does not expose credentials from malformed MongoDB parser errors', () => {
  const error = Object.assign(new Error('Unable to parse dbuser:secret with URL'), { startupStage: 'database' });
  const messages = startupErrorMessages(error, 5000).join(' ');
  assert.doesNotMatch(messages, /dbuser|secret/);
  assert.match(messages, /database configuration is invalid/i);
});

test('does not expose credentials containing whitespace or multiple at signs', () => {
  const error = Object.assign(new Error('connect mongodb://dbuser:secret word@@cluster.example/test failed'), { startupStage: 'database' });
  const messages = startupErrorMessages(error, 5000).join(' ');
  assert.doesNotMatch(messages, /dbuser|secret|word/);
  assert.match(messages, /database configuration is invalid/i);
});
