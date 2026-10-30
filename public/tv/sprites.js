// Pre-rendered sprites for the real-time chapters (zombie baraat + treasure hunt).
// Everything is drawn procedurally ONCE into small offscreen canvases; the render loop only blits them.
// Style: upright chibi figures seen from a high 3/4 angle, facing right (flip the canvas for left).
// Coordinates below are world units; sprites are rasterised at RES× for crisp scaling on a 1080p TV.

export const RES = 2;
const TAU = Math.PI * 2;

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * RES);
  c.height = Math.ceil(h * RES);
  const x = c.getContext('2d');
  x.scale(RES, RES);
  return [c, x];
}
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (amt > 0 ? (255 - v) * amt : v * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const rr = (x, X, Y, w, h, r) => { x.beginPath(); x.roundRect(X, Y, w, h, r); };

// ---------------------------------------------------------------- light / glow
const glowCache = new Map();
// Soft radial dot, white or tinted; drawn with drawImage at any size (no per-frame gradients).
export function glow(color = '255,255,255') {
  if (glowCache.has(color)) return glowCache.get(color);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${color},1)`);
  g.addColorStop(0.35, `rgba(${color},.55)`);
  g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  glowCache.set(color, c);
  return c;
}
let shadowSprite = null;
export function shadow() {
  if (shadowSprite) return shadowSprite;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 32, 0, 64, 32, 64);
  g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(0.7, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.scale(1, 0.5);
  x.beginPath(); x.arc(64, 64, 64, 0, TAU); x.fill();
  shadowSprite = c;
  return c;
}

// ---------------------------------------------------------------- baraati (players)
export const B = { w: 48, h: 66, fx: 24, fy: 62, headX: 25, headY: 17, headR: 10.5 };
export const WALK_FRAMES = 6;
// vertical bob per walk frame — face and safa are drawn at runtime with the same bob
export const BOB = Array.from({ length: WALK_FRAMES }, (_, i) => -Math.abs(Math.sin((i / WALK_FRAMES) * Math.PI)) * 2.2);

const SAFA = [
  { base: '#d81b3c', alt: '#f5b700', kind: 'leheriya' },
  { base: '#f28c00', alt: '#c2185b', kind: 'bandhani' },
  { base: '#ffcf33', alt: '#d32f2f', kind: 'leheriya' },
  { base: '#e91e63', alt: '#ffd54f', kind: 'bandhani' },
  { base: '#ff7043', alt: '#fff3e0', kind: 'plain' },
  { base: '#8e24aa', alt: '#ffca28', kind: 'leheriya' },
];

function drawLegs(x, phase, moving, cream = '#efe3cc') {
  const sw = moving ? Math.sin(phase) * 5.5 : 0;
  const lift = moving ? Math.max(0, Math.cos(phase)) * 2.2 : 0;
  const lift2 = moving ? Math.max(0, -Math.cos(phase)) * 2.2 : 0;
  // back leg (darker), then front leg
  x.fillStyle = shade(cream, -0.25);
  rr(x, B.fx - 6 - sw, 46 - lift2, 7, 15, 3.5); x.fill();
  x.fillStyle = '#6b3a12'; rr(x, B.fx - 8 - sw, 59 - lift2, 10, 4, 2); x.fill(); // mojari
  x.fillStyle = cream;
  rr(x, B.fx - 1 + sw, 46 - lift, 7, 15, 3.5); x.fill();
  x.fillStyle = '#8a4b16'; rr(x, B.fx - 2 + sw, 59 - lift, 11, 4, 2); x.fill();
  x.fillStyle = '#f2c14e'; x.fillRect(B.fx + 6 + sw, 60 - lift, 2, 1.4); // curled mojari tip
}

function drawSherwani(x, color, bob) {
  const top = 26 + bob;
  const dark = shade(color, -0.35);
  const lite = shade(color, 0.18);
  // back arm (the gun arm is drawn live)
  x.fillStyle = dark; rr(x, B.fx - 13, top + 3, 7, 16, 3.5); x.fill();
  // body: a rounded kurta flaring at the hem
  x.beginPath();
  x.moveTo(B.fx - 11, top + 2);
  x.quadraticCurveTo(B.fx, top - 3, B.fx + 11, top + 2);
  x.lineTo(B.fx + 14, top + 22);
  x.quadraticCurveTo(B.fx, top + 26, B.fx - 14, top + 22);
  x.closePath();
  const g = x.createLinearGradient(B.fx - 14, 0, B.fx + 14, 0);
  g.addColorStop(0, dark); g.addColorStop(0.55, color); g.addColorStop(1, lite);
  x.fillStyle = g; x.fill();
  // gold hem + placket + buttons
  x.strokeStyle = '#f2c14e'; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(B.fx - 14, top + 22); x.quadraticCurveTo(B.fx, top + 26, B.fx + 14, top + 22); x.stroke();
  x.lineWidth = 1; x.beginPath(); x.moveTo(B.fx + 3, top + 1); x.lineTo(B.fx + 4, top + 23); x.stroke();
  x.fillStyle = '#ffe08a';
  for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(B.fx + 4, top + 5 + k * 4.5, 0.9, 0, TAU); x.fill(); }
  // the baraati's stole (dupatta) across the chest
  x.strokeStyle = 'rgba(255,214,120,.85)'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(B.fx - 9, top + 1); x.quadraticCurveTo(B.fx + 2, top + 10, B.fx + 12, top + 15); x.stroke();
  // neck
  x.fillStyle = '#c99a72'; rr(x, B.fx - 3, top - 4, 6, 6, 2); x.fill();
}

// Turban sits on top of the selfie. Drawn per variant; the tail (turra) falls behind the head.
function drawSafa(x, v, bob) {
  const s = SAFA[v % SAFA.length];
  const cx = B.headX;
  const cy = B.headY + bob;
  // tail behind
  x.fillStyle = shade(s.base, -0.25);
  x.beginPath(); x.moveTo(cx - 9, cy - 4); x.quadraticCurveTo(cx - 19, cy + 6, cx - 15, cy + 18); x.lineTo(cx - 11, cy + 17); x.quadraticCurveTo(cx - 13, cy + 6, cx - 5, cy - 2); x.fill();
  // dome
  x.save();
  x.beginPath();
  x.moveTo(cx - 12.5, cy - 1);
  x.bezierCurveTo(cx - 14, cy - 16, cx + 12, cy - 19, cx + 13, cy - 2);
  x.quadraticCurveTo(cx, cy - 6, cx - 12.5, cy - 1);
  x.closePath();
  x.fillStyle = s.base; x.fill();
  x.clip();
  if (s.kind === 'leheriya') {
    x.strokeStyle = s.alt; x.lineWidth = 1.6;
    for (let k = -30; k < 30; k += 4.5) { x.beginPath(); x.moveTo(cx + k, cy - 20); x.lineTo(cx + k + 14, cy + 2); x.stroke(); }
  } else if (s.kind === 'bandhani') {
    x.fillStyle = s.alt;
    for (let yy = -18; yy < 2; yy += 3.6) for (let xx = -14; xx < 14; xx += 3.6) { x.beginPath(); x.arc(cx + xx + ((yy / 3.6) % 2) * 1.8, cy + yy, 0.75, 0, TAU); x.fill(); }
  }
  // folds
  x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1;
  for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(cx - 12, cy - 3 - k * 4); x.quadraticCurveTo(cx, cy - 8 - k * 4.5, cx + 12, cy - 4 - k * 4); x.stroke(); }
  x.restore();
  // brooch + kalgi plume
  x.fillStyle = '#ffe08a'; x.beginPath(); x.arc(cx + 6, cy - 9, 2.1, 0, TAU); x.fill();
  x.fillStyle = '#e53935'; x.beginPath(); x.arc(cx + 6, cy - 9, 1, 0, TAU); x.fill();
  x.strokeStyle = '#fff8e1'; x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(cx + 6, cy - 10); x.quadraticCurveTo(cx + 9, cy - 19, cx + 4, cy - 22); x.stroke();
}

const baraatiCache = new Map();
// Frames for one team colour: { walk: [canvas×6], hats: [canvas×6 per variant lazily] }
export function baraati(color) {
  if (baraatiCache.has(color)) return baraatiCache.get(color);
  const walk = [];
  for (let i = 0; i < WALK_FRAMES; i++) {
    const [c, x] = cv(B.w, B.h);
    const ph = (i / WALK_FRAMES) * TAU;
    drawLegs(x, ph, true);
    drawSherwani(x, color, BOB[i]);
    walk.push(c);
  }
  const [idle, ix] = cv(B.w, B.h);
  drawLegs(ix, 0, false);
  drawSherwani(ix, color, 0);
  const out = { walk, idle };
  baraatiCache.set(color, out);
  return out;
}
const hatCache = new Map();
export function safa(variant, frame) {
  const key = `${variant % SAFA.length}:${frame}`;
  if (hatCache.has(key)) return hatCache.get(key);
  const [c, x] = cv(B.w, B.h);
  drawSafa(x, variant, frame < 0 ? 0 : BOB[frame]);
  hatCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- weapons (pointing right, grip at 0,0)
export const GUN = { w: 46, h: 18, gx: 6, gy: 9 };
const gunCache = [];
export function gun(tier) {
  if (gunCache[tier]) return gunCache[tier];
  const [c, x] = cv(GUN.w, GUN.h);
  x.translate(GUN.gx, GUN.gy);
  const metal = '#3b3f45';
  const wood = '#7a4a22';
  if (tier === 0) { // desi katta
    x.fillStyle = wood; rr(x, -4, -1, 7, 9, 2); x.fill();
    x.fillStyle = metal; rr(x, -2, -4, 22, 5, 2); x.fill();
    x.fillStyle = '#9aa0a6'; x.fillRect(4, -3.5, 14, 1.2);
  } else if (tier === 1) { // dunali (double barrel)
    x.fillStyle = wood; x.beginPath(); x.moveTo(-6, 4); x.lineTo(6, -1); x.lineTo(10, 3); x.lineTo(-3, 8); x.fill();
    x.fillStyle = metal; x.fillRect(6, -4, 30, 3.2); x.fillRect(6, -0.6, 30, 3.2);
    x.fillStyle = '#c9a94f'; x.fillRect(8, -4.4, 3, 7.4);
  } else if (tier === 2) { // tommy gun with drum
    x.fillStyle = wood; rr(x, -7, -2, 10, 6, 2); x.fill();
    x.fillStyle = metal; rr(x, 2, -4, 24, 6, 2); x.fill(); x.fillRect(24, -2.5, 12, 2.5);
    x.fillStyle = '#23262a'; x.beginPath(); x.arc(10, 5, 5.5, 0, TAU); x.fill();
    x.fillStyle = wood; rr(x, 16, 1, 3, 7, 1.5); x.fill();
  } else if (tier === 3) { // phuljhadi flamer: a brass tank and nozzle
    x.fillStyle = '#c9a94f'; rr(x, -6, -5, 14, 11, 4); x.fill();
    x.fillStyle = '#8d6e2a'; x.fillRect(-6, -1, 14, 2);
    x.fillStyle = metal; rr(x, 6, -2.5, 24, 5, 2); x.fill();
    x.fillStyle = '#ff9800'; x.beginPath(); x.arc(31, 0, 2.4, 0, TAU); x.fill();
  } else { // anaar rocket: a painted tube with a firework cone
    x.fillStyle = '#b71c1c'; rr(x, -6, -5, 30, 10, 3); x.fill();
    x.strokeStyle = '#ffd54f'; x.lineWidth = 1.2; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(-2 + k * 7, -5); x.lineTo(2 + k * 7, 5); x.stroke(); }
    x.fillStyle = '#ffeb3b'; x.beginPath(); x.moveTo(24, -6); x.lineTo(36, 0); x.lineTo(24, 6); x.fill();
  }
  gunCache[tier] = c;
  return c;
}
export const MUZZLE = [24, 37, 37, 32, 37]; // barrel length per tier

// ---------------------------------------------------------------- zombies
// Each type: canvas size, foot anchor, eye positions (for the glow pass), scale.
export const ZDEF = [
  { w: 50, h: 68, fx: 25, fy: 64, eyes: [[31, 18], [35, 19]], s: 1.22 }, // 0 baraati shambler
  { w: 50, h: 66, fx: 25, fy: 62, eyes: [[34, 20], [38, 21]], s: 1.14 }, // 1 naagin runner
  { w: 54, h: 70, fx: 27, fy: 66, eyes: [[33, 19], [37, 19]], s: 1.24 }, // 2 gossip aunty
  { w: 64, h: 70, fx: 32, fy: 66, eyes: [[38, 19], [43, 19]], s: 1.3 }, // 3 fufaji
  { w: 64, h: 86, fx: 32, fy: 82, eyes: [[37, 21], [43, 21]], s: 1.95 }, // 4 kunwar vikram (boss)
];
const SKIN = '#8fa58a';
const SKIN_DK = '#5f7560';
const KURTAS = ['#7b2d2d', '#8c7337', '#4f4466', '#355a4a'];

function zLegs(x, d, phase, speed = 1, cloth = '#4a4038') {
  const sw = Math.sin(phase) * 5 * speed;
  x.fillStyle = shade(cloth, -0.3); rr(x, d.fx - 7 - sw, d.fy - 17, 7, 16, 3); x.fill();
  x.fillStyle = cloth; rr(x, d.fx + sw, d.fy - 17, 7, 16, 3); x.fill();
  x.fillStyle = '#2c241e'; rr(x, d.fx - 9 - sw, d.fy - 3, 10, 4, 2); x.fill(); rr(x, d.fx - 1 + sw, d.fy - 3, 11, 4, 2); x.fill();
}
function zHead(x, hx, hy, r, tilt = 0.25) {
  x.save(); x.translate(hx, hy); x.rotate(tilt);
  x.fillStyle = SKIN; x.beginPath(); x.ellipse(0, 0, r, r * 1.05, 0, 0, TAU); x.fill();
  x.fillStyle = SKIN_DK; x.beginPath(); x.ellipse(-r * 0.35, r * 0.2, r * 0.55, r * 0.7, 0, 0, TAU); x.fill();
  // sunken eye sockets + slack mouth
  x.fillStyle = '#1b2219';
  x.beginPath(); x.ellipse(r * 0.45, -r * 0.1, 2.4, 2, 0, 0, TAU); x.ellipse(r * 0.85, -r * 0.05, 2, 1.8, 0, 0, TAU); x.fill();
  x.fillStyle = '#2a1414'; x.beginPath(); x.ellipse(r * 0.7, r * 0.5, 2.6, 1.6, 0.2, 0, TAU); x.fill();
  x.restore();
}
function zArms(x, sx, sy, phase, reach = 18, color = SKIN) {
  // both arms out in front, swaying out of step
  x.strokeStyle = color; x.lineCap = 'round'; x.lineWidth = 4.5;
  const a1 = Math.sin(phase) * 3;
  const a2 = Math.sin(phase + 1.7) * 3;
  x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + reach * 0.5, sy - 2 + a1, sx + reach, sy + 1 + a1); x.stroke();
  x.globalAlpha = 0.75;
  x.beginPath(); x.moveTo(sx - 3, sy + 3); x.quadraticCurveTo(sx + reach * 0.45, sy + 2 + a2, sx + reach - 3, sy + 5 + a2); x.stroke();
  x.globalAlpha = 1;
}

function drawWalker(x, d, ph, variant) {
  const cloth = KURTAS[variant % KURTAS.length];
  zLegs(x, d, ph, 0.8, '#5b5146');
  const bob = Math.abs(Math.sin(ph)) * 1.5;
  x.save(); x.translate(0, bob); x.rotate(0.06);
  // torn kurta
  x.fillStyle = cloth;
  x.beginPath(); x.moveTo(d.fx - 11, 28); x.quadraticCurveTo(d.fx, 23, d.fx + 11, 28); x.lineTo(d.fx + 13, 50);
  for (let k = 0; k < 6; k++) x.lineTo(d.fx + 13 - k * 4.6, 50 + (k % 2 ? 3 : -1));
  x.lineTo(d.fx - 13, 49); x.closePath(); x.fill();
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(d.fx - 2, 30, 3, 6); // stain
  zArms(x, d.fx + 4, 32, ph, 19);
  zHead(x, d.fx + 7, 19, 9.5, 0.35);
  if (variant % 2 === 0) { // a crooked, faded safa
    x.fillStyle = '#9c2b2b'; x.beginPath(); x.ellipse(d.fx + 5, 12, 10, 5.5, 0.35, Math.PI, 0); x.fill();
    x.strokeStyle = '#c9a94f'; x.lineWidth = 1; x.beginPath(); x.ellipse(d.fx + 5, 12, 10, 5.5, 0.35, Math.PI, 0); x.stroke();
  }
  x.restore();
}
function drawRunner(x, d, ph) {
  zLegs(x, d, ph, 1.4, '#1f5e3a');
  x.save(); x.translate(4, 2); x.rotate(0.28); // sprinting lean
  // sequinned green outfit
  x.fillStyle = '#1e7d47';
  x.beginPath(); x.moveTo(d.fx - 9, 28); x.quadraticCurveTo(d.fx, 24, d.fx + 9, 28); x.lineTo(d.fx + 13, 48); x.lineTo(d.fx - 13, 48); x.closePath(); x.fill();
  x.fillStyle = 'rgba(190,255,170,.7)';
  for (let k = 0; k < 14; k++) { x.beginPath(); x.arc(d.fx - 9 + ((k * 7) % 20), 31 + ((k * 5) % 16), 0.8, 0, TAU); x.fill(); }
  // hands in the "naagin" hood pose, held forward
  x.strokeStyle = SKIN; x.lineWidth = 3.6; x.lineCap = 'round';
  x.beginPath(); x.moveTo(d.fx + 3, 31); x.lineTo(d.fx + 15, 24 + Math.sin(ph * 2) * 2); x.lineTo(d.fx + 20, 21); x.stroke();
  zHead(x, d.fx + 7, 20, 8.8, 0.2);
  x.fillStyle = '#141010'; x.beginPath(); x.moveTo(d.fx - 1, 13); x.quadraticCurveTo(d.fx - 12, 20, d.fx - 10, 36); x.lineTo(d.fx - 6, 34); x.quadraticCurveTo(d.fx - 6, 22, d.fx + 3, 15); x.fill(); // long hair
  x.restore();
}
function drawAunty(x, d, ph) {
  const sw = Math.sin(ph) * 3;
  x.fillStyle = '#2c241e'; rr(x, d.fx - 8 - sw, d.fy - 4, 9, 4, 2); x.fill(); rr(x, d.fx + sw, d.fy - 4, 9, 4, 2); x.fill();
  const bob = Math.abs(Math.sin(ph)) * 1.2;
  x.save(); x.translate(0, bob);
  // saree: a bell shape in magenta with a gold border, pallu over the shoulder
  x.fillStyle = '#c2185b';
  x.beginPath(); x.moveTo(d.fx - 12, 27); x.quadraticCurveTo(d.fx, 22, d.fx + 12, 27); x.lineTo(d.fx + 17, d.fy - 3); x.quadraticCurveTo(d.fx, d.fy + 1, d.fx - 17, d.fy - 3); x.closePath(); x.fill();
  x.strokeStyle = '#ffca28'; x.lineWidth = 2.2;
  x.beginPath(); x.moveTo(d.fx - 17, d.fy - 4); x.quadraticCurveTo(d.fx, d.fy, d.fx + 17, d.fy - 4); x.stroke();
  x.fillStyle = '#8e24aa'; x.beginPath(); x.moveTo(d.fx + 9, 26); x.quadraticCurveTo(d.fx - 2, 40, d.fx - 15, 50); x.lineTo(d.fx - 11, 53); x.quadraticCurveTo(d.fx + 2, 44, d.fx + 13, 30); x.fill();
  x.strokeStyle = '#ffca28'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(d.fx + 11, 28); x.quadraticCurveTo(d.fx, 42, d.fx - 13, 51); x.stroke();
  // arms thrown up — gossip in progress
  const up = Math.sin(ph * 2) * 4;
  x.strokeStyle = SKIN; x.lineWidth = 4; x.lineCap = 'round';
  x.beginPath(); x.moveTo(d.fx + 6, 31); x.lineTo(d.fx + 17, 19 + up); x.moveTo(d.fx - 6, 31); x.lineTo(d.fx - 15, 20 - up); x.stroke();
  zHead(x, d.fx + 5, 18, 9.5, 0.12);
  // hair bun + big bindi + open mouth
  x.fillStyle = '#1a1210'; x.beginPath(); x.arc(d.fx - 4, 12, 6, 0, TAU); x.fill();
  x.beginPath(); x.ellipse(d.fx + 4, 11, 10, 5, 0.1, Math.PI, 0); x.fill();
  x.fillStyle = '#d50000'; x.beginPath(); x.arc(d.fx + 12, 14, 1.6, 0, TAU); x.fill();
  x.fillStyle = '#300'; x.beginPath(); x.ellipse(d.fx + 12, 23, 2.8, 2.4, 0, 0, TAU); x.fill();
  x.restore();
}
function drawFufaji(x, d, ph) {
  zLegs(x, d, ph, 0.6, '#b8a074');
  const wob = Math.sin(ph) * 1.4;
  x.save(); x.translate(0, Math.abs(wob) * 0.6);
  // safari suit with a magnificent belly
  x.fillStyle = '#c8b183';
  x.beginPath(); x.ellipse(d.fx + 1, 40, 19 + wob * 0.3, 17, 0, 0, TAU); x.fill();
  x.fillStyle = '#a89064'; x.beginPath(); x.ellipse(d.fx - 6, 42, 10, 14, 0, 0, TAU); x.fill();
  x.strokeStyle = '#8a7348'; x.lineWidth = 1.2;
  x.beginPath(); x.moveTo(d.fx + 6, 25); x.lineTo(d.fx + 8, 56); x.stroke();
  x.strokeRect(d.fx - 5, 31, 7, 6); x.strokeRect(d.fx + 10, 31, 7, 6); // pockets
  x.fillStyle = '#5c4a2c'; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(d.fx + 7, 30 + k * 6.5, 1, 0, TAU); x.fill(); }
  zArms(x, d.fx + 12, 34, ph, 14);
  zHead(x, d.fx + 9, 17, 10.5, 0.15);
  // bald dome, specs, moustache
  x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.ellipse(d.fx + 6, 10, 6, 3, 0.2, 0, TAU); x.fill();
  x.strokeStyle = '#111'; x.lineWidth = 1.2; x.beginPath(); x.arc(d.fx + 13, 16, 3.2, 0, TAU); x.arc(d.fx + 20, 17, 3, 0, TAU); x.stroke();
  x.fillStyle = '#1a1210'; x.beginPath(); x.moveTo(d.fx + 10, 23); x.quadraticCurveTo(d.fx + 17, 19, d.fx + 24, 24); x.quadraticCurveTo(d.fx + 17, 22, d.fx + 10, 23); x.fill();
  x.restore();
}
function drawBoss(x, d, ph) {
  const sw = Math.sin(ph) * 4;
  x.fillStyle = '#efe3cc'; rr(x, d.fx - 8 - sw, d.fy - 18, 8, 17, 3); x.fill(); rr(x, d.fx + 1 + sw, d.fy - 18, 8, 17, 3); x.fill();
  x.fillStyle = '#8a4b16'; rr(x, d.fx - 10 - sw, d.fy - 3, 12, 4, 2); x.fill(); rr(x, d.fx - 1 + sw, d.fy - 3, 13, 4, 2); x.fill();
  // a long cream-and-gold sherwani, a maroon dupatta and a sword at the hip
  const g = x.createLinearGradient(d.fx - 16, 0, d.fx + 16, 0);
  g.addColorStop(0, '#b9a678'); g.addColorStop(0.6, '#efe2bd'); g.addColorStop(1, '#fff6dc');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(d.fx - 13, 30); x.quadraticCurveTo(d.fx, 24, d.fx + 13, 30); x.lineTo(d.fx + 17, d.fy - 14); x.quadraticCurveTo(d.fx, d.fy - 9, d.fx - 17, d.fy - 14); x.closePath(); x.fill();
  x.strokeStyle = '#d4a017'; x.lineWidth = 1.6;
  x.beginPath(); x.moveTo(d.fx + 4, 29); x.lineTo(d.fx + 5, d.fy - 12); x.stroke();
  x.beginPath(); x.moveTo(d.fx - 17, d.fy - 14); x.quadraticCurveTo(d.fx, d.fy - 9, d.fx + 17, d.fy - 14); x.stroke();
  x.fillStyle = '#7b1022'; x.beginPath(); x.moveTo(d.fx - 10, 29); x.quadraticCurveTo(d.fx + 2, 44, d.fx + 15, 52); x.lineTo(d.fx + 14, 57); x.quadraticCurveTo(d.fx, 49, d.fx - 13, 33); x.fill();
  x.strokeStyle = '#5d4037'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(d.fx - 12, 52); x.lineTo(d.fx - 22, 70); x.stroke();
  x.fillStyle = '#d4a017'; x.fillRect(d.fx - 14, 50, 5, 3);
  zArms(x, d.fx + 6, 36, ph, 18, '#7f9478');
  // face circle left for the possessed groom's selfie; the safa and sehra are an overlay (bossHat)
  x.fillStyle = SKIN; x.beginPath(); x.arc(d.fx + 6, 20, 10.5, 0, TAU); x.fill();
}
// Red safa with a kalgi + a curtain of gold sehra strands that sway over the face.
export function bossHat(frame) {
  const key = `boss:${frame}`;
  if (hatCache.has(key)) return hatCache.get(key);
  const d = ZDEF[4];
  const [c, x] = cv(d.w, d.h);
  const cx = d.fx + 6;
  const cy = 20;
  x.fillStyle = '#9b0e1e';
  x.beginPath(); x.moveTo(cx - 13, cy - 3); x.bezierCurveTo(cx - 15, cy - 20, cx + 13, cy - 22, cx + 14, cy - 4); x.quadraticCurveTo(cx, cy - 8, cx - 13, cy - 3); x.fill();
  x.strokeStyle = '#f2c14e'; x.lineWidth = 1.3;
  for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(cx - 12, cy - 5 - k * 4); x.quadraticCurveTo(cx, cy - 10 - k * 4.5, cx + 13, cy - 6 - k * 4); x.stroke(); }
  x.fillStyle = '#ffe08a'; x.beginPath(); x.arc(cx + 6, cy - 12, 2.6, 0, TAU); x.fill();
  x.strokeStyle = '#ffffff'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx + 6, cy - 13); x.quadraticCurveTo(cx + 11, cy - 24, cx + 4, cy - 28); x.stroke();
  // sehra strands
  const sway = Math.sin((frame / WALK_FRAMES) * TAU) * 1.5;
  for (let k = -9; k <= 11; k += 2.2) {
    x.strokeStyle = k % 4.4 < 2.2 ? 'rgba(255,214,120,.9)' : 'rgba(255,255,255,.75)';
    x.lineWidth = 0.9;
    x.beginPath(); x.moveTo(cx + k, cy - 4); x.quadraticCurveTo(cx + k + sway, cy + 6, cx + k + sway * 1.4, cy + 14); x.stroke();
    x.fillStyle = k % 3 < 1.5 ? '#ff8f00' : '#fff3e0';
    x.beginPath(); x.arc(cx + k + sway * 1.4, cy + 14, 1.1, 0, TAU); x.fill();
  }
  hatCache.set(key, c);
  return c;
}

const zCache = new Map();
export function zombieFrames(type, variant = 0) {
  const key = `${type}:${type === 0 ? variant % 4 : 0}`;
  if (zCache.has(key)) return zCache.get(key);
  const d = ZDEF[type];
  const frames = [];
  for (let i = 0; i < WALK_FRAMES; i++) {
    const [c, x] = cv(d.w, d.h);
    const ph = (i / WALK_FRAMES) * TAU;
    if (type === 0) drawWalker(x, d, ph, variant);
    else if (type === 1) drawRunner(x, d, ph);
    else if (type === 2) drawAunty(x, d, ph);
    else if (type === 3) drawFufaji(x, d, ph);
    else drawBoss(x, d, ph);
    frames.push(c);
  }
  zCache.set(key, frames);
  return frames;
}

// ---------------------------------------------------------------- Chandravati's shadow (treasure hunt)
// A floating veiled bride in a torn red lehenga — no face under the ghoonghat, just dark.
export const GHOST = { w: 56, h: 92, fx: 28, fy: 88 };
const ghostCache = [];
export function ghostFrames() {
  if (ghostCache.length) return ghostCache;
  for (let i = 0; i < WALK_FRAMES; i++) {
    const ph = (i / WALK_FRAMES) * TAU;
    const [c, x] = cv(GHOST.w, GHOST.h);
    const d = GHOST;
    const lift = Math.sin(ph) * 2.5;
    x.translate(0, -6 + lift);
    // trailing hem wisps
    x.fillStyle = 'rgba(120,0,20,.55)';
    for (let k = 0; k < 6; k++) {
      const wx = d.fx - 18 + k * 7;
      x.beginPath(); x.moveTo(wx, 66); x.quadraticCurveTo(wx - 3 + Math.sin(ph + k) * 3, 80, wx + 2, 90 + Math.sin(ph * 2 + k) * 3); x.lineTo(wx + 6, 66); x.fill();
    }
    // lehenga (flared, tattered) with a dulled gold border
    const g = x.createLinearGradient(d.fx - 20, 0, d.fx + 20, 0);
    g.addColorStop(0, '#4a0010'); g.addColorStop(0.5, '#9b0e1e'); g.addColorStop(1, '#5c0414');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(d.fx - 9, 34); x.quadraticCurveTo(d.fx, 30, d.fx + 9, 34); x.lineTo(d.fx + 21, 70); x.quadraticCurveTo(d.fx, 76, d.fx - 21, 70); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(201,169,79,.55)'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(d.fx - 21, 69); x.quadraticCurveTo(d.fx, 75, d.fx + 21, 69); x.stroke();
    // long pale arms hanging, fingers too long
    x.strokeStyle = '#c9c2b4'; x.lineWidth = 2.6; x.lineCap = 'round';
    x.beginPath(); x.moveTo(d.fx - 8, 38); x.quadraticCurveTo(d.fx - 14, 50, d.fx - 12, 60 + Math.sin(ph) * 2); x.moveTo(d.fx + 8, 38); x.quadraticCurveTo(d.fx + 14, 50, d.fx + 12, 60 - Math.sin(ph) * 2); x.stroke();
    // the ghoonghat: a translucent red veil from crown to waist
    x.fillStyle = 'rgba(200,16,46,.78)';
    x.beginPath(); x.moveTo(d.fx, 6); x.bezierCurveTo(d.fx + 20, 10, d.fx + 18, 34, d.fx + 15 + Math.sin(ph) * 2, 46); x.lineTo(d.fx - 15 - Math.sin(ph) * 2, 46); x.bezierCurveTo(d.fx - 18, 34, d.fx - 20, 10, d.fx, 6); x.fill();
    x.fillStyle = '#05010a'; x.beginPath(); x.ellipse(d.fx, 22, 8, 10, 0, 0, TAU); x.fill(); // nothing under the veil
    x.strokeStyle = 'rgba(255,214,120,.7)'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(d.fx - 15, 46); x.quadraticCurveTo(d.fx, 49, d.fx + 15, 46); x.stroke();
    x.fillStyle = '#ffd27a'; x.beginPath(); x.arc(d.fx, 10, 1.8, 0, TAU); x.fill(); // tikka glint
    ghostCache.push(c);
  }
  return ghostCache;
}

// Warm every cache up front (called while the chapter title is on screen) so the first frame never hitches.
export function prewarm(colors) {
  for (const c of colors) baraati(c);
  for (let v = 0; v < SAFA.length; v++) for (let f = -1; f < WALK_FRAMES; f++) safa(v, f);
  for (let t = 0; t < 5; t++) gun(t);
  for (let t = 0; t < 5; t++) for (let v = 0; v < (t === 0 ? 4 : 1); v++) zombieFrames(t, v);
  for (let f = 0; f < WALK_FRAMES; f++) bossHat(f);
  ghostFrames();
  shadow();
  for (const c of ['255,255,255', '255,214,140', '255,60,80', '210,255,150', '160,220,255', '255,140,40']) glow(c);
}
export const SAFA_COUNT = SAFA.length;
