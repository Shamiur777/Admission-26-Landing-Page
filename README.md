# Admission 26 landing page

A static landing page for the Edge Course / Hulkenstein admission courses and QNA Publication books. It is the destination for boosted Facebook/Meta ads. It is plain HTML, CSS and ES modules. There is no build step and no dependencies.

The page runs no server code, has no forms and stores no user data. Enrolment and purchase happen on edgecoursebd.com.

## Folder map

```
index.html              the page (copy lives here)
_headers                security + cache headers (Cloudflare Pages / Netlify format)
assets/css/             styles (fonts.css declares the self-hosted fonts)
assets/fonts/           self-hosted font files (woff2)
assets/js/config.js     coupon, offer end time, phone, tracking IDs, link allowlists
assets/js/catalog.js    every course, book and category
assets/js/tracking.js   Meta Pixel / GTM loader and click events
assets/js/*.js          rendering, links, countdown, coupon copy, filters
assets/img/courses/     course banners: <id>-400.webp and <id>-800.webp
assets/img/books/       book covers: <id>.webp, 260x372
deploy/nginx.conf       nginx location blocks
deploy/nginx-security-headers.conf  shared headers, included by nginx.conf
deploy/apache.htaccess  same headers for Apache / cPanel
scripts/                make-image.py (course banners and book covers)
_source/                original JPEGs, local only (git-ignored, do not upload)
.editorconfig .gitignore  editor and git settings
```

## How to edit

| I want to... | Edit |
| --- | --- |
| Change the coupon code, discount percentages or offer end time | `assets/js/config.js` (`OFFER`). `endsAt` is ISO time with the +06:00 Bangladesh offset. |
| Change the phone number | `assets/js/config.js` (`CONTACT`) |
| Add, remove, reorder or edit a course or book | `assets/js/catalog.js`, plus the banner image for a course or the cover image for a book (below) |
| Change headlines, text, button labels | `index.html` |
| Link to a new website | Add its host to `ALLOWED_LINK_HOSTS` in `config.js`, or the link will not render |
| Pass UTM/fbclid to another host | Add it to `ATTRIBUTION_HOSTS` in `config.js` |

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

`render.js` marks each outbound link with `data-track="courseClick|bookClick|liveClick"` plus `data-track-id`, `data-track-name` and `data-track-category`. One delegated listener (`initClickTracking` in `tracking.js`) reads those attributes. To track a new link, add those attributes. The pixel loads with `autoConfig` off, so Meta does not scrape button text. In Meta Events Manager, also turn off Automatic Advanced Matching unless you want it.

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

The page is a folder of static files. Put it at `https://edgecoursebd.com/admission26/`.

- Upload exactly `index.html` and `assets/` to `admission26/` under the web root. Everything else stays in the repo. On Laravel that is `public/admission26/`. Real files are served directly, so the page never touches PHP, sessions or the database.
- Apply the headers. Use whichever matches the server:
  - Cloudflare Pages / Workers static assets / Netlify: `_headers` at the root of the deployed folder. If the folder is served under `/admission26/` on a bigger site, prefix every path in the file with `/admission26/`.
  - nginx: `deploy/nginx.conf` (edit the `alias` and include paths) and `deploy/nginx-security-headers.conf`. Not tested with `nginx -t`, so run that first.
  - Apache / cPanel: `deploy/apache.htaccess`, saved as `.htaccess` inside `admission26/`. If you get a 500 error, delete the `Options` line.
- Check the live URL with `?utm_source=test`, for example `https://edgecoursebd.com/admission26/?utm_source=test`. Click a course and confirm the outbound URL carries `utm_source=test`.
- Do not deploy over the main site's own `.htaccess`, `_headers` or nginx config. These headers belong to this folder only. If the main site already sets its own CSP, check that the page's policy is the one the browser receives.

**Cache:** html, js and css are cached for 5 minutes. File names have no hash, so a short cache makes edits show up quickly. Images and fonts are cached for a year, which is why a changed image needs a new name.

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
- Do not cache HTML for long at the edge. Respect the 5-minute headers above.
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
