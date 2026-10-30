// Run: node --test tests/render.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { promptIndex } from '../assets/js/render.js';

test('promptIndex: no cards puts the prompt first', () => {
  assert.equal(promptIndex(0), 0);
});

test('promptIndex: fewer than six cards puts it after the last card', () => {
  assert.equal(promptIndex(1), 1);
  assert.equal(promptIndex(5), 5);
});

test('promptIndex: exactly six cards puts it after the sixth', () => {
  assert.equal(promptIndex(6), 6);
});

test('promptIndex: more than six cards puts it after the sixth', () => {
  assert.equal(promptIndex(7), 6);
  assert.equal(promptIndex(24), 6);
});

test('promptIndex: a custom position and a bad count', () => {
  assert.equal(promptIndex(10, 3), 3);
  assert.equal(promptIndex(-2), 0);
});
