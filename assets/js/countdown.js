import { padBangla } from './format.js';
import { getOffer } from './offer.js';

/**
 * Runs a live countdown. The numbers come from getOffer(); this module only ticks
 * and writes them. The root needs children with data-unit="days|hours|minutes|seconds".
 * When the offer has ended the root is hidden and `onExpire` is called once.
 * @param {HTMLElement} root
 * @param {import('./offer.js').OfferConfig} offerConfig
 * @param {() => void} [onExpire]
 * @returns {() => void} stop function
 */
export function initCountdown(root, offerConfig, onExpire) {
  const cells = {};
  root.querySelectorAll('[data-unit]').forEach((el) => {
    cells[el.dataset.unit] = el;
  });

  let timer = 0;
  const stop = () => window.clearInterval(timer);

  function tick() {
    const { status, timeLeft } = getOffer(offerConfig, Date.now());
    if (status === 'ended') {
      stop();
      root.hidden = true;
      if (onExpire) onExpire();
      return;
    }
    for (const key of ['days', 'hours', 'minutes', 'seconds']) {
      if (cells[key]) cells[key].textContent = padBangla(timeLeft[key]);
    }
  }

  tick();
  if (!root.hidden) timer = window.setInterval(tick, 1000);
  return stop;
}
