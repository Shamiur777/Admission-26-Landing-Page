import { CONTACT, OFFER } from './config.js';
import { COURSES, BOOKS } from './catalog.js';
import { discounted, formatTaka, toBanglaDigits } from './format.js';

/**
 * Fills [data-bind] elements in the static HTML from config.js / catalog.js,
 * so numbers are written once. The HTML keeps sensible defaults for no-JS.
 */
export function bindStaticText() {
  const lowestCoursePrice = Math.min(...COURSES.map((c) => discounted(c.price, OFFER.courseDiscountPercent)));
  const values = {
    coupon: OFFER.couponCode,
    'course-percent': toBanglaDigits(OFFER.courseDiscountPercent) + '%',
    'book-percent': toBanglaDigits(OFFER.bookDiscountPercent) + '%',
    'course-count': toBanglaDigits(COURSES.length),
    'book-count': toBanglaDigits(BOOKS.length),
    'lowest-price': formatTaka(lowestCoursePrice),
    phone: CONTACT.phone,
    'phone-bn': toBanglaDigits(CONTACT.phone),
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
