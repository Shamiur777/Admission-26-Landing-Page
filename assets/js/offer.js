import { toBanglaDigits } from './format.js';

/**
 * The Offer module: the whole coupon campaign, answered from one place.
 * Callers hand over the OFFER config and the current time, and get back the
 * status, the time left, coupon prices and every piece of offer text.
 * Nothing here reads the clock or touches the DOM, so tests pass any `now`.
 */

/** @typedef {{ percent: number, upTo?: boolean }} OfferRate */
/** @typedef {{ couponCode: string, endsAt: string, courses: OfferRate, books: OfferRate }} OfferConfig */

/**
 * "৪০%" for a percentage.
 * @param {number} percent
 * @returns {string}
 */
function percentLabel(percent) {
  return toBanglaDigits(percent) + '%';
}

/**
 * Splits a number of milliseconds into whole days, hours, minutes and seconds.
 * @param {number} ms
 */
function splitTime(ms) {
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    totalMs: ms,
  };
}

/**
 * Coupon price: the regular price less the course percent, rounded to whole taka.
 * The one place this rule lives.
 * @param {number} price regular price in taka
 * @param {number} percent
 * @returns {number}
 */
function couponPrice(price, percent) {
  return Math.round(price * (1 - percent / 100));
}

const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const DHAKA_OFFSET_MS = 6 * 3600 * 1000;

/**
 * Part of the day for an hour on the 24-hour clock (Bangladesh usage):
 * ভোর 4 to 6, সকাল 6 to 12, দুপুর 12 to 15, বিকেল 15 to 18, সন্ধ্যা 18 to 20, রাত 20 to 4.
 * @param {number} hour 0 to 23
 * @returns {string}
 */
function dayPeriod(hour) {
  if (hour >= 4 && hour < 6) return 'ভোর';
  if (hour >= 6 && hour < 12) return 'সকাল';
  if (hour >= 12 && hour < 15) return 'দুপুর';
  if (hour >= 15 && hour < 18) return 'বিকেল';
  if (hour >= 18 && hour < 20) return 'সন্ধ্যা';
  return 'রাত';
}

/**
 * The deadline in words, in Bangladesh time (fixed UTC+6), for example "৩ নভেম্বর, সন্ধ্যা ৭টা".
 * 12-hour clock; minutes appear only when they are not zero ("রাত ১২টা ৩০ মিনিট").
 * Pure: no clock, no locale, so it reads the same on every phone.
 * @param {string} endsAt ISO date with an explicit offset
 * @returns {string} empty when the date cannot be read
 */
export function deadlineLabel(endsAt) {
  const ms = Date.parse(endsAt);
  if (Number.isNaN(ms)) return '';
  const dhaka = new Date(ms + DHAKA_OFFSET_MS);
  const hour = dhaka.getUTCHours();
  const minute = dhaka.getUTCMinutes();
  const clock = toBanglaDigits(hour % 12 || 12) + 'টা' + (minute ? ' ' + toBanglaDigits(minute) + ' মিনিট' : '');
  return `${toBanglaDigits(dhaka.getUTCDate())} ${MONTHS[dhaka.getUTCMonth()]}, ${dayPeriod(hour)} ${clock}`;
}

/** An offset is required: without one, Date.parse uses the visitor's own timezone. */
const EXPLICIT_OFFSET = /(Z|[+-]\d\d:\d\d)$/;

/**
 * @param {number} percent
 * @returns {boolean}
 */
function isPercent(percent) {
  return Number.isFinite(percent) && percent >= 0 && percent <= 100;
}

/**
 * @param {OfferConfig} offerConfig
 * @returns {boolean}
 */
function isWellFormed({ endsAt, courses, books }) {
  return typeof endsAt === 'string' && EXPLICIT_OFFSET.test(endsAt)
    && isPercent(courses?.percent) && isPercent(books?.percent);
}

/**
 * Describes the offer at a moment in time.
 *
 * Interface notes:
 * - Pure. `now` is epoch milliseconds, supplied by the caller (Date.now() in the page).
 * - `status` is 'running' while now is before `endsAt`, and 'ended' at `endsAt` and after.
 * - A malformed offer counts as 'ended', so a typo can never show a wrong discount: an `endsAt`
 *   that does not parse or has no explicit offset (+06:00 or Z), or a percent outside 0–100.
 * - `timeLeft` is all zeros once ended.
 * - Text for the page lives in `labels`; the "offer ended" copy stays in index.html.
 *
 * @param {OfferConfig} offerConfig OFFER from config.js
 * @param {number} now epoch milliseconds
 * @returns {{
 *   status: 'running' | 'ended',
 *   timeLeft: { days: number, hours: number, minutes: number, seconds: number, totalMs: number },
 *   couponCode: string,
 *   coursePrice: (price: number) => { regular: number, coupon: number },
 *   lowestCoursePrice: (courses: { price: number }[]) => number,
 *   labels: Record<string, string>,
 * }}
 */
export function getOffer(offerConfig, now) {
  const { couponCode, endsAt, courses, books } = offerConfig;
  const end = Date.parse(endsAt);
  const msLeft = end - now;
  const running = isWellFormed(offerConfig) && !Number.isNaN(end) && msLeft > 0;

  const coursePrice = (price) => ({ regular: price, coupon: couponPrice(price, courses.percent) });
  const bookPercent = percentLabel(books.percent);
  const bookUpTo = books.upTo ? 'পর্যন্ত' : '';
  const bookPercentFull = books.upTo ? `${bookPercent} ${bookUpTo}` : bookPercent;

  return {
    status: running ? 'running' : 'ended',
    timeLeft: splitTime(running ? msLeft : 0),
    couponCode,
    coursePrice,
    lowestCoursePrice: (list) => Math.min(...list.map((c) => coursePrice(c.price).coupon)),
    labels: {
      coursePercent: percentLabel(courses.percent),
      /** "২০% পর্যন্ত" when the books rate is a maximum, else "২০%". */
      bookPercent: bookPercentFull,
      /** The number alone, "২০%", and the "পর্যন্ত" word alone (empty when flat). */
      bookPercentFigure: bookPercent,
      bookUpTo,
      bookTag: `${couponCode} কুপনে ${bookPercentFull} ছাড়`,
      /** "৩ নভেম্বর, সন্ধ্যা ৭টা": when the Offer stops, in words, Bangladesh time. */
      deadline: deadlineLabel(endsAt),
      copyCouponAria: `কুপন ${couponCode} কপি করো`,
      couponFieldAria: `কুপন কোড ${couponCode}`,
    },
  };
}
