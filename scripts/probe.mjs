// Live probe. Run: node scripts/probe.mjs https://example.com/
const base = process.argv[2];
if (!base) { console.error('usage: node scripts/probe.mjs <base-url>'); process.exit(2); }
const root = base.endsWith('/') ? base : base + '/';
const rows = [];
const add = (name, ok, note = '') => rows.push({ name, ok, note });
const get = (p) => fetch(new URL(p, root), { redirect: 'manual' });

const home = await get('');
add('GET / returns 200', home.status === 200, `status ${home.status}`);
const h = home.headers;

const required = {
  'x-content-type-options': /nosniff/i,
  'x-frame-options': /deny/i,
  'referrer-policy': /./,
  'permissions-policy': /camera=\(\)/,
  'cross-origin-opener-policy': /same-origin/,
  'cross-origin-resource-policy': /same-site/,
  'x-permitted-cross-domain-policies': /none/,
};
const missing = Object.entries(required).filter(([k, re]) => !re.test(h.get(k) || '')).map(([k]) => k);
add('required security headers', missing.length === 0, missing.length ? `missing/wrong: ${missing.join(', ')}` : '');

const csp = h.get('content-security-policy');
if (csp) {
  const script = csp.split(';').find((d) => d.trim().startsWith('script-src')) || '';
  add('CSP header', /base-uri 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && !/unsafe-inline/.test(script), 'present');
} else add('CSP header', false, 'absent (only the meta CSP applies; it lacks frame-ancestors)');

const acao = h.get('access-control-allow-origin');
add('Access-Control-Allow-Origin absent or not *', acao !== '*', acao ? `value ${acao}` : 'absent');

const hidden = ['README.md', 'PRODUCT.md', 'CLAUDE.md', 'HANDOFF.md', 'GLOSSARY.md', '_headers', '.git/config', 'deploy/nginx.conf', 'scripts/stage.mjs', 'tests/offer.test.js', '_source/', 'Links%20and%20Other%20info.txt'];
for (const p of hidden) {
  try {
    const r = await get(p);
    add(`/${p} not public`, r.status === 404 || r.status === 403, `status ${r.status}`);
  } catch (e) { add(`/${p} not public`, false, e.message); }
}

const miss = await get(`zz-${Math.random().toString(36).slice(2)}`);
add('random missing path returns 404', miss.status === 404, `status ${miss.status}`);

const js = await get('assets/js/main.js');
const ct = js.headers.get('content-type') || '';
add('assets/js/main.js is JavaScript', js.status === 200 && /javascript/i.test(ct), `${js.status} ${ct}`);

const w = Math.max(...rows.map((r) => r.name.length));
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(w)}  ${r.note}`);
const fails = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - fails} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
