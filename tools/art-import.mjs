#!/usr/bin/env node
// Import painted art (e.g. made in Google Flow) into the game.
//   node tools/art-import.mjs <folder-with-images>
// Files are matched by name (see ART_PROMPTS.md: haveli, chandravati, chandravati-scare, vikram, baraat,
// dulhanein, ch-guestbook … ch-dawn), converted with ffmpeg to WebP at 1600 px (TV) and 720 px (phones),
// and listed in public/art/manifest.json. Unknown names are skipped.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = ['haveli', 'chandravati', 'chandravati-scare', 'vikram', 'baraat', 'dulhanein',
  'ch-guestbook', 'ch-library', 'ch-nursery', 'ch-reception', 'ch-hunt', 'ch-arena', 'ch-vow', 'ch-dawn'];
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'public', 'art');
const src = process.argv[2];
if (!src) { console.log('usage: node tools/art-import.mjs <folder>'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const mfile = path.join(out, 'manifest.json');
const manifest = fs.existsSync(mfile) ? JSON.parse(fs.readFileSync(mfile, 'utf8')) : {};
for (const f of fs.readdirSync(src)) {
  const name = path.basename(f, path.extname(f)).toLowerCase().replace(/[\s_]+/g, '-');
  if (!NAMES.includes(name) || !/\.(png|jpe?g|webp|avif)$/i.test(f)) { console.log(`skip ${f}`); continue; }
  const input = path.join(src, f);
  for (const [tag, w, q] of [['tv', 1600, 78], ['phone', 720, 72]]) {
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-vf', `scale='min(${w},iw)':-2`, '-c:v', 'libwebp', '-quality', String(q), path.join(out, `${name}${tag === 'phone' ? '.phone' : ''}.webp`)]);
  }
  manifest[name] = { tv: `${name}.webp`, phone: `${name}.phone.webp` };
  console.log(`✓ ${name}`);
}
fs.writeFileSync(mfile, JSON.stringify(manifest, null, 1));
