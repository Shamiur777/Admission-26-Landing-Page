const COPIED_LABEL = 'কপি হয়েছে';
const COPIED_MESSAGE = 'কোড কপি হয়েছে, চেকআউটে পেস্ট করো';
const RESET_MS = 2000;
const STATUS_MS = 3000;
const TOAST_MS = 15000;

function copyWithTextarea(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.className = 'visually-hidden';
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

/**
 * Copies `text` to the clipboard with the async Clipboard API, then execCommand (old WebViews).
 * @param {string} text
 * @returns {Promise<boolean>} true if the browser accepted the copy
 */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to the older path */
    }
  }
  return copyWithTextarea(text);
}

/**
 * Selects the coupon text on the page, so a long-press can copy it when the clipboard is blocked.
 * @param {string} code
 */
function selectCodeOnPage(code) {
  const el = Array.from(document.querySelectorAll('.ticket__code, [data-bind="coupon"]')).find((e) => e.offsetParent !== null && e.textContent.trim() === code);
  const selection = window.getSelection && window.getSelection();
  if (!el || !selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Makes every [data-coupon-copy] button copy the coupon and show feedback.
 * Buttons may contain a [data-copy-label] element whose text is swapped briefly.
 * When the browser refuses to copy, a toast shows the code in a selected input
 * so the visitor can long-press to copy it.
 * @param {{ code: string, status: HTMLElement, toast: HTMLElement, onCopy?: () => void }} options
 */
export function initCoupon({ code, status, toast, onCopy }) {
  const input = toast.querySelector('input');
  const closeButton = toast.querySelector('button');
  let toastTimer = 0;
  let statusTimer = 0;

  function say(message) {
    status.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => { status.textContent = ''; }, STATUS_MS);
  }
  let returnFocusTo = null;

  function closeToast() {
    window.clearTimeout(toastTimer);
    toast.hidden = true;
    if (returnFocusTo) returnFocusTo.focus();
    returnFocusTo = null;
  }

  function openToast(opener) {
    returnFocusTo = opener;
    input.value = code;
    toast.hidden = false;
    input.focus();
    input.select();
    input.setSelectionRange(0, code.length);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(closeToast, TOAST_MS);
  }

  closeButton.addEventListener('click', closeToast);
  toast.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeToast();
  });

  document.querySelectorAll('[data-coupon-copy]').forEach((button) => {
    const label = button.querySelector('[data-copy-label]');
    const icon = button.querySelector('svg use');
    const iconOriginal = icon ? icon.getAttribute('href') : '';
    const original = label ? label.textContent : '';
    let timer = 0;

    button.addEventListener('click', async () => {
      selectCodeOnPage(code);
      const copied = await copyText(code);
      if (!copied) {
        say(`কোডটি লিখে নাও: ${code}`);
        openToast(button);
        return;
      }
      say(COPIED_MESSAGE);
      if (label) label.textContent = COPIED_LABEL;
      if (icon) icon.setAttribute('href', '#i-check');
      button.classList.add('is-copied');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (label) label.textContent = original;
        if (icon) icon.setAttribute('href', iconOriginal);
        button.classList.remove('is-copied');
      }, RESET_MS);
      if (onCopy) onCopy();
    });
  });
}
