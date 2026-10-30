import { CONTACT, OFFER } from './config.js';
import { COURSES, BOOKS } from './catalog.js';
import { bookDiscountText, discounted, formatTaka, percentText, toBanglaDigits } from './format.js';

/**
 * Fills [data-bind] elements in the static HTML from config.js / catalog.js,
 * so every number is written once. The HTML keeps defaults for when script is off.
 */
export function bindStaticText() {
  const lowestCoursePrice = Math.min(...COURSES.map((c) => discounted(c.price, OFFER.courseDiscountPercent)));
  const values = {
    coupon: OFFER.couponCode,
    'course-percent': percentText(OFFER.courseDiscountPercent),
    'book-percent': percentText(OFFER.bookDiscountPercent),
    'book-max': OFFER.bookDiscountIsMax ? 'পর্যন্ত' : '',
    'book-discount': bookDiscountText(OFFER),
    'course-count': toBanglaDigits(COURSES.length),
    'book-count': toBanglaDigits(BOOKS.length),
    'lowest-price': formatTaka(lowestCoursePrice),
    phone: CONTACT.phone,
  };

  document.querySelectorAll('[data-bind]').forEach((el) => {
    const key = el.dataset.bind;
    if (key in values) el.textContent = values[key];
    if (key.startsWith('phone')) {
      const link = el.tagName === 'A' ? el : el.closest('a');
      if (link) link.setAttribute('href', CONTACT.phoneHref);
    }
  });
}
