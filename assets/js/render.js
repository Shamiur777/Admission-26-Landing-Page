import { OFFER } from './config.js';
import { buildLink } from './links.js';
import { discounted, formatTaka, toBanglaDigits } from './format.js';

const EAGER_IMAGES = 2;
const IMAGE_SIZES = '(min-width: 960px) 360px, (min-width: 600px) 45vw, 112px';
const LIVE_ICONS = {
  'Facebook Page': 'i-fb',
  'Facebook Group': 'i-group',
  'YouTube Channel': 'i-yt',
};

function part(root, name) {
  return root.querySelector(`[data-part="${name}"]`);
}

/** Marks a link so tracking.js can report its click (see initClickTracking). */
function setTracking(link, kind, id, name, category) {
  link.dataset.track = kind;
  link.dataset.trackId = id;
  link.dataset.trackName = name;
  link.dataset.trackCategory = category;
}

function cloneTemplate(template) {
  return template.content.firstElementChild.cloneNode(true);
}

/**
 * Builds the category chips ("সব" first).
 * @param {HTMLElement} container
 * @param {HTMLTemplateElement} template
 * @param {{id: string, label: string}[]} categories
 */
export function renderChips(container, template, categories) {
  const all = [{ id: 'all', label: 'সব' }, ...categories];
  all.forEach((category) => {
    const chip = cloneTemplate(template);
    chip.textContent = category.label;
    chip.dataset.filter = category.id;
    container.appendChild(chip);
  });
}

/**
 * Builds one card per course; a course with an unsafe link is skipped.
 * @param {HTMLElement} list
 * @param {HTMLTemplateElement} template
 * @param {object[]} courses
 * @param {{id: string, label: string}[]} categories
 */
export function renderCourses(list, template, courses, categories) {
  const labels = Object.fromEntries(categories.map((c) => [c.id, c.label]));
  let index = 0;
  courses.forEach((course) => {
    const href = buildLink(course.url);
    if (!href) return;
    const card = cloneTemplate(template);
    card.dataset.category = course.category;

    const img = part(card, 'image');
    img.src = `assets/img/courses/${course.id}-400.webp`;
    img.srcset = `assets/img/courses/${course.id}-400.webp 400w, assets/img/courses/${course.id}-800.webp 800w`;
    img.sizes = IMAGE_SIZES;
    img.alt = course.title + ' কোর্সের ব্যানার';
    img.loading = index < EAGER_IMAGES ? 'eager' : 'lazy';

    part(card, 'category').textContent = labels[course.category] || '';
    part(card, 'title').textContent = course.title;

    const highlights = part(card, 'highlights');
    course.highlights.forEach((text) => {
      const li = document.createElement('li');
      li.className = 'course-card__highlight';
      li.textContent = text;
      highlights.appendChild(li);
    });

    part(card, 'regular-price').textContent = formatTaka(course.price);
    part(card, 'coupon-price').textContent = formatTaka(discounted(course.price, OFFER.courseDiscountPercent));
    part(card, 'coupon-code').textContent = OFFER.couponCode;

    const link = part(card, 'link');
    link.setAttribute('href', href);
    setTracking(link, 'courseClick', course.id, course.title, course.category);
    link.setAttribute('aria-label', `${course.title}, ভর্তি হও`);

    list.appendChild(card);
    index += 1;
  });
}

/**
 * Builds one card per book, with its cover image from assets/img/books/<id>.webp.
 * @param {HTMLElement} list
 * @param {HTMLTemplateElement} template
 * @param {object[]} books
 */
export function renderBooks(list, template, books) {
  books.forEach((book) => {
    const href = buildLink(book.url);
    if (!href) return;
    const card = cloneTemplate(template);
    card.dataset.category = book.category;

    const cover = part(card, 'cover');
    cover.src = `assets/img/books/${book.id}.webp`;
    cover.alt = book.title;
    cover.loading = 'lazy';

    part(card, 'title').textContent = book.title;
    part(card, 'coupon-code').textContent = OFFER.couponCode;
    part(card, 'discount').textContent = `${toBanglaDigits(OFFER.bookDiscountPercent)}% ছাড়`;

    const link = part(card, 'link');
    link.setAttribute('href', href);
    setTracking(link, 'bookClick', book.id, book.title, book.category);
    link.setAttribute('aria-label', `${book.title}, Rokomari-তে অর্ডার করো`);

    list.appendChild(card);
  });
}

/**
 * Builds the free-live channel rows.
 * @param {HTMLElement} list
 * @param {HTMLTemplateElement} template
 * @param {object[]} channels
 */
export function renderLive(list, template, channels) {
  channels.forEach((channel) => {
    const href = buildLink(channel.url);
    if (!href) return;
    const row = cloneTemplate(template);
    const link = part(row, 'link');
    link.setAttribute('href', href);
    setTracking(link, 'liveClick', channel.id, channel.name, channel.kind);
    part(row, 'name').textContent = channel.name;
    part(row, 'kind').textContent = channel.kind;
    const use = part(row, 'icon');
    use.setAttribute('href', '#' + (LIVE_ICONS[channel.kind] || 'i-fb'));
    list.appendChild(row);
  });
}
