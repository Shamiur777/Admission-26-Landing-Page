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
 * Price after a percentage discount, rounded to whole taka.
 * @param {number} price
 * @param {number} percent
 * @returns {number}
 */
export function discounted(price, percent) {
  return Math.round(price * (1 - percent / 100));
}

/**
 * Zero-padded Bangla number, e.g. 7 -> "০৭".
 * @param {number} n
 * @returns {string}
 */
export function padBangla(n) {
  return toBanglaDigits(String(n).padStart(2, '0'));
}

/**
 * "৪০%" for a percentage.
 * @param {number} percent
 * @returns {string}
 */
export function percentText(percent) {
  return toBanglaDigits(percent) + '%';
}

/**
 * Book discount as shown in running text: "২০% পর্যন্ত" when the offer is a maximum, else "২০%".
 * @param {{bookDiscountPercent: number, bookDiscountIsMax?: boolean}} offer
 * @returns {string}
 */
export function bookDiscountText(offer) {
  const base = percentText(offer.bookDiscountPercent);
  return offer.bookDiscountIsMax ? base + ' পর্যন্ত' : base;
}
