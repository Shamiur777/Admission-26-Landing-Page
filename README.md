# Admission 26 landing page

A static landing page for the Edge Course / Hulkenstein admission courses and QNA Publication books. It is the destination for boosted Facebook/Meta ads. It is plain HTML, CSS and ES modules. There is no build step and no dependencies.

The page runs no server code, has no forms and stores no user data. Enrolment and purchase happen on edgecoursebd.com.

**Deploying it?** Follow `docs/RELEASE-CHECKLIST.md` step by step. It points to the [Deploy](#deploy) section below and to `docs/SECURITY-EDGE.md` for the server headers.

## Folder map

```
index.html              the page (copy lives here)
_headers                security + cache headers (Cloudflare Pages / Netlify format)
assets/css/             styles (fonts.css declares the self-hosted font; tokens.css holds every colour)
assets/fonts/           Kona (QNA Font) as woff2, plus Kona-OFL.txt, its licence
assets/js/config.js     offer (coupon, deadline, percents), phone, tracking IDs, link allowlists
assets/js/offer.js      the Offer module: status, time left, coupon prices, offer text (pure)
tests/                  node:test tests for the Offer module and the index.html meta text
GLOSSARY.md             the page's domain words (Offer, Coupon code, Offer deadline ...)
assets/js/catalog.js    every course, book and category
assets/js/tracking.js   Meta Pixel / GTM loader, the table of event kinds (EVENTS), click events
assets/js/cards.js      course, book and live cards: template contract, link, images, click tag
assets/js/render.js     chips, hero fan, the loops that skip any item with an unsafe link, and the in-list prompt position
assets/js/links.js      buildLink(): pure link check + UTM pass-through
assets/js/*.js          rendering, links, countdown, coupon copy, the shop tabs and chip filters (shop.js)
tests/*.test.js        run: node --test
assets/img/courses/     course banners: <id>-400.webp and <id>-800.webp
assets/img/books/       book covers: <id>.webp, 260x372
deploy/nginx.conf       nginx location blocks
deploy/nginx-security-headers.conf  shared headers, included by nginx.conf
deploy/apache.htaccess  same headers for Apache / cPanel
scripts/                make-image.py (course banners, book covers, og-cover.jpg)
_source/                original JPEGs, local only (git-ignored, do not upload)
PRODUCT.md              design context for the page (not uploaded)
.editorconfig .gitignore  editor and git settings
```

## How to edit

| I want to... | Edit |
| --- | --- |
| Change the coupon code, discount percentages or offer end time | `assets/js/config.js` (`OFFER`: `couponCode`, `endsAt`, `courses.percent`, `books.percent`, `books.upTo`). `endsAt` is ISO time with the +06:00 Bangladesh offset, for example `'2026-11-03T19:00:00+06:00'`. `books: { percent: 20, upTo: true }` prints "২০% পর্যন্ত" (up to 20%); set `upTo: false` for a flat rate. Every number on the page reads from here through `offer.js`. The campaign checklist at the top of `config.js` lists the spots typed by hand: `<title>`, meta description, `og:description` and `twitter:description` in `index.html` (`node --test` fails if they drift from `OFFER`), plus the share picture, which you redraw with `python scripts/make-image.py og`. |
| Change the phone number | `assets/js/config.js` (`CONTACT`) |
| Add, remove, reorder or edit a course or book | `assets/js/catalog.js`, plus the banner image for a course or the cover image for a book (below) |
| Change headlines, text, button labels | `index.html` |
| Link to a new website | Add its host to `ALLOWED_LINK_HOSTS` in `config.js`, or the link will not render |
| Pass UTM/fbclid to another host | Add it to `ATTRIBUTION_HOSTS` in `config.js` |

### Safe to change / change with care

Developers can edit freely in the first group. The second group is wired to other files; change one side and the test named here fails, with the file and item to fix.

| Safe to change (plain data) | What to know |
| --- | --- |
| `assets/js/config.js` | Offer, phone, tracking IDs. `tests/contract.test.js` (contract 6) checks the format: coupon code A-Z0-9, `endsAt` with `+06:00` or `Z`, phone digits match `phoneHref`, tracking IDs. `tests/meta.test.js` checks the hand-typed meta text. |
| `assets/js/catalog.js` | Courses, books, categories, `FEATURED`. Contract 5 checks unique ids, categories, FEATURED ids, link hosts, prices; `scripts/validate.mjs` checks the images exist. |
| Copy in `index.html` | Edit text freely. Keep the `data-*` attributes and ids. |
| `assets/css/tokens.css` | Colours, type, space. Contract 4 fails on a `var(--x)` with no definition and on a hex colour outside this file. |

| Change with care (wired together) | Guarded by |
| --- | --- |
| `<template id="tpl-…">` in `index.html` and `cards.js` (`data-part` names) | Contract 2 in `tests/contract.test.js` |
| `data-bind` / `data-bind-label` in `index.html` and `bindTables()` in `bind.js` | Contract 3 |
| Ids and `data-*` hooks in `index.html` and the lookups in `shop.js`, `main.js`, `coupon.js`, `countdown.js`, `render.js`, `tracking.js` | Contract 1. Contract 9 fails if JS finds an element by a CSS class: use a `data-` hook |
| Outbound links in `index.html` (`target`, `rel`) | Contract 7 |
| CSP in `index.html`, `_headers`, `deploy/nginx-security-headers.conf`, `deploy/apache.htaccess` | `tests/headers.test.js` |
| Cache rules in `_headers`, `deploy/nginx.conf`, `deploy/apache.htaccess` | `tests/headers.test.js` (html, js, css `no-cache`; images and fonts immutable) |
| Files allowed in `assets/`, missing images, inline script or style | `scripts/validate.mjs` (run by `tests/validate.test.js`) |

When a lookup targets an element that JS builds itself (not in `index.html`), add it to `CREATED_BY_JS` in `tests/contract.test.js` with the reason.

### Deadline in words, prompts and copy messages

`offer.js` turns `endsAt` into a Bangla label in Bangladesh time (`deadlineLabel()`, exposed as `labels.deadline`), for example "৩ নভেম্বর, সন্ধ্যা ৭টা". It shows under the coupon slip and in the top bar, and follows `endsAt` with no other edit. Each list has a slim prompt after its sixth card ("QNA-র ১৮টি বইও আছে" in the courses list, "২৪টি কোর্সও আছে" in the books list). The prompts are `[data-prompt]` links in `index.html`; `render.js` places them after the sixth card (`promptIndex()` decides the position, tested in `tests/render.test.js`) and `shop.js` does not count them as cards. After a coupon copy tap the page shows a message for 3 seconds (`labels.copied`, or `labels.copyFailed` with the code if the browser blocks the clipboard; both live in `offer.js`, and `copyFeedback()` in `coupon.js` picks between them, tested in `tests/coupon.test.js`) and selects the code text so a long-press can copy it.

### Font and colours

The whole page is set in one family, Kona (the QNA Font), regular and bold, from `assets/fonts/kona-regular.woff2` and `kona-bold.woff2`. They are subsets with Bengali, Latin and punctuation. The fallback stack is Kalpurush, then Noto Sans Bengali. Kona has no check mark, so "কপি হয়েছে" shows a drawn tick icon (`#i-check` in the sprite). Do not type "✓" in the copy: it would fall back to another font.

Kona is licensed under the SIL Open Font License 1.1. `assets/fonts/Kona-OFL.txt` is that licence and must be uploaded with the font files (`validate.mjs` and `stage.mjs` allow exactly that one `.txt`). Kona descends from Kalpurush (OmicronLab) for Bengali and Liberation Serif for Latin; the licence file names both. The footer names it only as "QNA Font"; never show "Kona" to visitors.

Colours are CSS custom properties in `assets/css/tokens.css`: near-black ink, warm paper, white cards and one accent, green. Green is only a fill, a mark or an underline, never text on a light background.

### Page order and shop tabs

The page runs top to bottom as: offer bar, hero, free guideline lives, shop, how to use the coupon, FAQ, footer. The shop has two ARIA tabs, courses and books, and one list shows at a time. Links to `#courses` and `#books` select the right tab and scroll to it (changing tab on the page also updates the hash, so a shared or reloaded URL opens the same tab), so an ad can point at `https://edgecoursebd.com/admission26/#books`. The hero's two path tiles and the sticky bottom bar use the same links.

The two hero tiles each show a fan of three pictures. Which ones is set by `FEATURED` at the bottom of `catalog.js` (item ids; the middle one sits in front). The same fans appear on the hand-off card at the end of each list ("এবার QNA-র বইগুলো দেখো" after the courses, "কোর্সগুলো দেখো" after the books). Those cards are plain links to `#books` and `#courses`, so they use the same tab switching as every other link. The two tabs are green buttons with an icon; the open one turns ink with a green underline.

Every outbound link opens in a new tab. This is set in one place, `setLink()` in `assets/js/cards.js`; `buildLink()` in `assets/js/links.js` vets the URL first.

When the offer ends (`OFFER.endsAt` passes), `bind.js` adds `offer-ended` to `<html>`, live, without a reload. The countdown, ticket, coupon prices and book tags hide and the offer bar says the offer is over. That text is in `index.html`; `offer.js` only reports the status (`running` or `ended`). An `endsAt` that cannot be read counts as ended, so a typo never shows a false discount. To test it, set `endsAt` to a past date, look, then set it back.

`offer.js` is pure: `getOffer(OFFER, now)` takes the time as an argument and never reads the clock. `bind.js` is its only DOM adapter: it writes every `data-bind` text and `data-bind-label` screen-reader label (aria-labels that mention the coupon code) from it. To show offer text in a new place, add a label in `offer.js` and a `data-bind` or `data-bind-label` attribute in `index.html`.

### Tests

`node --test` runs the tests in `tests/` (Node 20 or newer, nothing to install). `offer.test.js` checks the Offer module: status at the deadline, time left, coupon prices, labels. `contract.test.js` checks the couplings between `index.html`, the JS, the CSS, the catalog and the config (see the table above). `meta.test.js` fails unless the `<title>` and the meta, `og:` and `twitter:` descriptions in `index.html` carry the current coupon code, course percent and book percent from `config.js`.

### Share picture

`python scripts/make-image.py og` redraws `assets/img/og-cover.jpg` (needs pillow) from the coupon code and percents in `config.js`. The text is English, because PIL cannot shape Bangla. It fails loudly if it cannot read `OFFER`. It uses Windows fonts (Impact, Arial Bold); on another system change the font paths at the top of the script. Use a new file name if the old picture is cached by Facebook.

### Course banner images

Each course needs two files named after its `id` in `catalog.js`:

```
assets/img/courses/<id>-400.webp
assets/img/courses/<id>-800.webp
```

Make them with the script (needs `pip install pillow`):

```
python scripts/make-image.py course _source/my-banner.jpg du-a-unit-written
```

It writes both sizes and upscales to 800 if the source is smaller. You can also export both sizes by hand at squoosh.app (WebP, quality about 80).

### Book cover images

Each book needs one file named after its `id` in `catalog.js`, 260x372:

```
assets/img/books/<id>.webp
```

```
python scripts/make-image.py book _source/my-cover.jpg ju-highlights
```

It crops to the cover shape and writes the WebP. A book without a cover image shows a broken image, so add the image before the catalog entry.

Always use a new file name for a changed image (for example `sust-crash-v2` as the id, or a new id). Images are cached for a year, so overwriting a file under the same name will not reach returning visitors.

## Tracking

Paste the IDs into `TRACKING` in `assets/js/config.js`:

```js
metaPixelId: '123456789012345',   // 10 to 20 digits
gtmContainerId: 'GTM-XXXXXXX',
```

Leave a value empty to turn that tag off. A badly formatted ID is ignored, and the console warns. The page does nothing with analytics until you add an ID.

Events fire on click and never delay the click. Meta usually sends them with `sendBeacon`, so they complete even as the browser leaves the page.

`cards.js` marks each outbound link through `tagLink()` in `tracking.js`, which sets `data-track="courseClick|bookClick|liveClick"` plus `data-track-id`, `data-track-name` and `data-track-category`. One delegated listener (`initClickTracking`) reads those attributes. To track a new kind of link, add a row to the `EVENTS` table in `tracking.js` (and its Meta event name to `TRACKING.events`). `window.fbq` and `dataLayer` sit behind an adapter (`browserAdapter`), so tests run against a recording fake. The pixel loads with `autoConfig` off, so Meta does not scrape button text. In Meta Events Manager, also turn off Automatic Advanced Matching unless you want it.

| Action on the page | `kind` | Default Meta event | GTM `dataLayer` event |
| --- | --- | --- | --- |
| Course button | `courseClick` | `InitiateCheckout` | `courseClick` |
| Book button | `bookClick` | `InitiateCheckout` | `bookClick` |
| Copy coupon | `couponCopy` | `CopyCoupon` (custom) | `couponCopy` |
| Live channel button | `liveClick` | `JoinLive` (custom) | `liveClick` |

Change the Meta event names in `TRACKING.events`. Standard names (`InitiateCheckout`, `ViewContent`, `Lead`, `Contact`, `AddToCart`, `Purchase`, `CompleteRegistration`, `Search`) go out with `fbq('track')`. Anything else goes out as a custom event. Only these params are ever sent: `content_name`, `content_category`, `content_ids`, `content_type`, `currency`, `value`.

**Purchases happen on edgecoursebd.com**, not here. This page can only report clicks. The `Purchase` event, and ideally the Conversions API, must be set up on the main site's checkout. Without that, Meta cannot optimise ads for sales.

**UTM and fbclid pass-through.** The page copies `utm_*` and `fbclid` from its own URL onto outbound links to hosts in `ATTRIBUTION_HOSTS`. The params copied are listed in `ATTRIBUTION_PARAMS` in `config.js`. This lets the main site see which ad sent the visitor. Other hosts get no params.

**Noscript pixel.** Not included: the page needs JavaScript to show the offer, and we keep `index.html` free of tag code. To add the fallback anyway, put this in `index.html` (`img-src` already allows facebook.com):

```html
<noscript><img height="1" width="1" alt="" src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"></noscript>
```


### Adding a new tracking host to the CSP

The policy lives in four places. Edit all of them, then re-test:

1. `index.html`, the `<meta http-equiv="Content-Security-Policy">` tag
2. `_headers`
3. `deploy/nginx-security-headers.conf`
4. `deploy/apache.htaccess`

`index.html` is the only one without `frame-ancestors 'none'`, because meta tags cannot express it.

Add the script host to `script-src` and, usually, its collection endpoints to `connect-src` and `img-src`. Never add `'unsafe-inline'` or `'unsafe-eval'`. If a tag needs them, it does not belong on this page.

## Deploy

The page is live at `https://hulkenstein.com/admission26/`, served by a Cloudflare Worker (static assets only) on the hulkenstein.com zone. To update it:

1. `node --test` passes.
2. `node scripts/stage-cloudflare.mjs` builds `dist-cloudflare/`: the staged files under `admission26/`, plus `_headers` with every path prefixed by `/admission26`.
3. `npx wrangler deploy --config deploy/cloudflare/wrangler.jsonc --env-file .env.cloudflare` uploads it. On Windows PowerShell use `npx.cmd`. `.env.cloudflare` holds one line, `CLOUDFLARE_API_TOKEN=...`, a token made from the "Edit Cloudflare Workers" template and limited to the hulkenstein.com zone. It is git-ignored. Never commit or print it.
4. `node scripts/probe.mjs https://hulkenstein.com/admission26/` passes.

The Worker answers only `hulkenstein.com/admission26*`. Every other hulkenstein.com path still redirects to edgecoursebd.com as before.

To host it on another server instead (for example `https://edgecoursebd.com/admission26/`), change `canonical`, `og:url`, `og:image` and `twitter:image` in `index.html` to the new address, then:

- Upload exactly `index.html` and `assets/` to `admission26/` under the web root. Everything else stays in the repo. On Laravel that is `public/admission26/`. Real files are served directly, so the page never touches PHP, sessions or the database.
- Apply the headers. Use whichever matches the server:
  - Cloudflare Pages / Workers static assets / Netlify: `_headers` at the root of the deployed folder. If the folder is served under `/admission26/` on a bigger site, prefix every path in the file with `/admission26/`.
  - nginx: `deploy/nginx.conf` (edit the `alias` and include paths) and `deploy/nginx-security-headers.conf`. Not tested with `nginx -t`, so run that first.
  - Apache / cPanel: `deploy/apache.htaccess`, saved as `.htaccess` inside `admission26/`. If you get a 500 error, delete the `Options` line.
- Check the live URL with `?utm_source=test`, for example `https://edgecoursebd.com/admission26/?utm_source=test`. Click a course and confirm the outbound URL carries `utm_source=test`.
- Do not deploy over the main site's own `.htaccess`, `_headers` or nginx config. These headers belong to this folder only. If the main site already sets its own CSP, check that the page's policy is the one the browser receives.

**Cache:** html, js and css are sent with `Cache-Control: no-cache`. File names have no hash, so the browser asks the server every time and gets a cheap 304 (via ETag or Last-Modified) when nothing changed. A returning visitor can then never load a mix of old and new ES modules after a deploy. Images and fonts are cached for a year, which is why a changed image needs a new name. `tests/headers.test.js` checks this in `_headers`, `deploy/nginx.conf` and `deploy/apache.htaccess`.

**Local preview:** ES modules do not run from `file://`. From the project folder run `npx serve .` and open the address it prints.

## Security notes

- **Strict CSP, no inline JavaScript.** Scripts load only from this origin, Meta and Google Tag Manager. A bug in a catalog entry cannot run injected script.
- **Link host allowlist.** `ALLOWED_LINK_HOSTS` stops a typo or a tampered catalog from sending visitors to an unexpected site.
- **`textContent` only.** Catalog text is written to the page as text, never as HTML.
- **No forms, no user data.** `form-action 'none'`. The page collects nothing.
- **No cookies from the page itself.** Meta and GTM set their own cookies once enabled. If you serve visitors who need a consent notice, handle that with GTM consent mode or the main site's banner.
- **Not frameable.** `frame-ancestors 'none'` and `X-Frame-Options: DENY` block clickjacking.
- **Separate path.** On a static folder the page cannot reach the main app. A bad deploy here cannot change checkout.

If edgecoursebd.com is behind Cloudflare:

- Turn on Always Use HTTPS. Set HSTS at the domain level, deliberately, as the site owner. This folder does not set it, because a subfolder must not decide a domain-wide policy.
- Keep WAF managed rules on.
- Be careful with Bot Fight Mode and Super Bot Fight Mode. They can challenge real people arriving from Meta's in-app browser and waste ad spend. Test from a phone on mobile data first, and use a rule that skips the challenge for `/admission26/*` if needed.
- Do not cache HTML, JS or CSS at the edge without revalidation. Respect the `no-cache` headers above.
- After a deploy, purge the cache for the changed files.

## Pre-launch checklist

- [ ] Meta Pixel ID set in `config.js` (and GTM ID if used)
- [ ] Pixel verified with Meta Pixel Helper and Events Manager "Test events": `PageView` on load, `InitiateCheckout` on a course click, `CopyCoupon` on copy
- [ ] Purchase event / Conversions API set up on the main site's checkout
- [ ] Offer end time (`endsAt`) and coupon code are correct
- [ ] Every course and book link clicked and opens the right page
- [ ] A link opened with `?utm_source=test&fbclid=test` passes both params to edgecoursebd.com
- [ ] Headers verified with securityheaders.com (aim for A or A+) and no CSP errors in the browser console
- [ ] Lighthouse mobile run, with no blocked or missing images
- [ ] Opened on a real phone from a Facebook link (in-app browser)
- [ ] `_source/`, `README.md`, `deploy/` and `scripts/` not uploaded to the public folder
