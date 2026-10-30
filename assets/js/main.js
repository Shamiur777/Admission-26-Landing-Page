import { OFFER } from './config.js';
import { COURSE_CATEGORIES, COURSES, BOOK_CATEGORIES, BOOKS, LIVE_CHANNELS, FEATURED } from './catalog.js';
import { initTracking, initClickTracking, track } from './tracking.js';
import { bindOffer } from './bind.js';
import { renderChips, renderCourses, renderBooks, renderFan, renderLive } from './render.js';
import { initShop, landingTab } from './shop.js';
import { initCountdown } from './countdown.js';
import { initCoupon } from './coupon.js';
import { initStickyBar } from './stickybar.js';

const $ = (selector) => document.querySelector(selector);
const EAGER_IMAGES = 2;

/** Items of `list` whose ids are named in `ids`, in the order of `ids`. */
function pick(list, ids) {
  return ids.map((id) => list.find((item) => item.id === id)).filter(Boolean);
}

function start() {
  initTracking();
  // Binding runs first: if the offer is over it sets html.offer-ended before cards render.
  bindOffer(Date.now());
  initCountdown($('#countdown'), OFFER, () => bindOffer(Date.now()));

  // Only the first images of the tab the visitor lands on load eagerly.
  const initial = landingTab();
  renderChips($('#course-chips'), $('#tpl-chip'), COURSE_CATEGORIES);
  renderCourses($('#course-grid'), $('#tpl-course'), COURSES, COURSE_CATEGORIES, initial === 'courses' ? EAGER_IMAGES : 0);
  renderChips($('#book-chips'), $('#tpl-chip'), BOOK_CATEGORIES);
  renderBooks($('#book-grid'), $('#tpl-book'), BOOKS, initial === 'books' ? EAGER_IMAGES : 0);
  renderFan($('[data-fan="courses"]'), $('#tpl-fan'), pick(COURSES, FEATURED.courses), 'courses');
  renderFan($('[data-fan="books"]'), $('#tpl-fan'), pick(BOOKS, FEATURED.books), 'books');
  renderLive($('#live-list'), $('#tpl-live'), LIVE_CHANNELS);
  document.querySelectorAll('.grid, .live-grid').forEach((el) => el.setAttribute('data-ready', ''));

  initShop({ shop: $('#shop'), offerBar: $('#offer-bar') });

  initCoupon({
    code: OFFER.couponCode,
    status: $('#copy-status'),
    toast: $('#copy-toast'),
    onCopy: () => track('couponCopy', {
      content_name: OFFER.couponCode,
      content_category: 'coupon',
      content_ids: [OFFER.couponCode],
    }),
  });
  initStickyBar({ bar: $('#sticky-bar'), hero: $('#hero'), shop: $('#shop'), footer: $('#site-footer') });
  initClickTracking();
}

start();
