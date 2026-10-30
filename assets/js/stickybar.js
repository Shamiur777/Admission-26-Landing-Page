/**
 * Shows the mobile bottom bar once the hero has scrolled away, and hides it again
 * while the shop (which has its own sticky tabs) or the footer is on screen.
 * @param {{ bar: HTMLElement, hero: HTMLElement, shop: HTMLElement, footer: HTMLElement }} options
 */
export function initStickyBar({ bar, hero, shop, footer }) {
  if (!('IntersectionObserver' in window)) {
    bar.classList.add('is-visible');
    return;
  }
  let heroGone = false;
  let shopShown = false;
  let footerShown = false;
  const update = () => bar.classList.toggle('is-visible', heroGone && !shopShown && !footerShown);

  new IntersectionObserver(([entry]) => {
    heroGone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    update();
  }).observe(hero);

  new IntersectionObserver(([entry]) => {
    shopShown = entry.isIntersecting;
    update();
  }).observe(shop);

  new IntersectionObserver(([entry]) => {
    footerShown = entry.isIntersecting;
    update();
  }).observe(footer);
}
