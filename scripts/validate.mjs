// Pre-deploy validator. Run: node scripts/validate.mjs   (exit 1 on any error)
import { existsSync, readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, extname, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ALLOWED_EXT = new Set(['.css', '.js', '.woff2', '.webp', '.jpg', '.png', '.svg', '.ico']);

const SKIP_REF = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

export function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function parseTags(html) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');
  const tags = [];
  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=/>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  const attrRe = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = tagRe.exec(clean))) {
    const attrs = {};
    let a;
    attrRe.lastIndex = 0;
    while ((a = attrRe.exec(m[2]))) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    tags.push({ name: m[1].toLowerCase(), attrs, index: m.index });
  }
  return { clean, tags };
}

function localTarget(root, base, ref) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  return clean.startsWith('/') ? join(root, clean) : join(base, clean);
}

export async function validate(root = ROOT) {
  const errors = [];
  const info = {};
  const err = (m) => errors.push(m);
  const indexPath = join(root, 'index.html');

  if (!existsSync(indexPath)) { err('index.html is missing'); return { errors, info }; }
  if (existsSync(join(root, '_redirects'))) err('_redirects must not exist');

  const html = readFileSync(indexPath, 'utf8');
  const { clean, tags } = parseTags(html);
  info.emEnDashesInIndex = (html.match(/[–—]/g) || []).length;

  const checkRef = (ref, what) => {
    const v = ref.trim();
    if (!v || SKIP_REF.test(v)) return;
    const t = localTarget(root, root, v);
    if (t && !existsSync(t)) err(`${what} points to a missing file: ${v}`);
  };
  for (const t of tags) {
    for (const k of ['src', 'href']) if (k in t.attrs) checkRef(t.attrs[k], `<${t.name} ${k}>`);
    if ('srcset' in t.attrs) {
      for (const part of t.attrs.srcset.split(',')) {
        const u = part.trim().split(/\s+/)[0];
        if (u) checkRef(u, `<${t.name} srcset>`);
      }
    }
    for (const k of Object.keys(t.attrs)) {
      if (/^on/.test(k)) err(`inline event handler attribute ${k}= on <${t.name}>`);
    }
    if ('style' in t.attrs) err(`style= attribute on <${t.name}> (CSP style-src 'self' blocks it)`);
    for (const k of ['href', 'src', 'action', 'formaction', 'data']) {
      if (/^\s*javascript:/i.test(t.attrs[k] || '')) err(`javascript: URL in <${t.name} ${k}>`);
    }
    for (const [k, v] of Object.entries(t.attrs)) {
      if (k !== 'content' && /^\s*http:\/\//i.test(v)) err(`http: URL in <${t.name} ${k}>: ${v}`);
    }
    if (t.name === 'img') {
      for (const k of ['width', 'height', 'alt']) {
        if (!(k in t.attrs)) err(`<img> missing ${k} (src=${t.attrs.src || 'set at runtime'})`);
      }
    }
  }
  if (/["'(]http:\/\//i.test(clean)) err('http: URL found in index.html (use https)');

  const h1 = tags.filter((t) => t.name === 'h1').length;
  if (h1 !== 1) err(`expected exactly one <h1>, found ${h1}`);

  const scriptRe = /<script\b([^>]*)>/gi;
  let sm;
  while ((sm = scriptRe.exec(clean))) {
    if (!/\ssrc\s*=/i.test(' ' + sm[1])) err('inline <script> without src (CSP forbids it)');
  }

  const cssDir = join(root, 'assets', 'css');
  if (existsSync(cssDir)) {
    for (const f of walk(cssDir).filter((p) => p.endsWith('.css'))) {
      const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      const re = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
      let m;
      while ((m = re.exec(css))) {
        const v = m[2].trim();
        if (SKIP_REF.test(v)) { if (/^http:/i.test(v)) err(`http: url() in ${relative(root, f)}`); continue; }
        const t = localTarget(root, dirname(f), v);
        if (t && !existsSync(t)) err(`url(${v}) in ${relative(root, f)} points to a missing file`);
      }
    }
  }

  const catalogPath = join(root, 'assets', 'js', 'catalog.js');
  if (existsSync(catalogPath)) {
    const { COURSES = [], BOOKS = [] } = await import(pathToFileURL(catalogPath).href);
    for (const c of COURSES) {
      for (const w of [400, 800]) {
        if (!existsSync(join(root, 'assets', 'img', 'courses', `${c.id}-${w}.webp`))) err(`missing course image assets/img/courses/${c.id}-${w}.webp`);
      }
    }
    for (const b of BOOKS) {
      if (!existsSync(join(root, 'assets', 'img', 'books', `${b.id}.webp`))) err(`missing book image assets/img/books/${b.id}.webp`);
    }
    info.courses = COURSES.length;
    info.books = BOOKS.length;
  } else err('assets/js/catalog.js is missing');

  const assets = join(root, 'assets');
  if (existsSync(assets)) {
    for (const f of walk(assets)) {
      const rel = relative(root, f).split(sep).join('/');
      const base = f.split(sep).pop();
      if (lstatSync(f).isSymbolicLink()) err(`symlink inside assets/: ${rel}`);
      if (base.startsWith('.')) err(`dotfile inside assets/: ${rel}`);
      else if (!ALLOWED_EXT.has(extname(base).toLowerCase())) err(`file type not allowed inside assets/: ${rel}`);
    }
  } else err('assets/ folder is missing');

  return { errors, info };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, info } = await validate();
  console.log(`em/en dashes in index.html: ${info.emEnDashesInIndex ?? '?'}`);
  if (errors.length) {
    console.error(`\nVALIDATION FAILED (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`validate OK (${info.courses} courses, ${info.books} books)`);
}
