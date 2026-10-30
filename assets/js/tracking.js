/**
 * Ad / analytics tags. Loads Meta Pixel and/or Google Tag Manager from the IDs in config.js.
 *
 * Shape: EVENTS is the one table of event kinds. buildEvent() is the pure mapping from a
 * kind to what is sent. createTracker() sends it through an adapter (the seam to
 * window.fbq / window.dataLayer). browserAdapter is the real one; tests use a recording fake.
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
const META_STANDARD = new Set([
  'InitiateCheckout', 'ViewContent', 'Lead', 'Contact',
  'AddToCart', 'Purchase', 'CompleteRegistration', 'Search',
]);
const PARAM_KEYS = ['content_name', 'content_category', 'content_ids', 'content_type', 'currency', 'value'];

const productPayload = ({ id, name, category }) => ({
  content_ids: [id],
  content_name: name,
  content_category: category,
  content_type: 'product',
});

/**
 * The one table of event kinds. The Meta event name for each kind is owner-editable in
 * config.js TRACKING.events. `click` kinds are links tagged by tagLink() and reported by
 * the delegated listener; `payload` turns a kind's info into raw params.
 */
export const EVENTS = {
  courseClick: { click: true, payload: productPayload },
  bookClick: { click: true, payload: productPayload },
  liveClick: { click: true, payload: productPayload },
  couponCopy: {
    click: false,
    payload: ({ code }) => ({ content_name: code, content_category: 'coupon', content_ids: [code] }),
  },
};

/**
 * Keep only whitelisted keys with safe types and bounded sizes.
 * @param {object} params
 * @returns {object}
 */
export function cleanParams(params) {
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
 * Maps a kind and its info to what each tag receives. Pure.
 * @param {string} kind a key of EVENTS
 * @param {object} info what the kind's payload needs: {id, name, category} for clicks, {code} for couponCopy
 * @param {Record<string, string>} [names] Meta event name per kind (defaults to TRACKING.events)
 * @returns {{kind: string, data: object, meta: {method: 'track'|'trackCustom', name: string}|null}|null} null for an unknown kind
 */
export function buildEvent(kind, info, names = TRACKING.events) {
  if (!Object.prototype.hasOwnProperty.call(EVENTS, kind)) return null;
  const data = cleanParams(EVENTS[kind].payload(info || {}));
  const name = names && names[kind];
  const meta = typeof name === 'string' && EVENT_NAME_RE.test(name)
    ? { method: META_STANDARD.has(name) ? 'track' : 'trackCustom', name }
    : null;
  return { kind, data, meta };
}

/**
 * Marks a link so the delegated listener can report its click.
 * @param {{dataset: object}} link the <a> element
 * @param {string} kind a click kind of EVENTS
 * @param {{id: string, name: string, category: string}} info
 */
export function tagLink(link, kind, info) {
  link.dataset.track = kind;
  link.dataset.trackId = info.id;
  link.dataset.trackName = info.name;
  link.dataset.trackCategory = info.category;
}

function injectScript(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  const parent = document.head || document.documentElement;
  parent.appendChild(s);
}

/**
 * The seam to the tags. Interface: metaInit(id), metaTrack(method, name, data), gtmInit(id), gtmPush(obj).
 * This is the real adapter, over window.fbq / window.dataLayer.
 */
export const browserAdapter = {
  metaInit(id) {
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
  },
  metaTrack(method, name, data) {
    if (typeof window.fbq === 'function') window.fbq(method, name, data);
  },
  gtmInit(id) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    injectScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
  },
  gtmPush(obj) {
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(obj);
  },
};

function warnInvalid(name, value) {
  if (value) console.warn(`[tracking] ${name} ignored: invalid format`);
}

/**
 * Builds a tracker over an adapter. Nothing it returns throws.
 * @param {typeof browserAdapter} adapter
 * @param {{metaPixelId: string, gtmContainerId: string, events: Record<string, string>}} [config]
 * @returns {{init: () => void, track: (kind: string, info?: object) => void}}
 */
export function createTracker(adapter, config = TRACKING) {
  const state = { meta: false, gtm: false };
  return {
    /** Loads each tag whose ID is valid. Safe to call twice. */
    init() {
      try {
        const pixel = config.metaPixelId;
        const gtm = config.gtmContainerId;
        if (!state.meta) {
          if (typeof pixel === 'string' && PIXEL_ID_RE.test(pixel)) {
            state.meta = true;
            adapter.metaInit(pixel);
          } else {
            warnInvalid('metaPixelId', pixel);
          }
        }
        if (!state.gtm) {
          if (typeof gtm === 'string' && GTM_ID_RE.test(gtm)) {
            state.gtm = true;
            adapter.gtmInit(gtm);
          } else {
            warnInvalid('gtmContainerId', gtm);
          }
        }
      } catch {
        /* tracking must never break the page */
      }
    },
    /**
     * Reports an event. Outbound clicks leave the page right away and we do not delay
     * navigation: Meta's fbevents.js sends with navigator.sendBeacon, which the browser
     * completes after unload.
     */
    track(kind, info) {
      try {
        const event = buildEvent(kind, info, config.events);
        if (!event) return;
        if (state.meta && event.meta) adapter.metaTrack(event.meta.method, event.meta.name, event.data);
        if (state.gtm) adapter.gtmPush({ event: kind, ...event.data });
      } catch {
        /* never throw */
      }
    },
  };
}

const tracker = createTracker(browserAdapter);

/** Loads Meta Pixel and/or GTM from the IDs in config.js. */
export const initTracking = tracker.init;

/**
 * Reports an event of EVENTS. See buildEvent for `info`.
 * @param {string} kind
 * @param {object} [info]
 */
export const track = tracker.track;

const wired = new WeakSet();

/**
 * One delegated click listener. Links are tagged by tagLink() with
 * data-track="<click kind>" plus data-track-id / -name / -category.
 * @param {Document|Element} [root]
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
        if (!EVENTS[kind] || !EVENTS[kind].click) return;
        track(kind, { id: trackId, name: trackName, category: trackCategory });
      } catch {
        /* never throw */
      }
    });
  } catch {
    /* never throw */
  }
}
