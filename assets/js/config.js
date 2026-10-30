/**
 * Site settings. This is the file to edit for a new campaign.
 * Course, book and live-channel content lives in catalog.js.
 *
 * Campaign checklist. Everything on the page reads OFFER below, except these
 * hand-typed spots. Change them too (tests/meta.test.js fails if the text drifts):
 *   1. index.html <title>
 *   2. index.html <meta name="description">
 *   3. index.html <meta property="og:description">
 *   4. index.html <meta name="twitter:description">
 *   5. assets/img/og-cover.jpg: run `python scripts/make-image.py og`
 */

export const OFFER = {
  couponCode: 'REVENGE',
  // Bangladesh time (+06:00). 72 hours from 31 Oct 2026, 7:00 PM.
  // At this moment the page flips to "offer ended". An unreadable date also counts as ended.
  endsAt: '2026-11-03T19:00:00+06:00',
  courses: { percent: 40 },
  // upTo: true prints "২০% পর্যন্ত" (the coupon gives at most 20%). false prints a flat "২০%".
  books: { percent: 20, upTo: true },
};

export const CONTACT = {
  phone: '01787-852989',
  phoneHref: 'tel:+8801787852989',
};

/**
 * Ad / analytics IDs. Leave a value empty ('') to disable that tag.
 * Example: metaPixelId: '123456789012345'
 * If you add a host here, also add it to the Content-Security-Policy
 * in index.html and in deploy/ (see README → Tracking).
 */
export const TRACKING = {
  metaPixelId: '',
  gtmContainerId: '', // e.g. 'GTM-XXXXXXX'
  // Meta event fired for each kind of click. Standard events optimise best for ads.
  events: {
    courseClick: 'InitiateCheckout',
    bookClick: 'InitiateCheckout',
    couponCopy: 'CopyCoupon', // custom event
    liveClick: 'JoinLive', // custom event
  },
};

/**
 * Outbound links are only rendered if their host is listed here.
 * Protects the page from a typo or a tampered catalog pointing somewhere unexpected.
 */
export const ALLOWED_LINK_HOSTS = [
  'edgecoursebd.com',
  'www.edgecoursebd.com',
  'www.rokomari.com',
  'www.facebook.com',
  'www.youtube.com',
];

/** Hosts that receive the visitor's utm_* / fbclid params, so ad attribution survives the click. */
export const ATTRIBUTION_HOSTS = ['edgecoursebd.com', 'www.edgecoursebd.com'];

/** Query params copied from the visitor's URL onto links to ATTRIBUTION_HOSTS. */
export const ATTRIBUTION_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
