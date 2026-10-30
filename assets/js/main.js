import { OFFER } from './config.js';
import { COURSE_CATEGORIES, COURSES, BOOK_CATEGORIES, BOOKS, LIVE_CHANNELS, FEATURED } from './catalog.js';
import { initTracking, initClickTracking, track } from './tracking.js';
import { bindStaticText } from './bind.js';
import { renderChips, renderCourses, renderBooks, renderFan, renderLive } from './render.js';
import { initTabs, tabFromHash } from './tabs.js';
import { initFilters } from './filters.js';
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
  bindStaticText();

  // The countdown runs first: if the offer is over it sets html.offer-ended before cards render.
  initCountdown($('#countdown'), OFFER.endsAt, () => {
    document.documentElement.classList.add('offer-ended');
  });

  // Only the first images of the tab the visitor lands on load eagerly.
  const initial = tabFromHash() || 'courses';
  renderChips($('#course-chips'), $('#tpl-chip'), COURSE_CATEGORIES);
  renderCourses($('#course-grid'), $('#tpl-course'), COURSES, COURSE_CATEGORIES, initial === 'courses' ? EAGER_IMAGES : 0);
  renderChips($('#book-chips'), $('#tpl-chip'), BOOK_CATEGORIES);
  renderBooks($('#book-grid'), $('#tpl-book'), BOOKS, initial === 'books' ? EAGER_IMAGES : 0);
  renderFan($('[data-fan="courses"]'), $('#tpl-fan'), pick(COURSES, FEATURED.courses), 'courses');
  renderFan($('[data-fan="books"]'), $('#tpl-fan'), pick(BOOKS, FEATURED.books), 'books');
  renderLive($('#live-list'), $('#tpl-live'), LIVE_CHANNELS);
  document.querySelectorAll('.grid, .live-grid').forEach((el) => el.setAttribute('data-ready', ''));

  initTabs({ tablist: $('.tabs'), bar: $('[data-sticky-bar]'), anchor: $('.chips-row'), initial });
  const bar = $('[data-sticky-bar]');
  initFilters({ chips: $('#course-chips'), items: $('#course-grid'), bar, status: $('#course-status'), noun: 'কোর্স' });
  initFilters({ chips: $('#book-chips'), items: $('#book-grid'), bar, status: $('#book-status'), noun: 'বই' });

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
