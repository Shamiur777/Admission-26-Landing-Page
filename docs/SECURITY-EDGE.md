# Edge and dashboard checklist

For the owner or developer of edgecoursebd.com. The page is a static subfolder (`/admission26/`) on that domain, so these settings belong to the domain, not to this repo. A deploy does not apply them. Tick each box with the owner and record the date in `HANDOFF.md`.

Who does it: the developer or domain owner, unless noted.

## Transport

- [ ] SSL/TLS mode is Full (strict).
- [ ] Always Use HTTPS is on. Automatic HTTPS Rewrites is on.
- [ ] Minimum TLS version is 1.2.
- [ ] HSTS decision made at domain level. The page's headers leave HSTS out on purpose, because it affects every subdomain. If enabled, start with a short max-age, then raise it. Record the choice.
- [ ] `www` redirects to the apex (or the reverse), and `http` to `https`, in one hop.

## WAF and bots

- [ ] Cloudflare Managed Ruleset and OWASP Core Ruleset are deployed at paranoia level 1. Watch Security Events for a week before raising it.
- [ ] Bot Fight Mode is on. Watch that it does not challenge Facebook's in-app browser. Ad traffic arrives from it, and a challenge there means lost clicks. Check Security Events for challenges on `/admission26/` after the first boosted day. Add a skip rule if needed.
- [ ] Browser Integrity Check is on. Security level is Medium.

## Rate limiting

- [ ] Optional: one rate rule for `/admission26/`, by IP, for example 300 requests per minute with a managed challenge. The page is static and cached, so this is low value. Skip it if the plan allows only one rule and the shop needs it more.

## Headers

- [ ] The headers in `_headers` (or `deploy/nginx-security-headers.conf`, `deploy/apache.htaccess`) are applied to `/admission26/*`, with the path prefix. Confirm with `node scripts/probe.mjs <url>`.
- [ ] Remove `Access-Control-Allow-Origin: *` from responses under `/admission26/`. The page needs no cross-origin reads. If the main domain needs it elsewhere, scope it to the paths that do.
- [ ] No second, conflicting `Content-Security-Policy` header from the main site. Two policies combine and the stricter one wins on each directive.

## Indexing

- [ ] Preview hosts (`admission26-preview.vercel.app`) send `X-Robots-Tag: noindex`, or the preview is deleted after launch.
- [ ] The real URL is indexable and `index.html` canonical matches the final path.

## Alerts and emergency

- [ ] HTTP DDoS attack alert goes to the owner.
- [ ] Rate Limiting alert goes to the owner, if a rate rule exists.
- [ ] The owner knows that Under Attack Mode is the emergency switch.

## Not applicable to this page

Leaked credentials detection, Turnstile, `/api/*` cache rules and per-route API rate rules. The page has no login, forms or API.
