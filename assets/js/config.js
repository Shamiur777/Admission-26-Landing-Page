/**
 * Site settings. This is the file to edit for a new campaign.
 * Course, book and live-channel content lives in catalog.js.
 */

export const OFFER = {
  couponCode: 'REVENGE',
  courseDiscountPercent: 40,
  bookDiscountPercent: 20,
  // true: books read "২০% পর্যন্ত" (up to 20%). false: a flat 20%.
  bookDiscountIsMax: true,
  // 72-hour campaign window, Bangladesh time (+06:00).
  // The countdown hides itself after this moment; the coupon text stays.
  endsAt: '2026-11-03T00:00:00+06:00',
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
