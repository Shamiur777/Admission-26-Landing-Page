// Allowlist deploy: copies ONLY index.html and assets/ into a fresh dist/. Run: node scripts/stage.mjs
import { mkdirSync, rmSync, readdirSync, lstatSync, copyFileSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, ALLOWED_EXT, ALLOWED_FILES } from './validate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const { errors } = await validate(ROOT);
if (errors.length) {
  console.error('Validation failed, nothing staged:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
copyFileSync(join(ROOT, 'index.html'), join(DIST, 'index.html'));

const staged = ['index.html'];
function copyDir(src) {
  for (const name of readdirSync(src)) {
    const p = join(src, name);
    const rel = relative(ROOT, p).split(sep).join('/');
    const st = lstatSync(p);
    if (name.startsWith('.') || st.isSymbolicLink()) { console.error(`refusing ${rel} (dotfile or symlink)`); process.exit(1); }
    if (st.isDirectory()) { copyDir(p); continue; }
    if (!ALLOWED_EXT.has(extname(name).toLowerCase()) && !ALLOWED_FILES.has(rel)) { console.error(`refusing ${rel} (extension not allowed)`); process.exit(1); }
    mkdirSync(dirname(join(DIST, rel)), { recursive: true });
    copyFileSync(p, join(DIST, rel));
    staged.push(rel);
  }
}
copyDir(join(ROOT, 'assets'));

let total = 0;
for (const f of staged) {
  const s = statSync(join(DIST, f)).size;
  total += s;
  console.log(`${String(s).padStart(9)}  ${f}`);
}
console.log(`\n${staged.length} files, ${(total / 1024 / 1024).toFixed(2)} MB staged in dist/. Upload the contents of dist/.`);
