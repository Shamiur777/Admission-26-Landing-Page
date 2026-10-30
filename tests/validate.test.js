// Run: node --test tests/validate.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, ALLOWED_FILES } from '../scripts/validate.mjs';

test('site passes the pre-deploy validator', async () => {
  const { errors } = await validate();
  assert.deepEqual(errors, []);
});

test('only the font licence is allowed past the extension list', () => {
  assert.deepEqual([...ALLOWED_FILES], ['assets/fonts/Kona-OFL.txt']);
});
