import { OFFER } from './config.js';
import { buildLink, setExternalLink } from './links.js';
import { bookDiscountText, discounted, formatTaka } from './format.js';

const IMAGE_SIZES = '(min-width: 960px) 360px, (min-width: 600px) 45vw, 112px';
const WIDE_NAME_LENGTH = 26;
const LIVE_ICONS = {
  'Facebook Page': 'i-fb',
  'Facebook Group': 'i-group',
  'YouTube Channel': 'i-yt',
};

function part(root, name) {
  return root.querySelector(`[data-part="${name}"]`);
}

function cloneTemplate(template) {
  return template.content.firstElementChild.cloneNode(true);
}

/** Marks a link so tracking.js can report its click (see initClickTracking). */
function setTracking(link, kind, id, name, category) {
  link.dataset.track = kind;
  link.dataset.trackId = id;
  link.dataset.trackName = name;
  link.dataset.trackCategory = category;
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
 * @param {number} eager how many leading images load eagerly (the rest are lazy)
 */
export function renderCourses(list, template, courses, categories, eager) {
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
    img.loading = index < eager ? 'eager' : 'lazy';

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
    setExternalLink(link, href);
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
 * @param {number} eager how many leading covers load eagerly (the rest are lazy)
 */
export function renderBooks(list, template, books, eager) {
  let index = 0;
  books.forEach((book) => {
    const href = buildLink(book.url);
    if (!href) return;
    const card = cloneTemplate(template);
    card.dataset.category = book.category;

    const cover = part(card, 'cover');
    cover.src = `assets/img/books/${book.id}.webp`;
    cover.alt = book.title;
    cover.loading = index < eager ? 'eager' : 'lazy';

    part(card, 'title').textContent = book.title;
    part(card, 'coupon-code').textContent = OFFER.couponCode;
    part(card, 'discount').textContent = `${bookDiscountText(OFFER)} ছাড়`;

    const link = part(card, 'link');
    setExternalLink(link, href);
    setTracking(link, 'bookClick', book.id, book.title, book.category);
    link.setAttribute('aria-label', `${book.title}, Rokomari-তে অর্ডার করো`);

    list.appendChild(card);
    index += 1;
  });
}

/**
 * Fills a hero path tile with a small fan of three pictures.
 * @param {HTMLElement} container
 * @param {HTMLTemplateElement} template
 * @param {object[]} items catalog items, in fan order (the middle one sits in front)
 * @param {'courses'|'books'} kind decides which image file and shape each item uses
 */
export function renderFan(container, template, items, kind) {
  items.forEach((item) => {
    const img = cloneTemplate(template);
    if (kind === 'books') {
      img.src = `assets/img/books/${item.id}.webp`;
      img.width = 260;
      img.height = 372;
    } else {
      img.src = `assets/img/courses/${item.id}-400.webp`;
      img.width = 400;
      img.height = 400;
    }
    img.loading = 'eager';
    container.appendChild(img);
  });
}

/**
 * Builds the free-live channel tiles.
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
    setExternalLink(link, href);
    setTracking(link, 'liveClick', channel.id, channel.name, channel.kind);
    link.setAttribute('aria-label', `${channel.name}, ${channel.kind}`);
    part(row, 'name').textContent = channel.name;
    if (channel.name.length > WIDE_NAME_LENGTH) row.classList.add('live-grid__item--wide');
    part(row, 'icon').setAttribute('href', '#' + (LIVE_ICONS[channel.kind] || 'i-fb'));
    list.appendChild(row);
  });
}
