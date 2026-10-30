// Regression tests for the 2026-10-31 audit pass. Each test name carries the finding id.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLink } from '../assets/js/links.js';
import { getOffer } from '../assets/js/offer.js';

const SHOP = 'https://edgecoursebd.com/courses/596';
const NOW = Date.parse('2026-11-01T00:00:00+06:00');
const base = { couponCode: 'REVENGE', endsAt: '2026-11-03T19:00:00+06:00', courses: { percent: 40 }, books: { percent: 20, upTo: true } };

test('F1: plain ad params are forwarded to our own shop', () => {
  const { href } = buildLink(SHOP, '?utm_source=fb&fbclid=IwAR0a-B_c.9~x');
  const params = new URL(href).searchParams;
  assert.equal(params.get('utm_source'), 'fb');
  assert.equal(params.get('fbclid'), 'IwAR0a-B_c.9~x');
});

test('F1: ad params with markup, quotes, spaces or over 200 chars are dropped', () => {
  for (const bad of ['<script>', '"x"', 'a b', 'javascript:alert(1)', 'x'.repeat(201)]) {
    const { href } = buildLink(SHOP, '?utm_source=' + encodeURIComponent(bad));
    assert.equal(new URL(href).searchParams.has('utm_source'), false, bad);
  }
});

test('F2: Apache allows only index.html and assets/', () => {
  const htaccess = readFileSync(new URL('../deploy/apache.htaccess', import.meta.url), 'utf8');
  assert.match(htaccess, /RewriteRule !\^\(index\\\.html\|assets\/\.\+\)\?\$ - \[F,L\]/);
});

test('SE1: a deadline without an explicit offset counts as ended', () => {
  assert.equal(getOffer({ ...base, endsAt: '2026-11-03T19:00:00' }, NOW).status, 'ended');
  assert.equal(getOffer(base, NOW).status, 'running');
  assert.equal(getOffer({ ...base, endsAt: '2026-11-03T13:00:00Z' }, NOW).status, 'running');
});

test('SE2: a percent outside 0-100 or not a number counts as ended', () => {
  for (const percent of [-5, 140, NaN, '40']) {
    assert.equal(getOffer({ ...base, courses: { percent } }, NOW).status, 'ended', String(percent));
    assert.equal(getOffer({ ...base, books: { percent, upTo: true } }, NOW).status, 'ended', String(percent));
  }
});
