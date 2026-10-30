// Player photo cache + the "possessed" filter (pale, veined, hollow-eyed) generated on a canvas.
import { h } from './dom.js';

const photos = new Map(); // id -> dataURL
const possessedCache = new Map(); // id -> dataURL
const listeners = new Set();
let names = new Map();

export function setPhoto(id, data) {
  if (data) photos.set(id, data); else photos.delete(id);
  possessedCache.delete(id);
  for (const fn of listeners) fn(id);
}
export function getPhoto(id) { return photos.get(id) || null; }
export function onPhoto(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setNames(list) { names = new Map(list.map((p) => [p.id, p.name])); }
export function nameOf(id) { return names.get(id) || '?'; }

// A circular face element. Falls back to the initial on a candle-coloured disc.
export function face(id, size = 64, { possessed = false, ring = null, cls = '' } = {}) {
  const el = h('div', { class: `face ${cls}`, style: { width: `${size}px`, height: `${size}px`, boxShadow: ring ? `0 0 0 ${Math.max(2, size / 22)}px ${ring}` : '' } });
  const src = possessed ? getPossessed(id) : getPhoto(id);
  if (src) el.append(h('img', { src, alt: '' }));
  else el.append(h('span', { class: 'initial' }, (nameOf(id)[0] || '?').toUpperCase()));
  if (possessed && !src) el.style.background = '#1d2a1a';
  return el;
}

// Possessed version of a photo: desaturated, green-grey skin, dark sunken eyes, veins, red pupils.
export function getPossessed(id) {
  if (possessedCache.has(id)) return possessedCache.get(id);
  const src = getPhoto(id);
  if (!src) return null;
  const img = new Image();
  img.src = src;
  if (!img.complete) {
    img.onload = () => { possessedCache.delete(id); for (const fn of listeners) fn(id); };
    return src;
  }
  const out = possessedFrom(img);
  possessedCache.set(id, out);
  return out;
}

export function possessedFrom(img, size = 160) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, size, size);
  const d = x.getImageData(0, 0, size, size);
  const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11;
    const v = Math.pow(l / 255, 1.35) * 255;
    p[i] = v * 0.78;
    p[i + 1] = v * 0.92;
    p[i + 2] = v * 0.8;
  }
  x.putImageData(d, 0, 0);
  // Vignette rot
  const g = x.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,20,8,0.85)');
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  // Sunken eyes (approximate positions for a centred selfie) with red pinpricks
  for (const ex of [0.36, 0.64]) {
    const eg = x.createRadialGradient(size * ex, size * 0.42, 1, size * ex, size * 0.42, size * 0.13);
    eg.addColorStop(0, 'rgba(0,0,0,0.95)');
    eg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = eg;
    x.beginPath(); x.arc(size * ex, size * 0.42, size * 0.13, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,40,60,0.95)';
    x.beginPath(); x.arc(size * ex, size * 0.42, size * 0.018, 0, Math.PI * 2); x.fill();
  }
  // Veins
  x.strokeStyle = 'rgba(40,10,30,0.55)';
  x.lineWidth = 1;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 9; k++) {
    let vx = rnd() * size;
    let vy = size * (0.55 + rnd() * 0.45);
    x.beginPath(); x.moveTo(vx, vy);
    for (let s = 0; s < 6; s++) { vx += (rnd() - 0.5) * 14; vy -= 6 + rnd() * 8; x.lineTo(vx, vy); }
    x.stroke();
  }
  return c.toDataURL('image/jpeg', 0.8);
}

// Downscale a picked/captured photo to a small square JPEG (centre crop). ~8–14 KB.
export function shrinkPhoto(file, size = 176) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const x = c.getContext('2d');
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      x.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      let q = 0.78;
      let out = c.toDataURL('image/jpeg', q);
      while (out.length > 80000 && q > 0.3) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that photo')); };
    img.src = url;
  });
}
