import { toBanglaDigits } from './format.js';

/**
 * Wires a group of category chips to a list of items carrying data-category.
 * Chips need data-filter ("all" or a category id); the active chip gets aria-pressed="true".
 * After a tap, a list that has scrolled above the sticky chip bar is brought back into view.
 * @param {{ chips: HTMLElement, items: HTMLElement, status: HTMLElement|null, noun: string }} options
 */
export function initFilters({ chips, items, status, noun }) {
  const buttons = Array.from(chips.querySelectorAll('[data-filter]'));
  const cards = Array.from(items.children);
  const bar = chips.closest('.chips-bar');

  function apply(category) {
    let shown = 0;
    cards.forEach((card) => {
      const match = category === 'all' || card.dataset.category === category;
      card.hidden = !match;
      if (match) shown += 1;
    });
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === category)));
    if (status) status.textContent = `${toBanglaDigits(shown)}টি ${noun} দেখাচ্ছে`;
  }

  function revealList() {
    const stackBottom = bar ? bar.getBoundingClientRect().bottom : 0;
    if (items.getBoundingClientRect().top >= stackBottom) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    items.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }

  chips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    apply(button.dataset.filter);
    revealList();
  });
  apply('all');
}
