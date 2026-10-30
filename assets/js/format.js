const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Replaces every ASCII digit with its Bangla digit.
 * @param {string|number} value
 * @returns {string}
 */
export function toBanglaDigits(value) {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/**
 * Formats a whole BDT amount as e.g. "৳১,১৯৯".
 * @param {number} amount
 * @returns {string}
 */
export function formatTaka(amount) {
  const grouped = String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '৳' + toBanglaDigits(grouped);
}

/**
 * Zero-padded Bangla number, e.g. 7 -> "০৭".
 * @param {number} n
 * @returns {string}
 */
export function padBangla(n) {
  return toBanglaDigits(String(n).padStart(2, '0'));
}
