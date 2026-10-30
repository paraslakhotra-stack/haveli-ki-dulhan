// TV renderer for Chapter VI — Murda Baraat. World 1600×900 drawn into the 1920×1080 stage.
// Positions come from the server's 30 Hz binary snapshots via RtBuffer (interpolated ~90 ms in the past).
// Characters and zombies are pre-rendered sprites (sprites.js); lights are blits of pre-made glow sprites,
// so a frame is mostly drawImage calls — comfortably 60 fps with 16 players and a 60-zombie horde.
import { createNoise2D } from '/vendor/simplex-noise.mjs';
import { getPhoto, getPossessed, nameOf } from '/shared/photos.js';
import { audio } from '/shared/audio.js';
import { RtBuffer, playerKey, idKey } from '/tv/rtclient.js';
import * as SP from '/tv/sprites.js';

const WW = 1600;
const WH = 900;
const S = 1.2; // world → stage scale
const TAU = Math.PI * 2;
const WEAPON_NAMES = ['DESI KATTA', 'DUNALI', 'TOMMY GUN', 'PHULJHADI FLAMER', 'ANAAR ROCKET'];
const POWERS = ['coldfeet', 'prenup', 'lastdance', 'bestman', 'bouquet'];
const PICKUPS = ['grenade', ...POWERS];
const POWER_ICON = { coldfeet: '🏃', prenup: '🧿', lastdance: '💃', bestman: '👬', bouquet: '🎨', grenade: '🍋' };
const POWER_NAME = { coldfeet: 'BHAAG MILKHA', prenup: 'NAZAR BATTU', lastdance: 'NAAGIN DANCE', bestman: 'BESTIE BHAI', bouquet: 'GULAAL BOMB', grenade: 'NIMBU-MIRCHI BOMB' };
const ZNAME = ['Baraati', 'Naagin', 'Gossip Aunty', 'Fufaji', 'Bhoot Dulha'];
const OBST = [
  { x: 800, y: 450, r: 62, kind: 'fountain' }, { x: 380, y: 230, r: 30, kind: 'chhatri' }, { x: 1220, y: 230, r: 30, kind: 'chhatri' },
  { x: 380, y: 670, r: 30, kind: 'chhatri' }, { x: 1220, y: 670, r: 30, kind: 'chhatri' }, { x: 560, y: 120, r: 22, kind: 'lamp' },
  { x: 1040, y: 780, r: 22, kind: 'lamp' }, { x: 180, y: 460, r: 40, kind: 'tree' }, { x: 1420, y: 440, r: 40, kind: 'tree' },
  { x: 640, y: 760, r: 24, kind: 'lamp' }, { x: 980, y: 130, r: 24, kind: 'lamp' },
];

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rnd(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

export class ArenaRenderer {
  constructor() {
    this.buf = new RtBuffer();
    this.anim = new Map(); // per-entity animation state (walk phase, facing, first seen)
    this.fx = [];
    this.parts = [];
    this.corpses = [];
    this.banners = [];
    this.feed = [];
    this.shake = 0;
    this.teamColor = {};
    this.faceCache = new Map();
    this.groomId = null;
    this.ground = null;
    this.obstSprites = null;
    [this.decals, this.dctx] = cv(WW, WH);
    [this.light, this.lctx] = cv(WW / 2, WH / 2);
    this.cone = this.buildCone();
    this.t = 0;
    this.fps = { n: 0, acc: 0, value: 60, low: 0 };
    this.quality = 1;
    this.debug = /[?&]debug/.test(location.search);
  }
  reset() {
    this.buf.reset(); this.anim.clear(); this.fx = []; this.parts = []; this.corpses = []; this.banners = []; this.feed = [];
    if (this.ground) { this.dctx.globalCompositeOperation = 'copy'; this.dctx.drawImage(this.ground, 0, 0); this.dctx.globalCompositeOperation = 'source-over'; }
  }
  setContext({ teams, players, groomId }) {
    this.teamColor = Object.fromEntries((teams || []).map((t) => [t.id, t.color]));
    this.playerTeam = Object.fromEntries((players || []).map((p) => [p.id, p.team]));
    if (groomId !== this.groomId) { this.groomId = groomId; this.faceCache.clear(); }
  }
  // Build sprites/ground lazily (the first arena frame) and warm every cache before the fight starts.
  prepare() {
    if (this.ground) return;
    this.ground = this.buildGround();
    // The floor = ground + blood/scorch decals painted straight onto it: one full-screen blit per frame, not two.
    this.dctx.drawImage(this.ground, 0, 0);
    this.obstSprites = this.buildObstacles();
    SP.prewarm(Object.values(this.teamColor).concat('#efe6d8'));
  }
  ingest(buf, meta) { this.buf.push(buf, meta); }

  // ---------------------------------------------------------------- static art
  buildGround() {
    const [c, x] = cv(WW, WH);
    const noise = createNoise2D(rnd(1234));
    const [n, nx] = cv(400, 225);
    const img = nx.createImageData(400, 225);
    for (let y = 0; y < 225; y++) for (let xx = 0; xx < 400; xx++) {
      const v = noise(xx / 40, y / 40) * 0.5 + noise(xx / 12, y / 12) * 0.3 + noise(xx / 4, y / 4) * 0.2;
      const i = (y * 400 + xx) * 4;
      img.data[i] = 24 + v * 10; img.data[i + 1] = 36 + v * 14; img.data[i + 2] = 24 + v * 8; img.data[i + 3] = 255;
    }
    nx.putImageData(img, 0, 0);
    x.drawImage(n, 0, 0, WW, WH);
    // sandstone char-bagh paths: a cross of slabs and a ring around the fountain
    const slab = (x0, y0, w, h) => {
      x.fillStyle = '#5b4a36'; x.fillRect(x0, y0, w, h);
      x.strokeStyle = 'rgba(30,20,12,.55)'; x.lineWidth = 2;
      const step = 34;
      if (w > h) for (let k = x0; k < x0 + w; k += step) { x.beginPath(); x.moveTo(k, y0); x.lineTo(k, y0 + h); x.stroke(); }
      else for (let k = y0; k < y0 + h; k += step) { x.beginPath(); x.moveTo(x0, k); x.lineTo(x0 + w, k); x.stroke(); }
      x.strokeStyle = '#8a6f4e'; x.lineWidth = 3; x.strokeRect(x0, y0, w, h);
    };
    slab(0, 418, WW, 64); slab(768, 0, 64, WH);
    x.strokeStyle = '#5b4a36'; x.lineWidth = 46; x.beginPath(); x.arc(800, 450, 148, 0, TAU); x.stroke();
    x.strokeStyle = '#8a6f4e'; x.lineWidth = 3; x.beginPath(); x.arc(800, 450, 125, 0, TAU); x.arc(800, 450, 171, 0, TAU); x.stroke();
    const r = rnd(77);
    for (let i = 0; i < 2400; i++) {
      x.fillStyle = `rgba(10,20,10,${r() * 0.35})`;
      x.fillRect(r() * WW, r() * WH, 2, 2);
    }
    // marigold (genda) beds
    for (let i = 0; i < 80; i++) {
      const bx = r() * WW; const by = r() * WH;
      if (Math.abs(bx - 800) < 100 || Math.abs(by - 450) < 100 || Math.hypot(bx - 800, by - 450) < 220) continue;
      x.fillStyle = 'rgba(12,34,16,.95)'; x.beginPath(); x.arc(bx, by, 12 + r() * 8, 0, TAU); x.fill();
      for (let k = 0; k < 5; k++) { x.fillStyle = r() < 0.5 ? 'rgba(236,140,16,.95)' : 'rgba(252,192,52,.95)'; x.beginPath(); x.arc(bx + (r() - 0.5) * 18, by + (r() - 0.5) * 18, 3 + r() * 2, 0, TAU); x.fill(); }
    }
    // hedge border with gaps at the gates
    const gates = [[0, 450], [WW, 450], [800, 0], [800, WH], [400, 0], [1200, WH]];
    const nearGate = (hx, hy) => gates.some(([gx, gy]) => Math.hypot(hx - gx, hy - gy) < 70);
    for (let i = 0; i < 900; i++) {
      const side = i % 4;
      const f = r();
      const hx = side < 2 ? f * WW : side === 2 ? r() * 26 : WW - r() * 26;
      const hy = side === 0 ? r() * 26 : side === 1 ? WH - r() * 26 : f * WH;
      if (nearGate(hx, hy)) continue;
      x.fillStyle = `rgba(${8 + r() * 10},${30 + r() * 22},${12 + r() * 10},1)`;
      x.beginPath(); x.arc(hx, hy, 10 + r() * 12, 0, TAU); x.fill();
    }
    // fountain basin (flat) + soft contact shadows under every upright prop
    for (const o of OBST) {
      x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(o.x + 8, o.y + 6, o.r * 1.15, o.r * 0.6, 0, 0, TAU); x.fill();
      if (o.kind === 'fountain') {
        x.fillStyle = '#7d7466'; x.beginPath(); x.ellipse(o.x, o.y, o.r, o.r * 0.82, 0, 0, TAU); x.fill();
        x.fillStyle = '#1b2a38'; x.beginPath(); x.ellipse(o.x, o.y, o.r - 10, o.r * 0.82 - 9, 0, 0, TAU); x.fill();
        x.fillStyle = '#8f8676'; x.beginPath(); x.ellipse(o.x, o.y - 6, 14, 11, 0, 0, TAU); x.fill();
        for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; x.fillStyle = k % 2 ? '#f39c12' : '#ffc93c'; x.beginPath(); x.arc(o.x + Math.cos(a) * (o.r - 4), o.y + Math.sin(a) * (o.r * 0.82 - 4), 4, 0, TAU); x.fill(); }
      }
    }
    return c;
  }
  // Upright props, drawn y-sorted with the characters so you can walk behind a chhatri.
  buildObstacles() {
    const R = SP.RES;
    const make = (w, h, fn) => { const [c, x] = cv(w * R, h * R); x.scale(R, R); fn(x); return { c, w, h }; };
    const chhatri = make(84, 120, (x) => {
      // plinth
      x.fillStyle = '#7a5a3a'; x.fillRect(6, 96, 72, 18); x.fillStyle = '#9a7650'; x.fillRect(6, 92, 72, 6);
      // four pillars
      for (const px of [12, 30, 48, 66]) { x.fillStyle = px < 40 ? '#8f6b45' : '#b08658'; x.fillRect(px, 48, 7, 46); x.fillStyle = '#d6ad74'; x.fillRect(px, 46, 7, 4); }
      // chhajja (eave) + dome + finial
      x.fillStyle = '#7a5a3a'; x.beginPath(); x.moveTo(0, 50); x.lineTo(84, 50); x.lineTo(76, 40); x.lineTo(8, 40); x.closePath(); x.fill();
      const g = x.createLinearGradient(14, 0, 70, 0); g.addColorStop(0, '#8a6440'); g.addColorStop(0.6, '#d8b07a'); g.addColorStop(1, '#e8c592');
      x.fillStyle = g; x.beginPath(); x.moveTo(14, 41); x.bezierCurveTo(14, 4, 70, 4, 70, 41); x.closePath(); x.fill();
      x.fillStyle = '#e2b84f'; x.fillRect(40, 2, 4, 12); x.beginPath(); x.arc(42, 4, 4, 0, TAU); x.fill();
      // marigold string on the eave
      for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? '#f39c12' : '#ffc93c'; x.beginPath(); x.arc(6 + k * 9, 52 + Math.sin(k) * 2, 2.8, 0, TAU); x.fill(); }
    });
    const tree = make(120, 150, (x) => {
      x.fillStyle = '#3b2a1c'; x.beginPath(); x.moveTo(52, 150); x.lineTo(56, 80); x.lineTo(64, 80); x.lineTo(70, 150); x.fill();
      const blobs = [[60, 60, 46], [32, 74, 30], [88, 72, 32], [60, 30, 34], [40, 44, 28], [82, 44, 28]];
      for (const [bx, by, br] of blobs) { x.fillStyle = '#0d1a0e'; x.beginPath(); x.arc(bx, by, br, 0, TAU); x.fill(); }
      const r = rnd(9);
      for (let k = 0; k < 70; k++) { const a = r() * TAU; const d = r() * 46; x.fillStyle = `rgba(${36 + r() * 30},${64 + r() * 40},${32 + r() * 20},${0.5 + r() * 0.4})`; x.beginPath(); x.arc(60 + Math.cos(a) * d, 54 + Math.sin(a) * d * 0.8, 5 + r() * 8, 0, TAU); x.fill(); }
    });
    const lamp = make(30, 70, (x) => {
      // stone deepstambh (lamp pillar) with a little diya on top
      x.fillStyle = '#6d6458'; x.fillRect(9, 20, 12, 46); x.fillStyle = '#8b8174'; x.fillRect(9, 20, 5, 46);
      x.fillStyle = '#5a5248'; x.fillRect(4, 62, 22, 8); x.fillRect(5, 16, 20, 6);
      x.fillStyle = '#a0522d'; x.beginPath(); x.ellipse(15, 15, 7, 3, 0, 0, Math.PI); x.fill();
    });
    return { chhatri, tree, lamp };
  }
  // Flashlight wedge (pointing right), blitted rotated into the light mask.
  buildCone() {
    const L = 280;
    const [c, x] = cv(L, L * 2);
    const g = x.createRadialGradient(0, L, 4, 0, L, L);
    g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(0.7, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(0, L); x.arc(0, L, L, -0.42, 0.42); x.closePath(); x.fill();
    return c;
  }

  face(id, size, possessed = false) {
    const key = `${id}:${size}:${possessed}`;
    let c = this.faceCache.get(key);
    const src = possessed ? getPossessed(id) : getPhoto(id);
    if (c && c.src === src) return c.canvas;
    const [cc, x] = cv(size, size);
    x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, TAU); x.clip();
    if (src) {
      const img = new Image(); img.src = src;
      if (img.complete) x.drawImage(img, 0, 0, size, size);
      else img.onload = () => this.faceCache.delete(key);
    } else {
      x.fillStyle = possessed ? '#2a3a24' : '#c99a72'; x.fillRect(0, 0, size, size);
      x.fillStyle = '#2a1a10'; x.font = `700 ${size * 0.5}px Cinzel, serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText((nameOf(id)[0] || '?').toUpperCase(), size / 2, size / 2 + 2);
    }
    c = { canvas: cc, src };
    this.faceCache.set(key, c);
    return cc;
  }

  // ---------------------------------------------------------------- events
  handle(ev) {
    const pan = (x) => (x / WW) * 2 - 1;
    const P = this.players;
    switch (ev.e) {
      case 'shot': {
        const a = ev.a / 100;
        // misses (guns never stop) get a short, faint streak so the yard doesn't turn into a laser show
        if (ev.h || (this.quality > 0.5 && Math.random() < 0.5)) this.fx.push({ k: 'tracer', x: ev.x, y: ev.y - 30, a, l: ev.h ? ev.l : Math.min(ev.l, 170), w: ev.w, life: 0.08, max: ev.h ? 0.08 : 0.2 });
        this.fx.push({ k: 'flash', x: ev.x + Math.cos(a) * 30, y: ev.y - 30 + Math.sin(a) * 30, life: 0.06, max: 0.06, r: ev.w === 1 ? 90 : 60 });
        if ((this.shotsThisFrame = (this.shotsThisFrame || 0) + 1) <= 3) audio.shot(ev.w, pan(ev.x));
        break;
      }
      case 'flame': {
        const p = P?.get(ev.pid);
        if (p) {
          const a = ev.a / 100;
          for (let i = 0; i < 3; i++) this.parts.push({ k: 'fire', x: p[0] + Math.cos(a) * 30, y: p[1] - 28 + Math.sin(a) * 30, vx: Math.cos(a + (Math.random() - 0.5) * 0.8) * (380 + Math.random() * 200), vy: Math.sin(a + (Math.random() - 0.5) * 0.8) * (380 + Math.random() * 200), life: 0.45, max: 0.45 });
          if (Math.random() < 0.3) audio.shot(3, pan(p[0]));
        }
        break;
      }
      case 'beam': this.fx.push({ k: 'beam', x: ev.x, y: ev.y - 30, a: ev.a / 100, l: ev.l, life: 0.3, max: 0.3 }); audio.shot(4, pan(ev.x)); this.shake = Math.max(this.shake, 4); break;
      case 'kill': {
        const zt = ev.z ?? 0;
        this.corpses.push({ type: zt, v: ev.v || 0, x: ev.x, y: ev.y, t0: this.t, flip: Math.random() < 0.5, burn: !!ev.burn });
        this.splat(ev.x, ev.y, ev.burn);
        const n = this.quality > 0.5 ? 10 : 5;
        for (let i = 0; i < n; i++) this.parts.push({ k: ev.burn ? 'ember' : 'blood', x: ev.x, y: ev.y - 20, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.7) * 300, life: 0.5 + Math.random() * 0.4, max: 0.9 });
        for (let i = 0; i < 3; i++) this.parts.push({ k: 'petal', x: ev.x, y: ev.y - 30, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80, life: 1.4, max: 1.4, rot: Math.random() * TAU });
        audio.splat(pan(ev.x));
        if (Math.random() < 0.25) audio.groan(0.6, pan(ev.x), 1.1);
        if (ev.pid) { this.feed.unshift({ pid: ev.pid, z: zt, life: 4 }); if (this.feed.length > 5) this.feed.length = 5; }
        break;
      }
      case 'boom': {
        this.fx.push({ k: 'boom', x: ev.x, y: ev.y, r: ev.r, holy: ev.holy, life: 0.6, max: 0.6 });
        const n = this.quality > 0.5 ? 30 : 14;
        for (let i = 0; i < n; i++) { const a = Math.random() * TAU; const sp = 120 + Math.random() * 420; this.parts.push({ k: ev.holy ? 'holy' : 'ember', x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7 }); }
        this.scorch(ev.x, ev.y, ev.r * 0.6, ev.holy);
        this.shake = Math.max(this.shake, ev.r > 200 ? 16 : 9);
        audio.boom(1, !!ev.holy);
        break;
      }
      case 'dash': {
        const a = ev.a / 100;
        for (let i = 0; i < 6; i++) this.parts.push({ k: 'dust', x: ev.x - Math.cos(a) * i * 6, y: ev.y, vx: -Math.cos(a) * 80 + (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 30, life: 0.5, max: 0.5 });
        audio.ui('ok');
        break;
      }
      case 'scream': this.fx.push({ k: 'ring', x: ev.x, y: ev.y - 30, c: '200,90,255', life: 0.9, max: 0.9, r: 280 }); audio.scream(0.55, pan(ev.x)); break;
      case 'roar': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '255,40,60', life: 1, max: 1, r: 200 }); audio.roar(1); break;
      case 'slam': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '255,220,180', life: 0.6, max: 0.6, r: 260 }); this.shake = 22; audio.slam(1.4); for (let i = 0; i < 16; i++) this.parts.push({ k: 'dust', x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 200, life: 0.8, max: 0.8 }); break;
      case 'summon': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '120,255,120', life: 1.2, max: 1.2, r: 320 }); audio.stinger(0.6); audio.groan(1.2, 0, 0.7); break;
      case 'level': {
        const p = P?.get(ev.pid);
        if (p) { this.fx.push({ k: 'text', x: p[0], y: p[1] - 80, text: `${WEAPON_NAMES[ev.tier]}!`, c: '#ffd27a', life: 1.8, max: 1.8 }); this.fx.push({ k: 'ring', x: p[0], y: p[1], c: '255,210,120', life: 0.8, max: 0.8, r: 120 }); }
        audio.levelUp();
        break;
      }
      case 'pickup': {
        const p = P?.get(ev.pid);
        if (p) this.fx.push({ k: 'text', x: p[0], y: p[1] - 80, text: POWER_NAME[ev.kind] || '', c: '#bfe6ff', life: 1.4, max: 1.4 });
        audio.pickup();
        break;
      }
      case 'power': {
        this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: ev.pw === 'bouquet' ? '255,120,200' : '160,220,255', life: 0.8, max: 0.8, r: ev.pw === 'bouquet' ? 250 : 120 });
        if (ev.pw === 'bouquet') for (let i = 0; i < 40; i++) { const a = Math.random() * TAU; const sp = 100 + Math.random() * 380; this.parts.push({ k: 'gulal', c: ['255,64,129', '255,214,0', '0,200,83', '41,121,255'][i % 4], x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, max: 1 }); }
        this.banner(`${nameOf(ev.pid).toUpperCase()} — ${POWER_NAME[ev.pw]}`, 1.6, '#bfe6ff', 0.55);
        audio.ui('good');
        break;
      }
      case 'down': {
        const p = P?.get(ev.pid);
        if (p) this.fx.push({ k: 'text', x: p[0], y: p[1] - 80, text: 'DOWN!', c: '#ff4a5a', life: 1.5, max: 1.5 });
        audio.stinger(0.4);
        break;
      }
      case 'revive': { const p = P?.get(ev.pid); if (p) this.fx.push({ k: 'ring', x: p[0], y: p[1], c: '255,255,220', life: 0.7, max: 0.7, r: 90 }); audio.ui('ok'); break; }
      case 'wave': this.banner(ev.boss ? 'BHOOT DULHA AA GAYA' : `WAVE ${ev.n}`, 3.2, ev.boss ? '#ff3b5c' : '#efe6d8', 1, ev.title); audio.bell(0.8); audio.whisper(0.8); break;
      case 'break': this.banner('BARAAT BREAK', 2.6, '#ffd27a', 1, 'Phone pe sawaal — sahi jawaab = power!'); audio.bell(0.7); break;
      case 'boss': audio.roar(1.4); audio.stinger(1); break;
      case 'bossDie': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '255,255,255', life: 2, max: 2, r: 700 }); this.shake = 30; audio.scream(1); audio.bell(1); break;
      case 'bell': this.banner('GHANTA BAJ GAYA', 2.4, '#efe6d8', 0.8, 'Baaki murde jal gaye'); audio.bell(1); break;
      case 'victory': this.banner('BAAGH SAAF HAI', 4, '#ffd27a', 1, 'Mandap ki taraf bhaago!'); audio.bell(1); audio.ui('good'); break;
      default:
    }
  }
  banner(text, life, color, size = 1, sub = '') { this.banners.push({ text, sub, life, max: life, color, size }); }
  splat(x, y, burn) {
    const d = this.dctx;
    const n = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const dist = Math.random() * 26;
      d.fillStyle = burn ? `rgba(20,14,10,${0.4 + Math.random() * 0.3})` : `rgba(${70 + Math.random() * 50},${4 + Math.random() * 10},${8 + Math.random() * 10},${0.5 + Math.random() * 0.3})`;
      d.beginPath(); d.ellipse(x + Math.cos(a) * dist, y + Math.sin(a) * dist * 0.6, 3 + Math.random() * 10, 2 + Math.random() * 6, 0, 0, TAU); d.fill();
    }
  }
  scorch(x, y, r, holy) {
    const d = this.dctx;
    d.globalAlpha = holy ? 0.25 : 0.55;
    d.globalCompositeOperation = holy ? 'lighter' : 'source-over';
    d.drawImage(SP.glow(holy ? '160,200,255' : '0,0,0'), x - r, y - r * 0.6, r * 2, r * 1.2);
    d.globalAlpha = 1; d.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- per-frame state
  // Advance walk phase by distance travelled, remember facing, note when an entity first appeared.
  animate(id, x, y, fallbackFace, dt) {
    let a = this.anim.get(id);
    if (!a) { a = { x, y, ph: Math.random() * 6, face: fallbackFace >= 0 ? 1 : -1, born: this.t, speed: 0 }; this.anim.set(id, a); }
    const dx = x - a.x;
    const dy = y - a.y;
    const dist = Math.hypot(dx, dy);
    a.speed += ((dt > 0 ? dist / dt : 0) - a.speed) * Math.min(1, dt * 12);
    a.ph = (a.ph + dist / 7) % SP.WALK_FRAMES;
    if (Math.abs(dx) > 0.4) a.face = dx > 0 ? 1 : -1;
    a.x = x; a.y = y; a.seen = this.t;
    return a;
  }

  draw(ctx, dt) {
    this.prepare();
    this.t += dt;
    this.shotsThisFrame = 0;
    this.trackFps(dt);
    const meta = this.buf.latest?.meta;
    this.players = this.buf.sample('p', { key: playerKey, x: 0, y: 1, angle: 2 });
    const zs = this.buf.sample('z', { key: idKey, x: 2, y: 3, angle: 4 });
    for (const ev of this.buf.takeEvents()) this.handle(ev);
    // forget entities that vanished (keeps the map small)
    if ((this.frame = (this.frame || 0) + 1) % 60 === 0) for (const [id, a] of this.anim) if (this.t - a.seen > 2) this.anim.delete(id);

    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
    if (this.shake > 0) { ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake = Math.max(0, this.shake - dt * 40); }
    ctx.scale(S, S);
    ctx.drawImage(this.decals, 0, 0);
    this.drawWater(ctx);
    const latest = this.buf.latest;
    if (latest) for (const k of latest.tables.k) this.drawPickup(ctx, k);

    // y-sorted world: props, corpses, zombies, players
    const list = [];
    for (const o of OBST) if (o.kind !== 'fountain') list.push({ y: o.y, k: 'o', o });
    for (const c of this.corpses) list.push({ y: c.y - 1, k: 'c', c });
    for (const [id, z] of zs) list.push({ y: z[3], k: 'z', id, z });
    for (const [id, p] of this.players) list.push({ y: p[1], k: 'p', id, p });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.k === 'o') this.drawProp(ctx, it.o);
      else if (it.k === 'c') this.drawCorpse(ctx, it.c);
      else if (it.k === 'z') this.drawZombie(ctx, it.id, it.z, dt, meta);
      else this.drawPlayer(ctx, it.id, it.p, dt);
    }
    this.corpses = this.corpses.filter((c) => this.t - c.t0 < 1.3);
    if (latest) for (const g of latest.tables.g) this.drawGrenade(ctx, g);
    this.drawParticles(ctx, dt);
    this.drawFx(ctx, dt, 'world');
    this.drawLight(ctx, zs, meta);
    this.drawFx(ctx, 0, 'glow');
    this.drawGlow(ctx, zs);
    this.drawTags(ctx);
    ctx.restore();
    this.drawHud(ctx, dt, meta);
  }

  trackFps(dt) {
    const f = this.fps;
    f.n++; f.acc += dt;
    if (f.acc >= 1) {
      f.value = f.n / f.acc; f.n = 0; f.acc = 0;
      // Auto quality: drop particles/glow when the TV can't keep up, restore when it can.
      if (f.value < 48) { f.low++; if (f.low >= 2) this.quality = Math.max(0.3, this.quality - 0.35); } else { f.low = 0; if (f.value > 57) this.quality = Math.min(1, this.quality + 0.1); }
    }
  }

  drawWater(x) {
    x.strokeStyle = 'rgba(150,180,210,.3)'; x.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const r = ((this.t * 14 + i * 16) % 46) + 4;
      x.globalAlpha = 1 - r / 50;
      x.beginPath(); x.ellipse(800, 450, r, r * 0.8, 0, 0, TAU); x.stroke();
    }
    x.globalAlpha = 1;
    // fountain spout
    x.fillStyle = 'rgba(190,220,255,.5)';
    for (let i = 0; i < 6; i++) { const k = ((this.t * 1.6 + i / 6) % 1); x.beginPath(); x.arc(800 + Math.cos(i * 1.1) * k * 20, 444 - Math.sin(k * Math.PI) * 26, 2, 0, TAU); x.fill(); }
  }
  drawProp(x, o) {
    const s = this.obstSprites[o.kind];
    if (!s) return;
    x.drawImage(s.c, o.x - s.w / 2, o.y - s.h + 8, s.w, s.h);
    if (o.kind === 'lamp') {
      const fl = 0.8 + Math.sin(this.t * 13 + o.x) * 0.15 + Math.random() * 0.05;
      x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = fl;
      x.drawImage(SP.glow('255,170,60'), o.x - 14, o.y - 74, 28, 28);
      x.fillStyle = '#ffe08a'; x.beginPath(); x.ellipse(o.x, o.y - 58, 2.4, 4.4, 0, 0, TAU); x.fill();
      x.restore();
    }
  }

  drawPlayer(x, id, p, dt) {
    const [px, py, aim100, hp, flags, tier, rev] = p;
    const aim = aim100 / 100;
    const down = flags & 1;
    const a = this.animate(id, px, py, Math.cos(aim), dt);
    const color = this.teamColor[this.playerTeam?.[id]] || '#efe6d8';
    const fr = SP.baraati(color);
    const moving = a.speed > 25 && !down;
    const fi = Math.floor(a.ph) % SP.WALK_FRAMES;
    const face = Math.cos(aim) >= 0 ? 1 : -1; // players face where they aim
    const bob = moving ? SP.BOB[fi] : 0;
    const variant = hash(id) % SP.SAFA_COUNT;
    const B = SP.B;
    x.drawImage(SP.shadow(), px - 20, py - 7, 40, 14);
    if (down) {
      x.save(); x.translate(px, py - 8); x.rotate(-Math.PI / 2 * face); x.globalAlpha = 0.75;
      x.drawImage(fr.idle, -B.fx, -B.fy + 14, B.w, B.h);
      x.restore();
      x.drawImage(this.face(id, 48), px - 30 * face - 10, py - 18, 20, 20);
      const pulse = 0.5 + Math.sin(this.t * 6) * 0.5;
      x.strokeStyle = `rgba(255,60,80,${pulse})`; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py - 6, 42, 24, 0, 0, TAU); x.stroke();
      if (rev > 0) { x.strokeStyle = '#fff6c8'; x.lineWidth = 5; x.beginPath(); x.ellipse(px, py - 6, 42, 24, 0, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, rev / 90)); x.stroke(); }
      return;
    }
    // dash afterimages
    if (flags & 32) {
      for (let k = 3; k >= 1; k--) {
        x.globalAlpha = 0.12 * k;
        x.save(); x.translate(px - (px - (a.px ?? px)) * k * 1.4, py - (py - (a.py ?? py)) * k * 1.4); x.scale(face, 1);
        x.drawImage(fr.walk[fi], -B.fx, -B.fy, B.w, B.h); x.restore();
      }
      x.globalAlpha = 1;
    }
    a.px = px; a.py = py;
    if (flags & 4) { x.strokeStyle = 'rgba(160,220,255,.5)'; x.lineWidth = 2; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(px - face * (12 + i * 7), py - 30 + i * 6); x.lineTo(px - face * (28 + i * 9), py - 30 + i * 6); x.stroke(); } }
    // body (mirrored for left), face (never mirrored), safa (mirrored)
    x.save(); x.translate(px, py); x.scale(face, 1);
    x.drawImage(moving ? fr.walk[fi] : fr.idle, -B.fx, -B.fy, B.w, B.h);
    if (flags & 64) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.45; x.drawImage(moving ? fr.walk[fi] : fr.idle, -B.fx, -B.fy, B.w, B.h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    x.restore();
    const hx = px + (B.headX - B.fx) * face;
    const hy = py + (B.headY - B.fy) + bob;
    x.fillStyle = '#c99a72'; x.beginPath(); x.arc(hx, hy, B.headR + 0.6, 0, TAU); x.fill();
    x.drawImage(this.face(id, 48), hx - B.headR, hy - B.headR, B.headR * 2, B.headR * 2);
    x.save(); x.translate(px, py); x.scale(face, 1);
    x.drawImage(SP.safa(variant, moving ? fi : -1), -B.fx, -B.fy, B.w, B.h);
    x.restore();
    // gun arm: shoulder → aim, gun flipped when aiming left so it never draws upside down
    const sx = px + 3 * face;
    const sy = py - 30 + bob;
    x.save(); x.translate(sx, sy); x.rotate(aim);
    if (face < 0) x.scale(1, -1);
    const kick = (flags & 8) ? Math.random() * 2.5 : 0;
    x.fillStyle = shadeCached(color); x.beginPath(); x.roundRect(-2, -3, 14, 6, 3); x.fill();
    x.fillStyle = '#c99a72'; x.beginPath(); x.arc(12 - kick, 0, 3, 0, TAU); x.fill();
    const G = SP.GUN;
    x.drawImage(SP.gun(tier), 10 - kick - G.gx, -G.gy, G.w, G.h);
    x.restore();
    if (flags & 2) { x.strokeStyle = `rgba(140,200,255,${0.6 + Math.sin(this.t * 10) * 0.3})`; x.lineWidth = 3; x.beginPath(); x.ellipse(px, py - 28, 30, 38, 0, 0, TAU); x.stroke(); }
    if (flags & 16) {
      const ang = this.t * 3;
      x.globalAlpha = 0.85; x.drawImage(SP.glow('207,232,255'), px + Math.cos(ang) * 46 - 12, py - 30 + Math.sin(ang) * 30 - 12, 24, 24); x.globalAlpha = 1;
    }
    // health pip under the feet
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(px - 16, py + 6, 32, 4);
    x.fillStyle = hp > 50 ? '#7fe07a' : hp > 25 ? '#ffc04a' : '#ff3b4a'; x.fillRect(px - 16, py + 6, 32 * hp / 100, 4);
  }

  drawZombie(x, id, z, dt, meta) {
    const [, type, zx, zy, ang100, hp, flags] = z;
    const d = SP.ZDEF[type];
    const a = this.animate(`z${id}`, zx, zy, Math.cos(ang100 / 100), dt);
    const frames = SP.zombieFrames(type, id % 4);
    const speedMul = type === 1 ? 1.6 : type === 3 ? 0.7 : 1;
    const fi = Math.floor((a.ph * speedMul) % SP.WALK_FRAMES);
    let sc = d.s;
    if (flags & 32) sc *= 1 + 0.1 + Math.sin(this.t * 22) * 0.06; // Fufaji swelling
    if (type === 4 && (flags & 8)) sc *= 1.04;
    const face = type === 4 ? (Math.cos(ang100 / 100) >= 0 ? 1 : -1) : a.face;
    const age = this.t - a.born;
    const rising = age < 0.6 && meta?.phase === 'fight' && this.t > 1;
    x.drawImage(SP.shadow(), zx - 22 * sc, zy - 7 * sc, 44 * sc, 14 * sc);
    x.save(); x.translate(zx, zy); x.scale(face * sc, sc);
    if (rising) {
      const k = age / 0.6;
      x.beginPath(); x.rect(-d.fx, -d.fy, d.w, d.fy); x.clip();
      x.translate(0, (1 - k) * d.h * 0.8);
      if (Math.random() < 0.4) this.parts.push({ k: 'dust', x: zx + (Math.random() - 0.5) * 30, y: zy, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, life: 0.5, max: 0.5 });
    }
    x.drawImage(frames[fi], -d.fx, -d.fy, d.w, d.h);
    if (flags & 16) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = type === 4 ? 0.1 : 0.55; x.drawImage(frames[fi], -d.fx, -d.fy, d.w, d.h); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
    x.restore();
    if (type === 4) {
      // the possessed groom's face under a swaying sehra
      const hx = zx + (d.fx + 6 - d.fx) * face * sc;
      const hy = zy + (20 - d.fy) * sc;
      x.drawImage(this.face(this.groomId || 'boss', 64, true), hx - 10 * sc, hy - 10 * sc, 20 * sc, 20 * sc);
      x.save(); x.translate(zx, zy); x.scale(face * sc, sc);
      x.drawImage(SP.bossHat(fi), -d.fx, -d.fy, d.w, d.h);
      x.restore();
      if (flags & 8) for (let i = 0; i < 2; i++) this.parts.push({ k: 'dust', x: zx - face * 30, y: zy, vx: -face * (80 + Math.random() * 80), vy: -20 - Math.random() * 40, life: 0.6, max: 0.6 });
      if (flags & 4) { x.strokeStyle = `rgba(255,40,60,${0.5 + Math.sin(this.t * 30) * 0.5})`; x.lineWidth = 4; x.beginPath(); x.ellipse(zx, zy - 10, 80, 40, 0, 0, TAU); x.stroke(); }
    } else if (hp < 100) {
      const top = zy - d.fy * sc - 4;
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(zx - 12, top, 24, 3);
      x.fillStyle = '#c8102e'; x.fillRect(zx - 12, top, 24 * (hp / 100), 3);
    }
  }
  drawCorpse(x, c) {
    const k = (this.t - c.t0);
    const d = SP.ZDEF[c.type];
    const frames = SP.zombieFrames(c.type, c.v);
    const fall = Math.min(1, k / 0.25);
    const fade = Math.max(0, 1 - Math.max(0, k - 0.45) / 0.85);
    x.save(); x.translate(c.x, c.y); x.scale((c.flip ? -1 : 1) * d.s, d.s);
    x.rotate(fall * Math.PI / 2 * 0.95);
    x.globalAlpha = fade;
    x.drawImage(frames[0], -d.fx, -d.fy, d.w, d.h);
    // ash dissolve: darken as it fades
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = c.burn ? 'rgba(20,10,5,.8)' : `rgba(30,25,22,${Math.min(0.85, k)})`;
    x.fillRect(-d.fx, -d.fy, d.w, d.h);
    x.restore();
    if (k > 0.45 && k < 1.2 && Math.random() < 0.5) this.parts.push({ k: 'ash', x: c.x + (Math.random() - 0.5) * 30, y: c.y - 10, vx: (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 30, life: 0.9, max: 0.9 });
  }

  drawTags(x) {
    x.textAlign = 'center';
    x.font = '700 13px Cinzel, serif';
    for (const [id, p] of this.players) {
      const color = this.teamColor[this.playerTeam?.[id]] || '#efe6d8';
      const down = p[4] & 1;
      const label = down ? `${nameOf(id)} — HELP!` : nameOf(id);
      const ty = p[1] - (down ? 44 : 82);
      x.fillStyle = 'rgba(0,0,0,.6)';
      const w = x.measureText(label).width + 12;
      x.fillRect(p[0] - w / 2, ty - 13, w, 17);
      x.fillStyle = down ? '#ff6a7a' : color;
      x.fillText(label, p[0], ty);
    }
  }
  drawPickup(x, [id, kind, px, py]) {
    const bob = Math.sin(this.t * 4 + id) * 4;
    x.drawImage(SP.glow(kind === 0 ? '140,200,255' : '255,220,140'), px - 30, py - 30 + bob, 60, 60);
    x.font = '24px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(POWER_ICON[PICKUPS[kind]] || '?', px, py + 1 + bob);
    x.textBaseline = 'alphabetic';
  }
  drawGrenade(x, [gx, gy, f]) {
    const hgt = Math.sin((f / 100) * Math.PI) * 50;
    x.drawImage(SP.shadow(), gx - 8, gy - 3, 16, 6);
    x.save(); x.translate(gx, gy - hgt); x.rotate(this.t * 12);
    x.fillStyle = '#d4e157'; x.beginPath(); x.ellipse(0, 0, 6, 4.5, 0, 0, TAU); x.fill();
    x.fillStyle = '#2e7d32'; for (let k = 0; k < 3; k++) { x.beginPath(); x.ellipse(0, 6 + k * 3, 1.5, 3, 0, 0, TAU); x.fill(); } // nimbu + mirchi on a thread
    x.restore();
  }

  drawParticles(x, dt) {
    const q = this.quality;
    for (const p of this.parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9;
      const a = Math.max(0, p.life / p.max);
      if (p.k === 'blood') { x.fillStyle = `rgba(140,10,20,${a})`; x.fillRect(p.x, p.y, 3, 3); }
      else if (p.k === 'fire') { x.globalCompositeOperation = 'lighter'; x.globalAlpha = a; x.drawImage(SP.glow('255,140,40'), p.x - 10 - (1 - a) * 8, p.y - 10 - (1 - a) * 8, 20 + (1 - a) * 16, 20 + (1 - a) * 16); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
      else if (p.k === 'ember') { x.fillStyle = `rgba(255,${100 + a * 120},40,${a})`; x.fillRect(p.x, p.y, 3, 3); }
      else if (p.k === 'holy') { x.fillStyle = `rgba(180,220,255,${a})`; x.fillRect(p.x, p.y, 3, 3); }
      else if (p.k === 'gulal') { x.fillStyle = `rgba(${p.c},${a})`; x.fillRect(p.x, p.y, 4, 4); }
      else if (p.k === 'dust') { x.fillStyle = `rgba(120,105,85,${a * 0.5})`; x.beginPath(); x.arc(p.x, p.y, 3 + (1 - a) * 6, 0, TAU); x.fill(); }
      else if (p.k === 'ash') { x.fillStyle = `rgba(60,55,50,${a})`; x.fillRect(p.x, p.y, 2, 2); }
      else if (p.k === 'petal') { p.vy += 140 * dt; p.rot += dt * 6; x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.fillStyle = `rgba(243,156,18,${a})`; x.beginPath(); x.ellipse(0, 0, 3.5, 2, 0, 0, TAU); x.fill(); x.restore(); }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    const cap = Math.round(900 * q);
    if (this.parts.length > cap) this.parts.splice(0, this.parts.length - cap);
  }

  drawFx(x, dt, pass) {
    for (const f of this.fx) {
      const a = Math.max(0, f.life / f.max);
      if (pass === 'world') {
        if (f.k === 'tracer') {
          x.strokeStyle = f.w === 9 ? `rgba(200,230,255,${a})` : `rgba(255,230,160,${a})`; x.lineWidth = f.w === 2 ? 1.5 : 2.2;
          x.beginPath(); x.moveTo(f.x + Math.cos(f.a) * 30, f.y + Math.sin(f.a) * 30); x.lineTo(f.x + Math.cos(f.a) * f.l, f.y + Math.sin(f.a) * f.l); x.stroke();
        } else if (f.k === 'ring') {
          x.strokeStyle = `rgba(${f.c},${a * 0.8})`; x.lineWidth = 4 + a * 6;
          x.beginPath(); x.ellipse(f.x, f.y, f.r * (1 - a) + 10, (f.r * (1 - a) + 10) * 0.6, 0, 0, TAU); x.stroke();
        } else if (f.k === 'text') {
          x.font = '700 22px Cinzel, serif'; x.textAlign = 'center'; x.fillStyle = f.c; x.globalAlpha = Math.min(1, a * 2);
          x.fillText(f.text, f.x, f.y - (1 - a) * 30); x.globalAlpha = 1;
        }
      }
      if (pass === 'glow') {
        if (f.k === 'beam') {
          x.save(); x.globalCompositeOperation = 'lighter';
          x.strokeStyle = `rgba(255,220,140,${a})`; x.lineWidth = 16 * a + 2;
          x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x + Math.cos(f.a) * f.l, f.y + Math.sin(f.a) * f.l); x.stroke();
          x.strokeStyle = `rgba(255,255,255,${a})`; x.lineWidth = 4; x.stroke(); x.restore();
        } else if (f.k === 'boom') {
          x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a;
          const r = f.r * (1.1 - a * 0.6);
          x.drawImage(SP.glow(f.holy ? '160,200,255' : '255,140,40'), f.x - r, f.y - r, r * 2, r * 2);
          x.drawImage(SP.glow('255,240,200'), f.x - r * 0.4, f.y - r * 0.4, r * 0.8, r * 0.8);
          x.restore();
        } else if (f.k === 'flash') {
          x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = a;
          x.drawImage(SP.glow('255,214,140'), f.x - 22, f.y - 22, 44, 44); x.restore();
        }
      }
      if (pass === 'world') f.life -= dt;
    }
    if (pass === 'world') this.fx = this.fx.filter((f) => f.life > 0);
  }

  // Darkness with holes punched by lanterns, flashlights, muzzle flashes and blasts — all sprite blits.
  drawLight(x, zs, meta) {
    const l = this.lctx;
    const sc = 0.5;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, WW * sc, WH * sc);
    l.fillStyle = meta?.slow ? 'rgba(4,8,30,0.66)' : 'rgba(2,3,10,0.6)';
    l.fillRect(0, 0, WW * sc, WH * sc);
    l.globalCompositeOperation = 'destination-out';
    const W0 = SP.glow('0,0,0');
    const hole = (cx, cy, r, alpha = 1) => { l.globalAlpha = alpha; l.drawImage(W0, (cx - r) * sc, (cy - r) * sc, r * 2 * sc, r * 2 * sc); };
    for (const [, p] of this.players) {
      const boost = p[4] & 128 ? 1.35 : 1;
      hole(p[0], p[1] - 20, 200 * boost, 0.95);
      if (!(p[4] & 1)) {
        l.globalAlpha = 1;
        l.save(); l.translate(p[0] * sc, (p[1] - 28) * sc); l.rotate(p[2] / 100); l.scale(2 * boost * sc, 2 * boost * sc);
        l.drawImage(this.cone, 0, -this.cone.height / 2);
        l.restore();
      }
    }
    for (const f of this.fx) {
      const a = f.life / f.max;
      if (f.k === 'flash') hole(f.x, f.y, f.r, a);
      if (f.k === 'boom') hole(f.x, f.y, f.r * 1.4, a);
      if (f.k === 'beam') hole(f.x + Math.cos(f.a) * f.l * 0.5, f.y + Math.sin(f.a) * f.l * 0.5, f.l * 0.55, a * 0.6);
    }
    for (const q of this.parts) if (q.k === 'fire') hole(q.x, q.y, 70, (q.life / q.max) * 0.5);
    const latest = this.buf.latest;
    if (latest) for (const k of latest.tables.k) hole(k[2], k[3], 50, 0.6);
    for (const o of OBST) if (o.kind === 'lamp') hole(o.x, o.y - 50, 120, 0.7);
    hole(800, 450, 100, 0.4);
    for (const [, z] of zs) if (z[1] === 4 && (z[6] & 2)) hole(z[2], z[3] - 40, 130, 0.9);
    l.globalAlpha = 1;
    x.drawImage(this.light, 0, 0, WW * sc, WH * sc, 0, 0, WW, WH);
  }

  // After the darkness: glowing eyes, the boss's aura, the stunned boss's heart.
  drawGlow(x, zs) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const t = this.t;
    for (const [id, z] of zs) {
      const [, type, zx, zy, ang100, , flags] = z;
      const d = SP.ZDEF[type];
      const a = this.anim.get(`z${id}`);
      const face = type === 4 ? (Math.cos(ang100 / 100) >= 0 ? 1 : -1) : (a?.face || 1);
      const col = (flags & 1) || type === 4 ? '255,60,80' : '210,255,150';
      const g = SP.glow(col);
      const er = (type === 4 ? 6 : 4.5) * d.s;
      if (type === 4) {
        x.globalAlpha = 0.35 + Math.sin(t * 4) * 0.12;
        x.drawImage(SP.glow('255,30,60'), zx - 110, zy - 160, 220, 200);
        if (flags & 2) { x.globalAlpha = 0.7 + Math.sin(t * 20) * 0.3; x.drawImage(SP.glow('255,60,80'), zx - 26, zy - 120, 52, 52); }
        x.globalAlpha = 1;
        continue; // the boss's eyes hide behind the sehra
      }
      x.globalAlpha = this.quality > 0.5 ? 0.95 : 0.7;
      for (const [ex, ey] of d.eyes) {
        const wx = zx + (ex - d.fx) * face * d.s;
        const wy = zy + (ey - d.fy) * d.s;
        x.drawImage(g, wx - er, wy - er, er * 2, er * 2);
      }
    }
    x.restore();
  }

  drawHud(x, dt, meta) {
    if (!meta) return;
    // team kill tallies (2–4 teams)
    const teams = {};
    for (const [id, p] of this.players) { const t = this.playerTeam?.[id]; if (t) teams[t] = (teams[t] || 0) + Math.max(0, p[7] || 0); }
    x.font = '700 26px Cinzel, serif'; x.textBaseline = 'middle';
    Object.entries(teams).forEach(([t, n], i) => {
      const bx = 40 + i * 200;
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(bx, 24, 184, 52);
      x.fillStyle = this.teamColor[t] || '#fff'; x.fillRect(bx, 24, 6, 52);
      x.textAlign = 'left'; x.fillText(`${n}`, bx + 20, 51);
      x.fillStyle = '#b9ad9c'; x.font = '400 16px Cinzel, serif'; x.fillText('KILLS', bx + 90, 52); x.font = '700 26px Cinzel, serif';
    });
    x.textAlign = 'right'; x.fillStyle = '#efe6d8'; x.font = '700 24px Cinzel, serif';
    x.fillText(meta.phase === 'warmup' ? `GET READY — ${meta.left}` : meta.phase === 'break' ? `BARAAT BREAK — ${meta.left}` : `WAVE ${Math.max(1, meta.wave)} / ${meta.waves}`, 1880, 50);
    // kill feed
    x.font = '600 18px Cinzel, serif';
    this.feed.forEach((f, i) => {
      f.life -= dt;
      const y = 100 + i * 34;
      x.globalAlpha = Math.max(0, Math.min(1, f.life));
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(1560, y - 14, 320, 30);
      x.drawImage(this.face(f.pid, 48), 1566, y - 11, 24, 24);
      x.textAlign = 'left'; x.fillStyle = this.teamColor[this.playerTeam?.[f.pid]] || '#efe6d8';
      x.fillText(nameOf(f.pid).slice(0, 12), 1598, y + 1);
      x.fillStyle = '#b9ad9c'; x.textAlign = 'right'; x.fillText(`☠ ${ZNAME[f.z]}`, 1872, y + 1);
      x.globalAlpha = 1;
    });
    this.feed = this.feed.filter((f) => f.life > 0);
    if (meta.phase === 'warmup') {
      x.textAlign = 'center'; x.font = '700 40px Cinzel, serif'; x.fillStyle = '#efe6d8';
      x.fillText('BAAYAN ANGOOTHA = CHALO · DAAYAN = NISHANA', 960, 950);
      x.font = '400 26px Fell, serif'; x.fillStyle = '#b9ad9c';
      x.fillText('Goli kabhi nahi rukti. 💨 Dash se bacho, 🍋 bomb phenko. Gire dost ke paas khade raho — woh uth jaayega.', 960, 1000);
    }
    if (meta.boss) {
      const w = 900;
      x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(960 - w / 2 - 4, 1010, w + 8, 34);
      x.fillStyle = '#5a0010'; x.fillRect(960 - w / 2, 1014, w, 26);
      x.fillStyle = meta.boss.state === 'stun' ? '#ff6a7a' : '#c8102e'; x.fillRect(960 - w / 2, 1014, (w * meta.boss.hp) / 100, 26);
      x.textAlign = 'center'; x.fillStyle = '#efe6d8'; x.font = '700 20px Cinzel, serif';
      x.fillText(meta.boss.state === 'stun' ? 'VIKRAM STUNNED HAI — DIL PE GOLI MAARO!' : 'KUNWAR VIKRAM, THE BHOOT DULHA', 960, 1000);
    }
    if (meta.slow) { x.fillStyle = 'rgba(80,120,255,.08)'; x.fillRect(0, 0, 1920, 1080); }
    for (const b of this.banners) {
      b.life -= dt;
      const a = Math.min(1, b.life * 2, (b.max - b.life) * 4);
      x.globalAlpha = Math.max(0, a);
      x.textAlign = 'center';
      x.font = `700 ${Math.round(96 * b.size)}px Cinzel, serif`;
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillText(b.text, 964, 404);
      x.fillStyle = b.color; x.fillText(b.text, 960, 400);
      if (b.sub) { x.font = `italic 400 ${Math.round(40 * b.size)}px Fell, serif`; x.fillStyle = '#efe6d8'; x.fillText(b.sub, 960, 470); }
      x.globalAlpha = 1;
    }
    this.banners = this.banners.filter((b) => b.life > 0);
    x.textBaseline = 'alphabetic';
    if (this.debug) {
      const d = this.buf.debug();
      x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(20, 1000, 520, 60);
      x.fillStyle = '#9f9'; x.font = '16px monospace'; x.textAlign = 'left';
      x.fillText(`fps ${this.fps.value.toFixed(0)}  q ${this.quality.toFixed(2)}  snaps ${d.snaps}  gap p50 ${d.gap50}ms p95 ${d.gap95}ms  buf ${d.buffered}`, 30, 1035);
    }
  }
}

const armShade = new Map();
function shadeCached(c) { if (!armShade.has(c)) armShade.set(c, SP.shade(c.startsWith('#') ? c : '#efe6d8', -0.2)); return armShade.get(c); }
