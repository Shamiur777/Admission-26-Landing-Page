// Run: node --test tests/contract.test.js
//
// Guard rails for the hidden couplings between files. Each test names the file and the item to fix.
// Nothing here needs a DOM: index.html and the CSS are read as text, with small regexes, the same way
// headers.test.js and scripts/validate.mjs do.
//
//   1. JS -> HTML hooks        every id / [data-*] / class that assets/js/*.js looks up exists in index.html
//   2. Templates               every data-part cards.js reads exists in the matching <template id="tpl-...">
//   3. data-bind keys          index.html and bind.js agree on every key
//   4. CSS custom properties   every var(--x) is defined; no hex colour outside tokens.css
//   5. Catalog integrity       ids, categories, FEATURED, links, hosts, prices
//   6. Config sanity           OFFER, CONTACT, TRACKING
//   7. Static outbound links   target="_blank" and rel="noopener noreferrer"
//   8. Cache rules             in headers.test.js, next to the other header tests
//   9. Fragile lookups         JS never finds an element by a styling class name
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseTags } from '../scripts/validate.mjs';
import { OFFER, CONTACT, TRACKING } from '../assets/js/config.js';
import { getOffer } from '../assets/js/offer.js';
import { buildLink } from '../assets/js/links.js';
import { bindTables } from '../assets/js/bind.js';
import { TABS } from '../assets/js/shop.js';
import { EVENTS, PIXEL_ID_RE, GTM_ID_RE, EVENT_NAME_RE } from '../assets/js/tracking.js';
import {
  COURSES, BOOKS, COURSE_CATEGORIES, BOOK_CATEGORIES, FEATURED, LIVE_CHANNELS,
} from '../assets/js/catalog.js';

const here = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, here), 'utf8');
const list = (dir, ext) => readdirSync(new URL(dir, here)).filter((f) => f.endsWith(ext)).sort().map((f) => `${dir}${f}`);

const html = read('index.html');
const { tags } = parseTags(html);
const jsFiles = list('assets/js/', '.js');
const cssFiles = list('assets/css/', '.css');
const stripJs = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1');
const stripCss = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const js = Object.fromEntries(jsFiles.map((f) => [f, stripJs(read(f))]));
const css = Object.fromEntries(cssFiles.map((f) => [f, stripCss(read(f))]));
const allCss = Object.values(css).join('\n');

// ---------------------------------------------------------------------------------------------
// Tiny selector engine: enough for the selectors this page uses. It checks that SOME element in
// index.html (templates included) matches each compound part of a selector. It does not check
// how the parts relate (descendant, child), only that each hook exists.
// ---------------------------------------------------------------------------------------------

/** Splits a selector list into compound selectors (no combinators), keeping [..] intact. */
function compounds(selector) {
  const out = [];
  for (const one of selector.split(',')) {
    let depth = 0;
    let cur = '';
    for (const ch of one.trim()) {
      if (ch === '[') depth += 1;
      if (ch === ']') depth -= 1;
      if (depth === 0 && /[\s>+~]/.test(ch)) {
        if (cur) out.push(cur);
        cur = '';
      } else cur += ch;
    }
    if (cur) out.push(cur);
  }
  return out;
}

/** Parses 'a.btn#x[data-y="z"]' into { tag, id, classes, attrs }. Returns null for syntax it does not know. */
function parseCompound(c) {
  const m = c.match(/^([a-z][a-z0-9-]*)?((?:[#.][\w-]+|\[[^\]]+\])*)$/i);
  if (!m) return null;
  const parsed = { tag: m[1] ? m[1].toLowerCase() : null, id: null, classes: [], attrs: [] };
  for (const piece of m[2].match(/[#.][\w-]+|\[[^\]]+\]/g) || []) {
    if (piece[0] === '#') parsed.id = piece.slice(1);
    else if (piece[0] === '.') parsed.classes.push(piece.slice(1));
    else {
      const a = piece.slice(1, -1).match(/^([\w-]+)(?:([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?$/);
      if (!a) return null;
      parsed.attrs.push({ name: a[1].toLowerCase(), op: a[2] || null, value: a[3] ?? a[4] ?? a[5] ?? '' });
    }
  }
  return parsed;
}

function elementMatches(el, p) {
  if (p.tag && el.name !== p.tag) return false;
  if (p.id !== null && el.attrs.id !== p.id) return false;
  const have = (el.attrs.class || '').split(/\s+/).filter(Boolean);
  if (!p.classes.every((c) => have.includes(c))) return false;
  return p.attrs.every(({ name, op, value }) => {
    if (!(name in el.attrs)) return false;
    const v = el.attrs[name];
    switch (op) {
      case null: return true;
      case '=': return v === value;
      case '^=': return v.startsWith(value);
      case '$=': return v.endsWith(value);
      case '*=': return v.includes(value);
      case '~=': return v.split(/\s+/).includes(value);
      default: return false;
    }
  });
}

const existsInHtml = (parsed) => tags.some((el) => elementMatches(el, parsed));

// ---------------------------------------------------------------------------------------------
// 1. JS -> HTML hooks
// ---------------------------------------------------------------------------------------------

/**
 * Selectors that match only elements the JS builds itself (from templates or createElement),
 * so they are NOT in the static index.html. Key: "<file> <selector>". Value: why.
 * An entry that no JS uses any more fails the test, so this list cannot rot.
 */
const CREATED_BY_JS = {
  'assets/js/tracking.js a[data-track]': 'tagLink() in tracking.js sets data-track on card links that cards.js creates',
  'assets/js/shop.js [data-filter]': 'render.js renderChips() creates the chip buttons and sets data-filter on them',
};

/** What `${...}` stands for in a template-literal selector, per file. cards.js is checked by test 2 instead. */
const TEMPLATE_VALUES = { 'assets/js/shop.js': TABS };
const SKIP_TEMPLATED = new Set(['assets/js/cards.js']);

const LOOKUP = /(?:\$|querySelectorAll|querySelector|closest|matches|getElementById)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;

/** [{ file, call, selector }] for every literal selector the JS passes to a lookup. */
function lookups() {
  const found = [];
  for (const [file, src] of Object.entries(js)) {
    for (const m of src.matchAll(LOOKUP)) {
      const call = m[0].slice(0, m[0].indexOf('('));
      found.push({ file, selector: call === 'getElementById' ? `#${m[2]}` : m[2], quote: m[1] });
    }
  }
  return found;
}

/** Expands `${...}` using TEMPLATE_VALUES; returns null when the selector is not checkable here. */
function expand(file, selector) {
  if (!selector.includes('${')) return [selector];
  const values = TEMPLATE_VALUES[file];
  if (!values) return null;
  return values.map((v) => selector.replace(/\$\{[^}]*\}/g, v));
}

test('contract 1: the lookup scan finds the JS selectors (guards the scanner itself)', () => {
  const all = lookups();
  assert.ok(all.length >= 30, `only ${all.length} selectors found in assets/js/*.js; the regex in tests/contract.test.js (LOOKUP) no longer matches how the JS looks up elements`);
  for (const must of ['#copy-toast', '#shop', '[data-bind="coupon"]']) {
    assert.ok(all.some((l) => l.selector === must), `scanner did not find ${must}; fix LOOKUP in tests/contract.test.js`);
  }
});

test('contract 1: every selector the JS looks up exists in index.html', () => {
  const used = new Set();
  const problems = [];
  for (const { file, selector } of lookups()) {
    if (SKIP_TEMPLATED.has(file) && selector.includes('${')) continue;
    const variants = expand(file, selector);
    if (!variants) {
      problems.push(`${file} uses the templated selector \`${selector}\`; add its possible values to TEMPLATE_VALUES in tests/contract.test.js`);
      continue;
    }
    for (const variant of variants) {
      const key = `${file} ${variant}`;
      if (CREATED_BY_JS[key]) { used.add(key); continue; }
      for (const part of compounds(variant)) {
        const parsed = parseCompound(part);
        if (!parsed) {
          problems.push(`${file}: selector '${variant}' uses syntax tests/contract.test.js cannot read ('${part}'); extend parseCompound()`);
        } else if (!existsInHtml(parsed)) {
          problems.push(`index.html has no element for selector '${variant}' used in ${file} (looked for '${part}'). Restore the element or hook in index.html, or update the selector in ${file}`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
  const stale = Object.keys(CREATED_BY_JS).filter((k) => !used.has(k));
  assert.deepEqual(stale, [], `CREATED_BY_JS in tests/contract.test.js lists selectors no JS uses any more: ${stale.join(', ')}. Delete those entries`);
});

test('contract 1: tab names from shop.js TABS each have a tab, panel and chip row in index.html', () => {
  for (const name of TABS) {
    for (const attr of ['data-tab', 'data-panel', 'data-chips']) {
      assert.ok(tags.some((t) => t.attrs[attr] === name), `index.html has no element with ${attr}="${name}" (shop.js TABS lists '${name}'). Add it, or remove '${name}' from TABS in assets/js/shop.js`);
    }
  }
});

test('contract 1: classes the JS adds or removes exist in the CSS', () => {
  const problems = [];
  for (const [file, src] of Object.entries(js)) {
    const names = new Set();
    for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\(\s*'([^']+)'/g)) names.add(m[1]);
    for (const m of src.matchAll(/\.className\s*=\s*'([^']+)'/g)) m[1].split(/\s+/).forEach((n) => names.add(n));
    for (const name of names) {
      if (!allCss.includes(`.${name}`)) problems.push(`${file} sets the class '${name}' but no file in assets/css has a '.${name}' rule. Restore the rule, or remove the class from ${file}`);
    }
  }
  assert.deepEqual(problems, []);
});

// ---------------------------------------------------------------------------------------------
// 9. Fragile lookups: JS finds elements by data- hooks, ids or roles, never by styling classes
// ---------------------------------------------------------------------------------------------

test('contract 9: no JS finds an element by a CSS class name', () => {
  const problems = [];
  for (const { file, selector } of lookups()) {
    const withoutBrackets = selector.replace(/\[[^\]]*\]/g, '').replace(/\$\{[^}]*\}/g, '');
    const classes = withoutBrackets.match(/\.[A-Za-z_][\w-]*/g);
    if (classes) problems.push(`${file} finds elements by the class ${classes.join(', ')} in '${selector}'. Add a data- hook to index.html and select that instead, so a CSS rename cannot break behaviour`);
  }
  for (const [file, src] of Object.entries(js)) {
    if (/getElementsByClassName\(/.test(src)) problems.push(`${file} uses getElementsByClassName; use a data- hook instead`);
  }
  assert.deepEqual(problems, []);
});

// ---------------------------------------------------------------------------------------------
// 2. Templates
// ---------------------------------------------------------------------------------------------

/** The card function in cards.js -> the template it clones. */
const CARD_TEMPLATES = { courseCard: 'tpl-course', bookCard: 'tpl-book', liveCard: 'tpl-live' };

function templateParts(id) {
  const m = html.match(new RegExp(`<template id="${id}">([\\s\\S]*?)</template>`));
  if (!m) return null;
  return new Set([...m[1].matchAll(/data-part="([^"]+)"/g)].map((x) => x[1]));
}

function functionBodies(src) {
  const starts = [...src.matchAll(/^(?:export )?function (\w+)\(/gm)];
  return Object.fromEntries(starts.map((m, i) => [m[1], src.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : src.length)]));
}

test('contract 2: every card function in cards.js is mapped to a template', () => {
  const bodies = functionBodies(js['assets/js/cards.js']);
  const cards = Object.keys(bodies).filter((n) => /Card$/.test(n));
  for (const name of cards) {
    assert.ok(CARD_TEMPLATES[name], `assets/js/cards.js has a new card function '${name}'. Add it to CARD_TEMPLATES in tests/contract.test.js with its <template id>`);
  }
  for (const name of Object.keys(CARD_TEMPLATES)) {
    assert.ok(bodies[name], `tests/contract.test.js CARD_TEMPLATES lists '${name}' but assets/js/cards.js has no such function`);
  }
});

for (const [fn, tpl] of Object.entries(CARD_TEMPLATES)) {
  test(`contract 2: every part ${fn}() uses exists in <template id="${tpl}">`, () => {
    const body = functionBodies(js['assets/js/cards.js'])[fn];
    const available = templateParts(tpl);
    assert.ok(available, `index.html has no <template id="${tpl}"> (cards.js ${fn}() clones it)`);
    const used = new Set();
    for (const m of body.matchAll(/\bpart\(\s*\w+\s*,\s*'([^']+)'\s*\)/g)) used.add(m[1]);
    for (const m of body.matchAll(/\[data-part="([^"]+)"\]/g)) used.add(m[1]);
    if (/\bsetLink\(/.test(body)) used.add('link'); // setLink() reads the 'link' part
    assert.ok(used.size > 0, `found no parts in ${fn}() of assets/js/cards.js; the scan in tests/contract.test.js needs updating`);
    for (const name of used) {
      assert.ok(available.has(name), `<template id="${tpl}"> in index.html has no data-part="${name}", but assets/js/cards.js ${fn}() uses part(…, '${name}')`);
    }
  });
}

test('contract 2: every template the JS clones exists in index.html', () => {
  for (const [file, src] of Object.entries(js)) {
    for (const m of src.matchAll(/#(tpl-[\w-]+)/g)) {
      assert.ok(templateParts(m[1]), `index.html has no <template id="${m[1]}"> used in ${file}`);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// 3. data-bind keys
// ---------------------------------------------------------------------------------------------

/** Keys bindTables() defines that index.html does not use today. Key: name. Value: why that is fine. */
const BIND_KEYS_UNUSED_OK = {
  'lowest-price': 'ready for copy that quotes the cheapest course price; no spot in index.html yet',
};

const bindNow = getOffer(OFFER, Date.parse(OFFER.endsAt) - 1000);
const { texts: bindTexts, ariaLabels: bindAria } = bindTables(bindNow);
const htmlKeys = (attr) => [...new Set(tags.filter((t) => attr in t.attrs).map((t) => t.attrs[attr]))];

test('contract 3: every data-bind key in index.html is a key bind.js knows', () => {
  for (const key of htmlKeys('data-bind')) {
    assert.ok(Object.hasOwn(bindTexts, key), `index.html uses data-bind="${key}" but assets/js/bind.js bindTables() has no '${key}' key (known: ${Object.keys(bindTexts).join(', ')}). It would silently show its default text`);
  }
});

test('contract 3: every data-bind-label key in index.html is a key bind.js knows', () => {
  for (const key of htmlKeys('data-bind-label')) {
    assert.ok(Object.hasOwn(bindAria, key), `index.html uses data-bind-label="${key}" but assets/js/bind.js bindTables() has no '${key}' label (known: ${Object.keys(bindAria).join(', ')})`);
  }
});

test('contract 3: every key bind.js knows is used in index.html', () => {
  const usedText = htmlKeys('data-bind');
  const usedLabel = htmlKeys('data-bind-label');
  for (const key of Object.keys(bindTexts)) {
    if (BIND_KEYS_UNUSED_OK[key]) continue;
    assert.ok(usedText.includes(key), `assets/js/bind.js knows data-bind="${key}" but index.html never uses it. Use it in index.html, remove it from bindTables(), or list it in BIND_KEYS_UNUSED_OK in tests/contract.test.js`);
  }
  for (const key of Object.keys(bindAria)) {
    assert.ok(usedLabel.includes(key), `assets/js/bind.js knows data-bind-label="${key}" but index.html never uses it. Use it or remove it from bindTables()`);
  }
  for (const key of Object.keys(BIND_KEYS_UNUSED_OK)) {
    assert.ok(Object.hasOwn(bindTexts, key), `BIND_KEYS_UNUSED_OK in tests/contract.test.js lists '${key}', which bind.js no longer has. Delete the entry`);
    assert.ok(!usedText.includes(key), `'${key}' is now used in index.html. Delete it from BIND_KEYS_UNUSED_OK in tests/contract.test.js`);
  }
});

// ---------------------------------------------------------------------------------------------
// 4. CSS custom properties and colours
// ---------------------------------------------------------------------------------------------

test('contract 4: every var(--x) in assets/css is defined, or carries a fallback', () => {
  const defined = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
  const problems = [];
  for (const [file, src] of Object.entries(css)) {
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
      if (!defined.has(m[1]) && !m[2]) {
        problems.push(`${file} uses var(${m[1]}) but no file in assets/css defines ${m[1]}. Define it in assets/css/tokens.css, or write var(${m[1]}, fallback)`);
      }
    }
  }
  assert.deepEqual([...new Set(problems)], []);
  assert.ok(defined.size > 10, 'found almost no custom properties in assets/css; the scan in tests/contract.test.js needs updating');
});

test('contract 4: custom properties the JS sets are defined in the CSS', () => {
  for (const [file, src] of Object.entries(js)) {
    for (const m of src.matchAll(/setProperty\(\s*'(--[\w-]+)'/g)) {
      assert.ok(new RegExp(`${m[1]}\\s*:`).test(allCss), `${file} sets ${m[1]} but no file in assets/css declares it. Add a fallback value to assets/css/tokens.css`);
    }
  }
});

test('contract 4: no hex colour outside tokens.css', () => {
  const HEX = /(?<![\w&-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;
  for (const [file, src] of Object.entries(css)) {
    if (file.endsWith('tokens.css')) continue;
    const hits = src.replace(/url\([^)]*\)/g, '').match(HEX);
    assert.equal(hits, null, `${file} has the hex colour ${hits && hits[0]}. Define it as a --color-* token in assets/css/tokens.css and use var(--color-…)`);
  }
});

// ---------------------------------------------------------------------------------------------
// 5. Catalog integrity (image files are checked by scripts/validate.mjs, run from validate.test.js)
// ---------------------------------------------------------------------------------------------

const hostOf = (url) => { try { return new URL(url).hostname; } catch { return ''; } };
const duplicates = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);

test('contract 5: ids are unique in each list', () => {
  const lists = { COURSES, BOOKS, COURSE_CATEGORIES, BOOK_CATEGORIES, LIVE_CHANNELS };
  for (const [name, items] of Object.entries(lists)) {
    assert.deepEqual(duplicates(items.map((i) => i.id)), [], `assets/js/catalog.js ${name} has a duplicate id. Ids are image names and filter keys, so each must be unique`);
  }
});

test('contract 5: every item category exists in its CATEGORIES list', () => {
  const check = (name, items, cats, catName) => {
    const ids = new Set(cats.map((c) => c.id));
    for (const item of items) {
      assert.ok(ids.has(item.category), `assets/js/catalog.js ${name} '${item.id}' has category '${item.category}', which is not in ${catName} (${[...ids].join(', ')})`);
    }
  };
  check('COURSES', COURSES, COURSE_CATEGORIES, 'COURSE_CATEGORIES');
  check('BOOKS', BOOKS, BOOK_CATEGORIES, 'BOOK_CATEGORIES');
});

test('contract 5: FEATURED names real items, three per fan', () => {
  for (const [kind, items] of [['courses', COURSES], ['books', BOOKS]]) {
    const ids = new Set(items.map((i) => i.id));
    assert.equal(FEATURED[kind].length, 3, `assets/js/catalog.js FEATURED.${kind} must list exactly 3 ids (the hero fan shows three)`);
    for (const id of FEATURED[kind]) {
      assert.ok(ids.has(id), `assets/js/catalog.js FEATURED.${kind} lists '${id}', which is not an id in ${kind.toUpperCase()}`);
    }
  }
});

test('contract 5: every catalog url passes buildLink()', () => {
  for (const [name, items] of [['COURSES', COURSES], ['BOOKS', BOOKS], ['LIVE_CHANNELS', LIVE_CHANNELS]]) {
    for (const item of items) {
      const result = buildLink(item.url, '');
      assert.ok(!result.error, `assets/js/catalog.js ${name} '${item.id}' url '${item.url}' is rejected by buildLink(): ${result.error}. Fix the url, or add its host to ALLOWED_LINK_HOSTS in assets/js/config.js`);
    }
  }
});

test('contract 5: course urls are on edgecoursebd.com, book urls on www.rokomari.com', () => {
  for (const c of COURSES) {
    assert.ok(['edgecoursebd.com', 'www.edgecoursebd.com'].includes(hostOf(c.url)), `assets/js/catalog.js COURSES '${c.id}' url '${c.url}' is not on edgecoursebd.com`);
  }
  for (const b of BOOKS) {
    assert.equal(hostOf(b.url), 'www.rokomari.com', `assets/js/catalog.js BOOKS '${b.id}' url '${b.url}' is not on www.rokomari.com`);
  }
});

test('contract 5: course prices are positive whole numbers, with highlights', () => {
  for (const c of COURSES) {
    assert.ok(Number.isInteger(c.price) && c.price > 0, `assets/js/catalog.js COURSES '${c.id}' price ${JSON.stringify(c.price)} must be a positive whole number of taka`);
    assert.ok(Array.isArray(c.highlights) && c.highlights.length > 0 && c.highlights.every((h) => typeof h === 'string' && h.trim()), `assets/js/catalog.js COURSES '${c.id}' needs a non-empty highlights list of text`);
    assert.ok(typeof c.title === 'string' && c.title.trim(), `assets/js/catalog.js COURSES '${c.id}' has no title`);
  }
  for (const b of BOOKS) assert.ok(typeof b.title === 'string' && b.title.trim(), `assets/js/catalog.js BOOKS '${b.id}' has no title`);
});

// ---------------------------------------------------------------------------------------------
// 6. Config sanity
// ---------------------------------------------------------------------------------------------

test('contract 6: OFFER is running before endsAt, and endsAt carries a time zone', () => {
  assert.match(OFFER.endsAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?(?:\.\d+)?(?:\+06:00|Z)$/, `assets/js/config.js OFFER.endsAt '${OFFER.endsAt}' must be an ISO time ending in +06:00 or Z, for example '2026-11-03T19:00:00+06:00'`);
  const end = Date.parse(OFFER.endsAt);
  assert.ok(Number.isFinite(end), `assets/js/config.js OFFER.endsAt '${OFFER.endsAt}' is not a readable date (the page would show "ended")`);
  assert.equal(getOffer(OFFER, end - 60_000).status, 'running', 'getOffer(OFFER) is not "running" one minute before OFFER.endsAt; check assets/js/config.js OFFER');
  assert.equal(getOffer(OFFER, end).status, 'ended', 'getOffer(OFFER) is not "ended" at OFFER.endsAt');
  for (const k of ['courses', 'books']) {
    const p = OFFER[k] && OFFER[k].percent;
    assert.ok(Number.isInteger(p) && p > 0 && p <= 100, `assets/js/config.js OFFER.${k}.percent ${JSON.stringify(p)} must be a whole number from 1 to 100`);
  }
});

test('contract 6: the coupon code is not empty and uses only A-Z and 0-9', () => {
  assert.match(OFFER.couponCode, /^[A-Z0-9]+$/, `assets/js/config.js OFFER.couponCode '${OFFER.couponCode}' must be non-empty, A-Z and 0-9 only`);
});

test('contract 6: CONTACT.phoneHref matches CONTACT.phone, which uses English digits', () => {
  assert.match(CONTACT.phone, /^[0-9][0-9 -]*[0-9]$/, `assets/js/config.js CONTACT.phone '${CONTACT.phone}' must use English digits (0-9), spaces or dashes only; bind.js and the tel: link depend on it`);
  assert.match(CONTACT.phoneHref, /^tel:\+[0-9]+$/, `assets/js/config.js CONTACT.phoneHref '${CONTACT.phoneHref}' must look like 'tel:+8801XXXXXXXXX'`);
  const local = CONTACT.phone.replace(/\D/g, '').replace(/^0/, '');
  assert.ok(CONTACT.phoneHref.endsWith(local), `assets/js/config.js CONTACT.phoneHref '${CONTACT.phoneHref}' does not end with the digits of CONTACT.phone '${CONTACT.phone}' (${local})`);
});

test('contract 6: the no-script defaults in index.html match config.js', () => {
  for (const t of tags.filter((x) => x.name === 'a' && (x.attrs.href || '').startsWith('tel:'))) {
    assert.equal(t.attrs.href, CONTACT.phoneHref, `index.html has <a href="${t.attrs.href}"> but assets/js/config.js CONTACT.phoneHref is '${CONTACT.phoneHref}'`);
  }
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of clean.matchAll(/<[a-z][^>]*\sdata-bind="(phone|coupon)"[^>]*>([^<]*)</g)) {
    const expected = m[1] === 'phone' ? CONTACT.phone : OFFER.couponCode;
    assert.equal(m[2].trim(), expected, `index.html data-bind="${m[1]}" default text '${m[2].trim()}' differs from config.js ('${expected}'); visitors without script would see the old value`);
  }
});

test('contract 6: TRACKING ids are empty or match the patterns tracking.js enforces', () => {
  const { metaPixelId, gtmContainerId } = TRACKING;
  assert.ok(metaPixelId === '' || PIXEL_ID_RE.test(metaPixelId), `assets/js/config.js TRACKING.metaPixelId '${metaPixelId}' must be '' or match ${PIXEL_ID_RE} (tracking.js would silently load nothing)`);
  assert.ok(gtmContainerId === '' || GTM_ID_RE.test(gtmContainerId), `assets/js/config.js TRACKING.gtmContainerId '${gtmContainerId}' must be '' or match ${GTM_ID_RE} (tracking.js would silently load nothing)`);
  for (const kind of Object.keys(EVENTS)) {
    const name = TRACKING.events[kind];
    assert.ok(typeof name === 'string' && EVENT_NAME_RE.test(name), `assets/js/config.js TRACKING.events.${kind} ${JSON.stringify(name)} must be an event name matching ${EVENT_NAME_RE}; tracking.js EVENTS needs one for '${kind}'`);
  }
});

// ---------------------------------------------------------------------------------------------
// 7. Static outbound links
// ---------------------------------------------------------------------------------------------

test('contract 7: every static https link in index.html opens in a new tab with noopener noreferrer', () => {
  const links = tags.filter((t) => t.name === 'a' && /^https:\/\//i.test(t.attrs.href || ''));
  for (const t of links) {
    assert.equal(t.attrs.target, '_blank', `index.html <a href="${t.attrs.href}"> needs target="_blank"`);
    const rel = (t.attrs.rel || '').toLowerCase().split(/\s+/);
    for (const token of ['noopener', 'noreferrer']) {
      assert.ok(rel.includes(token), `index.html <a href="${t.attrs.href}"> needs rel to contain "${token}" (rel="${t.attrs.rel || ''}")`);
    }
  }
});
