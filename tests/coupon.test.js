// Run: node --test tests/coupon.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFeedback } from '../assets/js/coupon.js';
import { getOffer } from '../assets/js/offer.js';
import { OFFER } from '../assets/js/config.js';

const { labels } = getOffer(OFFER, 0);

test('copied: success message, no toast, button shows the short label', () => {
  assert.deepEqual(copyFeedback({ copied: true, labels }), {
    message: labels.copied,
    openToast: false,
    buttonLabel: labels.copiedButton,
  });
});

test('not copied: the message holds the code, the toast opens, the button is left alone', () => {
  const result = copyFeedback({ copied: false, labels });
  assert.equal(result.message, labels.copyFailed);
  assert.ok(result.message.includes(OFFER.couponCode));
  assert.equal(result.openToast, true);
  assert.equal(result.buttonLabel, null);
});
