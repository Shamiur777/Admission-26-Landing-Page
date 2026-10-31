// Run: node --test tests/headers.test.js
// Guard test: the CSP and required headers must stay in sync across all four places.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const files = {
  '_headers': read('_headers'),
  'deploy/nginx-security-headers.conf': read('deploy/nginx-security-headers.conf'),
  'deploy/apache.htaccess': read('deploy/apache.htaccess'),
};

const metaCsp = html.match(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]+content="([^"]+)"/)?.[1];
const headerCsp = {
  '_headers': files['_headers'].match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1].trim(),
  'deploy/nginx-security-headers.conf': files['deploy/nginx-security-headers.conf'].match(/add_header Content-Security-Policy "([^"]+)"/)?.[1],
  'deploy/apache.htaccess': files['deploy/apache.htaccess'].match(/Content-Security-Policy "([^"]+)"/)?.[1],
};

const directives = (csp) => Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
  const [name, ...vals] = d.split(/\s+/);
  return [name, vals];
}));
const withoutFrame = (csp) => csp.split(';').map((d) => d.trim()).filter((d) => d && !d.startsWith('frame-ancestors')).join('; ');

test('all four CSP copies exist', () => {
  assert.ok(metaCsp, 'meta CSP');
  for (const [f, v] of Object.entries(headerCsp)) assert.ok(v, f);
});

test('CSP copies are identical (meta lacks frame-ancestors only)', () => {
  const ref = headerCsp['_headers'];
  for (const [f, v] of Object.entries(headerCsp)) assert.equal(v, ref, f);
  assert.equal(metaCsp, withoutFrame(ref), 'meta differs from header CSP');
  assert.ok(!/frame-ancestors/.test(metaCsp), 'meta must not carry frame-ancestors (ignored in meta)');
});

test('CSP strictness rules', () => {
  const d = directives(headerCsp['_headers']);
  const script = d['script-src'];
  assert.ok(script, 'script-src');
  assert.ok(!script.includes("'unsafe-inline'"));
  assert.ok(!script.includes("'unsafe-eval'"));
  for (const v of script) {
    assert.ok(v !== '*' && !/^[a-z][a-z0-9+.-]*:$/i.test(v), `wildcard/scheme-only source in script-src: ${v}`);
    assert.ok(!/^https?:\/\/\*/.test(v), `wildcard host in script-src: ${v}`);
  }
  assert.deepEqual(d['object-src'], ["'none'"]);
  assert.deepEqual(d['base-uri'], ["'none'"]);
  assert.deepEqual(d['form-action'], ["'none'"]);
  assert.deepEqual(d['frame-ancestors'], ["'none'"]);
  assert.deepEqual(d['default-src'], ["'self'"]);
  assert.ok(!d['style-src'].includes("'unsafe-inline'"));
});

const required = [
  ['X-Content-Type-Options', /nosniff/],
  ['X-Frame-Options', /DENY/],
  ['Referrer-Policy', /strict-origin-when-cross-origin/],
  ['Permissions-Policy', /camera=\(\)/],
  ['Cross-Origin-Opener-Policy', /same-origin/],
  ['Cross-Origin-Resource-Policy', /same-site/],
  ['X-Permitted-Cross-Domain-Policies', /none/],
];
for (const [file, text] of Object.entries(files)) {
  test(`${file} carries every required header`, () => {
    for (const [name, value] of required) {
      const line = text.split('\n').find((l) => !l.trim().startsWith('#') && l.includes(name));
      assert.ok(line, `${name} missing`);
      assert.match(line, value, name);
    }
    assert.ok(!/Strict-Transport-Security/i.test(text.replace(/^#.*$/gm, '')), 'HSTS is set at domain level, not here');
  });
}

test('_headers strips the default Access-Control-Allow-Origin', () => {
  assert.match(files['_headers'], /^\s*!\s*Access-Control-Allow-Origin\s*$/m);
});

test('all Permissions-Policy copies are identical and deny-all', () => {
  const pp = [
    files['_headers'].match(/Permissions-Policy:\s*(.+)/)[1].trim(),
    files['deploy/nginx-security-headers.conf'].match(/Permissions-Policy "([^"]+)"/)[1],
    files['deploy/apache.htaccess'].match(/Permissions-Policy "([^"]+)"/)[1],
  ];
  assert.equal(pp[1], pp[0]);
  assert.equal(pp[2], pp[0]);
  for (const item of pp[0].split(',')) assert.match(item.trim(), /^[a-z-]+=\(\)$/);
});

// ---- Cache rules --------------------------------------------------------------------------
// html, js and css have no hashed names, so they must revalidate every time (no-cache).
// A time-based cache lets a returning visitor load a mix of old and new ES modules after a deploy.
// Images and fonts get a new file name when they change, so they are cached for a year.
const nginxConf = read('deploy/nginx.conf');
const noComments = (text) => text.replace(/^\s*#.*$/gm, '');
const cacheValues = (text) => [...noComments(text).matchAll(/Cache-Control[:\s]+"?([^"\n]+?)"?\s*(?:always;)?\s*$/gim)].map((m) => m[1].trim());

/** Cache-Control of one _headers path rule, e.g. '/assets/js/*'. */
function headersRule(path) {
  const lines = files['_headers'].split('\n');
  const start = lines.findIndex((l) => l.trim() === path && !l.startsWith(' '));
  assert.ok(start >= 0, `_headers has no rule for path '${path}'`);
  const body = [];
  for (let i = start + 1; i < lines.length && /^\s+\S/.test(lines[i]); i += 1) body.push(lines[i]);
  return cacheValues(body.join('\n'));
}

/** The text of one nginx `location ... { }` block, found by its exact header text. */
function nginxBlock(header) {
  const at = nginxConf.indexOf(header);
  assert.ok(at >= 0, `deploy/nginx.conf has no '${header}' block`);
  return nginxConf.slice(at, nginxConf.indexOf('\n}', at));
}

/** The text of the Apache <FilesMatch> block whose pattern contains `ext`. */
function apacheBlock(ext) {
  const m = files['deploy/apache.htaccess'].match(new RegExp(String.raw`<FilesMatch "[^"]*${ext}[^"]*">([\s\S]*?)</FilesMatch>`));
  assert.ok(m, `deploy/apache.htaccess has no <FilesMatch> block for '${ext}'`);
  return m[1];
}

const NO_CACHE = ['no-cache'];
const IMMUTABLE = ['public, max-age=31536000, immutable'];

test('_headers: html, js and css are no-cache; images and fonts are immutable', () => {
  for (const path of ['/', '/index.html', '/assets/js/*', '/assets/css/*']) {
    assert.deepEqual(headersRule(path), NO_CACHE, `_headers '${path}' must be exactly "Cache-Control: no-cache" (no hashed names, a timed cache mixes old and new modules)`);
  }
  for (const path of ['/assets/img/*', '/assets/fonts/*']) {
    assert.deepEqual(headersRule(path), IMMUTABLE, `_headers '${path}' must be "Cache-Control: ${IMMUTABLE[0]}"`);
  }
});

test('deploy/nginx.conf: html, js and css are no-cache; images and fonts are immutable', () => {
  assert.deepEqual(cacheValues(nginxBlock('location /admission26/ {')), NO_CACHE, "deploy/nginx.conf 'location /admission26/' (html, js, css) must be exactly Cache-Control \"no-cache\"");
  for (const header of ['location ^~ /admission26/assets/img/ {', 'location ^~ /admission26/assets/fonts/ {']) {
    assert.deepEqual(cacheValues(nginxBlock(header)), IMMUTABLE, `deploy/nginx.conf '${header}' must be Cache-Control "${IMMUTABLE[0]}"`);
  }
});

test('deploy/apache.htaccess: html, js and css are no-cache; images and fonts are immutable', () => {
  assert.deepEqual(cacheValues(apacheBlock('html')), NO_CACHE, "deploy/apache.htaccess <FilesMatch> for html|js|css must be exactly Header set Cache-Control \"no-cache\"");
  assert.deepEqual(cacheValues(apacheBlock('woff2')), IMMUTABLE, `deploy/apache.htaccess <FilesMatch> for images and fonts must be Cache-Control "${IMMUTABLE[0]}"`);
  const htaccess = noComments(files['deploy/apache.htaccess']);
  assert.ok(!/ExpiresDefault/.test(htaccess), 'deploy/apache.htaccess: remove ExpiresDefault, it would give html, js and css a timed Expires header');
  assert.ok(/<FilesMatch "[^"]*html\|js\|css[^"]*">/.test(htaccess), 'deploy/apache.htaccess: the no-cache <FilesMatch> must cover html, js and css together');
});

test('no doc still says html, js and css are cached for 5 minutes', () => {
  for (const p of ['README.md', 'HANDOFF.md', 'docs/SECURITY-EDGE.md', 'docs/RELEASE-CHECKLIST.md', 'docs/THREAT-MODEL.md']) {
    assert.ok(!/5[- ]minute|max-age=300/i.test(read(p)), `${p} still mentions the old 5-minute cache; code, html and css are Cache-Control: no-cache now`);
  }
});

test('Cloudflare build prefixes every _headers path with /admission26 and keeps the CSP', async () => {
  const { prefixHeaders } = await import('../scripts/stage-cloudflare.mjs');
  const source = readFileSync(new URL('../_headers', import.meta.url), 'utf8');
  const out = prefixHeaders(source);
  const paths = out.split('\n').filter((l) => /^\S/.test(l) && !l.startsWith('#'));
  assert.ok(paths.length > 0, 'prefixed _headers has no path rules');
  for (const p of paths) assert.ok(p.startsWith('/admission26/'), `path rule '${p}' is not under /admission26/`);
  const csp = (t) => t.match(/Content-Security-Policy: (.*)/)[1];
  assert.equal(csp(out), csp(source), 'the Cloudflare build changed the CSP');
});
