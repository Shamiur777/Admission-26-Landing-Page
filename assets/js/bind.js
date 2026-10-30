import { CONTACT, OFFER } from './config.js';
import { COURSES, BOOKS } from './catalog.js';
import { formatTaka, toBanglaDigits } from './format.js';
import { getOffer } from './offer.js';

/**
 * The one table of [data-bind] text keys and [data-bind-label] aria-label keys, built from an Offer.
 * Pure. tests/contract.test.js reads it to check every key used in index.html is known here,
 * and every key here is used in index.html.
 * @param {ReturnType<typeof getOffer>} offer result of getOffer()
 * @returns {{ texts: Record<string, string>, ariaLabels: Record<string, string> }}
 */
export function bindTables(offer) {
  const { labels } = offer;
  const texts = {
    coupon: offer.couponCode,
    'course-percent': labels.coursePercent,
    'book-percent': labels.bookPercentFigure,
    'book-max': labels.bookUpTo,
    'book-discount': labels.bookPercent,
    deadline: labels.deadline,
    'course-count': toBanglaDigits(COURSES.length),
    'book-count': toBanglaDigits(BOOKS.length),
    'lowest-price': formatTaka(offer.lowestCoursePrice(COURSES)),
    phone: CONTACT.phone,
  };
  const ariaLabels = {
    'copy-coupon': labels.copyCouponAria,
    'coupon-field': labels.couponFieldAria,
  };
  return { texts, ariaLabels };
}

/**
 * The Offer module's only DOM adapter. Writes every offer-related [data-bind] text
 * and [data-bind-label] screen-reader label from getOffer(), and sets or removes
 * `offer-ended` on <html> to match the offer status. Call again to refresh
 * (main.js does when the countdown reaches zero). The HTML keeps defaults for when script is off.
 * @param {number} now epoch milliseconds (Date.now() in the page)
 */
export function bindOffer(now) {
  const offer = getOffer(OFFER, now);
  const { texts, ariaLabels } = bindTables(offer);

  document.documentElement.classList.toggle('offer-ended', offer.status === 'ended');

  document.querySelectorAll('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    if (Object.hasOwn(texts, key)) el.textContent = texts[key];
    if (key.startsWith('phone')) {
      const link = el.tagName === 'A' ? el : el.closest('a');
      if (link) link.setAttribute('href', CONTACT.phoneHref);
    }
  });

  document.querySelectorAll('[data-bind-label]').forEach((el) => {
    const key = el.dataset.bindLabel;
    if (Object.hasOwn(ariaLabels, key)) el.setAttribute('aria-label', ariaLabels[key]);
  });
}
