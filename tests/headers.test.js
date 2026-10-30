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
