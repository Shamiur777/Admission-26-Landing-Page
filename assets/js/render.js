import { OFFER } from './config.js';
import { buildLink } from './links.js';
import { getOffer } from './offer.js';
import { courseCard, bookCard, liveCard, courseImage, bookImage, cloneTemplate } from './cards.js';

/**
 * Appends a card per item. An item whose link fails buildLink() is skipped with a console warning.
 * @param {HTMLElement} list
 * @param {object[]} items
 * @param {(item: object, ctx: {href: string, eager: boolean}) => Element} make a card function from cards.js
 * @param {number} eager how many leading cards load their image eagerly
 */
function appendCards(list, items, make, eager = 0) {
  let index = 0;
  items.forEach((item) => {
    const link = buildLink(item.url, window.location.search);
    if (link.error) {
      console.warn(`[links] skipped (${link.error}):`, item.url);
      return;
    }
    list.appendChild(make(item, { href: link.href, eager: index < eager }));
    index += 1;
  });
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
  const offer = getOffer(OFFER, Date.now());
  appendCards(list, courses, (course, ctx) => courseCard(course, {
    ...ctx, template, offer, categoryLabel: labels[course.category],
  }), eager);
}

/**
 * Builds one card per book; a book with an unsafe link is skipped.
 * @param {HTMLElement} list
 * @param {HTMLTemplateElement} template
 * @param {object[]} books
 * @param {number} eager how many leading covers load eagerly (the rest are lazy)
 */
export function renderBooks(list, template, books, eager) {
  const offer = getOffer(OFFER, Date.now());
  appendCards(list, books, (book, ctx) => bookCard(book, { ...ctx, template, offer }), eager);
}

/**
 * Builds the free-live channel tiles.
 * @param {HTMLElement} list
 * @param {HTMLTemplateElement} template
 * @param {object[]} channels
 */
export function renderLive(list, template, channels) {
  appendCards(list, channels, (channel, ctx) => liveCard(channel, { ...ctx, template }));
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
      img.src = bookImage(item.id);
      img.width = 260;
      img.height = 372;
    } else {
      img.src = courseImage(item.id).src;
      img.width = 400;
      img.height = 400;
    }
    img.loading = 'eager';
    container.appendChild(img);
  });
}
