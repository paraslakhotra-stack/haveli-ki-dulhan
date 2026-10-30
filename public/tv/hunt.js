// TV renderer for Chapter V — Solah Shringar Ki Khoj. The screen splits into one pane per team (2 side by side,
// 3 columns, or a 2×2 grid). Each pane follows its own team through the same haveli with its own lantern light,
// a header of recovered adornments, and a mini-map whose hint zone narrows towards the next station.
// The whole floor plan is pre-rendered once; a pane is one blit of the map + a handful of sprites.
import { nameOf, getPhoto } from '/shared/photos.js';
import { audio } from '/shared/audio.js';
import { music } from '/shared/music.js';
import { RtBuffer, playerKey, idKey } from '/tv/rtclient.js';
import * as SP from '/tv/sprites.js';
import { GRID, COLS, ROWS, TILE, WORLD_W, WORLD_H, ROOMS, ITEMS } from '/shared/haveli-map.js';

const TAU = Math.PI * 2;
const FLOOR = {
  stone: ['#3b3328', '#463c2f'], court: ['#5b4a36', '#66533c'], wood: ['#3a2618', '#442d1c'], tile: ['#2c2a3a', '#36334a'],
  mirror: ['#28323c', '#33404c'], carpet: ['#4a1420', '#561a28'], dirt: ['#2a241c', '#30291f'], step: ['#4a4436', '#554e3e'],
};
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rnd(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; }
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

export function paneRects(n) {
  if (n <= 1) return [[0, 0, 1920, 1080]];
  if (n === 2) return [[0, 0, 960, 1080], [960, 0, 960, 1080]];
  if (n === 3) return [[0, 0, 640, 1080], [640, 0, 640, 1080], [1280, 0, 640, 1080]];
  return [[0, 0, 960, 540], [960, 0, 960, 540], [0, 540, 960, 540], [960, 540, 960, 540]];
}

export class HuntRenderer {
  constructor() {
    this.buf = new RtBuffer();
    this.anim = new Map();
    this.cams = [];
    this.fx = [];
    this.parts = [];
    this.banners = [];
    this.teams = [];
    this.teamColor = {};
    this.teamName = {};
    this.teamGlyph = {};
    this.faceCache = new Map();
    this.map = null;
    this.mini = null;
    this.light = null;
    this.t = 0;
    this.q = {};
    this.debug = /[?&]debug/.test(location.search);
  }
  reset() { this.buf.reset(); this.anim.clear(); this.cams = []; this.fx = []; this.parts = []; this.banners = []; this.q = {}; }
  setContext({ teams, players, step }) {
    for (const t of teams || []) { this.teamColor[t.id] = t.color; this.teamName[t.id] = t.name; this.teamGlyph[t.id] = t.glyph; }
    this.playerTeam = Object.fromEntries((players || []).map((p) => [p.id, p.team]));
    this.q = step?.q || {};
  }
  ingest(buf, meta) { this.buf.push(buf, meta); }
  prepare() {
    if (this.map) return;
    this.map = this.buildMap();
    this.mini = this.buildMini();
    [this.light, this.lctx] = cv(960, 540);
    SP.prewarm(Object.values(this.teamColor).concat('#efe6d8'));
  }

  // ---------------------------------------------------------------- static map
  buildMap() {
    const [c, x] = cv(WORLD_W, WORLD_H);
    x.fillStyle = '#0b0807'; x.fillRect(0, 0, WORLD_W, WORLD_H);
    const r = rnd(42);
    // floors per room, with a checker of slabs and grime
    for (const room of ROOMS) {
      const [c0, r0, c1, r1] = room.rect;
      const [a, b] = FLOOR[room.floor] || FLOOR.stone;
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        x.fillStyle = (rr + cc) % 2 ? a : b;
        x.fillRect(cc * TILE, rr * TILE, TILE, TILE);
      }
      if (room.floor === 'carpet') { x.strokeStyle = 'rgba(214,173,116,.45)'; x.lineWidth = 6; x.strokeRect((c0 + 1) * TILE, (r0 + 1) * TILE, (c1 - c0 - 1) * TILE, (r1 - r0 - 1) * TILE); }
      if (room.floor === 'mirror') for (let k = 0; k < 120; k++) { x.fillStyle = `rgba(200,230,255,${r() * 0.25})`; x.fillRect((c0 + r() * (c1 - c0 + 1)) * TILE, (r0 + r() * (r1 - r0 + 1)) * TILE, 3, 3); }
      if (room.floor === 'court') {
        // a big rangoli-ish star in the courtyard
        const [cx, cy] = [((c0 + c1 + 1) / 2) * TILE, ((r0 + r1 + 1) / 2) * TILE + 120];
        x.strokeStyle = 'rgba(243,156,18,.25)'; x.lineWidth = 5;
        for (let k = 0; k < 8; k++) { const ang = (k / 8) * TAU; x.beginPath(); x.ellipse(cx + Math.cos(ang) * 70, cy + Math.sin(ang) * 70, 60, 24, ang, 0, TAU); x.stroke(); }
      }
    }
    // doorways/corridors share the stone floor
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      if (GRID[rr * COLS + cc] === 0 && !ROOMS.some((rm) => cc >= rm.rect[0] && cc <= rm.rect[2] && rr >= rm.rect[1] && rr <= rm.rect[3])) {
        x.fillStyle = (rr + cc) % 2 ? '#3b3328' : '#433a2d'; x.fillRect(cc * TILE, rr * TILE, TILE, TILE);
      }
    }
    for (let k = 0; k < 9000; k++) { x.fillStyle = `rgba(0,0,0,${r() * 0.25})`; x.fillRect(r() * WORLD_W, r() * WORLD_H, 2 + r() * 3, 2 + r() * 3); }
    // walls with a lit top edge and a dark front face (reads as height from a 3/4 view)
    const solid = (cc, rr) => cc < 0 || rr < 0 || cc >= COLS || rr >= ROWS || GRID[rr * COLS + cc] === 1;
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      const v = GRID[rr * COLS + cc];
      const X = cc * TILE; const Y = rr * TILE;
      if (v === 1) {
        x.fillStyle = '#6b5136'; x.fillRect(X, Y, TILE, TILE);
        if (!solid(cc, rr + 1)) { x.fillStyle = '#3c2b1c'; x.fillRect(X, Y + TILE * 0.55, TILE, TILE * 0.45); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(X, Y + TILE, TILE, 10); }
        if (!solid(cc, rr - 1)) { x.fillStyle = '#a07a50'; x.fillRect(X, Y, TILE, 5); }
        x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1; x.strokeRect(X + 0.5, Y + 0.5, TILE - 1, TILE - 1);
        // jharokha niches on long walls
        if (!solid(cc, rr + 1) && cc % 6 === 0) { x.fillStyle = '#20160e'; x.beginPath(); x.moveTo(X + 10, Y + TILE); x.lineTo(X + 10, Y + 28); x.quadraticCurveTo(X + 20, Y + 16, X + 30, Y + 28); x.lineTo(X + 30, Y + TILE); x.fill(); }
      } else if (v === 2) {
        const room = ROOMS.find((rm) => cc >= rm.rect[0] && cc <= rm.rect[2] && rr >= rm.rect[1] && rr <= rm.rect[3]);
        this.prop(x, room?.id, X, Y);
      } else if (v === 3) {
        x.fillStyle = '#0d1d2a'; x.fillRect(X, Y, TILE, TILE);
        x.fillStyle = 'rgba(120,170,210,.12)'; x.fillRect(X + 4, Y + 10, TILE - 8, 3);
      }
    }
    // baoli steps around the pool
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 3;
    for (let k = 1; k <= 3; k++) x.strokeRect(48 * TILE - k * 14, 31 * TILE - k * 14, 5 * TILE + k * 28, 4 * TILE + k * 28);
    // room names painted faintly on the floor
    x.textAlign = 'center'; x.font = '700 34px Cinzel, serif'; x.fillStyle = 'rgba(239,230,216,.10)';
    for (const room of ROOMS) { if (room.id === 'chhat') continue; const [c0, r0, c1] = room.rect; x.fillText(room.name.toUpperCase(), ((c0 + c1 + 1) / 2) * TILE, (r0 + 1.2) * TILE + 12); }
    return c;
  }
  prop(x, room, X, Y) {
    if (room === 'aangan' && X >= 29 * TILE && X <= 30 * TILE && Y >= 21 * TILE && Y <= 23 * TILE) { // fountain basin
      x.fillStyle = '#7d7466'; x.fillRect(X, Y, TILE, TILE); x.fillStyle = '#1b2a38'; x.fillRect(X + (X === 29 * TILE ? 8 : 0), Y + (Y === 21 * TILE ? 8 : 0), TILE - 8, TILE - (Y === 23 * TILE ? 8 : 0) - (Y === 21 * TILE ? 8 : 0));
      x.fillStyle = 'rgba(120,170,210,.18)'; x.fillRect(X + 10, Y + 16, TILE - 20, 3);
    } else if (room === 'aangan') { // sandstone column seen from above
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(X + 24, Y + 28, 16, 10, 0, 0, TAU); x.fill();
      x.fillStyle = '#9a7650'; x.beginPath(); x.arc(X + 20, Y + 20, 15, 0, TAU); x.fill();
      x.fillStyle = '#c99a62'; x.beginPath(); x.arc(X + 18, Y + 18, 10, 0, TAU); x.fill();
      x.fillStyle = '#e2b84f'; x.beginPath(); x.arc(X + 18, Y + 18, 3, 0, TAU); x.fill();
    } else if (room === 'pothi') {
      x.fillStyle = '#4a2c16'; x.fillRect(X + 1, Y + 4, TILE - 2, TILE - 6);
      const cols = ['#7b1e1e', '#2e4a7b', '#7b6a1e', '#2e6b4a', '#6b2e7b'];
      for (let k = 0; k < 6; k++) { x.fillStyle = cols[(X / TILE + k) % cols.length]; x.fillRect(X + 4 + k * 5.5, Y + 8, 4, 12); x.fillRect(X + 4 + k * 5.5, Y + 22, 4, 12); }
    } else if (room === 'zenana') { // jaali screen
      x.fillStyle = '#7a5a3a'; x.fillRect(X + 12, Y, 16, TILE);
      x.fillStyle = '#20160e'; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(X + 20, Y + 6 + k * 10, 3, 0, TAU); x.fill(); }
    } else if (room === 'sheesh') {
      x.fillStyle = '#9fb4c4'; x.fillRect(X + 10, Y + 2, 20, TILE - 4); x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(X + 13, Y + 4, 4, TILE - 8);
    } else if (room === 'rasoi') {
      x.fillStyle = '#5a3a26'; x.fillRect(X + 2, Y + 2, TILE - 4, TILE - 4); x.fillStyle = '#1a0e08'; x.beginPath(); x.arc(X + 20, Y + 20, 10, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,120,40,.35)'; x.beginPath(); x.arc(X + 20, Y + 20, 5, 0, TAU); x.fill();
    } else if (room === 'diwan') {
      x.fillStyle = '#7b1022'; x.fillRect(X, Y + 4, TILE, TILE - 6); x.fillStyle = '#d4a017'; x.fillRect(X, Y + 4, TILE, 3);
      x.fillStyle = '#e8c592'; x.beginPath(); x.ellipse(X + 20, Y + 14, 12, 6, 0, 0, TAU); x.fill();
    } else if (room === 'tehkhana') {
      x.fillStyle = '#5a4025'; x.fillRect(X + 4, Y + 6, TILE - 8, TILE - 10); x.strokeStyle = '#2a1a0c'; x.lineWidth = 2; x.strokeRect(X + 4, Y + 6, TILE - 8, TILE - 10); x.beginPath(); x.moveTo(X + 4, Y + 6); x.lineTo(X + TILE - 4, Y + TILE - 4); x.stroke();
    } else {
      x.fillStyle = '#6d6458'; x.fillRect(X + 8, Y + 8, TILE - 16, TILE - 16);
    }
  }
  buildMini() {
    const s = 4; // px per tile
    const [c, x] = cv(COLS * s, ROWS * s);
    for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
      const v = GRID[rr * COLS + cc];
      x.fillStyle = v === 1 ? '#1a120c' : v === 3 ? '#183248' : v === 2 ? '#5a4632' : '#8a7356';
      x.fillRect(cc * s, rr * s, s, s);
    }
    x.font = '700 9px sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(255,240,210,.85)';
    for (const room of ROOMS) { if (room.id === 'chhat' || room.id === 'darwaza') continue; const [c0, r0, c1, r1] = room.rect; x.fillText(room.name, ((c0 + c1 + 1) / 2) * s, ((r0 + r1 + 1) / 2) * s + 3); }
    return c;
  }
  face(id, size) {
    const key = `${id}:${size}`;
    let c = this.faceCache.get(key);
    const src = getPhoto(id);
    if (c && c.src === src) return c.canvas;
    const [cc, x] = cv(size, size);
    x.beginPath(); x.arc(size / 2, size / 2, size / 2, 0, TAU); x.clip();
    if (src) { const img = new Image(); img.src = src; if (img.complete) x.drawImage(img, 0, 0, size, size); else img.onload = () => this.faceCache.delete(key); }
    else { x.fillStyle = '#c99a72'; x.fillRect(0, 0, size, size); x.fillStyle = '#2a1a10'; x.font = `700 ${size * 0.5}px Cinzel, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((nameOf(id)[0] || '?').toUpperCase(), size / 2, size / 2 + 2); }
    c = { canvas: cc, src };
    this.faceCache.set(key, c);
    return cc;
  }

  // ---------------------------------------------------------------- events
  handle(ev, meta) {
    switch (ev.e) {
      case 'go': this.banner('KHOJ SHURU!', 2.6, '#ffd27a', 'Phone pe paheli padho — map pe roshni dekho'); audio.bell(0.8); break;
      case 'arrive': this.fx.push({ k: 'ring', team: ev.team, x: ev.x, y: ev.y, c: '255,214,120', life: 1, max: 1, r: 120 }); audio.ui('good'); break;
      case 'found': {
        this.fx.push({ k: 'burst', team: ev.team, x: ev.x, y: ev.y, life: 1.6, max: 1.6, item: ev.item });
        for (let i = 0; i < 24; i++) { const a = Math.random() * TAU; const sp = 60 + Math.random() * 200; this.parts.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: 1.2, max: 1.2, c: i % 2 ? '255,214,120' : '243,156,18' }); }
        this.paneBanner(ev.team, `${ITEMS[ev.item]?.icon || '✨'} ${ITEMS[ev.item]?.name || ''} mil gaya!`);
        music.stinger('found');
        break;
      }
      case 'wrong': this.paneBanner(ev.team, 'GALAT! Woh aa rahi hai…', '#ff5a6e'); music.stinger('wrong'); audio.whisper(0.9); break;
      case 'ghostTp': audio.ghungroo?.(0.8, 0, 3); break;
      case 'freeze': this.fx.push({ k: 'ring', x: ev.x, y: ev.y, c: '160,40,60', life: 0.9, max: 0.9, r: 90 }); audio.scream(0.4, 0); break;
      case 'finish': this.paneBanner(ev.team, ev.place === 1 ? '🏆 PEHLE POHONCHE!' : `🏁 #${ev.place} — poora shringar!`, '#ffd27a'); audio.bell(1); break;
      case 'over': this.banner('KHOJ KHATAM', 3, '#efe6d8', 'Baagh mein dhol ruk gaya…'); audio.bell(1); break;
      default:
    }
  }
  banner(text, life, color, sub = '') { this.banners.push({ text, sub, life, max: life, color, team: null }); }
  paneBanner(team, text, color = '#ffd27a') { this.banners.push({ text, life: 2.4, max: 2.4, color, team, sub: '' }); }

  animate(id, x, y, dt) {
    let a = this.anim.get(id);
    if (!a) { a = { x, y, ph: Math.random() * 6, face: 1, speed: 0 }; this.anim.set(id, a); }
    const dx = x - a.x;
    const dist = Math.hypot(dx, y - a.y);
    a.speed += ((dt > 0 ? dist / dt : 0) - a.speed) * Math.min(1, dt * 12);
    a.ph = (a.ph + dist / 7) % SP.WALK_FRAMES;
    if (Math.abs(dx) > 0.4) a.face = dx > 0 ? 1 : -1;
    a.x = x; a.y = y;
    return a;
  }

  // ---------------------------------------------------------------- frame
  draw(ctx, dt) {
    this.prepare();
    this.t += dt;
    const snap = this.buf.latest;
    const meta = snap?.meta;
    const players = this.buf.sample('p', { key: playerKey, x: 0, y: 1 });
    const ghosts = this.buf.sample('g', { key: idKey, x: 1, y: 2 });
    for (const ev of this.buf.takeEvents()) this.handle(ev, meta);
    for (const [id, p] of players) this.animate(id, p[0], p[1], dt);
    for (const [id, gh] of ghosts) this.animate(`g${id}`, gh[1], gh[2], dt);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
    if (!meta) return;
    if (meta.phase === 'hunt') music.setIntensity(1 - meta.left / 480); // the taal tightens as time runs out
    const teams = meta.teams;
    const stations = new Map((snap.tables.s || []).map((row) => [teams[row[0]], row]));
    const rects = paneRects(teams.length);
    teams.forEach((tid, i) => this.drawPane(ctx, rects[i], tid, i, players, ghosts, stations.get(tid), meta, dt));
    // pane dividers
    ctx.fillStyle = '#c9a94f';
    for (const [x, y, w, h] of rects) { if (x > 0) ctx.fillRect(x - 2, y, 4, h); if (y > 0) ctx.fillRect(x, y - 2, w, 4); }
    this.drawCenter(ctx, meta, dt);
    for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.vx *= 0.96; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter((f) => f.life > 0);
  }

  drawPane(ctx, [px, py, pw, ph], tid, idx, players, ghosts, st, meta, dt) {
    const color = this.teamColor[tid] || '#efe6d8';
    const mine = [...players].filter(([id]) => this.playerTeam?.[id] === tid);
    // camera: follow the team's centroid; zoom out to fit a spread-out team (within limits)
    let cx = WORLD_W / 2; let cy = WORLD_H - 300; let span = 0;
    if (mine.length) {
      cx = mine.reduce((a, [, p]) => a + p[0], 0) / mine.length;
      cy = mine.reduce((a, [, p]) => a + p[1], 0) / mine.length;
      for (const [, p] of mine) span = Math.max(span, Math.abs(p[0] - cx) * (ph / pw), Math.abs(p[1] - cy));
    }
    const baseZoom = Math.min(pw / 820, ph / 760) * 1.05;
    const fitZoom = Math.max(baseZoom * 0.55, Math.min(baseZoom, (ph * 0.42) / Math.max(1, span)));
    const cam = (this.cams[idx] ||= { x: cx, y: cy, z: fitZoom });
    const k = Math.min(1, dt * 4);
    cam.x += (cx - cam.x) * k; cam.y += (cy - cam.y) * k; cam.z += (fitZoom - cam.z) * Math.min(1, dt * 2);
    const z = cam.z;
    const vw = pw / z; const vh = ph / z;
    const vx = Math.max(0, Math.min(WORLD_W - vw, cam.x - vw / 2));
    const vy = Math.max(0, Math.min(WORLD_H - vh, cam.y - vh / 2));
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    ctx.translate(px, py); ctx.scale(z, z); ctx.translate(-vx, -vy);
    ctx.drawImage(this.map, vx, vy, vw, vh, vx, vy, vw, vh);
    const inView = (x, y, m = 120) => x > vx - m && x < vx + vw + m && y > vy - m && y < vy + vh + m;
    // this team's station: a glowing casket with the item inside
    if (st && st[1] >= 0 && !(st[7] & 4)) this.drawStation(ctx, st, color);
    // y-sorted entities
    const list = [];
    for (const [id, p] of players) if (inView(p[0], p[1])) list.push({ y: p[1], id, p, k: 'p' });
    for (const [id, gh] of ghosts) if (inView(gh[1], gh[2])) list.push({ y: gh[2], id, gh, k: 'g' });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) if (it.k === 'p') this.drawPlayer(ctx, it.id, it.p); else this.drawGhost(ctx, it.id, it.gh);
    for (const p of this.parts) if (inView(p.x, p.y)) { ctx.fillStyle = `rgba(${p.c},${p.life / p.max})`; ctx.fillRect(p.x, p.y, 4, 4); }
    for (const f of this.fx) {
      if (f.team && f.team !== tid) continue;
      const a = f.life / f.max;
      if (f.k === 'ring') { ctx.strokeStyle = `rgba(${f.c},${a})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (1 - a) + 12, (f.r * (1 - a) + 12) * 0.6, 0, 0, TAU); ctx.stroke(); }
      if (f.k === 'burst') { ctx.font = `${Math.round(40 + (1 - a) * 30)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, a * 2); ctx.fillText(ITEMS[f.item]?.icon || '✨', f.x, f.y - 40 - (1 - a) * 60); ctx.globalAlpha = 1; }
    }
    ctx.restore();
    this.drawPaneLight(ctx, [px, py, pw, ph], { vx, vy, z }, players, ghosts, st, tid);
    // name tags after the darkness so teammates are always findable
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    ctx.font = '700 13px Cinzel, serif'; ctx.textAlign = 'center';
    for (const [id, p] of mine) {
      const sx = px + (p[0] - vx) * z; const sy = py + (p[1] - vy) * z - 70 * z;
      const label = (p[2] & 1) ? `${nameOf(id)} ❄` : nameOf(id);
      const w = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(sx - w / 2, sy - 13, w, 17);
      ctx.fillStyle = color; ctx.fillText(label, sx, sy);
    }
    // edge arrows for teammates off-screen
    for (const [id, p] of mine) {
      const sx = (p[0] - vx) * z; const sy = (p[1] - vy) * z;
      if (sx >= 0 && sx <= pw && sy >= 0 && sy <= ph) continue;
      const ex = Math.max(18, Math.min(pw - 18, sx)); const ey = Math.max(60, Math.min(ph - 18, sy));
      ctx.drawImage(this.face(id, 48), px + ex - 14, py + ey - 14, 28, 28);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px + ex, py + ey, 15, 0, TAU); ctx.stroke();
    }
    this.drawPaneHud(ctx, [px, py, pw, ph], tid, st, meta, { vx, vy, vw, vh }, mine);
    ctx.restore();
  }

  drawStation(ctx, st, color) {
    const [, sx, sy] = st;
    const pulse = 0.6 + Math.sin(this.t * 4) * 0.25;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse;
    ctx.drawImage(SP.glow('255,200,110'), sx - 60, sy - 70, 120, 120);
    ctx.restore();
    // a little carved sandook (casket)
    ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.roundRect(sx - 16, sy - 16, 32, 22, 4); ctx.fill();
    ctx.fillStyle = '#7a5228'; ctx.beginPath(); ctx.roundRect(sx - 17, sy - 24, 34, 10, 5); ctx.fill();
    ctx.fillStyle = '#d4a017'; ctx.fillRect(sx - 3, sy - 16, 6, 8);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -this.t * 20;
    ctx.beginPath(); ctx.ellipse(sx, sy, 46, 28, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  drawPlayer(ctx, id, p) {
    const [x, y, flags] = p;
    const a = this.anim.get(id);
    const color = this.teamColor[this.playerTeam?.[id]] || '#efe6d8';
    const fr = SP.baraati(color);
    const B = SP.B;
    const moving = (flags & 4) || (a && a.speed > 25);
    const fi = Math.floor(a?.ph || 0) % SP.WALK_FRAMES;
    const face = a?.face || 1;
    const bob = moving ? SP.BOB[fi] : 0;
    ctx.drawImage(SP.shadow(), x - 20, y - 7, 40, 14);
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    if (flags & 1) ctx.globalAlpha = 0.55;
    ctx.drawImage(moving ? fr.walk[fi] : fr.idle, -B.fx, -B.fy, B.w, B.h);
    ctx.restore();
    const hx = x + (B.headX - B.fx) * face;
    const hy = y + (B.headY - B.fy) + bob;
    ctx.fillStyle = '#c99a72'; ctx.beginPath(); ctx.arc(hx, hy, B.headR + 0.6, 0, TAU); ctx.fill();
    ctx.drawImage(this.face(id, 48), hx - B.headR, hy - B.headR, B.headR * 2, B.headR * 2);
    ctx.save(); ctx.translate(x, y); ctx.scale(face, 1);
    ctx.drawImage(SP.safa(hash(id) % SP.SAFA_COUNT, moving ? fi : -1), -B.fx, -B.fy, B.w, B.h);
    ctx.restore();
    // the diya, held out in front; raised high when the button is held
    const raise = flags & 2;
    const dx = x + 14 * face; const dy = y - (raise ? 58 : 30) + bob;
    ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.ellipse(dx, dy, 6, 2.6, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.ellipse(dx, dy - 4, 2, 4 + Math.sin(this.t * 14 + x) * 0.8, 0, 0, TAU); ctx.fill();
    if (flags & 1) { // frozen by a shadow: frost ring
      ctx.strokeStyle = `rgba(190,220,255,${0.6 + Math.sin(this.t * 10) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - 28, 26, 36, 0, 0, TAU); ctx.stroke();
    }
  }
  drawGhost(ctx, id, gh) {
    const [, x, y, vx100, flags] = gh;
    const frames = SP.ghostFrames();
    const fi = Math.floor((this.t * 6 + id) % SP.WALK_FRAMES);
    const G = SP.GHOST;
    const face = vx100 >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(x, y); ctx.scale(face * 1.05, 1.05);
    ctx.globalAlpha = 0.82 + Math.sin(this.t * 3 + id) * 0.1;
    if (flags & 1) ctx.globalAlpha = 0.45; // recoiling from a diya
    ctx.drawImage(frames[fi], -G.fx, -G.fy, G.w, G.h);
    ctx.restore();
  }

  // Darkness for one pane, with lantern holes from every player nearby, the station glow and red ghost-light.
  drawPaneLight(ctx, [px, py, pw, ph], { vx, vy, z }, players, ghosts, st) {
    const l = this.lctx;
    const sc = 0.5;
    const w = pw * sc; const h = ph * sc;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, w, h);
    l.fillStyle = 'rgba(3,2,8,0.86)'; l.fillRect(0, 0, w, h);
    l.globalCompositeOperation = 'destination-out';
    const W0 = SP.glow('0,0,0');
    const hole = (x, y, r, a = 1) => { l.globalAlpha = a; const sx = (x - vx) * z * sc; const sy = (y - vy) * z * sc; const rr = r * z * sc; l.drawImage(W0, sx - rr, sy - rr, rr * 2, rr * 2); };
    for (const [, p] of players) hole(p[0], p[1] - 24, (p[2] & 2) ? 300 : 230, 1);
    if (st && st[1] >= 0) hole(st[1], st[2] - 10, 110, 0.7);
    for (const [, g] of ghosts) hole(g[1], g[2] - 40, 70, 0.35);
    l.globalAlpha = 1;
    ctx.drawImage(this.light, 0, 0, w, h, px, py, pw, ph);
    // a faint red bleed around the shadows so you sense them before you see them
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    for (const [, g] of ghosts) { const sx = px + (g[1] - vx) * z; const sy = py + (g[2] - vy) * z; ctx.globalAlpha = 0.35 + Math.sin(this.t * 2.5) * 0.12; ctx.drawImage(SP.glow('200,16,46'), sx - 70 * z, sy - 110 * z, 140 * z, 140 * z); }
    ctx.restore();
  }

  drawPaneHud(ctx, [px, py, pw, ph], tid, st, meta, view, mine) {
    const color = this.teamColor[tid] || '#efe6d8';
    const found = meta.found?.[meta.teams.indexOf(tid)] || [];
    const total = 5;
    // header bar
    ctx.fillStyle = 'rgba(8,4,6,.78)'; ctx.fillRect(px, py, pw, 50);
    ctx.fillStyle = color; ctx.fillRect(px, py + 48, pw, 3);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = '700 22px Cinzel, serif'; ctx.fillStyle = color;
    ctx.fillText(`${this.teamGlyph[tid] || ''} ${(this.teamName[tid] || '').replace('Team ', '')}`, px + 14, py + 25);
    // collected adornment slots
    ctx.font = '22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center';
    const slots = Math.max(total, found.length + (st && st[1] >= 0 ? 1 : 0));
    const sx0 = px + pw - 22 - (slots - 1) * 32;
    for (let i = 0; i < slots; i++) {
      const x = sx0 + i * 32;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(x, py + 25, 14, 0, TAU); ctx.fill();
      if (found[i] != null) ctx.fillText(ITEMS[found[i]]?.icon || '✨', x, py + 26);
    }
    // status line under the header
    const flags = st?.[7] || 0;
    let status = null;
    if (flags & 4) status = [`🏁 Poora! #${meta.finished.indexOf(tid) + 1}`, '#ffd27a'];
    else if (flags & 1) status = ['❓ SAWAAL PHONE PE — jaldi!', '#ffd27a'];
    else if (flags & 2) status = ['🔒 Galat jawaab — ruko…', '#ff7a8a'];
    if (status) {
      ctx.font = '700 20px Cinzel, serif'; ctx.textAlign = 'center';
      const w = ctx.measureText(status[0]).width + 30;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(px + pw / 2 - w / 2, py + 58, w, 32);
      ctx.fillStyle = status[1]; ctx.fillText(status[0], px + pw / 2, py + 74);
    }
    // mini-map with this team's hint zone
    const mw = Math.min(260, pw * 0.34);
    const mh = mw * (ROWS / COLS);
    const mx = px + pw - mw - 12;
    const my = py + ph - mh - 12;
    const ms = mw / WORLD_W;
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.drawImage(this.mini, mx, my, mw, mh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.strokeRect(mx + view.vx * ms, my + view.vy * ms, view.vw * ms, view.vh * ms);
    ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    if (st && st[1] >= 0 && st[5] > 0 && !(flags & 4)) {
      const pulse = 0.5 + Math.sin(this.t * 4) * 0.3;
      const hx = mx + st[3] * ms; const hy = my + st[4] * ms; const hr = Math.max(4, st[5] * ms);
      ctx.fillStyle = `rgba(255,214,120,${0.18 + pulse * 0.15})`; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,214,120,${0.6 + pulse * 0.4})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, TAU); ctx.stroke();
    }
    for (const [, p] of mine) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(mx + p[0] * ms, my + p[1] * ms, 3.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
    // pane banners
    for (const b of this.banners) {
      if (b.team !== tid) continue;
      const a = Math.min(1, b.life * 2, (b.max - b.life) * 4);
      ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(Math.min(44, pw / 16))}px Cinzel, serif`;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillText(b.text, px + pw / 2 + 2, py + ph * 0.36 + 2);
      ctx.fillStyle = b.color; ctx.fillText(b.text, px + pw / 2, py + ph * 0.36);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = 'alphabetic';
  }

  drawCenter(ctx, meta, dt) {
    // shared timer in the middle seam
    const mins = Math.floor(meta.left / 60); const secs = String(meta.left % 60).padStart(2, '0');
    const label = meta.phase === 'warmup' ? `TAIYAAR — ${meta.left}` : meta.phase === 'over' ? 'KHATAM' : `${mins}:${secs}`;
    ctx.font = '700 28px Cinzel, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(label).width + 36;
    const y = meta.teams.length === 4 ? 540 : 1040;
    ctx.fillStyle = 'rgba(8,4,6,.88)'; ctx.beginPath(); ctx.roundRect(960 - w / 2, y - 24, w, 48, 24); ctx.fill();
    ctx.strokeStyle = '#c9a94f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = meta.left < 30 && meta.phase === 'hunt' ? '#ff5a6e' : '#efe6d8';
    ctx.fillText(label, 960, y + 1);
    for (const b of this.banners) {
      if (b.team) continue;
      const a = Math.min(1, b.life * 2, (b.max - b.life) * 4);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '700 90px Cinzel, serif';
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillText(b.text, 964, 404);
      ctx.fillStyle = b.color; ctx.fillText(b.text, 960, 400);
      if (b.sub) { ctx.font = 'italic 400 38px Fell, serif'; ctx.fillStyle = '#efe6d8'; ctx.fillText(b.sub, 960, 470); }
      ctx.globalAlpha = 1;
    }
    for (const b of this.banners) b.life -= dt;
    this.banners = this.banners.filter((b) => b.life > 0);
    ctx.textBaseline = 'alphabetic';
    if (meta.phase === 'warmup') {
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(360, 860, 1200, 110);
      ctx.font = '700 32px Cinzel, serif'; ctx.fillStyle = '#efe6d8'; ctx.fillText('ANGOOTHE SE CHALO · 🪔 DIYA UTHAO = PARCHHAAI BHAGAO', 960, 905);
      ctx.font = '400 24px Fell, serif'; ctx.fillStyle = '#b9ad9c'; ctx.fillText('Phone pe paheli. Map pe peeli roshni = jagah. Wahan pohoncho → shaadi ka sawaal → agla suraag.', 960, 945);
    }
    if (this.debug) { const d = this.buf.debug(); ctx.fillStyle = '#9f9'; ctx.font = '16px monospace'; ctx.textAlign = 'left'; ctx.fillText(`snaps ${d.snaps} gap p50 ${d.gap50} p95 ${d.gap95}`, 20, 1070); }
  }
}
