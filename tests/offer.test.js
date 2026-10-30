import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOffer, deadlineLabel } from '../assets/js/offer.js';
import { OFFER } from '../assets/js/config.js';
import { COURSES } from '../assets/js/catalog.js';

const END = Date.parse(OFFER.endsAt);
const config = { couponCode: 'TESTCODE', endsAt: OFFER.endsAt, courses: { percent: 40 }, books: { percent: 20, upTo: true } };

test('running 1 ms before endsAt, ended at endsAt and 1 ms after', () => {
  assert.equal(getOffer(config, END - 1).status, 'running');
  assert.equal(getOffer(config, END).status, 'ended');
  assert.equal(getOffer(config, END + 1).status, 'ended');
});

test('timeLeft splits into days, hours, minutes, seconds', () => {
  const ms = ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000 + 678;
  const { timeLeft } = getOffer(config, END - ms);
  assert.deepEqual(timeLeft, { days: 2, hours: 3, minutes: 4, seconds: 5, totalMs: ms });
});

test('timeLeft is all zeros once ended', () => {
  assert.deepEqual(getOffer(config, END + 5000).timeLeft, { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
});

test('an invalid endsAt counts as ended, so no false discount shows', () => {
  for (const endsAt of ['', 'soon', undefined]) {
    const offer = getOffer({ ...config, endsAt }, 0);
    assert.equal(offer.status, 'ended');
    assert.equal(offer.timeLeft.totalMs, 0);
  }
});

test('getOffer does not read the clock: same inputs, same answer', () => {
  const a = getOffer(config, END - 1000);
  const b = getOffer(config, END - 1000);
  assert.deepEqual([a.status, a.timeLeft, a.labels], [b.status, b.timeLeft, b.labels]);
});

test('coupon price for every catalog course is whole taka, below regular, and the right 60%', () => {
  const offer = getOffer(config, END - 1);
  for (const { id, price } of COURSES) {
    const { regular, coupon } = offer.coursePrice(price);
    assert.equal(regular, price, id);
    assert.ok(Number.isInteger(coupon), id);
    assert.ok(coupon < regular, id);
    assert.ok(Math.abs(coupon - price * 0.6) <= 0.5, `${id}: ${coupon} vs ${price * 0.6}`);
  }
});

test('coupon price rounds to the nearest taka', () => {
  const at = (percent, price) => getOffer({ ...config, courses: { percent } }, END - 1).coursePrice(price).coupon;
  assert.equal(at(40, 1199), 719); // 719.4
  assert.equal(at(40, 1201), 721); // 720.6
  assert.equal(at(15, 1010), 859); // 858.5
  assert.equal(at(0, 999), 999);
});

test('lowestCoursePrice is the smallest coupon price', () => {
  const offer = getOffer(config, END - 1);
  const expected = Math.min(...COURSES.map((c) => offer.coursePrice(c.price).coupon));
  assert.equal(offer.lowestCoursePrice(COURSES), expected);
});

test('labels: percents in Bangla, "পর্যন্ত" only when upTo is true', () => {
  const up = getOffer(config, END - 1).labels;
  assert.equal(up.coursePercent, '৪০%');
  assert.equal(up.bookPercent, '২০% পর্যন্ত');
  assert.equal(up.bookPercentFigure, '২০%');
  assert.equal(up.bookUpTo, 'পর্যন্ত');

  const flat = getOffer({ ...config, books: { percent: 20, upTo: false } }, END - 1).labels;
  assert.equal(flat.bookPercent, '২০%');
  assert.equal(flat.bookUpTo, '');
  assert.equal(flat.bookTag, 'TESTCODE কুপনে ২০% ছাড়');
});

test('labels carry the coupon code', () => {
  const { couponCode, labels } = getOffer(config, END - 1);
  assert.equal(couponCode, 'TESTCODE');
  assert.equal(labels.bookTag, 'TESTCODE কুপনে ২০% পর্যন্ত ছাড়');
  assert.ok(labels.copyCouponAria.includes('TESTCODE'));
  assert.ok(labels.couponFieldAria.includes('TESTCODE'));
});

test('the real OFFER config produces the expected page text', () => {
  const { labels } = getOffer(OFFER, END - 1);
  assert.equal(labels.coursePercent, '৪০%');
  assert.equal(labels.bookPercent, '২০% পর্যন্ত');
});

test('deadline label for the current config reads in Bangla words, Dhaka time', () => {
  assert.equal(getOffer(config, END - 1).labels.deadline, deadlineLabel(OFFER.endsAt));
  assert.equal(deadlineLabel('2026-11-03T19:00:00+06:00'), '৩ নভেম্বর, সন্ধ্যা ৭টা');
});

test('deadline label: midnight is রাত ১২টা, minutes only when not zero', () => {
  assert.equal(deadlineLabel('2026-11-03T00:30:00+06:00'), '৩ নভেম্বর, রাত ১২টা ৩০ মিনিট');
  assert.equal(deadlineLabel('2026-11-03T00:00:00+06:00'), '৩ নভেম্বর, রাত ১২টা');
});

test('deadline label: a Z-suffixed time is converted to Dhaka time', () => {
  assert.equal(deadlineLabel('2026-11-03T13:00:00Z'), '৩ নভেম্বর, সন্ধ্যা ৭টা');
  assert.equal(deadlineLabel('2026-12-31T20:00:00Z'), '১ জানুয়ারি, রাত ২টা');
});

test('deadline label: day periods change at 4, 6, 12, 15, 18 and 20 o\'clock', () => {
  const at = (h) => deadlineLabel(`2026-11-03T${String(h).padStart(2, '0')}:00:00+06:00`).split(', ')[1];
  assert.equal(at(3), 'রাত ৩টা');
  assert.equal(at(4), 'ভোর ৪টা');
  assert.equal(at(6), 'সকাল ৬টা');
  assert.equal(at(12), 'দুপুর ১২টা');
  assert.equal(at(15), 'বিকেল ৩টা');
  assert.equal(at(18), 'সন্ধ্যা ৬টা');
  assert.equal(at(20), 'রাত ৮টা');
});

test('deadline label is empty for an unreadable date', () => {
  assert.equal(deadlineLabel('soon'), '');
  assert.equal(getOffer({ ...config, endsAt: 'soon' }, 0).labels.deadline, '');
});

test('labels: coupon copy messages carry the code', () => {
  const { labels } = getOffer(config, END - 1);
  assert.equal(labels.copied, 'কোড কপি হয়েছে, চেকআউটে পেস্ট করো');
  assert.equal(labels.copyFailed, 'কোডটি লিখে নাও: TESTCODE');
  assert.equal(labels.copiedButton, 'কপি হয়েছে');
});
