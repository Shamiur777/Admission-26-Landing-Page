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
      copyCouponAria: `কুপন ${couponCode} কপি করো`,
      couponFieldAria: `কুপন কোড ${couponCode}`,
    },
  };
}
