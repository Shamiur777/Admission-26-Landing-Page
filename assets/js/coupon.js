const COPIED_LABEL = 'কপি হয়েছে ✓';
const RESET_MS = 2000;
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
    const original = label ? label.textContent : '';
    let timer = 0;

    button.addEventListener('click', async () => {
      const copied = await copyText(code);
      if (!copied) {
        openToast(button);
        return;
      }
      status.textContent = COPIED_LABEL;
      if (label) label.textContent = COPIED_LABEL;
      button.classList.add('is-copied');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (label) label.textContent = original;
        button.classList.remove('is-copied');
        status.textContent = '';
      }, RESET_MS);
      if (onCopy) onCopy();
    });
  });
}
