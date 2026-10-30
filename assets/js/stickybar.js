/**
 * Shows the mobile bottom bar once the hero has scrolled away, and hides it
 * again while the footer is on screen.
 * @param {{ bar: HTMLElement, hero: HTMLElement, footer: HTMLElement }} options
 */
export function initStickyBar({ bar, hero, footer }) {
  if (!('IntersectionObserver' in window)) {
    bar.classList.add('is-visible');
    return;
  }
  let heroGone = false;
  let footerShown = false;
  const update = () => bar.classList.toggle('is-visible', heroGone && !footerShown);

  new IntersectionObserver(([entry]) => {
    heroGone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    update();
  }).observe(hero);

  new IntersectionObserver(([entry]) => {
    footerShown = entry.isIntersecting;
    update();
  }).observe(footer);
}
