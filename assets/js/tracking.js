/**
 * Ad / analytics tags. Loads Meta Pixel and/or Google Tag Manager from the IDs in config.js.
 *
 * Security rules for this file:
 *  - No inline scripts. Tags are injected as external <script src> elements, which the
 *    page CSP allows only for connect.facebook.net and www.googletagmanager.com.
 *  - IDs are validated with strict patterns before they go anywhere near a URL.
 *  - Only whitelisted, type-checked params leave the page. No PII, no free text from the DOM.
 *  - Nothing here throws. A blocked or failing tag must never break the page.
 */
import { TRACKING } from './config.js';

const PIXEL_ID_RE = /^\d{10,20}$/;
const GTM_ID_RE = /^GTM-[A-Z0-9]{4,10}$/;
const EVENT_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,49}$/;
const KINDS = new Set(['courseClick', 'bookClick', 'couponCopy', 'liveClick']);
const META_STANDARD = new Set([
  'InitiateCheckout', 'ViewContent', 'Lead', 'Contact',
  'AddToCart', 'Purchase', 'CompleteRegistration', 'Search',
]);
const PARAM_KEYS = ['content_name', 'content_category', 'content_ids', 'content_type', 'currency', 'value'];

const state = { meta: false, gtm: false };

function warnInvalid(name, value) {
  if (value) console.warn(`[tracking] ${name} ignored: invalid format`);
}

function injectScript(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  const parent = document.head || document.documentElement;
  parent.appendChild(s);
}

function loadMeta(id) {
  if (window.fbq) {
    // Another loader already created the stub; reuse it.
    window.fbq('set', 'autoConfig', false, id);
    window.fbq('init', id);
    window.fbq('track', 'PageView');
    return;
  }
  // Standard Meta Pixel stub: queues calls until fbevents.js replaces callMethod.
  const n = function () {
    if (n.callMethod) n.callMethod.apply(n, arguments);
    else n.queue.push(arguments);
  };
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  injectScript('https://connect.facebook.net/en_US/fbevents.js');
  // autoConfig off: stops Meta scraping button text and form fields (automatic matching).
  n('set', 'autoConfig', false, id);
  n('init', id);
  n('track', 'PageView');
}

function loadGtm(id) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  injectScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
}

export function initTracking() {
  try {
    const pixel = TRACKING.metaPixelId;
    const gtm = TRACKING.gtmContainerId;

    if (!state.meta) {
      if (typeof pixel === 'string' && PIXEL_ID_RE.test(pixel)) {
        state.meta = true;
        loadMeta(pixel);
      } else {
        warnInvalid('metaPixelId', pixel);
      }
    }
    if (!state.gtm) {
      if (typeof gtm === 'string' && GTM_ID_RE.test(gtm)) {
        state.gtm = true;
        loadGtm(gtm);
      } else {
        warnInvalid('gtmContainerId', gtm);
      }
    }
  } catch {
    /* tracking must never break the page */
  }
}

const CLICK_KINDS = new Set(['courseClick', 'bookClick', 'liveClick']);
const wired = new WeakSet();

/**
 * One delegated click listener. render.js marks links with
 * data-track="courseClick|bookClick|liveClick" plus data-track-id / -name / -category.
 */
export function initClickTracking(root = document) {
  try {
    if (wired.has(root)) return;
    wired.add(root);
    root.addEventListener('click', (event) => {
      try {
        const link = event.target && event.target.closest && event.target.closest('a[data-track]');
        if (!link) return;
        const { track: kind, trackId, trackName, trackCategory } = link.dataset;
        if (!CLICK_KINDS.has(kind)) return;
        track(kind, {
          content_ids: [trackId],
          content_name: trackName,
          content_category: trackCategory,
          content_type: 'product',
        });
      } catch {
        /* never throw */
      }
    });
  } catch {
    /* never throw */
  }
}

/** Keep only whitelisted keys with safe types and bounded sizes. */
function cleanParams(params) {
  const out = {};
  if (!params || typeof params !== 'object') return out;
  for (const key of PARAM_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(params, key)) continue;
    const v = params[key];
    if (key === 'value') {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out.value = v;
    } else if (key === 'currency') {
      if (typeof v === 'string' && /^[A-Z]{3}$/.test(v)) out.currency = v;
    } else if (key === 'content_ids') {
      if (Array.isArray(v)) {
        const ids = v.filter((x) => typeof x === 'string').slice(0, 10).map((x) => x.slice(0, 100));
        if (ids.length) out.content_ids = ids;
      }
    } else if (typeof v === 'string') {
      out[key] = v.slice(0, 100);
    }
  }
  return out;
}

/**
 * Report a click. kind: 'courseClick' | 'bookClick' | 'couponCopy' | 'liveClick'.
 *
 * Outbound clicks leave the page right away and we do not delay navigation: Meta's
 * fbevents.js sends events with navigator.sendBeacon, which the browser completes
 * after the page unloads. A delay would only slow the visitor down.
 */
export function track(kind, params = {}) {
  try {
    if (!KINDS.has(kind)) return;
    const data = cleanParams(params);

    if (state.meta && typeof window.fbq === 'function') {
      const name = TRACKING.events[kind];
      if (typeof name === 'string' && EVENT_NAME_RE.test(name)) {
        window.fbq(META_STANDARD.has(name) ? 'track' : 'trackCustom', name, data);
      }
    }
    if (state.gtm && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: kind, ...data });
    }
  } catch {
    /* never throw */
  }
}
