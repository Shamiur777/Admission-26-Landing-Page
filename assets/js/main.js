import { OFFER } from './config.js';
import { COURSE_CATEGORIES, COURSES, BOOK_CATEGORIES, BOOKS, LIVE_CHANNELS } from './catalog.js';
import { initTracking, initClickTracking, track } from './tracking.js';
import { bindStaticText } from './bind.js';
import { renderChips, renderCourses, renderBooks, renderLive } from './render.js';
import { initFilters } from './filters.js';
import { initCountdown } from './countdown.js';
import { initCoupon } from './coupon.js';
import { initStickyBar } from './stickybar.js';

const $ = (selector) => document.querySelector(selector);

function start() {
  initTracking();
  bindStaticText();

  // The countdown runs first: if the offer is over it sets html.offer-ended before cards render.
  initCountdown($('#countdown'), OFFER.endsAt, () => {
    document.documentElement.classList.add('offer-ended');
  });

  renderChips($('#course-chips'), $('#tpl-chip'), COURSE_CATEGORIES);
  renderCourses($('#course-grid'), $('#tpl-course'), COURSES, COURSE_CATEGORIES);
  renderChips($('#book-chips'), $('#tpl-chip'), BOOK_CATEGORIES);
  renderBooks($('#book-grid'), $('#tpl-book'), BOOKS);
  renderLive($('#live-list'), $('#tpl-live'), LIVE_CHANNELS);
  document.querySelectorAll('.grid, .live-list').forEach((el) => el.setAttribute('data-ready', ''));

  initFilters({ chips: $('#course-chips'), items: $('#course-grid'), status: $('#course-status'), noun: 'কোর্স' });
  initFilters({ chips: $('#book-chips'), items: $('#book-grid'), status: $('#book-status'), noun: 'বই' });

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
  initStickyBar({ bar: $('#sticky-bar'), hero: $('#hero'), footer: $('#site-footer') });
  initClickTracking();
}

start();
