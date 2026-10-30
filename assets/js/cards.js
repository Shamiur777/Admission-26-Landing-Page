/**
 * Cards: one function per kind of catalog card, each owning its template contract
 * (the data-part names in index.html), its outbound link, image paths and click tracking.
 *
 * Every card takes the catalog item and a ctx:
 *   template  the <template> element to clone
 *   offer     result of getOffer() (coupon code, coupon prices, book percent label)
 *   href      vetted URL, from a successful buildLink()
 *   eager     (course and book) whether the image loads eagerly
 *   categoryLabel (course) the category's printed label
 */
import { formatTaka } from './format.js';
import { tagLink } from './tracking.js';

const IMAGE_SIZES = '(min-width: 960px) 360px, (min-width: 600px) 45vw, 112px';
const WIDE_NAME_LENGTH = 26;
const LIVE_ICONS = {
  'Facebook Page': 'i-fb',
  'Facebook Group': 'i-group',
  'YouTube Channel': 'i-yt',
};

/**
 * Image paths for a course banner.
 * @param {string} id
 * @returns {{src: string, srcset: string}}
 */
export function courseImage(id) {
  const small = `assets/img/courses/${id}-400.webp`;
  const large = `assets/img/courses/${id}-800.webp`;
  return { src: small, srcset: `${small} 400w, ${large} 800w` };
}

/**
 * Image path for a book cover.
 * @param {string} id
 * @returns {string}
 */
export function bookImage(id) {
  return `assets/img/books/${id}.webp`;
}

/**
 * Clones the template's single root element.
 * @param {HTMLTemplateElement} template
 * @returns {Element}
 */
export function cloneTemplate(template) {
  return template.content.firstElementChild.cloneNode(true);
}

function part(root, name) {
  return root.querySelector(`[data-part="${name}"]`);
}

/** Points a card's link at a vetted URL, opens it in a new tab and marks it for click tracking. */
function setLink(root, href, kind, info, label) {
  const link = part(root, 'link');
  link.setAttribute('href', href);
  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');
  link.setAttribute('aria-label', label);
  tagLink(link, kind, info);
}

/**
 * One course card.
 * @param {{id: string, title: string, category: string, price: number, highlights: string[]}} course
 * @param {{template: HTMLTemplateElement, offer: object, href: string, eager: boolean, categoryLabel?: string}} ctx
 * @returns {Element}
 */
export function courseCard(course, ctx) {
  const card = cloneTemplate(ctx.template);
  card.dataset.category = course.category;

  const img = part(card, 'image');
  const images = courseImage(course.id);
  img.src = images.src;
  img.srcset = images.srcset;
  img.sizes = IMAGE_SIZES;
  img.alt = course.title + ' কোর্সের ব্যানার';
  img.loading = ctx.eager ? 'eager' : 'lazy';

  part(card, 'category').textContent = ctx.categoryLabel || '';
  part(card, 'title').textContent = course.title;

  const highlights = part(card, 'highlights');
  course.highlights.forEach((text) => {
    const li = document.createElement('li');
    li.className = 'course-card__highlight';
    li.textContent = text;
    highlights.appendChild(li);
  });

  const price = ctx.offer.coursePrice(course.price);
  part(card, 'regular-price').textContent = formatTaka(price.regular);
  part(card, 'coupon-price').textContent = formatTaka(price.coupon);
  part(card, 'coupon-code').textContent = ctx.offer.couponCode;

  setLink(card, ctx.href, 'courseClick',
    { id: course.id, name: course.title, category: course.category },
    `${course.title}, ভর্তি হও`);
  return card;
}

/**
 * One book card, with its cover from assets/img/books/<id>.webp.
 * @param {{id: string, title: string, category: string}} book
 * @param {{template: HTMLTemplateElement, offer: object, href: string, eager: boolean}} ctx
 * @returns {Element}
 */
export function bookCard(book, ctx) {
  const card = cloneTemplate(ctx.template);
  card.dataset.category = book.category;

  const cover = part(card, 'cover');
  cover.src = bookImage(book.id);
  cover.alt = book.title;
  cover.loading = ctx.eager ? 'eager' : 'lazy';

  part(card, 'title').textContent = book.title;
  part(card, 'coupon-code').textContent = ctx.offer.couponCode;
  part(card, 'discount').textContent = `${ctx.offer.labels.bookPercent} ছাড়`;

  setLink(card, ctx.href, 'bookClick',
    { id: book.id, name: book.title, category: book.category },
    `${book.title}, Rokomari-তে অর্ডার করো`);
  return card;
}

/**
 * One free-live channel tile.
 * @param {{id: string, name: string, kind: string}} channel
 * @param {{template: HTMLTemplateElement, href: string}} ctx
 * @returns {Element}
 */
export function liveCard(channel, ctx) {
  const row = cloneTemplate(ctx.template);
  setLink(row, ctx.href, 'liveClick',
    { id: channel.id, name: channel.name, category: channel.kind },
    `${channel.name}, ${channel.kind}`);
  part(row, 'name').textContent = channel.name;
  if (channel.name.length > WIDE_NAME_LENGTH) row.classList.add('live-grid__item--wide');
  part(row, 'icon').setAttribute('href', '#' + (LIVE_ICONS[channel.kind] || 'i-fb'));
  return row;
}
