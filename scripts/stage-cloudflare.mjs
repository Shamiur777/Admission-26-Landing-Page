// Builds the Cloudflare Worker upload for https://hulkenstein.com/admission26/.
// Run: node scripts/stage-cloudflare.mjs, then: npx wrangler deploy --config deploy/cloudflare/wrangler.jsonc
// It runs stage.mjs, copies dist/ into dist-cloudflare/admission26/ and writes _headers with every
// path prefixed by /admission26, because a Worker route serves assets at their full URL path.
// With --redirect it builds only a _redirects file that sends every /admission26 link to OFFICIAL_URL.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PREFIX = '/admission26';

/** Prefixes each path rule in a _headers file. Comments, header lines and host rules stay as they are. */
export function prefixHeaders(text, prefix = PREFIX) {
  return text
    .split('\n')
    .filter((line) => !line.startsWith('https://')) // the *.pages.dev noindex rule does not apply here
    .map((line) => (line.startsWith('/') ? prefix + line : line))
    .join('\n');
}

/** Launch day: the backup copy forwards every old link (path, query and #tab kept) to the official URL. */
export const OFFICIAL_URL = 'https://edgecoursebd.com/admission26/';
export function redirectRules(prefix = PREFIX, target = OFFICIAL_URL) {
  return `${prefix} ${target} 301\n${prefix}/* ${target}:splat 301\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const OUT = join(ROOT, 'dist-cloudflare');
  if (process.argv.includes('--redirect')) {
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, '_redirects'), redirectRules());
    console.log(`Staged dist-cloudflare/ as a redirect from hulkenstein.com${PREFIX}/ to ${OFFICIAL_URL}`);
    process.exit(0);
  }
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'stage.mjs')], { stdio: 'inherit' });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(join(ROOT, 'dist'), join(OUT, PREFIX.slice(1)), { recursive: true });
  writeFileSync(join(OUT, '_headers'), prefixHeaders(readFileSync(join(ROOT, '_headers'), 'utf8')));
  console.log(`Staged dist-cloudflare/ for https://hulkenstein.com${PREFIX}/`);
}
