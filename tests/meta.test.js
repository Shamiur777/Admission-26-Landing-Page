import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OFFER } from '../assets/js/config.js';
import { getOffer } from '../assets/js/offer.js';

// The hand-typed text in index.html <head> cannot read config.js. This fails when it drifts.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const { couponCode, labels } = getOffer(OFFER, Date.parse(OFFER.endsAt) - 1);
const expected = [couponCode, labels.coursePercent, labels.bookPercent];

function metaContent(attr, name) {
  const tag = html.match(new RegExp(`<meta[^>]*${attr}="${name}"[^>]*>`));
  assert.ok(tag, `<meta ${attr}="${name}"> not found in index.html`);
  const content = tag[0].match(/content="([^"]*)"/);
  assert.ok(content, `<meta ${attr}="${name}"> has no content`);
  return content[1];
}

const spots = {
  '<title>': () => (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '',
  'meta description': () => metaContent('name', 'description'),
  'og:description': () => metaContent('property', 'og:description'),
  'twitter:description': () => metaContent('name', 'twitter:description'),
};

for (const [label, read] of Object.entries(spots)) {
  test(`${label} mentions the coupon code and both discounts`, () => {
    const text = read();
    for (const part of expected) {
      assert.ok(text.includes(part), `${label} is missing "${part}": ${text}`);
    }
  });
}
