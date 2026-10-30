import { toBanglaDigits } from './format.js';

/*
 * Shop module: the courses/books tabs and their category chips.
 *
 * Pure core (no DOM, tested in tests/shop.test.js): TABS, DEFAULT_TAB, resolveHash, nextTab, filterItems, formatStatus.
 * DOM adapter: initShop. It owns ARIA state, hidden attributes, chip state, status text, the URL hash,
 * deep-link scrolling and the one measurement of the sticky stack (offer bar + shop bar).
 *
 * Markup contract (index.html #shop):
 *   [role=tablist] > [data-tab="<name>"]       the tab buttons
 *   [data-panel="<name>"]                      the tab panel; holds [data-items] (the cards) and [data-status]
 *   [data-prompt]                              a link inside [data-items] that is not a card (it is never filtered or counted)
 *   [data-chips="<name>"] > [data-filter]      the chip row for that tab ("all" or a category id)
 *   [data-status-template]                     status copy on [data-status], "{n}" is the Bangla-digit count
 *   [data-shop-anchor]                         first element under the sticky bar (deep links scroll to it)
 *   [data-sticky-bar]                          the sticky element holding the tabs
 */

/** Tab names, in tab order. The only values the URL hash can select. */
export const TABS = Object.freeze(['courses', 'books']);

/** Tab shown when the URL names none. */
export const DEFAULT_TAB = 'courses';

const MAX_HASH_LENGTH = 64;
const CATEGORY_ID = /^[a-z0-9-]{1,32}$/;

/**
 * Reads a URL hash such as "#books" or "#courses/varsity". Only known tab names are accepted,
 * so nothing the visitor types in the URL reaches the DOM or an object lookup.
 * @param {string} hash e.g. window.location.hash
 * @returns {{ tab: 'courses'|'books', category?: string }|null} category is only shape-checked here
 */
export function resolveHash(hash) {
  if (typeof hash !== 'string' || hash.length > MAX_HASH_LENGTH) return null;
  const [tab, category, ...rest] = hash.replace(/^#/, '').split('/');
  if (rest.length > 0 || !TABS.includes(tab)) return null;
  return category !== undefined && CATEGORY_ID.test(category) ? { tab, category } : { tab };
}

/**
 * The tab a keypress moves to, wrapping at both ends.
 * @param {string} current the focused tab name
 * @param {string} key KeyboardEvent.key
 * @param {readonly string[]} [tabs]
 * @returns {string|null} null when the key is not a tab key or `current` is unknown
 */
export function nextTab(current, key, tabs = TABS) {
  const index = tabs.indexOf(current);
  if (index < 0) return null;
  const last = tabs.length - 1;
  switch (key) {
    case 'ArrowRight': return tabs[index === last ? 0 : index + 1];
    case 'ArrowLeft': return tabs[index === 0 ? last : index - 1];
    case 'Home': return tabs[0];
    case 'End': return tabs[last];
    default: return null;
  }
}

/**
 * Which items a category chip shows.
 * @param {ReadonlyArray<{ id: string|number, category: string }>} items
 * @param {string} category "all" or a category id
 * @returns {{ visibleIds: Array<string|number>, count: number }}
 */
export function filterItems(items, category) {
  const visibleIds = items
    .filter((item) => category === 'all' || item.category === category)
    .map((item) => item.id);
  return { visibleIds, count: visibleIds.length };
}

/**
 * Fills a status template ("{n}টি কোর্স দেখাচ্ছে") with a count in Bangla digits.
 * @param {string} template
 * @param {number} count
 * @returns {string}
 */
export function formatStatus(template, count) {
  return template.replace('{n}', () => toBanglaDigits(count));
}

/**
 * The tab named by the current URL, for choosing which images load eagerly before the shop is wired.
 * @returns {'courses'|'books'}
 */
export function landingTab() {
  const found = resolveHash(window.location.hash);
  return found ? found.tab : DEFAULT_TAB;
}

/**
 * Wires the shop: ARIA tabs (click, arrows, Home, End), category chips, the URL hash and deep-link scrolling.
 * Run after the chips and cards are rendered. Links to #courses / #books anywhere on the page select that tab and
 * scroll the chip row to just under the sticky tabs. Choosing a tab updates the hash with replaceState (never on
 * first load), so a shared or reloaded URL opens the same tab. It also sets --offer-bar-h and --shop-bar-h on
 * <html> from the measured sticky stack; the values in tokens.css are the fallback until it runs.
 * @param {{ shop: HTMLElement, offerBar: HTMLElement }} options shop is #shop; offerBar is the sticky bar above everything
 */
export function initShop({ shop, offerBar }) {
  const root = document.documentElement;
  const bar = shop.querySelector('[data-sticky-bar]');
  const tablist = shop.querySelector('[role="tablist"]');
  const anchor = shop.querySelector('[data-shop-anchor]');
  const tabButtons = Array.from(tablist.querySelectorAll('[data-tab]'));

  const lists = new Map(TABS.map((name) => {
    const panel = shop.querySelector(`[data-panel="${name}"]`);
    const chips = shop.querySelector(`[data-chips="${name}"]`);
    const items = panel.querySelector('[data-items]');
    const status = panel.querySelector('[data-status]');
    return [name, {
      panel,
      chips,
      items,
      status,
      template: status.dataset.statusTemplate,
      buttons: Array.from(chips.querySelectorAll('[data-filter]')),
      cards: Array.from(items.children).filter((el) => !el.hasAttribute('data-prompt')).map((el, id) => ({ el, id, category: el.dataset.category })),
    }];
  }));

  // The single measurement of the sticky stack. CSS reads the two custom properties it sets.
  let stack = { offer: 0, bar: 0 };
  function measure() {
    stack = { offer: offerBar.offsetHeight, bar: bar.offsetHeight };
    if (stack.offer > 0) root.style.setProperty('--offer-bar-h', stack.offer + 'px');
    if (stack.bar > 0) root.style.setProperty('--shop-bar-h', stack.bar + 'px');
  }

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function apply(name, category) {
    const list = lists.get(name);
    const { visibleIds, count } = filterItems(list.cards, category);
    const visible = new Set(visibleIds);
    list.cards.forEach((card) => { card.el.hidden = !visible.has(card.id); });
    list.buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === category)));
    list.status.textContent = formatStatus(list.template, count);
  }

  function select(name, { focus = false } = {}) {
    tabButtons.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
      const list = lists.get(tab.dataset.tab);
      list.panel.hidden = !active;
      list.chips.hidden = !active;
    });
  }

  /** Selects the tab a hash names, and its category chip if that chip exists. */
  function show({ tab, category }) {
    select(tab);
    if (category && lists.get(tab).buttons.some((b) => b.dataset.filter === category)) apply(tab, category);
  }

  /** Scrolls so the chip row sits just under the sticky tabs. */
  function reveal({ instant = false } = {}) {
    measure();
    anchor.scrollIntoView({ block: 'start', behavior: reducedMotion() || instant ? 'instant' : 'smooth' });
  }

  /** After a chip tap, brings the list back if it has scrolled up under the sticky stack. */
  function revealList(name) {
    measure();
    const items = lists.get(name).items;
    if (items.getBoundingClientRect().top >= stack.offer + stack.bar) return;
    items.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'instant' : 'smooth' });
  }

  function record(name) {
    window.history.replaceState(null, '', '#' + name);
  }

  /** The visitor chose a tab: show it, record it in the URL, and re-anchor if they were deep in a list. */
  function choose(name, options) {
    measure();
    const stuck = bar.getBoundingClientRect().top <= stack.offer + 2;
    select(name, options);
    record(name);
    if (stuck) reveal({ instant: true });
  }

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) choose(tab.dataset.tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const focused = document.activeElement && document.activeElement.dataset.tab;
    const next = nextTab(focused, event.key);
    if (!next) return;
    event.preventDefault();
    choose(next, { focus: true });
  });

  TABS.forEach((name) => {
    const list = lists.get(name);
    list.chips.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      apply(name, button.dataset.filter);
      revealList(name);
    });
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    const found = link && resolveHash(link.getAttribute('href'));
    if (!found) return;
    event.preventDefault();
    show(found);
    record(found.tab);
    // A hand-off card at the end of a list swaps the panel under the visitor, so jump rather than glide.
    reveal({ instant: Boolean(link.closest('[data-panel]')) });
  });

  window.addEventListener('hashchange', () => {
    const found = resolveHash(window.location.hash);
    if (found) {
      show(found);
      reveal();
    }
  });

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(offerBar);
    observer.observe(bar);
  } else {
    window.addEventListener('resize', measure);
  }

  // First load: no URL write. Chips start on "all" unless the hash names a category.
  measure();
  TABS.forEach((name) => apply(name, 'all'));
  const landing = resolveHash(window.location.hash);
  show(landing || { tab: DEFAULT_TAB });
  // On arrival, jump once the first layout exists and again after the web fonts settle the line heights.
  if (landing) {
    const jump = () => window.setTimeout(() => reveal({ instant: true }), 0);
    jump();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(jump);
    window.addEventListener('load', jump, { once: true });
  }
}
