// Builds the Cloudflare Worker upload for https://hulkenstein.com/admission26/.
// Run: node scripts/stage-cloudflare.mjs, then: npx wrangler deploy --config deploy/cloudflare/wrangler.jsonc
// It runs stage.mjs, copies dist/ into dist-cloudflare/admission26/ and writes _headers with every
// path prefixed by /admission26, because a Worker route serves assets at their full URL path.
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const OUT = join(ROOT, 'dist-cloudflare');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'stage.mjs')], { stdio: 'inherit' });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(join(ROOT, 'dist'), join(OUT, PREFIX.slice(1)), { recursive: true });
  writeFileSync(join(OUT, '_headers'), prefixHeaders(readFileSync(join(ROOT, '_headers'), 'utf8')));
  console.log(`Staged dist-cloudflare/ for https://hulkenstein.com${PREFIX}/`);
}
