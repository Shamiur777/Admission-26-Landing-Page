// Run: node --test tests/links.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLink } from '../assets/js/links.js';

const ok = (raw, search = '') => {
  const r = buildLink(raw, search);
  assert.ok(r.href, `expected ${raw} to be allowed, got ${JSON.stringify(r)}`);
  return r.href;
};

test('allowed hosts pass', () => {
  for (const raw of [
    'https://edgecoursebd.com/courses/1',
    'https://www.edgecoursebd.com/courses/1',
    'https://www.rokomari.com/book/1',
    'https://www.facebook.com/page',
    'https://www.youtube.com/@chan',
  ]) assert.equal(ok(raw), raw);
});

test('rejected links return an error and never a href', () => {
  const bad = [
    ['http, not https', 'http://edgecoursebd.com/x'],
    ['javascript:', 'javascript:alert(1)'],
    ['data:', 'data:text/html,hi'],
    ['userinfo', 'https://user:pass@edgecoursebd.com/x'],
    ['username only', 'https://user@edgecoursebd.com/x'],
    ['port', 'https://edgecoursebd.com:8443/x'],
    ['look-alike suffix', 'https://edgecoursebd.com.evil.com/x'],
    ['look-alike prefix', 'https://evil-edgecoursebd.com/x'],
    ['userinfo trick', 'https://edgecoursebd.com@evil.com/'],
    ['unknown host', 'https://example.com/'],
    ['not a URL', 'not a url'],
    ['empty', ''],
  ];
  for (const [name, raw] of bad) {
    const r = buildLink(raw, '?utm_source=x');
    assert.ok(r.error, name);
    assert.equal(r.href, undefined, name);
  }
});

test('attribution params pass only to ATTRIBUTION_HOSTS', () => {
  const search = '?utm_source=fb&utm_medium=cpc&fbclid=abc&other=1';
  const own = new URL(ok('https://edgecoursebd.com/c', search));
  assert.equal(own.searchParams.get('utm_source'), 'fb');
  assert.equal(own.searchParams.get('utm_medium'), 'cpc');
  assert.equal(own.searchParams.get('fbclid'), 'abc');
  assert.equal(own.searchParams.has('other'), false);
  assert.equal(new URL(ok('https://www.edgecoursebd.com/c', search)).searchParams.get('utm_source'), 'fb');
  assert.equal(ok('https://www.rokomari.com/b', search), 'https://www.rokomari.com/b');
});

test('existing params on the link are kept, not overwritten', () => {
  const u = new URL(ok('https://edgecoursebd.com/c?utm_source=own', '?utm_source=fb'));
  assert.equal(u.searchParams.get('utm_source'), 'own');
});

test('malicious param values are encoded', () => {
  const evil = '"><script>alert(1)</script>&x=y#z';
  const href = ok('https://edgecoursebd.com/c', '?utm_source=' + encodeURIComponent(evil));
  assert.ok(!href.includes('<'));
  assert.ok(!href.includes('"'));
  const u = new URL(href);
  assert.equal(u.searchParams.get('utm_source'), evil);
  assert.equal(u.searchParams.has('x'), false);
  assert.equal(u.host, 'edgecoursebd.com');
});

test('param values are capped at 200 characters', () => {
  const u = new URL(ok('https://edgecoursebd.com/c', '?utm_campaign=' + 'a'.repeat(500)));
  assert.equal(u.searchParams.get('utm_campaign').length, 200);
});

test('missing or empty search is fine', () => {
  assert.equal(ok('https://edgecoursebd.com/c'), 'https://edgecoursebd.com/c');
  assert.equal(ok('https://edgecoursebd.com/c', undefined), 'https://edgecoursebd.com/c');
  assert.equal(ok('https://edgecoursebd.com/c', '?utm_source='), 'https://edgecoursebd.com/c');
});
