// Run: node --test tests/cards.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { courseImage, bookImage } from '../assets/js/cards.js';
import { COURSES, BOOKS } from '../assets/js/catalog.js';
import { tagLink, buildEvent } from '../assets/js/tracking.js';

const root = new URL('../', import.meta.url);

test('course image paths name the id at 400 and 800 wide', () => {
  const img = courseImage('x-1');
  assert.equal(img.src, 'assets/img/courses/x-1-400.webp');
  assert.equal(img.srcset, 'assets/img/courses/x-1-400.webp 400w, assets/img/courses/x-1-800.webp 800w');
});

test('book image path names the id', () => {
  assert.equal(bookImage('b-1'), 'assets/img/books/b-1.webp');
});

test('every catalog item has its image files on disk', () => {
  for (const c of COURSES) {
    assert.ok(existsSync(new URL(courseImage(c.id).src, root)), c.id);
    assert.ok(existsSync(new URL(`assets/img/courses/${c.id}-800.webp`, root)), c.id);
  }
  for (const b of BOOKS) assert.ok(existsSync(new URL(bookImage(b.id), root)), b.id);
});

test('tagLink writes the data-track contract the click listener reads', () => {
  const link = { dataset: {} };
  const info = { id: 'b1', name: 'Book', category: 'gst' };
  tagLink(link, 'bookClick', info);
  assert.deepEqual(link.dataset, { track: 'bookClick', trackId: 'b1', trackName: 'Book', trackCategory: 'gst' });
  const e = buildEvent('bookClick', info, { bookClick: 'InitiateCheckout' });
  assert.deepEqual(e.data, { content_ids: ['b1'], content_name: 'Book', content_category: 'gst', content_type: 'product' });
});
