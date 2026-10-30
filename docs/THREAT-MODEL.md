# Threat model: Admission 26 landing page

Scope: the static page in this repo (`index.html`, `assets/`) as served from a subfolder of edgecoursebd.com, plus its build and upload path. Last reviewed 2026-10-31. Format follows playbook 2.1.

The page has no server code, no forms, no logins, no payments and sets no cookies of its own. Most classic web threats do not apply. What is left is script injection, link abuse, a wrong offer, and what the shared domain does around the page.

## Assets

- The main domain's reputation and cookies. The page shares an origin with edgecoursebd.com, so script that runs here can read that site's cookies and storage.
- Ad budget and attribution (Meta ads, UTM, fbclid, pixel events).
- Visitor trust. A visitor must land on the real shop, not a lookalike.
- Correctness of the coupon offer: code, percentages, deadline.

## Principals

Anonymous visitor (including anyone who crafts a URL for a visitor), the site owner, the developer who uploads to the main domain, the main domain's operator, Meta and Google (third-party script hosts), GitHub and CI, AI coding agents.

## Trust boundaries

1. Catalog and config (`assets/js/catalog.js`, `config.js`) to the DOM and outbound links.
2. Landing URL (query and hash) to outbound links and to the shop tabs.
3. Third-party scripts: Meta Pixel and GTM.
4. The hosting folder on the main domain.
5. The build and upload step (stage, then upload).
6. CI.

## Entry points

The landing URL, including `?utm_*`, `fbclid`, and `#courses`, `#books`, `#courses/<category>`. Clicks on outbound links and on the coupon copy button. Nothing else: no forms, no API, no cookies.

## Data flows

- UTM and fbclid: landing URL, then `buildLink()`, then links to edgecoursebd.com only.
- Pixel events: click, then `buildEvent()`, then `fbq` or `dataLayer`. Only whitelisted, type-checked fields leave the page (`tracking.js`).
- Offer values: `config.js`, then `offer.js`, then `bind.js`, then the DOM. The clock is read in the browser only.

## Threats

| # | Threat | Principal | Boundary | Concrete result | Control or gap |
|---|---|---|---|---|---|
| 1 | Open redirect or phishing link from a bad catalog entry or a crafted URL | Attacker, or an editor making a typo | 1, 2 | Visitor leaves for a lookalike site wearing the owner's brand | Control: `buildLink()` allows only https, no credentials, no port, and hosts in `ALLOWED_LINK_HOSTS` (`assets/js/links.js`, `config.js`). The render loops skip bad items (`render.js`). Tested in `tests/links.test.js`. The URL is never used as a link target. |
| 2 | XSS through data or the URL | Attacker | 1, 2 | Script runs on the main domain and can read its cookies | Control: strict CSP with no inline script (`_headers`, `deploy/`, meta tag in `index.html`). The hash selects a tab only if it matches a known name (`shop.js`, `resolveHash`). Gap: the full CSP holds only if the developer applies the headers; the meta tag is the fallback. |
| 3 | Ad parameters leak to third parties | Landing URL | 2 | Click ids sent to books or social hosts | Control: params go only to `ATTRIBUTION_HOSTS`, only listed keys, values cut to 200 characters (`links.js`). |
| 4 | Clickjacking | Attacker site | 4 | Page framed to hijack clicks | Control: `frame-ancestors 'none'` and `X-Frame-Options: DENY` (`_headers`, `deploy/`). A meta CSP cannot carry `frame-ancestors`, so this depends on headers being applied. |
| 5 | Stray files published (notes, PSD sources, `_source/`, `.git`) | Developer upload | 4, 5 | Private notes or source art become public on the main domain | Control: `.gitignore`; `deploy/nginx.conf` returns 404 for everything except `index.html` and `assets/`. Gap: staging and the validator (`scripts/stage.mjs`, `scripts/validate.mjs`) are being written. Until they are used, a hand upload of "the folder" is the risk. |
| 6 | Tampered Meta or GTM script | Third party | 3 | Arbitrary script on the main domain | Partly accepted. CSP limits script hosts to two. IDs are empty by default and pattern-checked (`tracking.js`). Subresource Integrity is not possible for these loaders. |
| 7 | GTM used to inject arbitrary script | Anyone who can publish in the GTM container | 3 | A custom HTML tag runs any code | Gap, inherent to GTM. CSP does not stop it because GTM is an allowed script host. Limit publish rights, require 2-step login, review changes, or use the Pixel alone. |
| 8 | Stale or false offer after expiry | Time | 1 | Visitor sees a coupon that no longer works | Control: `getOffer()` reports `ended` after `endsAt`; an unreadable date counts as ended; `bind.js` flips the page live (`tests/offer.test.js`). Hand-typed meta text is checked by `tests/meta.test.js`. Limit: a wrong device clock shows the wrong state; the shop must enforce the coupon itself. |
| 9 | Preview copies indexed | Search engines | 4 | A copy on `admission26-preview.vercel.app` competes with the real URL | Gap: no `noindex` for preview hosts yet (`docs/SECURITY-EDGE.md`). `index.html` sets the canonical URL. |
| 10 | Weakened checks or added network calls reach production through CI or an agent | Contributor, agent | 6 | Tampered code is published | Control: agents do not push or deploy (`CLAUDE.md`); the owner reviews diffs. Gap: CI is being added by another workstream and is not yet recorded. |
| 11 | Wide CORS or missing HSTS on the main domain | Domain operator | 4 | Other sites read responses; downgrade attacks | Not controlled here. Listed in `docs/SECURITY-EDGE.md`. |

## Assumptions that most affect ranking

- The page is served on the same origin as the main shop. On its own subdomain, threats 2 and 6 would drop from high to low.
- The developer, not the owner, uploads files and applies headers.
- The page collects no personal data.

## Open questions

- Does the main site's privacy policy cover Meta Pixel use from this page?
- Will the developer apply `_headers` or the nginx or Apache snippets?
- The meta CSP in `index.html` uses `base-uri 'none'`; the header copies use `'self'`. Pick one so the three copies match.

## Out of scope

The main site's accounts, checkout and payments. Rokomari, Facebook and YouTube themselves. Visitor devices. The owner's Meta and Google account security. Network-level DDoS (the domain's edge handles it).
