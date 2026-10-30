import { padBangla } from './format.js';

/**
 * Runs a live countdown to `endsAt`. The root needs children with
 * data-unit="days|hours|minutes|seconds". When time is up the root is hidden.
 * @param {HTMLElement} root
 * @param {string} endsAt ISO date with offset
 * @param {() => void} [onExpire]
 * @returns {() => void} stop function
 */
export function initCountdown(root, endsAt, onExpire) {
  const end = Date.parse(endsAt);
  const cells = {};
  root.querySelectorAll('[data-unit]').forEach((el) => {
    cells[el.dataset.unit] = el;
  });

  let timer = 0;
  const stop = () => window.clearInterval(timer);

  function tick() {
    const left = end - Date.now();
    if (Number.isNaN(end) || left <= 0) {
      stop();
      root.hidden = true;
      if (onExpire) onExpire();
      return;
    }
    const total = Math.floor(left / 1000);
    const parts = {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
    for (const key of Object.keys(parts)) {
      if (cells[key]) cells[key].textContent = padBangla(parts[key]);
    }
  }

  tick();
  if (!root.hidden) timer = window.setInterval(tick, 1000);
  return stop;
}
