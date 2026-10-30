// TV renderer for Chapter V — the zombie arena. World 1600×900 drawn into the 1920×1080 stage.
import { createNoise2D } from '/vendor/simplex-noise.mjs';
import { getPhoto, getPossessed, nameOf } from '/shared/photos.js';
import { audio } from '/shared/audio.js';

const WW = 1600;
const WH = 900;
const S = 1.2; // world → stage scale
const WEAPON_NAMES = ['REVOLVER', 'SHOTGUN', 'CHICAGO TYPEWRITER', 'UNITY CANDLE', 'WEDDING BELL'];
const POWER_ICON = { coldfeet: '❄', prenup: '📜', lastdance: '💃', bestman: '👻', bouquet: '💐', grenade: '⚗' };
const POWER_NAME = { coldfeet: 'COLD FEET', prenup: 'PRENUP', lastdance: 'LAST DANCE', bestman: 'BEST MAN', bouquet: 'BOUQUET TOSS' };
const OBST = [
  { x: 800, y: 450, r: 62, kind: 'fountain' }, { x: 380, y: 230, r: 30, kind: 'statue' }, { x: 1220, y: 230, r: 30, kind: 'statue' },
  { x: 380, y: 670, r: 30, kind: 'statue' }, { x: 1220, y: 670, r: 30, kind: 'statue' }, { x: 560, y: 120, r: 22, kind: 'grave' },
  { x: 1040, y: 780, r: 22, kind: 'grave' }, { x: 180, y: 460, r: 40, kind: 'tree' }, { x: 1420, y: 440, r: 40, kind: 'tree' },
  { x: 640, y: 760, r: 24, kind: 'grave' }, { x: 980, y: 130, r: 24, kind: 'grave' },
];

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rnd(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }

export class ArenaRenderer {
  constructor() {
    this.ents = { p: new Map(), z: new Map() };
    this.snap = null;
    this.fx = [];
    this.parts = [];
    this.banners = [];
    this.shake = 0;
    this.teamColor = {};
    this.faceCache = new Map();
    this.groomId = null;
    this.ground = this.buildGround();
    [this.decals, this.dctx] = cv(WW, WH);
    [this.light, this.lctx] = cv(WW / 2, WH / 2);
    this.t = 0;
  }
  reset() { this.ents.p.clear(); this.ents.z.clear(); this.fx = []; this.parts = []; this.banners = []; this.dctx.clearRect(0, 0, WW, WH); this.snap = null; }
  setContext({ teams, players, groomId }) {
    this.teamColor = Object.fromEntries((teams || []).map((t) => [t.id, t.color]));
    this.playerTeam = Object.fromEntries((players || []).map((p) => [p.id, p.team]));
    if (groomId !== this.groomId) { this.groomId = groomId; this.faceCache.delete('boss'); }
  }

  buildGround() {
    const [c, x] = cv(WW, WH);
    const noise = createNoise2D(rnd(1234));
    const [n, nx] = cv(400, 225);
    const img = nx.createImageData(400, 225);
    for (let y = 0; y < 225; y++) for (let xx = 0; xx < 400; xx++) {
      const v = noise(xx / 40, y / 40) * 0.5 + noise(xx / 12, y / 12) * 0.3 + noise(xx / 4, y / 4) * 0.2;
      const i = (y * 400 + xx) * 4;
      img.data[i] = 22 + v * 10; img.data[i + 1] = 34 + v * 14; img.data[i + 2] = 22 + v * 8; img.data[i + 3] = 255;
    }
    nx.putImageData(img, 0, 0);
    x.imageSmoothingEnabled = true;
    x.drawImage(n, 0, 0, WW, WH);
    // gravel paths: a cross and a ring around the fountain
    x.strokeStyle = 'rgba(92,84,70,.55)'; x.lineWidth = 70; x.lineCap = 'round';
    x.beginPath(); x.moveTo(0, 450); x.lineTo(WW, 450); x.moveTo(800, 0); x.lineTo(800, WH); x.stroke();
    x.lineWidth = 44; x.beginPath(); x.arc(800, 450, 150, 0, Math.PI * 2); x.stroke();
    const r = rnd(77);
    for (let i = 0; i < 2600; i++) {
      const onPath = r() < 0.5;
      const px = onPath ? (r() < 0.5 ? r() * WW : 800 + (r() - 0.5) * 70) : r() * WW;
      const py = onPath ? (px > 760 && px < 840 ? r() * WH : 450 + (r() - 0.5) * 70) : r() * WH;
      x.fillStyle = onPath ? `rgba(150,140,120,${r() * 0.25})` : `rgba(10,20,10,${r() * 0.35})`;
      x.fillRect(px, py, 2, 2);
    }
    // roses scattered
    for (let i = 0; i < 70; i++) {
      const bx = r() * WW; const by = r() * WH;
      if (Math.abs(bx - 800) < 90 || Math.abs(by - 450) < 90) continue;
      x.fillStyle = 'rgba(10,30,14,.9)'; x.beginPath(); x.arc(bx, by, 12 + r() * 8, 0, Math.PI * 2); x.fill();
      for (let k = 0; k < 4; k++) { x.fillStyle = `rgba(${150 + r() * 60},10,30,.9)`; x.beginPath(); x.arc(bx + (r() - 0.5) * 18, by + (r() - 0.5) * 18, 3 + r() * 2, 0, Math.PI * 2); x.fill(); }
    }
    // hedge border with gaps at the gates
    const gates = [[0, 450], [WW, 450], [800, 0], [800, WH], [400, 0], [1200, WH]];
    const nearGate = (hx, hy) => gates.some(([gx, gy]) => Math.hypot(hx - gx, hy - gy) < 70);
    for (let i = 0; i < 900; i++) {
      const side = i % 4;
      const f = r();
      const hx = side === 0 ? f * WW : side === 1 ? f * WW : side === 2 ? r() * 26 : WW - r() * 26;
      const hy = side === 0 ? r() * 26 : side === 1 ? WH - r() * 26 : f * WH;
      if (nearGate(hx, hy)) continue;
      x.fillStyle = `rgba(${8 + r() * 10},${28 + r() * 22},${12 + r() * 10},1)`;
      x.beginPath(); x.arc(hx, hy, 10 + r() * 12, 0, Math.PI * 2); x.fill();
    }
    // obstacles
    for (const o of OBST) {
      x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(o.x + 10, o.y + 12, o.r * 1.05, o.r * 0.95, 0, 0, Math.PI * 2); x.fill();
      if (o.kind === 'fountain') {
        x.fillStyle = '#6e6a62'; x.beginPath(); x.arc(o.x, o.y, o.r, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#1d2a36'; x.beginPath(); x.arc(o.x, o.y, o.r - 10, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#7d786e'; x.beginPath(); x.arc(o.x, o.y, 14, 0, Math.PI * 2); x.fill();
      } else if (o.kind === 'statue') {
        x.fillStyle = '#4e4b46'; x.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
        x.fillStyle = '#8a857c'; x.beginPath(); x.arc(o.x, o.y, o.r * 0.55, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#9c968c';
        for (const s of [-1, 1]) { x.beginPath(); x.ellipse(o.x + s * o.r * 0.7, o.y, o.r * 0.55, o.r * 0.22, s * 0.4, 0, Math.PI * 2); x.fill(); }
      } else if (o.kind === 'grave') {
        x.fillStyle = '#5c5952'; x.beginPath(); x.roundRect(o.x - o.r, o.y - o.r * 0.6, o.r * 2, o.r * 1.2, 8); x.fill();
        x.strokeStyle = '#38362f'; x.lineWidth = 3; x.beginPath(); x.moveTo(o.x - 8, o.y); x.lineTo(o.x + 8, o.y); x.moveTo(o.x, o.y - 8); x.lineTo(o.x, o.y + 10); x.stroke();
      } else if (o.kind === 'tree') {
        const g = x.createRadialGradient(o.x - 8, o.y - 8, 4, o.x, o.y, o.r * 1.4);
        g.addColorStop(0, '#1e2a18'); g.addColorStop(1, '#070b06');
        x.fillStyle = g; x.beginPath(); x.arc(o.x, o.y, o.r * 1.35, 0, Math.PI * 2); x.fill();
        // leaf clusters catch the moonlight so the canopy reads as a tree, not a hole
        for (let k = 0; k < 26; k++) {
          const a = r() * Math.PI * 2; const d = r() * o.r * 1.2;
          x.fillStyle = `rgba(${40 + r() * 30},${70 + r() * 40},${34 + r() * 20},${0.55 + r() * 0.35})`;
          x.beginPath(); x.arc(o.x + Math.cos(a) * d - 4, o.y + Math.sin(a) * d - 4, 6 + r() * 9, 0, Math.PI * 2); x.fill();
        }
        x.strokeStyle = 'rgba(120,160,110,.25)'; x.lineWidth = 2; x.beginPath(); x.arc(o.x - 6, o.y - 6, o.r * 1.25, Math.PI * 1.05, Math.PI * 1.7); x.stroke();
      }
    }
    return c;
  }

  // ---------------- input ----------------
  ingest(snap) {
    const pan = (x) => (x / WW) * 2 - 1;
    this.snap = snap;
    const seenP = new Set();
    for (const a of snap.p) {
      const [id, x, y, aim, hp, flags, tier, rev, kills, power, candle] = a;
      seenP.add(id);
      let e = this.ents.p.get(id);
      if (!e) { e = { x, y }; this.ents.p.set(id, e); }
      Object.assign(e, { tx: x, ty: y, aim: aim / 100, hp, flags, tier, rev, kills, power, candle });
    }
    for (const id of [...this.ents.p.keys()]) if (!seenP.has(id)) this.ents.p.delete(id);
    const seenZ = new Set();
    for (const a of snap.z) {
      const [id, type, x, y, ang, hp, flags] = a;
      seenZ.add(id);
      let e = this.ents.z.get(id);
      if (!e) { e = { x, y, born: this.t, seed: id * 7.3 }; this.ents.z.set(id, e); }
      Object.assign(e, { tx: x, ty: y, type, ang: ang / 100, hp, flags });
    }
    for (const id of [...this.ents.z.keys()]) if (!seenZ.has(id)) this.ents.z.delete(id);
    let shots = 0;
    for (const ev of snap.ev) {
      switch (ev.e) {
        case 'shot': {
          const a = ev.a / 100;
          this.fx.push({ k: 'tracer', x: ev.x, y: ev.y, a, l: ev.l, w: ev.w, life: 0.09, max: 0.09 });
          this.fx.push({ k: 'flash', x: ev.x + Math.cos(a) * 22, y: ev.y + Math.sin(a) * 22, life: 0.06, max: 0.06, r: ev.w === 1 ? 90 : 60 });
          if (shots++ < 3) audio.shot(ev.w, pan(ev.x));
          break;
        }
        case 'flame': {
          const p = this.ents.p.get(ev.pid);
          if (p) {
            const a = ev.a / 100;
            for (let i = 0; i < 4; i++) this.parts.push({ k: 'fire', x: p.x + Math.cos(a) * 20, y: p.y + Math.sin(a) * 20, vx: Math.cos(a + (Math.random() - 0.5) * 0.8) * (380 + Math.random() * 200), vy: Math.sin(a + (Math.random() - 0.5) * 0.8) * (380 + Math.random() * 200), life: 0.45, max: 0.45 });
            if (Math.random() < 0.3) audio.shot(3, pan(p.x));
          }
          break;
        }
        case 'beam': this.fx.push({ k: 'beam', x: ev.x, y: ev.y, a: ev.a / 100, l: ev.l, life: 0.3, max: 0.3 }); audio.shot(4, pan(ev.x)); this.shake = Math.max(this.shake, 4); break;
        case 'kill': {
          this.splat(ev.x, ev.y, ev.burn);
          for (let i = 0; i < 10; i++) this.parts.push({ k: ev.burn ? 'ember' : 'blood', x: ev.x, y: ev.y, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320, life: 0.5 + Math.random() * 0.4, max: 0.9 });
          audio.splat(pan(ev.x));
          if (Math.random() < 0.25) audio.groan(0.6, pan(ev.x), 1.1);
          break;
        }
        case 'boom': {
          this.fx.push({ k: 'boom', x: ev.x, y: ev.y, r: ev.r, holy: ev.holy, life: 0.6, max: 0.6 });
          for (let i = 0; i < 30; i++) { const a = Math.random() * Math.PI * 2; const sp = 120 + Math.random() * 420; this.parts.push({ k: ev.holy ? 'holy' : 'ember', x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, max: 0.7 }); }
          this.scorch(ev.x, ev.y, ev.r * 0.6, ev.holy);
          this.shake = Math.max(this.shake, ev.r > 200 ? 16 : 9);
          audio.boom(1, !!ev.holy);
          break;
        }
        case 'scream': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '180,80,255', life: 0.9, max: 0.9, r: 280 }); audio.scream(0.55, pan(ev.x)); break;
        case 'roar': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '255,40,60', life: 1, max: 1, r: 200 }); audio.roar(1); break;
        case 'slam': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '255,220,180', life: 0.6, max: 0.6, r: 260 }); this.shake = 22; audio.slam(1.4); break;
        case 'summon': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '120,255,120', life: 1.2, max: 1.2, r: 320 }); audio.stinger(0.6); audio.groan(1.2, 0, 0.7); break;
        case 'level': {
          const p = this.ents.p.get(ev.pid);
          if (p) this.fx.push({ k: 'text', x: p.x, y: p.y - 40, text: `${WEAPON_NAMES[ev.tier]}!`, c: '#ffd27a', life: 1.8, max: 1.8 });
          if (p) this.fx.push({ k: 'ring', x: p.x, y: p.y, c: '255,210,120', life: 0.8, max: 0.8, r: 120 });
          audio.levelUp();
          break;
        }
        case 'pickup': {
          const p = this.ents.p.get(ev.pid);
          if (p) this.fx.push({ k: 'text', x: p.x, y: p.y - 40, text: POWER_NAME[ev.kind] || 'HOLY WATER', c: '#bfe6ff', life: 1.4, max: 1.4 });
          audio.pickup();
          break;
        }
        case 'power': {
          this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: ev.pw === 'bouquet' ? '255,200,230' : '160,220,255', life: 0.8, max: 0.8, r: ev.pw === 'bouquet' ? 250 : 120 });
          this.banner(`${nameOf(ev.pid).toUpperCase()} — ${POWER_NAME[ev.pw]}`, 1.6, '#bfe6ff', 0.55);
          audio.ui('good');
          break;
        }
        case 'down': {
          const p = this.ents.p.get(ev.pid);
          if (p) this.fx.push({ k: 'text', x: p.x, y: p.y - 40, text: 'DOWN!', c: '#ff4a5a', life: 1.5, max: 1.5 });
          audio.stinger(0.4);
          break;
        }
        case 'revive': { const p = this.ents.p.get(ev.pid); if (p) this.fx.push({ k: 'ring', x: p.x, y: p.y, c: '255,255,220', life: 0.7, max: 0.7, r: 90 }); audio.ui('ok'); break; }
        case 'wave': this.banner(ev.boss ? 'THE GROOM OF THE DEAD' : `WAVE ${ev.n}`, 3.2, ev.boss ? '#ff3b5c' : '#efe6d8', 1, ev.title); audio.bell(0.8); audio.whisper(0.8); break;
        case 'boss': audio.roar(1.4); audio.stinger(1); break;
        case 'bossDie': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '255,255,255', life: 2, max: 2, r: 700 }); this.shake = 30; audio.scream(1); audio.bell(1); break;
        case 'bell': this.banner('THE BELL TOLLS', 2.4, '#efe6d8', 0.8, 'The rest of the dead burn'); audio.bell(1); break;
        case 'victory': this.banner('THE GARDEN IS CLEAR', 4, '#ffd27a', 1, 'Run to the chapel!'); audio.bell(1); audio.ui('good'); break;
        default:
      }
    }
    // Adaptive music follows the size of the horde.
    audio.setIntensity(Math.min(1, snap.z.length / 45 + (snap.boss ? 0.5 : 0)));
  }

  banner(text, life, color, size = 1, sub = '') { this.banners.push({ text, sub, life, max: life, color, size }); }
  splat(x, y, burn) {
    const d = this.dctx;
    const n = 6 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = Math.random() * 26;
      d.fillStyle = burn ? `rgba(20,14,10,${0.4 + Math.random() * 0.3})` : `rgba(${70 + Math.random() * 50},${4 + Math.random() * 10},${8 + Math.random() * 10},${0.55 + Math.random() * 0.35})`;
      d.beginPath(); d.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 3 + Math.random() * 10, 0, Math.PI * 2); d.fill();
    }
  }
  scorch(x, y, r, holy) {
    const d = this.dctx;
    const g = d.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, holy ? 'rgba(160,200,255,.25)' : 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g; d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill();
  }

  face(id, size, possessed = false) {
    const key = `${id}:${size}:${possessed}`;
    let c = this.faceCache.get(key);
    const src = possessed ? getPossessed(id) : getPhoto(id);
    if (c && c.src === src) return c.canvas;
    const [cc, x] = cv(size, size);
    x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); x.clip();
    if (src) {
      const img = new Image(); img.src = src;
      if (img.complete) x.drawImage(img, 0, 0, size, size);
      else { img.onload = () => this.faceCache.delete(key); }
    } else {
      x.fillStyle = possessed ? '#2a3a24' : '#3a2e26'; x.fillRect(0, 0, size, size);
      x.fillStyle = '#efe6d8'; x.font = `700 ${size * 0.5}px Cinzel, serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText((nameOf(id)[0] || '?').toUpperCase(), size / 2, size / 2 + 2);
    }
    c = { canvas: cc, src };
    this.faceCache.set(key, c);
    return cc;
  }

  // ---------------- drawing ----------------
  draw(ctx, dt) {
    this.t += dt;
    const k = 1 - Math.exp(-dt * 18);
    for (const e of this.ents.p.values()) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; }
    for (const e of this.ents.z.values()) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; }
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
    if (this.shake > 0) { ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake = Math.max(0, this.shake - dt * 40); }
    ctx.translate(0, 0);
    ctx.scale(S, S);
    ctx.drawImage(this.ground, 0, 0);
    ctx.drawImage(this.decals, 0, 0);
    this.drawWater(ctx);
    const snap = this.snap;
    if (snap) {
      for (const kp of snap.k) this.drawPickup(ctx, kp);
      for (const g of snap.g) this.drawGrenade(ctx, g);
    }
    for (const z of this.ents.z.values()) this.drawZombie(ctx, z);
    for (const p of [...this.ents.p.entries()]) this.drawPlayer(ctx, p[0], p[1]);
    this.drawParticles(ctx, dt);
    this.drawFx(ctx, dt, 'world');
    this.drawLight(ctx);
    this.drawFx(ctx, 0, 'glow');
    this.drawZombieGlow(ctx);
    this.drawTags(ctx);
    ctx.restore();
    this.drawHud(ctx, dt);
  }

  drawWater(x) {
    x.strokeStyle = 'rgba(140,170,200,.25)'; x.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const r = ((this.t * 14 + i * 16) % 48) + 4;
      x.globalAlpha = 1 - r / 52;
      x.beginPath(); x.arc(800, 450, r, 0, Math.PI * 2); x.stroke();
    }
    x.globalAlpha = 1;
  }

  // Drawn AFTER the darkness layer: eyes that glow in the dark, a faint rot-green rim, and Edmund's aura.
  drawZombieGlow(x) {
    const t = this.t;
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (const z of this.ents.z.values()) {
      const big = (z.type === 3 ? 1.5 : z.type === 4 ? 2.9 : z.type === 1 ? 0.9 : 1) * 1.35;
      const frenzy = z.flags & 1;
      if (z.type === 4) {
        const pulse = 0.35 + Math.sin(t * 4) * 0.12;
        const g = x.createRadialGradient(z.x, z.y, 10, z.x, z.y, 90);
        g.addColorStop(0, `rgba(255,30,60,${pulse})`); g.addColorStop(1, 'rgba(255,0,40,0)');
        x.fillStyle = g; x.beginPath(); x.arc(z.x, z.y, 90, 0, Math.PI * 2); x.fill();
      }
      x.strokeStyle = frenzy ? 'rgba(255,60,90,.45)' : 'rgba(140,220,110,.28)';
      x.lineWidth = 2;
      x.beginPath(); x.ellipse(z.x, z.y, 12 * big, 16 * big, z.ang, 0, Math.PI * 2); x.stroke();
      const c = Math.cos(z.ang); const s = Math.sin(z.ang);
      const fx = z.x + c * 8 * big; const fy = z.y + s * 8 * big;
      const col = frenzy || z.type === 4 ? '255,40,60' : '210,255,150';
      for (const side of [-1, 1]) {
        const ex = fx - s * 3 * big * side; const ey = fy + c * 3 * big * side;
        const er = 4.5 * Math.min(1.7, big);
        const g = x.createRadialGradient(ex, ey, 0, ex, ey, er);
        g.addColorStop(0, `rgba(${col},.95)`); g.addColorStop(1, `rgba(${col},0)`);
        x.fillStyle = g; x.beginPath(); x.arc(ex, ey, er, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
  }

  drawZombie(x, z) {
    const t = this.t;
    const big = (z.type === 3 ? 1.5 : z.type === 4 ? 2.9 : z.type === 1 ? 0.9 : 1) * 1.35;
    const wob = Math.sin(t * (z.type === 1 ? 14 : 7) + z.seed) * 0.25;
    x.save();
    x.translate(z.x, z.y);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(5, 7, 17 * big, 14 * big, 0, 0, Math.PI * 2); x.fill();
    x.rotate(z.ang);
    x.scale(big, big);
    const cloth = z.type === 2 ? '#6b3a5c' : z.type === 3 ? '#6e7a3a' : z.type === 4 ? '#34303c' : (z.seed | 0) % 3 === 0 ? '#8a8174' : '#46434f';
    const skin = z.type === 3 ? '#9aa86a' : '#7f9478';
    // arms reaching forward, swaying
    x.strokeStyle = skin; x.lineWidth = 5; x.lineCap = 'round';
    x.beginPath(); x.moveTo(2, -10); x.lineTo(20 + wob * 6, -12 + wob * 8); x.moveTo(2, 10); x.lineTo(20 - wob * 6, 12 - wob * 8); x.stroke();
    // body
    x.fillStyle = cloth;
    x.beginPath(); x.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2); x.fill();
    if (z.type === 4) { x.strokeStyle = '#6a6474'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(0, 0, 11, 16, 0, 0, Math.PI * 2); x.stroke(); x.fillStyle = '#e8e2d4'; x.beginPath(); x.moveTo(-2, -5); x.lineTo(9, 0); x.lineTo(-2, 5); x.fill(); x.fillStyle = '#7a0a1a'; x.fillRect(4, -1.5, 5, 3); }
    if (z.type === 2) { x.fillStyle = '#b88aa8'; x.beginPath(); x.ellipse(-4, 0, 12, 18, 0, 0, Math.PI * 2); x.globalAlpha = 0.5; x.fill(); x.globalAlpha = 1; }
    if (z.type === 3) { x.fillStyle = '#b8c27a'; for (const [px, py] of [[3, -6], [-4, 5], [5, 7], [-2, -9]]) { x.beginPath(); x.arc(px, py, 2.4, 0, Math.PI * 2); x.fill(); } }
    // head
    if (z.type === 4) {
      x.rotate(-z.ang);
      const f = this.face(this.groomId || 'boss', 40, true);
      x.drawImage(f, -10, -10, 20, 20);
      x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, 10, 0, Math.PI * 2); x.stroke();
      if (z.flags & 2) { // stunned: the heart glows — shoot it!
        x.globalCompositeOperation = 'lighter';
        const g = x.createRadialGradient(0, 8, 0, 0, 8, 16);
        g.addColorStop(0, `rgba(255,60,80,${0.7 + Math.sin(t * 20) * 0.3})`); g.addColorStop(1, 'rgba(255,0,40,0)');
        x.fillStyle = g; x.beginPath(); x.arc(0, 8, 16, 0, Math.PI * 2); x.fill();
        x.globalCompositeOperation = 'source-over';
      }
    } else {
      x.fillStyle = skin; x.beginPath(); x.arc(4, 0, 7.5, 0, Math.PI * 2); x.fill();
      if (z.type === 2) { x.fillStyle = '#2a1a14'; x.beginPath(); x.arc(1, 0, 7, Math.PI * 0.5, Math.PI * 1.5); x.fill(); }
      x.fillStyle = z.flags & 1 ? '#ff2a4a' : '#e8f0c8';
      x.beginPath(); x.arc(8, -3, 1.4, 0, Math.PI * 2); x.arc(8, 3, 1.4, 0, Math.PI * 2); x.fill();
    }
    if (z.flags & 16) { x.globalCompositeOperation = 'lighter'; x.fillStyle = z.type === 4 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(0, 0, 12, 17, 0, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = 'source-over'; }
    x.restore();
    if (z.flags & 4) { x.strokeStyle = `rgba(255,40,60,${0.5 + Math.sin(t * 30) * 0.5})`; x.lineWidth = 4; x.beginPath(); x.arc(z.x, z.y, 64, 0, Math.PI * 2); x.stroke(); }
    if (z.type !== 4 && z.hp < 100) {
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(z.x - 12, z.y - 24 * big, 24, 3);
      x.fillStyle = '#c8102e'; x.fillRect(z.x - 12, z.y - 24 * big, 24 * (z.hp / 100), 3);
    }
  }

  drawPlayer(x, id, p) {
    const color = this.teamColor[this.playerTeam?.[id]] || '#efe6d8';
    const down = p.flags & 1;
    x.save(); x.translate(p.x, p.y);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(4, 6, 20, 16, 0, 0, Math.PI * 2); x.fill();
    if (p.flags & 4) { x.strokeStyle = 'rgba(160,220,255,.5)'; x.lineWidth = 3; for (let i = 1; i < 4; i++) { x.beginPath(); x.arc(-Math.cos(p.aim) * i * 8, -Math.sin(p.aim) * i * 8, 18 - i * 3, 0, Math.PI * 2); x.stroke(); } }
    if (!down) {
      // gun
      x.save(); x.rotate(p.aim);
      x.strokeStyle = ['#c8c2b4', '#6a4a2a', '#2a2a2a', '#e8dcc0', '#ffd27a'][p.tier] || '#ccc';
      x.lineWidth = p.tier === 1 ? 7 : p.tier === 3 ? 8 : 5;
      x.beginPath(); x.moveTo(10, 0); x.lineTo(30 + p.tier * 3, 0); x.stroke();
      if (p.tier === 3) { x.fillStyle = '#ffb35c'; x.beginPath(); x.arc(36, 0, 4 + Math.random() * 2, 0, Math.PI * 2); x.fill(); }
      x.restore();
    }
    x.globalAlpha = down ? 0.55 : 1;
    x.fillStyle = color; x.beginPath(); x.arc(0, 0, 20, 0, Math.PI * 2); x.fill();
    x.drawImage(this.face(id, 64, false), -16, -16, 32, 32);
    x.globalAlpha = 1;
    // health arc
    x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 24, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = p.hp > 50 ? '#7fe07a' : p.hp > 25 ? '#ffc04a' : '#ff3b4a';
    x.beginPath(); x.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * p.hp) / 100); x.stroke();
    if (p.flags & 2) { x.strokeStyle = `rgba(140,200,255,${0.6 + Math.sin(this.t * 10) * 0.3})`; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.stroke(); }
    if (p.flags & 16) {
      const a = this.t * 3;
      x.globalAlpha = 0.7; x.fillStyle = '#cfe8ff';
      x.beginPath(); x.arc(Math.cos(a) * 46, Math.sin(a) * 46, 9, 0, Math.PI * 2); x.fill();
      x.globalAlpha = 1;
    }
    if (down) {
      const pulse = 0.5 + Math.sin(this.t * 6) * 0.5;
      x.strokeStyle = `rgba(255,60,80,${pulse})`; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 40, 0, Math.PI * 2); x.stroke();
      if (p.rev > 0) { x.strokeStyle = '#fff6c8'; x.lineWidth = 5; x.beginPath(); x.arc(0, 0, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.rev / 90)); x.stroke(); }
    }
    x.restore();
  }

  drawTags(x) {
    x.textAlign = 'center';
    x.font = '700 13px Cinzel, serif';
    for (const [id, p] of this.ents.p) {
      const color = this.teamColor[this.playerTeam?.[id]] || '#efe6d8';
      const label = (p.flags & 1) ? `${nameOf(id)} — HELP!` : nameOf(id);
      x.fillStyle = 'rgba(0,0,0,.6)';
      const w = x.measureText(label).width + 12;
      x.fillRect(p.x - w / 2, p.y - 46, w, 17);
      x.fillStyle = (p.flags & 1) ? '#ff6a7a' : color;
      x.fillText(label, p.x, p.y - 33);
    }
  }

  drawPickup(x, [id, kind, px, py]) {
    const bob = Math.sin(this.t * 4 + id) * 4;
    x.save(); x.translate(px, py + bob);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 30);
    g.addColorStop(0, kind === 'grenade' ? 'rgba(140,200,255,.6)' : 'rgba(255,220,140,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fill();
    x.font = '24px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(POWER_ICON[kind] || '?', 0, 1);
    x.restore();
  }
  drawGrenade(x, [gx, gy, f]) {
    const hgt = Math.sin((f / 100) * Math.PI) * 40;
    x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(gx, gy, 6, 4, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#bfe6ff'; x.beginPath(); x.arc(gx, gy - hgt, 6, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 1; x.stroke();
  }

  drawParticles(x, dt) {
    for (const q of this.parts) {
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9;
      const a = Math.max(0, q.life / q.max);
      if (q.k === 'blood') { x.fillStyle = `rgba(140,10,20,${a})`; x.fillRect(q.x, q.y, 3, 3); }
      else if (q.k === 'fire') { x.fillStyle = `rgba(255,${120 + a * 120},40,${a})`; x.beginPath(); x.arc(q.x, q.y, 6 + (1 - a) * 10, 0, Math.PI * 2); x.fill(); }
      else if (q.k === 'ember') { x.fillStyle = `rgba(255,${100 + a * 120},40,${a})`; x.fillRect(q.x, q.y, 3, 3); }
      else if (q.k === 'holy') { x.fillStyle = `rgba(180,220,255,${a})`; x.fillRect(q.x, q.y, 3, 3); }
    }
    this.parts = this.parts.filter((q) => q.life > 0);
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
  }

  drawFx(x, dt, pass) {
    for (const f of this.fx) {
      const a = Math.max(0, f.life / f.max);
      if (pass === 'world') {
        if (f.k === 'tracer') {
          x.strokeStyle = f.w === 9 ? `rgba(200,230,255,${a})` : `rgba(255,230,160,${a})`; x.lineWidth = f.w === 2 ? 1.5 : 2.2;
          x.beginPath(); x.moveTo(f.x + Math.cos(f.a) * 24, f.y + Math.sin(f.a) * 24); x.lineTo(f.x + Math.cos(f.a) * f.l, f.y + Math.sin(f.a) * f.l); x.stroke();
        } else if (f.k === 'ring') {
          x.strokeStyle = `rgba(${f.c},${a * 0.8})`; x.lineWidth = 4 + a * 6;
          x.beginPath(); x.arc(f.x, f.y, f.r * (1 - a) + 10, 0, Math.PI * 2); x.stroke();
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
          x.save(); x.globalCompositeOperation = 'lighter';
          const r = f.r * (1.1 - a * 0.6);
          const g = x.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
          g.addColorStop(0, f.holy ? `rgba(200,230,255,${a})` : `rgba(255,220,140,${a})`);
          g.addColorStop(0.5, f.holy ? `rgba(90,150,255,${a * 0.5})` : `rgba(255,90,20,${a * 0.6})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          x.fillStyle = g; x.beginPath(); x.arc(f.x, f.y, r, 0, Math.PI * 2); x.fill(); x.restore();
        } else if (f.k === 'flash') {
          x.save(); x.globalCompositeOperation = 'lighter';
          const g = x.createRadialGradient(f.x, f.y, 0, f.x, f.y, 26);
          g.addColorStop(0, `rgba(255,240,200,${a})`); g.addColorStop(1, 'rgba(255,160,60,0)');
          x.fillStyle = g; x.beginPath(); x.arc(f.x, f.y, 26, 0, Math.PI * 2); x.fill(); x.restore();
        }
      }
      if (pass === 'world') f.life -= dt;
    }
    if (pass === 'world') this.fx = this.fx.filter((f) => f.life > 0);
  }

  drawLight(x) {
    const l = this.lctx;
    const sc = 0.5;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, WW * sc, WH * sc);
    const slow = this.snap?.slow;
    l.fillStyle = slow ? 'rgba(4,8,30,0.72)' : 'rgba(2,3,10,0.74)';
    l.fillRect(0, 0, WW * sc, WH * sc);
    l.globalCompositeOperation = 'destination-out';
    const hole = (cx, cy, r, alpha = 1) => {
      const g = l.createRadialGradient(cx * sc, cy * sc, 0, cx * sc, cy * sc, r * sc);
      g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(0.6, `rgba(0,0,0,${alpha * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g; l.beginPath(); l.arc(cx * sc, cy * sc, r * sc, 0, Math.PI * 2); l.fill();
    };
    for (const p of this.ents.p.values()) {
      const boost = p.candle ? 1.35 : 1;
      hole(p.x, p.y, 190 * boost, 0.95);
      if (!(p.flags & 1)) {
        const len = 560 * boost;
        const g = l.createRadialGradient(p.x * sc, p.y * sc, 10, p.x * sc, p.y * sc, len * sc);
        g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = g;
        l.beginPath(); l.moveTo(p.x * sc, p.y * sc); l.arc(p.x * sc, p.y * sc, len * sc, p.aim - 0.42, p.aim + 0.42); l.closePath(); l.fill();
      }
    }
    for (const f of this.fx) {
      const a = f.life / f.max;
      if (f.k === 'flash') hole(f.x, f.y, f.r, a);
      if (f.k === 'boom') hole(f.x, f.y, f.r * 1.4, a);
      if (f.k === 'beam') hole(f.x + Math.cos(f.a) * f.l * 0.5, f.y + Math.sin(f.a) * f.l * 0.5, f.l * 0.55, a * 0.6);
    }
    for (const q of this.parts) if (q.k === 'fire') hole(q.x, q.y, 70, (q.life / q.max) * 0.5);
    if (this.snap) for (const k of this.snap.k) hole(k[2], k[3], 50, 0.6);
    hole(800, 450, 90, 0.35); // moonlight on the fountain
    for (const z of this.ents.z.values()) if (z.type === 4 && (z.flags & 2)) hole(z.x, z.y, 120, 0.9);
    x.drawImage(this.light, 0, 0, WW * sc, WH * sc, 0, 0, WW, WH);
  }

  drawHud(x, dt) {
    const snap = this.snap;
    if (!snap) return;
    // team kill tallies
    const teams = {};
    for (const [id, p] of this.ents.p) { const t = this.playerTeam?.[id]; if (t) teams[t] = (teams[t] || 0) + (p.kills || 0); }
    const entries = Object.entries(teams);
    x.font = '700 26px Cinzel, serif'; x.textBaseline = 'middle';
    entries.forEach(([t, n], i) => {
      const bx = 40 + i * 230;
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(bx, 24, 210, 52);
      x.fillStyle = this.teamColor[t] || '#fff'; x.fillRect(bx, 24, 6, 52);
      x.textAlign = 'left'; x.fillText(`${n}`, bx + 20, 51);
      x.fillStyle = '#b9ad9c'; x.font = '400 16px Cinzel, serif'; x.fillText('KILLS', bx + 90, 52); x.font = '700 26px Cinzel, serif';
    });
    x.textAlign = 'right'; x.fillStyle = '#efe6d8'; x.font = '700 24px Cinzel, serif';
    x.fillText(snap.phase === 'warmup' ? `GET READY — ${snap.left}` : `WAVE ${Math.max(1, snap.wave)} / ${snap.waves}`, 1880, 50);
    if (snap.phase === 'warmup') {
      x.textAlign = 'center'; x.font = '700 40px Cinzel, serif'; x.fillStyle = '#efe6d8';
      x.fillText('MOVE WITH YOUR THUMB — YOUR GUN AIMS ITSELF', 960, 960);
      x.font = '400 26px Fell, serif'; x.fillStyle = '#b9ad9c';
      x.fillText('Grab what the dead drop. Stand next to a fallen friend to revive them.', 960, 1010);
    }
    if (snap.boss) {
      const w = 900;
      x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(960 - w / 2 - 4, 1010, w + 8, 34);
      x.fillStyle = '#5a0010'; x.fillRect(960 - w / 2, 1014, w, 26);
      x.fillStyle = snap.boss.state === 'stun' ? '#ff6a7a' : '#c8102e'; x.fillRect(960 - w / 2, 1014, (w * snap.boss.hp) / 100, 26);
      x.textAlign = 'center'; x.fillStyle = '#efe6d8'; x.font = '700 20px Cinzel, serif';
      x.fillText(snap.boss.state === 'stun' ? 'EDMUND IS STUNNED — SHOOT HIS HEART!' : 'EDMUND, THE GROOM OF THE DEAD', 960, 1000);
    }
    if (snap.slow) { x.fillStyle = 'rgba(80,120,255,.08)'; x.fillRect(0, 0, 1920, 1080); }
    // banners
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
  }
}
