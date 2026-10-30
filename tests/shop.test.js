// Run: node --test tests/shop.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { TABS, resolveHash, nextTab, filterItems, formatStatus } from '../assets/js/shop.js';
import { COURSES, BOOKS, COURSE_CATEGORIES, BOOK_CATEGORIES } from '../assets/js/catalog.js';

test('resolveHash accepts known tabs', () => {
  assert.deepEqual(resolveHash('#courses'), { tab: 'courses' });
  assert.deepEqual(resolveHash('#books'), { tab: 'books' });
  assert.deepEqual(resolveHash('books'), { tab: 'books' });
});

test('resolveHash reads an optional category', () => {
  assert.deepEqual(resolveHash('#courses/varsity'), { tab: 'courses', category: 'varsity' });
  assert.deepEqual(resolveHash('#books/'), { tab: 'books' });
  assert.deepEqual(resolveHash('#books/<img>'), { tab: 'books' });
  assert.equal(resolveHash('#books/a/b'), null);
});

test('resolveHash rejects everything else', () => {
  for (const bad of ['', '#', '#shop', '#Courses', '#course', '#live', '#__proto__', '#constructor', '#toString', '#hasOwnProperty']) {
    assert.equal(resolveHash(bad), null, bad);
  }
  assert.equal(resolveHash('#' + 'a'.repeat(5000)), null);
  assert.equal(resolveHash('#courses/' + 'a'.repeat(5000)), null);
  assert.equal(resolveHash(undefined), null);
  assert.equal(resolveHash(null), null);
});

test('nextTab moves and wraps', () => {
  assert.equal(nextTab('courses', 'ArrowRight'), 'books');
  assert.equal(nextTab('books', 'ArrowRight'), 'courses');
  assert.equal(nextTab('courses', 'ArrowLeft'), 'books');
  assert.equal(nextTab('books', 'ArrowLeft'), 'courses');
  assert.equal(nextTab('books', 'Home'), TABS[0]);
  assert.equal(nextTab('courses', 'End'), TABS[TABS.length - 1]);
});

test('nextTab ignores other keys and unknown tabs', () => {
  assert.equal(nextTab('courses', 'Enter'), null);
  assert.equal(nextTab('nope', 'ArrowRight'), null);
  assert.equal(nextTab(undefined, 'Home'), null);
});

test('filterItems counts the real catalog', () => {
  const courses = COURSES.map(({ id, category }) => ({ id, category }));
  const books = BOOKS.map(({ id, category }) => ({ id, category }));
  assert.equal(filterItems(courses, 'all').count, COURSES.length);
  assert.equal(filterItems(books, 'all').count, BOOKS.length);
  for (const [items, cats] of [[courses, COURSE_CATEGORIES], [books, BOOK_CATEGORIES]]) {
    const total = cats.reduce((sum, c) => sum + filterItems(items, c.id).count, 0);
    assert.equal(total, items.length, 'categories partition the catalog');
    for (const c of cats) assert.ok(filterItems(items, c.id).count > 0, c.id + ' is not empty');
  }
  const { visibleIds, count } = filterItems(courses, COURSE_CATEGORIES[0].id);
  assert.equal(visibleIds.length, count);
  assert.ok(visibleIds.every((id) => COURSES.find((c) => c.id === id).category === COURSE_CATEGORIES[0].id));
  assert.deepEqual(filterItems(courses, 'no-such-category'), { visibleIds: [], count: 0 });
});

test('formatStatus writes Bangla digits', () => {
  assert.equal(formatStatus('{n}টি কোর্স দেখাচ্ছে', 12), '১২টি কোর্স দেখাচ্ছে');
  assert.equal(formatStatus('{n}টি বই দেখাচ্ছে', 0), '০টি বই দেখাচ্ছে');
});
