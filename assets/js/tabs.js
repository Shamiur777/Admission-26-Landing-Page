const NAMES = ['courses', 'books'];

/**
 * Reads the tab named by the URL hash (#courses or #books).
 * @returns {'courses'|'books'|null}
 */
export function tabFromHash() {
  const name = window.location.hash.slice(1);
  return NAMES.includes(name) ? name : null;
}

/**
 * ARIA tabs for the shop: [data-tab] buttons, #panel-<name> panels, #course-chips / #book-chips rows.
 * Arrow keys, Home and End move between tabs. Links to #courses / #books select a tab and
 * scroll the chip row to just under the sticky tabs, so ad links with those hashes land on the right list.
 * Changing tab by tap or key also updates the URL hash, so a shared or reloaded URL opens the same tab.
 * @param {{ tablist: HTMLElement, bar: HTMLElement, anchor: HTMLElement, initial: 'courses'|'books' }} options
 *   bar is the sticky element holding the tabs; anchor is the first element under it (it needs scroll-margin-top).
 * @returns {(name: string) => void} select function
 */
export function initTabs({ tablist, bar, anchor, initial }) {
  const tabs = Array.from(tablist.querySelectorAll('[data-tab]'));
  const offerBar = document.getElementById('offer-bar');

  function select(name, { focus = false } = {}) {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
      document.getElementById('panel-' + tab.dataset.tab).hidden = !active;
      const chips = document.getElementById(tab.dataset.tab.replace(/s$/, '') + '-chips');
      if (chips) chips.hidden = !active;
    });
  }

  function reveal({ instant = false } = {}) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    anchor.scrollIntoView({ block: 'start', behavior: reduced || instant ? 'instant' : 'smooth' });
  }

  /** The visitor chose a tab: show it, record it in the URL, and re-anchor if they were deep in a list. */
  function choose(name, options) {
    const stuck = bar.getBoundingClientRect().top <= offerBar.offsetHeight + 2;
    select(name, options);
    window.history.replaceState(null, '', '#' + name);
    if (stuck) reveal({ instant: true });
  }

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) choose(tab.dataset.tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const index = tabs.findIndex((t) => t === document.activeElement);
    if (index < 0) return;
    const last = tabs.length - 1;
    const targets = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    choose(tabs[next].dataset.tab, { focus: true });
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#courses"], a[href="#books"]');
    if (!link) return;
    event.preventDefault();
    const name = link.getAttribute('href').slice(1);
    select(name);
    window.history.replaceState(null, '', '#' + name);
    reveal();
  });

  window.addEventListener('hashchange', () => {
    const name = tabFromHash();
    if (name) {
      select(name);
      reveal();
    }
  });

  select(initial);
  // On arrival, jump once the first layout exists and again after the web fonts settle the line heights.
  if (tabFromHash()) {
    const jump = () => window.setTimeout(() => reveal({ instant: true }), 0);
    jump();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(jump);
    window.addEventListener('load', jump, { once: true });
  }
  return select;
}
