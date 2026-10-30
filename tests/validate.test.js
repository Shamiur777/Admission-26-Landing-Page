// Run: node --test tests/validate.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../scripts/validate.mjs';

test('site passes the pre-deploy validator', async () => {
  const { errors } = await validate();
  assert.deepEqual(errors, []);
});
