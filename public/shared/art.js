// Optional painted art (from Google Flow or any image tool), imported with tools/art-import.mjs into public/art.
// Every slot falls back to the game's own procedural scenes when the image isn't there.
//   art.url('chandravati')            → '/art/chandravati.webp' or null
//   art.url('chandravati', 'phone')   → the 720 px version for phones
let manifest = {};
const ready = fetch('/art/manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { manifest = m || {}; }).catch(() => {});
const cache = new Map();

export const art = {
  ready,
  has: (name) => !!manifest[name],
  url(name, size = 'tv') {
    const e = manifest[name];
    if (!e) return null;
    return `/art/${size === 'phone' ? e.phone : e.tv}`;
  },
  // Warm the browser cache so a chapter card never pops in late.
  preload() {
    for (const name of Object.keys(manifest)) {
      if (cache.has(name)) continue;
      const img = new Image();
      img.decoding = 'async';
      img.src = this.url(name);
      cache.set(name, img);
    }
  },
};
