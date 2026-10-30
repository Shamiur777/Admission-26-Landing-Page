# HANDOFF

## What this is

The Admission 26 landing page for Edge Course / Hulkenstein courses and QNA Publication books. Static HTML, CSS and ES modules. It is the destination for boosted Facebook ads. The owner's developer will upload it as a subfolder of the main site (likely https://edgecoursebd.com/admission26/). A temporary preview runs at https://admission26-preview.vercel.app.

## Status (2026-10-31)

- Page is built, redesigned and tested (`node --test`).
- The offer runs until 2026-11-03 19:00 +06:00.
- Meta Pixel ID and GTM ID are not set yet. Tracking is off until the owner supplies them.
- Playbook alignment is done for everything that applies to a static page: docs, headers, CSP guard test, validator, allowlist staging (`dist/`), live probe script, CI, and one audit loop (see the log).
- The final URL path on the main domain is not confirmed.
- All work is committed and pushed. 63 tests pass (`node --test`).
- Confirmed by the owner (2026-10-31): REVENGE gives the book discount on Rokomari.

## Decisions made

- Static, no build, vanilla ES modules. No dependencies.
- Strict CSP with no inline script. The same policy lives in `index.html` (meta), `_headers` and `deploy/`.
- Outbound links must pass a host allowlist (`ALLOWED_LINK_HOSTS`).
- UTM and fbclid go only to edgecoursebd.com (`ATTRIBUTION_HOSTS`).
- Meta `autoConfig` is off, so Meta does not scrape button text.
- HSTS is left to the owner of the main domain.
- Offer deadline is 2026-11-03 19:00 +06:00. Code `REVENGE`: 40% on courses, up to 20% on books.
- Phone numbers use English digits. Everything else uses Bangla digits.
- Books are bought on Rokomari: each card links to its product page,. The header line links to the QNA publisher page on Rokomari and to qnapublication.com; the footer links to qnapublication.com (owner request, 2026-10-31). Course links go to edgecoursebd.com.
- All outbound links open in a new tab.
- The shop has two tabs. `#courses` and `#books` are deep links, so ads can point straight at either.

## Constraints

- The main domain is not under the owner's control. Headers, HSTS, CORS and WAF are the developer's to apply (`docs/SECURITY-EDGE.md`).
- No forms, logins, payments or cookies of our own. Keep it that way.
- Do not invent numbers, testimonials or dates.

## Credentials (locations only)

- Meta Pixel ID and GTM container ID: go in `assets/js/config.js`. They are public IDs, not secrets.
- Vercel preview: the owner's own Vercel account. No token is stored in the repo.
- `Links and Other info.txt` holds the owner's notes. It is git-ignored and never read by agents or uploaded.

## How to resume

1. Read `CLAUDE.md`, `README.md`, `GLOSSARY.md`.
2. Run `node --test`.
3. Serve locally with `python -m http.server 8080`.
4. Before a release, follow `docs/RELEASE-CHECKLIST.md`.
5. Open items: Pixel and GTM IDs, final URL path, privacy policy coverage of the Pixel, `noindex` on the preview host, header application by the developer.

## Log

### 2026-10-30

- Initial build and first commit `ffb7c96`. Real links checked and course and book links verified. Books link directly to Rokomari product pages.
- Round-2 security fixes: link host allowlist, strict CSP, safe link building, tracking ID checks. These landed in the first commits. Exact commit not recorded. Verify with `git log -p` if needed.
- `abcb615` Ignore Photoshop source files.

### 2026-10-31

- `4231ea2` Redesign: live links at the top, courses and books as equal paths.
- `9412a4f` Original covers for the GST, HSTU, IUT and Agriculture books.
- `3a0a873` Offer and Shop modules deepened, tests and GLOSSARY.md added.
- Playbook alignment (commit 964e673): `CLAUDE.md`, this file, `docs/THREAT-MODEL.md`, `docs/SECURITY-EDGE.md`, `docs/RELEASE-CHECKLIST.md`; CORP, X-Permitted-Cross-Domain-Policies, `base-uri 'none'`, Pages ACAO stripped, preview noindex; `tests/headers.test.js`; `scripts/validate.mjs`, `scripts/stage.mjs`, `scripts/probe.mjs`; `.github/workflows/ci.yml` (actions pinned to SHAs, checked against tags). Footer links to the main site's privacy, terms and refund pages.
- Audit loop (playbook 14.6): sharp-edges, fp-check, differential review, secrets and Actions review by a read-only agent. 9 candidates, 2 confirmed (both Low), 7 false positive or informational. Fixed with regression tests in `tests/audit-fixes-2026-10-31.test.js`: F1 ad params forwarded only if plain characters and at most 200; F2 Apache now allowlists `index.html` and `assets/` like nginx. Sharp edges fixed too: a deadline without an offset or a percent outside 0-100 counts as ended; `bind.js` uses own-property lookups. Not done: semgrep (binary not installed), owasp-top-10-testing (live exploit agents, not authorised), live probes on edgecoursebd.com (production; the developer runs `node scripts/probe.mjs` after deploying).
- Round 5: Kona ("QNA Font") is the only font, with a footer credit and OFL file. Ink + saffron palette replaces orange and green. Tabs are coloured buttons, and hand-off cards sit at the end of each list.
- LLM Council (`llm-council` skill): 5 Sonnet/Haiku advisors as Bangladeshi visitors, anonymous peer review, chairman verdict. Round 6 fixes from it:
  - A primary "কোর্স আর বই দেখো" hero button.
  - The open tab is saffron and the closed tab is a raised white button.
  - In-list prompts that cross between courses and books.
  - The "কুপনসহ" price with a ৪০% tag and a checkout hint.
  - Copy success and failure messages.
  - Wrapping chips.
  - A deadline in words (`labels.deadline`, tested).
  - At most two pinned bars.
  - A Bangla brand line and category tags.
  - A Bangla Rokomari button.
- Rejected from the council: English digits for percentages (owner rule), and moving live links down (owner request).
- Left for the owner: per-course Bangla descriptions, and a real Android test in the Facebook browser.
- Accent colour changed from saffron to Hulkenstein green #01AD01 (sampled from the logo) at the owner's request. Tokens are `--color-green*`. Ink text on green is 6.28:1. Green is never used as text on a light background. Share image redrawn. Browser-tab icon is the Hulkenstein arms-and-brain mark.
- Focused security review of 65f3099..HEAD (differential-review, sharp-edges, fp-check, manual secrets sweep of tracked files plus a git-history pattern scan): 5 candidates, all false positive. No innerHTML or other HTML sinks; CSP identical in 4 places; new static outbound links are constant https with noopener noreferrer; the staged folder holds only allowed files. Added a test pinning `ALLOWED_FILES` to the font licence. Not run: the ghost-scan-secrets binary (manual sweep instead).

## Playbook section 16 checklist (static page)

### Setup
- [x] Threat model written (`docs/THREAT-MODEL.md`)
- [x] `CLAUDE.md` and `HANDOFF.md` created
- [ ] Repo private (owner to confirm; not checked here)
- [x] `.gitignore` has secret and scratch patterns (`.env*`, `.claude/`, `_source/`, `Links and Other info.txt`)
- [x] Test harness exists (`node --test`, `tests/`)
- [ ] Owner questions answered and recorded (partly: see Decisions)
- N/A `docs/CONVENTIONS.md`: README.md and GLOSSARY.md hold the conventions for a page this size.

### Architecture
- N/A Platform seam, scope module, audited writes, locks, migrations: no server or database.
- [x] Dangerous switches default off: Pixel and GTM IDs are empty; Meta `autoConfig` off (`tracking.js`).

### Authentication, Authorization, Payments
- N/A No logins, roles or payments. Checkout is on edgecoursebd.com and rokomari.com.

### Input, output, files
- [x] Outbound URLs validated (`links.js`); URL hash accepted only if it matches a known tab (`shop.js`)
- N/A Body size caps, SQL, uploads, server fetch: no server.

### Transport
- [x] CSP without inline script, `object-src 'none'`, `frame-ancestors 'none'` (`_headers`, `deploy/`); nosniff, frame denial, COOP, Permissions-Policy, Referrer-Policy present
- [ ] `base-uri 'none'` in all copies (meta says `'none'`, header copies say `'self'`)
- [ ] CORP header (not in `_headers`)
- N/A HSTS here: left to the domain owner (see `docs/SECURITY-EDGE.md`)
- N/A Credentialed CORS, CSRF, API `no-store`, `no-referrer` on token paths: no API, no tokens.

### Privacy
- [x] No personal data collected; tracking sends only whitelisted fields; `autoConfig` off
- [x] No personal data in URLs (UTM and fbclid pass through only to edgecoursebd.com)
- [ ] Privacy policy linked in the footer (linked; confirm it covers the Pixel)
- N/A Telemetry scrubber, consent log: no error tracking, no own cookies.

### Edge
- [ ] All items: the developer applies them. See `docs/SECURITY-EDGE.md`.
- N/A Leaked credentials detection, `/api/*` cache, Turnstile hostnames: no login, API or forms.

### Static site
- [x] Allowlist deploy from a temp folder (`scripts/stage.mjs` builds `dist/`)
- [x] Validator (`scripts/validate.mjs`, also run in CI)
- [ ] Hashed `?v=` on CSS and JS (not done; files cache for 5 minutes instead)
- [x] No `_redirects` file; no inline scripts; works with scripting off for the main links (verify before release)
- N/A Turnstile and forms: no forms.

### CI/CD
- [ ] CI workflow with SHA-pinned actions (being added by another workstream)
- N/A `npm audit`, lockfile: no dependencies.
- N/A AI review gate: not set up for this repo.

### Operations
- [x] Release checklist lists names and sources, never values (`docs/RELEASE-CHECKLIST.md`)
- [ ] Uptime check from outside the host (owner's choice)
- N/A Backups and restore drill: no data; the repo is the source of truth.

### Testing
- [x] Tests for links, tracking, cards, offer, shop and meta text (`tests/`)
- [ ] Live probe list run after deploy and recorded (`scripts/probe.mjs` exists; run it on the real URL after deploy)
- [ ] Meta Pixel Helper test (after IDs are set)
- N/A Route tests per role, Playwright persona suite: no roles or routes.

### Practice
- [x] Agents briefed with the safety rules (`CLAUDE.md`)
- [x] No secret file opened or printed
- [x] Commits after each milestone
