// Procedurally painted, animated environments for every chapter. Logical canvas: 1920×1080.
// Static layers are painted once per scene to an offscreen canvas; light, weather and creatures animate on top.
import { createNoise2D } from '/vendor/simplex-noise.mjs';

export const VW = 1920;
export const VH = 1080;

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function layer(w = VW, h = VH) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
const lerp = (a, b, t) => a + (b - a) * t;

function glow(x, cx, cy, r, color, alpha = 1) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color.replace('A', String(alpha)));
  g.addColorStop(1, color.replace('A', '0'));
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
}
function flame(x, cx, cy, s, t, seed = 0) {
  const f = 1 + Math.sin(t * 13 + seed) * 0.08 + Math.sin(t * 29 + seed * 3) * 0.05;
  glow(x, cx, cy - s * 0.6, s * 4.5 * f, 'rgba(255,170,80,A)', 0.22);
  x.fillStyle = '#ffb35c';
  x.beginPath();
  x.moveTo(cx, cy - s * 2.2 * f);
  x.quadraticCurveTo(cx + s * 0.9, cy - s * 0.6, cx, cy);
  x.quadraticCurveTo(cx - s * 0.9, cy - s * 0.6, cx, cy - s * 2.2 * f);
  x.fill();
  x.fillStyle = '#fff3d0';
  x.beginPath(); x.ellipse(cx, cy - s * 0.6, s * 0.28, s * 0.6, 0, 0, Math.PI * 2); x.fill();
}
function tree(x, rnd, bx, by, len, ang, depth, width) {
  if (depth === 0 || len < 4) return;
  const ex = bx + Math.cos(ang) * len;
  const ey = by + Math.sin(ang) * len;
  x.lineWidth = width;
  x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
  const n = depth > 6 ? 2 : 2 + (rnd() < 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) tree(x, rnd, ex, ey, len * (0.66 + rnd() * 0.16), ang + (rnd() - 0.5) * 1.1, depth - 1, width * 0.68);
}
function cloudStrip(noise, w, h, tint) {
  const [c, x] = layer(w, h);
  const img = x.createImageData(w, h);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      // Tileable horizontally by blending two samples.
      const fx = xx / w;
      const n = (a, b) => noise(a, b) * 0.6 + noise(a * 2.1, b * 2.1) * 0.3 + noise(a * 4.3, b * 4.3) * 0.1;
      const v = lerp(n(xx / 260, yy / 90), n((xx - w) / 260, yy / 90), fx);
      const fall = Math.sin((yy / h) * Math.PI);
      const a = Math.max(0, v * 1.4 - 0.15) * fall;
      const i = (yy * w + xx) * 4;
      img.data[i] = tint[0]; img.data[i + 1] = tint[1]; img.data[i + 2] = tint[2]; img.data[i + 3] = Math.min(255, a * 200);
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- scenes
const SCENES = {
  manor: {
    build(x, rnd, noise) {
      const sky = x.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, '#020309'); sky.addColorStop(0.55, '#0d1222'); sky.addColorStop(1, '#1a1f2e');
      x.fillStyle = sky; x.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(220,225,255,${rnd() * 0.5})`; x.fillRect(rnd() * VW, rnd() * 520, 1.4, 1.4); }
      // moon
      glow(x, 1470, 230, 420, 'rgba(160,180,230,A)', 0.18);
      const mg = x.createRadialGradient(1450, 210, 10, 1470, 230, 96);
      mg.addColorStop(0, '#f4f1e6'); mg.addColorStop(1, '#c9c6b8');
      x.fillStyle = mg; x.beginPath(); x.arc(1470, 230, 92, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(120,118,105,.25)';
      for (const [cx, cy, r] of [[1440, 200, 18], [1500, 260, 24], [1490, 190, 9], [1430, 255, 11]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
      // distant hills
      x.fillStyle = '#0a0d17';
      x.beginPath(); x.moveTo(0, 760);
      for (let i = 0; i <= 20; i++) x.lineTo((i / 20) * VW, 740 + noise(i / 4, 1) * 50);
      x.lineTo(VW, VH); x.lineTo(0, VH); x.fill();
      // the manor
      x.fillStyle = '#05060b';
      const M = (pts) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fill(); };
      M([640, 880, 640, 520, 700, 460, 760, 520, 760, 560, 900, 560, 900, 360, 935, 300, 960, 180, 985, 300, 1020, 360, 1020, 560, 1160, 560, 1160, 520, 1220, 450, 1280, 520, 1280, 880]);
      M([600, 880, 600, 600, 640, 600, 640, 880]);
      M([1280, 880, 1280, 610, 1330, 600, 1330, 880]);
      for (const [cx, w, top] of [[700, 26, 420], [1220, 26, 410]]) M([cx - w, 560, cx - w, top + 40, cx, top, cx + w, top + 40, cx + w, 560]);
      for (const [cx, top] of [[790, 500], [1130, 495], [860, 520]]) x.fillRect(cx, top, 16, 70);
      // battlements + spire finial
      for (let i = 0; i < 8; i++) x.fillRect(900 + i * 16, 350, 9, 14);
      x.fillRect(958, 150, 4, 36);
      // ground + fence + graves
      x.fillStyle = '#030407';
      x.beginPath(); x.moveTo(0, 900);
      for (let i = 0; i <= 30; i++) x.lineTo((i / 30) * VW, 880 + Math.sin(i * 0.7) * 10 + noise(i / 3, 9) * 16);
      x.lineTo(VW, VH); x.lineTo(0, VH); x.fill();
      x.strokeStyle = '#030407'; x.lineWidth = 4;
      for (let i = 0; i < 64; i++) { const fx = 40 + i * 29; x.beginPath(); x.moveTo(fx, 960); x.lineTo(fx, 900); x.stroke(); x.beginPath(); x.moveTo(fx - 5, 906); x.lineTo(fx, 894); x.lineTo(fx + 5, 906); x.fill(); }
      x.fillRect(0, 920, VW, 5);
      for (let i = 0; i < 9; i++) { const gx = 120 + rnd() * 1700; if (gx > 560 && gx < 1360) continue; x.fillRect(gx, 860 - rnd() * 20, 26, 50); x.beginPath(); x.arc(gx + 13, 860, 13, Math.PI, 0); x.fill(); }
      // dead trees
      x.strokeStyle = '#020306'; x.lineCap = 'round';
      tree(x, rnd, 160, 1000, 150, -Math.PI / 2 - 0.12, 9, 24);
      tree(x, rnd, 1780, 1000, 165, -Math.PI / 2 + 0.15, 9, 26);
      tree(x, rnd, 420, 960, 80, -Math.PI / 2 - 0.3, 7, 12);
    },
    init(st, rnd, noise) {
      st.clouds = cloudStrip(noise, 1024, 260, [40, 46, 70]);
      st.windows = [];
      for (const [x0, y0, cols, rows] of [[660, 620, 3, 3], [780, 600, 7, 3], [1040, 600, 7, 3], [920, 420, 3, 4], [1170, 620, 3, 3]]) {
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) st.windows.push({ x: x0 + c * 18, y: y0 + r * 70, lit: rnd() < 0.3, ph: rnd() * 10 });
      }
      st.vesperWin = st.windows.find((w) => w.x > 920 && w.x < 1000 && w.y < 600) || st.windows[0];
      st.drops = Array.from({ length: 420 }, () => ({ x: rnd() * VW, y: rnd() * VH, s: 900 + rnd() * 700, l: 14 + rnd() * 18 }));
    },
    frame(x, t, st, dt) {
      const off = (t * 14) % 1024;
      x.globalAlpha = 0.8;
      for (let i = -1; i < 3; i++) x.drawImage(st.clouds, i * 1024 - off, 80, 1024, 300);
      x.globalAlpha = 0.5;
      for (let i = -1; i < 3; i++) x.drawImage(st.clouds, i * 1024 - ((off * 1.7) % 1024), 300, 1024, 220);
      x.globalAlpha = 1;
      for (const w of st.windows) {
        if (!w.lit && w !== st.vesperWin) continue;
        const f = 0.65 + Math.sin(t * 7 + w.ph) * 0.12 + Math.sin(t * 17 + w.ph) * 0.08;
        x.fillStyle = `rgba(255,170,80,${f})`;
        x.fillRect(w.x, w.y, 10, 22);
        glow(x, w.x + 5, w.y + 11, 26, 'rgba(255,160,70,A)', 0.18 * f);
      }
      // Vesper appears in the tower window now and then.
      const cyc = t % 23;
      if (cyc > 17 && cyc < 20) {
        const w = st.vesperWin;
        x.fillStyle = '#e8f0ff';
        x.fillRect(w.x, w.y, 10, 22);
        x.fillStyle = '#05060b';
        x.beginPath(); x.ellipse(w.x + 5, w.y + 8, 3, 4, 0, 0, Math.PI * 2); x.fill();
        x.fillRect(w.x + 2, w.y + 11, 6, 11);
      }
      rain(x, st.drops, dt, 0.35);
    },
  },

  foyer: {
    build(x, rnd) {
      const wall = x.createLinearGradient(0, 0, 0, VH);
      wall.addColorStop(0, '#0b0706'); wall.addColorStop(0.7, '#1a100c'); wall.addColorStop(1, '#0a0605');
      x.fillStyle = wall; x.fillRect(0, 0, VW, VH);
      // wood panels
      x.strokeStyle = 'rgba(120,80,50,.18)'; x.lineWidth = 3;
      for (let i = 0; i < 12; i++) { x.strokeRect(20 + i * 160, 560, 140, 260); x.strokeRect(20 + i * 160, 160, 140, 360); }
      // arched window over the landing
      x.fillStyle = '#0d1426';
      x.beginPath(); x.moveTo(850, 470); x.lineTo(850, 230); x.arc(960, 230, 110, Math.PI, 0); x.lineTo(1070, 470); x.fill();
      x.strokeStyle = '#1b1210'; x.lineWidth = 8;
      x.beginPath(); x.moveTo(960, 120); x.lineTo(960, 470); x.moveTo(850, 330); x.lineTo(1070, 330); x.stroke();
      glow(x, 960, 300, 260, 'rgba(120,150,220,A)', 0.12);
      // staircase
      for (let i = 0; i < 14; i++) {
        const y = 520 + i * 28;
        const w = 300 + i * 46;
        x.fillStyle = i % 2 ? '#140c09' : '#1b110d';
        x.fillRect(960 - w / 2, y, w, 28);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(960 - w / 2, y + 22, w, 6);
      }
      x.strokeStyle = '#0a0605'; x.lineWidth = 10;
      x.beginPath(); x.moveTo(810, 500); x.lineTo(640, 900); x.moveTo(1110, 500); x.lineTo(1280, 900); x.stroke();
      x.lineWidth = 4;
      for (let i = 0; i < 12; i++) { const f = i / 11; x.beginPath(); x.moveTo(lerp(810, 640, f), lerp(500, 900, f)); x.lineTo(lerp(810, 640, f), lerp(500, 900, f) + 60); x.moveTo(lerp(1110, 1280, f), lerp(500, 900, f)); x.lineTo(lerp(1110, 1280, f), lerp(500, 900, f) + 60); x.stroke(); }
      // floor
      x.fillStyle = '#080505'; x.fillRect(0, 900, VW, 180);
      for (let r = 0; r < 6; r++) for (let c = -12; c < 12; c++) {
        if ((r + c) % 2) continue;
        const y0 = 900 + r * r * 5 + r * 8;
        const y1 = 900 + (r + 1) * (r + 1) * 5 + (r + 1) * 8;
        const s0 = 60 + r * 20; const s1 = 60 + (r + 1) * 20;
        x.fillStyle = 'rgba(70,55,45,.22)';
        x.beginPath(); x.moveTo(960 + c * s0, y0); x.lineTo(960 + (c + 1) * s0, y0); x.lineTo(960 + (c + 1) * s1, y1); x.lineTo(960 + c * s1, y1); x.fill();
      }
      // portraits
      for (const [px, who] of [[230, 'vesper'], [1520, 'edmund']]) {
        x.fillStyle = '#5a4020'; x.fillRect(px - 10, 210, 190, 250);
        x.fillStyle = '#16100c'; x.fillRect(px, 220, 170, 230);
        const pg = x.createLinearGradient(px, 220, px, 450); pg.addColorStop(0, '#2a2018'); pg.addColorStop(1, '#0c0907');
        x.fillStyle = pg; x.fillRect(px + 6, 226, 158, 218);
        x.fillStyle = '#060404';
        x.beginPath(); x.ellipse(px + 85, 310, 34, 42, 0, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.moveTo(px + 20, 444); x.quadraticCurveTo(px + 85, 340, px + 150, 444); x.fill();
        if (who === 'vesper') { x.fillStyle = 'rgba(230,230,240,.18)'; x.beginPath(); x.moveTo(px + 50, 280); x.quadraticCurveTo(px + 85, 230, px + 120, 280); x.lineTo(px + 135, 440); x.lineTo(px + 35, 440); x.fill(); }
      }
    },
    init(st, rnd) { st.motes = Array.from({ length: 70 }, () => ({ x: rnd() * VW, y: rnd() * VH, v: 4 + rnd() * 10, p: rnd() * 6 })); },
    frame(x, t, st, dt, params) {
      // chandelier swinging
      const sw = Math.sin(t * 0.6) * 0.04;
      x.save(); x.translate(960, 0); x.rotate(sw);
      x.strokeStyle = '#0a0605'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 120); x.stroke();
      x.fillStyle = '#1a120c'; x.beginPath(); x.ellipse(0, 130, 120, 16, 0, 0, Math.PI * 2); x.fill();
      for (let i = 0; i < 7; i++) { const cx = -108 + i * 36; x.fillStyle = '#d8ccb4'; x.fillRect(cx - 3, 104, 6, 22); flame(x, cx, 104, 6, t, i * 1.7); }
      x.restore();
      const fl = 0.8 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.05;
      glow(x, 960, 200, 900, 'rgba(255,150,70,A)', 0.12 * fl);
      // portrait eyes glint every so often
      if (t % 19 > 17.6) { for (const ex of [303, 327, 1593, 1617]) glow(x, ex, 304, 7, 'rgba(255,40,60,A)', 0.95); }
      // séance circle on the floor
      const g = params.circleGlow ?? 0.25;
      x.save(); x.translate(960, 980); x.scale(1, 0.28);
      x.strokeStyle = `rgba(200,20,46,${0.25 + g * 0.6})`; x.lineWidth = 6;
      x.beginPath(); x.arc(0, 0, 330, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 280, 0, Math.PI * 2); x.stroke();
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + t * 0.05; const b = a + (Math.PI * 4) / 5; x.beginPath(); x.moveTo(Math.cos(a) * 280, Math.sin(a) * 280); x.lineTo(Math.cos(b) * 280, Math.sin(b) * 280); x.stroke(); }
      x.restore();
      if (g > 0.3) glow(x, 960, 980, 420, 'rgba(255,30,60,A)', 0.12 * g);
      motes(x, st.motes, t, dt, 'rgba(255,220,180,A)');
    },
  },

  library: {
    build(x, rnd) {
      x.fillStyle = '#0a0706'; x.fillRect(0, 0, VW, VH);
      const colors = ['#3a1414', '#1c2a1a', '#2a1c10', '#1a1a2a', '#3a2a14', '#241210', '#162024'];
      for (let shelf = 0; shelf < 9; shelf++) {
        const y = 40 + shelf * 112;
        for (const [x0, x1] of [[0, 760], [1160, VW]]) {
          let bx = x0 + 6;
          while (bx < x1 - 10) {
            const w = 12 + rnd() * 22;
            const hgt = 70 + rnd() * 30;
            const col = colors[Math.floor(rnd() * colors.length)];
            x.fillStyle = col; x.fillRect(bx, y + 100 - hgt, w - 2, hgt);
            x.fillStyle = 'rgba(210,170,90,.25)'; x.fillRect(bx + 2, y + 100 - hgt + 10, w - 6, 3); x.fillRect(bx + 2, y + 90, w - 6, 2);
            if (rnd() < 0.06) { x.save(); x.translate(bx, y + 100); x.rotate(-0.2); x.fillStyle = col; x.fillRect(0, -hgt, w, hgt); x.restore(); bx += w; }
            bx += w;
          }
          x.fillStyle = '#1e140e'; x.fillRect(x0, y + 100, x1 - x0, 12);
        }
      }
      // central arched window
      x.fillStyle = '#0c1224'; x.beginPath(); x.moveTo(800, 900); x.lineTo(800, 300); x.arc(960, 300, 160, Math.PI, 0); x.lineTo(1120, 900); x.fill();
      x.strokeStyle = '#140d0a'; x.lineWidth = 10;
      for (const lx of [880, 960, 1040]) { x.beginPath(); x.moveTo(lx, 150); x.lineTo(lx, 900); x.stroke(); }
      for (const ly of [420, 600, 780]) { x.beginPath(); x.moveTo(800, ly); x.lineTo(1120, ly); x.stroke(); }
      glow(x, 960, 400, 380, 'rgba(110,140,220,A)', 0.14);
      // desk + diary
      x.fillStyle = '#120b08'; x.fillRect(620, 860, 680, 40); x.fillRect(660, 900, 40, 180); x.fillRect(1220, 900, 40, 180);
      x.fillStyle = '#e9e2d6'; x.beginPath(); x.moveTo(880, 860); x.lineTo(960, 846); x.lineTo(1040, 860); x.lineTo(960, 868); x.fill();
      x.strokeStyle = 'rgba(200,190,170,.6)'; x.lineWidth = 1; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(890 + i * 3, 858 - i); x.lineTo(955, 848); x.stroke(); }
      x.fillStyle = '#d8ccb4'; x.fillRect(1100, 800, 12, 60);
      // ladder
      x.strokeStyle = '#1a110c'; x.lineWidth = 8;
      x.beginPath(); x.moveTo(560, 1080); x.lineTo(660, 80); x.moveTo(640, 1080); x.lineTo(740, 80); x.stroke();
      x.lineWidth = 5; for (let i = 0; i < 16; i++) { const f = i / 16; x.beginPath(); x.moveTo(lerp(560, 660, f), lerp(1080, 80, f)); x.lineTo(lerp(640, 740, f), lerp(1080, 80, f)); x.stroke(); }
    },
    init(st, rnd) {
      st.pages = Array.from({ length: 18 }, () => ({ x: rnd() * VW, y: VH + rnd() * VH, v: 20 + rnd() * 40, r: rnd() * 6, vr: (rnd() - 0.5) * 1.5, s: 0.6 + rnd() * 0.7 }));
      st.motes = Array.from({ length: 60 }, () => ({ x: 700 + rnd() * 520, y: rnd() * VH, v: 3 + rnd() * 8, p: rnd() * 6 }));
    },
    frame(x, t, st, dt) {
      flame(x, 1106, 800, 7, t, 1);
      const fl = 0.8 + Math.sin(t * 11) * 0.08;
      glow(x, 1106, 790, 700, 'rgba(255,150,70,A)', 0.14 * fl);
      for (const p of st.pages) {
        p.y -= p.v * dt; p.x += Math.sin(t * 0.8 + p.r) * 20 * dt; p.r += p.vr * dt;
        if (p.y < -60) { p.y = VH + 60; p.x = Math.random() * VW; }
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.scale(p.s, p.s * Math.abs(Math.sin(t + p.r)) + 0.2);
        x.fillStyle = 'rgba(236,226,206,.55)'; x.fillRect(-22, -30, 44, 60);
        x.fillStyle = 'rgba(60,40,30,.35)'; for (let i = 0; i < 6; i++) x.fillRect(-16, -22 + i * 8, 32, 2);
        x.restore();
      }
      motes(x, st.motes, t, dt, 'rgba(190,210,255,A)');
    },
  },

  nursery: {
    build(x, rnd) {
      x.fillStyle = '#141712'; x.fillRect(0, 0, VW, VH);
      for (let yy = 0; yy < 900; yy += 60) for (let xx = (yy / 60) % 2 ? 30 : 0; xx < VW; xx += 60) {
        x.fillStyle = 'rgba(160,120,130,.08)'; x.beginPath(); x.moveTo(xx, yy - 14); x.lineTo(xx + 10, yy); x.lineTo(xx, yy + 14); x.lineTo(xx - 10, yy); x.fill();
        x.fillStyle = 'rgba(120,150,110,.06)'; x.beginPath(); x.arc(xx + 30, yy + 30, 4, 0, Math.PI * 2); x.fill();
      }
      // peeling strips + stains
      for (let i = 0; i < 6; i++) { const px = rnd() * VW; x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px, 0, 18 + rnd() * 30, 200 + rnd() * 500); }
      for (let i = 0; i < 5; i++) { glow(x, rnd() * VW, rnd() * 700, 60 + rnd() * 120, 'rgba(40,30,10,A)', 0.35); }
      // window
      x.fillStyle = '#0e1630'; x.fillRect(1320, 200, 380, 460);
      glow(x, 1560, 330, 70, 'rgba(240,240,230,A)', 0.9);
      x.strokeStyle = '#0b0a08'; x.lineWidth = 16; x.strokeRect(1320, 200, 380, 460);
      x.beginPath(); x.moveTo(1510, 200); x.lineTo(1510, 660); x.moveTo(1320, 430); x.lineTo(1700, 430); x.stroke();
      // floorboards
      x.fillStyle = '#0d0a08'; x.fillRect(0, 880, VW, 200);
      x.strokeStyle = 'rgba(70,50,35,.4)'; x.lineWidth = 2; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(0, 890 + i * i * 2.2); x.lineTo(VW, 890 + i * i * 2.2); x.stroke(); }
      // crib
      x.fillStyle = '#080706'; x.fillRect(240, 600, 520, 18); x.fillRect(240, 820, 520, 20); x.fillRect(240, 560, 22, 340); x.fillRect(738, 560, 22, 340);
      for (let i = 0; i < 14; i++) x.fillRect(280 + i * 34, 618, 8, 202);
      // blocks
      for (const [bx, by, c] of [[880, 840, '#3a1a1a'], [930, 850, '#1a2a3a'], [905, 800, '#2a2a10']]) { x.fillStyle = c; x.fillRect(bx, by, 40, 40); }
    },
    init(st, rnd) { st.motes = Array.from({ length: 50 }, () => ({ x: 1200 + rnd() * 500, y: rnd() * VH, v: 2 + rnd() * 6, p: rnd() * 6 })); st.r = rnd; },
    frame(x, t, st, dt) {
      // moonbeam with window-cross shadow
      x.save();
      x.globalCompositeOperation = 'lighter';
      const beam = x.createLinearGradient(1500, 300, 900, 1000);
      beam.addColorStop(0, 'rgba(150,170,230,.16)'); beam.addColorStop(1, 'rgba(150,170,230,0)');
      x.fillStyle = beam;
      x.beginPath(); x.moveTo(1320, 200); x.lineTo(1700, 200); x.lineTo(1200, 1080); x.lineTo(620, 1080); x.fill();
      x.restore();
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 20;
      x.beginPath(); x.moveTo(1510, 200); x.lineTo(910, 1080); x.stroke();
      // mobile over the crib
      x.strokeStyle = '#000'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(500, 0); x.lineTo(500, 360); x.stroke();
      for (let i = 0; i < 5; i++) {
        const a = t * 0.5 + (i / 5) * Math.PI * 2;
        const mx = 500 + Math.cos(a) * 110;
        const sc = 0.6 + (Math.sin(a) + 1) * 0.25;
        x.beginPath(); x.moveTo(500, 360); x.lineTo(mx, 380); x.lineTo(mx, 430); x.stroke();
        x.fillStyle = `rgba(210,200,170,${0.3 + sc * 0.4})`;
        star(x, mx, 450, 16 * sc);
      }
      // rocking horse
      const rock = Math.sin(t * 1.6) * 0.12;
      x.save(); x.translate(1150, 900); x.rotate(rock);
      x.fillStyle = '#070605'; x.strokeStyle = '#070605'; x.lineCap = 'round';
      // rocker
      x.lineWidth = 12; x.beginPath(); x.ellipse(0, -60, 190, 60, 0, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
      // legs
      x.lineWidth = 12;
      for (const [lx, fx] of [[-80, -120], [-50, -70], [50, 60], [80, 110]]) { x.beginPath(); x.moveTo(lx, -150); x.lineTo(fx, -8); x.stroke(); }
      // body
      x.beginPath(); x.ellipse(0, -165, 110, 42, 0, 0, Math.PI * 2); x.fill();
      // neck + head
      x.beginPath(); x.moveTo(60, -190); x.quadraticCurveTo(95, -260, 120, -300); x.lineTo(165, -282); x.quadraticCurveTo(130, -230, 105, -160); x.closePath(); x.fill();
      x.beginPath(); x.ellipse(160, -290, 52, 24, 0.35, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.moveTo(125, -318); x.lineTo(133, -348); x.lineTo(146, -316); x.fill();
      // mane + tail
      x.lineWidth = 5;
      for (let k = 0; k < 7; k++) { x.beginPath(); x.moveTo(85 + k * 6, -205 - k * 15); x.lineTo(68 + k * 6 + Math.sin(t * 2 + k) * 4, -195 - k * 15); x.stroke(); }
      for (let k = 0; k < 5; k++) { x.beginPath(); x.moveTo(-105, -175); x.quadraticCurveTo(-150, -150 + k * 6, -140 + Math.sin(t * 2 + k) * 6, -95 + k * 8); x.stroke(); }
      // saddle edge catches the moonlight
      x.strokeStyle = 'rgba(160,170,210,.25)'; x.lineWidth = 3; x.beginPath(); x.ellipse(0, -165, 110, 42, 0, Math.PI * 1.1, Math.PI * 1.9); x.stroke();
      glow(x, 168, -298, 7, 'rgba(255,40,60,A)', t % 13 > 11 ? 1 : 0);
      x.restore();
      // a small handprint fogs the window, then fades
      const cyc = t % 27;
      if (cyc > 20) {
        const a = Math.min(1, (cyc - 20) / 1.5) * Math.max(0, 1 - (cyc - 24) / 3);
        x.fillStyle = `rgba(220,230,240,${0.35 * a})`;
        x.beginPath(); x.ellipse(1420, 540, 16, 20, 0, 0, Math.PI * 2); x.fill();
        for (let f = 0; f < 5; f++) { x.beginPath(); x.ellipse(1402 + f * 9, 512 - (f === 0 ? -8 : Math.abs(2 - f) * -3), 3.5, 11, (f - 2) * 0.15, 0, Math.PI * 2); x.fill(); }
      }
      motes(x, st.motes, t, dt, 'rgba(200,215,255,A)');
    },
  },

  hall: {
    build(x, rnd) {
      const wall = x.createLinearGradient(0, 0, 0, VH);
      wall.addColorStop(0, '#08060a'); wall.addColorStop(1, '#140c0c');
      x.fillStyle = wall; x.fillRect(0, 0, VW, VH);
      for (const wx of [200, 560, 1240, 1600]) { x.fillStyle = '#0c1226'; x.beginPath(); x.moveTo(wx, 520); x.lineTo(wx, 200); x.arc(wx + 60, 200, 60, Math.PI, 0); x.lineTo(wx + 120, 520); x.fill(); glow(x, wx + 60, 300, 180, 'rgba(110,130,210,A)', 0.08); }
      // long table in perspective
      const tg = x.createLinearGradient(0, 560, 0, VH);
      tg.addColorStop(0, '#5c564c'); tg.addColorStop(1, '#2a2622');
      x.fillStyle = tg;
      x.beginPath(); x.moveTo(880, 560); x.lineTo(1040, 560); x.lineTo(1700, VH); x.lineTo(220, VH); x.fill();
      x.fillStyle = 'rgba(80,30,20,.25)'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(600 + rnd() * 720, 700 + rnd() * 340, 20 + rnd() * 40, 8 + rnd() * 10, 0, 0, Math.PI * 2); x.fill(); }
      // collapsed cake
      x.fillStyle = '#9a9488';
      x.beginPath(); x.moveTo(900, 640); x.lineTo(1020, 640); x.lineTo(1000, 600); x.lineTo(930, 606); x.fill();
      x.beginPath(); x.moveTo(920, 606); x.lineTo(990, 600); x.lineTo(975, 570); x.lineTo(948, 576); x.fill();
      x.fillStyle = '#6a645a'; x.beginPath(); x.ellipse(962, 565, 18, 8, 0.4, 0, Math.PI * 2); x.fill();
    },
    init(st, rnd) {
      st.guests = [];
      for (let i = 0; i < 7; i++) {
        const f = i / 6.5;
        const yb = lerp(600, 1060, f * f * 0.9 + f * 0.1);
        const sc = lerp(0.35, 1.3, f);
        st.guests.push({ x: lerp(860, 200, f), y: yb, s: sc, tilt: (rnd() - 0.5) * 0.5, side: -1, ph: rnd() * 6 });
        st.guests.push({ x: lerp(1060, 1720, f), y: yb, s: sc, tilt: (rnd() - 0.5) * 0.5, side: 1, ph: rnd() * 6 });
      }
      st.candles = [];
      for (let i = 0; i < 6; i++) { const f = (i + 0.5) / 6; st.candles.push({ x: 960, y: lerp(600, 1000, f * f), s: lerp(3, 9, f) }); }
      st.riseT = null;
    },
    frame(x, t, st, dt, params) {
      if (params.rise && st.riseT == null) st.riseT = t;
      if (!params.rise) st.riseT = null;
      const rise = st.riseT == null ? 0 : Math.min(1, (t - st.riseT) / 2.4);
      for (const c of st.candles) { x.fillStyle = '#d8ccb4'; x.fillRect(c.x - c.s * 0.5, c.y - c.s * 4, c.s, c.s * 4); flame(x, c.x, c.y - c.s * 4, c.s * 0.8, t, c.y); }
      // the dead guests (slumped → rising)
      for (const gst of st.guests) {
        const up = rise * 90 * gst.s;
        x.save(); x.translate(gst.x, gst.y - up); x.scale(gst.s, gst.s); x.rotate(gst.tilt * (1 - rise) + Math.sin(t * 2 + gst.ph) * 0.02 * rise);
        x.fillStyle = '#050405';
        x.beginPath(); x.moveTo(-60, 40); x.quadraticCurveTo(-58, -50, 0, -60); x.quadraticCurveTo(58, -50, 60, 40); x.fill();
        x.beginPath(); x.ellipse(0, -92, 26, 32, 0, 0, Math.PI * 2); x.fill();
        if (rise > 0.3) { glow(x, -9, -96, 6, 'rgba(255,40,60,A)', rise); glow(x, 9, -96, 6, 'rgba(255,40,60,A)', rise); }
        x.restore();
        // chair back
        x.fillStyle = '#0b0807';
        x.fillRect(gst.x - 70 * gst.s * gst.side * -1 - (gst.side < 0 ? 0 : 14 * gst.s), gst.y - 150 * gst.s, 14 * gst.s, 190 * gst.s);
      }
      const fl = 0.85 + Math.sin(t * 8) * 0.07;
      glow(x, 960, 760, 700, 'rgba(255,150,70,A)', 0.1 * fl);
      if (rise > 0) { x.fillStyle = `rgba(120,0,10,${0.15 * rise * (0.6 + Math.sin(t * 6) * 0.4)})`; x.fillRect(0, 0, VW, VH); }
    },
  },

  garden: {
    build(x, rnd, noise) {
      const sky = x.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, '#03040a'); sky.addColorStop(0.6, '#0f1424'); sky.addColorStop(1, '#0a0d14');
      x.fillStyle = sky; x.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(220,225,255,${rnd() * 0.4})`; x.fillRect(rnd() * VW, rnd() * 450, 1.3, 1.3); }
      glow(x, 360, 160, 300, 'rgba(160,180,230,A)', 0.14);
      x.fillStyle = '#e8e4d8'; x.beginPath(); x.arc(360, 160, 50, 0, Math.PI * 2); x.fill();
      // chapel
      x.fillStyle = '#04050a';
      x.beginPath(); x.moveTo(820, 640); x.lineTo(820, 420); x.lineTo(960, 300); x.lineTo(1100, 420); x.lineTo(1100, 640); x.fill();
      x.fillRect(930, 170, 60, 160); x.beginPath(); x.moveTo(920, 175); x.lineTo(960, 80); x.lineTo(1000, 175); x.fill();
      x.fillRect(957, 40, 6, 50); x.fillRect(945, 55, 30, 6);
      // hedges in perspective
      for (const side of [-1, 1]) {
        x.fillStyle = '#060a07';
        x.beginPath(); x.moveTo(960 + side * 120, 640); x.lineTo(960 + side * 980, 820); x.lineTo(960 + side * 980, 1080); x.lineTo(960 + side * 140, 660); x.fill();
        x.fillStyle = '#0a120c';
        for (let i = 0; i < 160; i++) { const f = rnd(); const hx = 960 + side * lerp(130, 980, f); const hy = lerp(640, 820, f) + rnd() * 30; x.beginPath(); x.arc(hx, hy, lerp(3, 16, f), 0, Math.PI * 2); x.fill(); }
        for (let i = 0; i < 40; i++) { const f = rnd(); const hx = 960 + side * lerp(160, 960, f); const hy = lerp(660, 900, f) + rnd() * 60; x.fillStyle = `rgba(150,10,30,${0.5 + rnd() * 0.4})`; x.beginPath(); x.arc(hx, hy, lerp(1.5, 7, f), 0, Math.PI * 2); x.fill(); }
      }
      // path
      const pg = x.createLinearGradient(0, 640, 0, VH);
      pg.addColorStop(0, '#1a1814'); pg.addColorStop(1, '#2a261e');
      x.fillStyle = pg; x.beginPath(); x.moveTo(930, 640); x.lineTo(990, 640); x.lineTo(1260, VH); x.lineTo(660, VH); x.fill();
      void noise;
    },
    init(st, rnd) {
      st.wisps = Array.from({ length: 9 }, () => ({ x: rnd() * VW, y: 650 + rnd() * 380, p: rnd() * 6, s: 3 + rnd() * 4 }));
      st.hands = Array.from({ length: 6 }, (_, i) => ({ x: 300 + i * 260 + rnd() * 80, y: 1000 + rnd() * 40, p: rnd() * 6 }));
    },
    frame(x, t, st, dt, params) {
      const pulse = 0.7 + Math.sin(t * 1.3) * 0.2;
      x.fillStyle = `rgba(255,170,90,${pulse})`;
      x.beginPath(); x.arc(960, 470, 34, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#04050a'; x.lineWidth = 4;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; x.beginPath(); x.moveTo(960, 470); x.lineTo(960 + Math.cos(a) * 34, 470 + Math.sin(a) * 34); x.stroke(); }
      glow(x, 960, 470, 200, 'rgba(255,150,70,A)', 0.2 * pulse);
      for (const w of st.wisps) {
        const wx = w.x + Math.sin(t * 0.4 + w.p) * 40;
        const wy = w.y + Math.sin(t * 0.9 + w.p) * 16;
        glow(x, wx, wy, w.s * 7, 'rgba(120,200,255,A)', 0.35 + Math.sin(t * 3 + w.p) * 0.15);
      }
      // hands claw up out of the soil when the dead are stirring
      if (params.hands !== false) {
        for (const hd of st.hands) {
          const up = Math.max(0, Math.sin(t * 0.5 + hd.p)) * 60;
          x.save(); x.translate(hd.x, hd.y + 60 - up);
          x.fillStyle = '#28331f';
          x.fillRect(-7, 0, 14, 80);
          for (let f = 0; f < 4; f++) { x.save(); x.rotate((f - 1.5) * 0.25 + Math.sin(t * 4 + hd.p + f) * 0.1); x.fillRect(-2.5, -26, 5, 28); x.restore(); }
          x.restore();
        }
      }
    },
  },

  chapel: {
    build(x, rnd) {
      x.fillStyle = '#07050a'; x.fillRect(0, 0, VW, VH);
      // gothic arches / pillars
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const px = 960 + side * (380 + i * 170);
          const w = 40 + i * 14;
          x.fillStyle = `rgb(${16 + i * 3},${12 + i * 2},${16 + i * 3})`;
          x.fillRect(px - w / 2, 120 - i * 30, w, VH);
          x.strokeStyle = 'rgba(80,60,70,.25)'; x.lineWidth = 2; x.strokeRect(px - w / 2, 120 - i * 30, w, VH);
        }
      }
      // rose window
      const cx = 960; const cy = 300; const R = 210;
      x.fillStyle = '#100a14'; x.beginPath(); x.arc(cx, cy, R + 24, 0, Math.PI * 2); x.fill();
      const pal = ['#8a0f24', '#1d3f8a', '#5a1f7a', '#b8862a', '#1f6a5a', '#a4204a'];
      for (let ring = 0; ring < 3; ring++) {
        const r0 = ring * 70; const r1 = r0 + 70; const segs = 6 + ring * 6;
        for (let s = 0; s < segs; s++) {
          const a0 = (s / segs) * Math.PI * 2; const a1 = ((s + 1) / segs) * Math.PI * 2;
          x.fillStyle = pal[(s + ring * 2) % pal.length];
          x.beginPath(); x.arc(cx, cy, r1, a0, a1); x.arc(cx, cy, r0, a1, a0, true); x.fill();
          x.strokeStyle = '#0a0608'; x.lineWidth = 6; x.stroke();
        }
      }
      x.fillStyle = '#e8c870'; x.beginPath(); x.arc(cx, cy, 26, 0, Math.PI * 2); x.fill();
      // altar + steps
      for (let i = 0; i < 4; i++) { x.fillStyle = `rgb(${30 - i * 4},${24 - i * 3},${28 - i * 4})`; x.fillRect(560 - i * 60, 640 + i * 26, 800 + i * 120, 26); }
      x.fillStyle = '#1e161a'; x.fillRect(780, 560, 360, 80);
      x.fillStyle = '#d8c8a8'; x.fillRect(780, 556, 360, 6);
      // pews
      for (let r = 0; r < 5; r++) {
        const y = 780 + r * r * 9 + r * 26;
        const sc = 0.6 + r * 0.18;
        for (const side of [-1, 1]) { x.fillStyle = '#0d0809'; x.fillRect(960 + side * 70 * sc - (side < 0 ? 520 * sc : 0), y, 520 * sc, 20 * sc + 10); x.fillRect(960 + side * 70 * sc - (side < 0 ? 520 * sc : 0), y - 40 * sc, 520 * sc, 12); }
      }
      void rnd;
    },
    init(st, rnd) { st.motes = Array.from({ length: 90 }, () => ({ x: 700 + rnd() * 600, y: rnd() * VH, v: 3 + rnd() * 6, p: rnd() * 6 })); },
    frame(x, t, st, dt) {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const sh = 0.05 + Math.sin(t * 0.7 + i) * 0.02;
        const g = x.createLinearGradient(960, 300, 960 + (i - 1.5) * 260, 1080);
        g.addColorStop(0, `rgba(${[255, 120, 180, 255][i]},${[60, 140, 90, 200][i]},${[90, 255, 255, 120][i]},${sh * 2})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.beginPath(); x.moveTo(900 + i * 30, 320); x.lineTo(960 + i * 30, 320); x.lineTo(1000 + (i - 1.5) * 300 + 120, 1080); x.lineTo(1000 + (i - 1.5) * 300 - 120, 1080); x.fill();
      }
      x.restore();
      glow(x, 960, 300, 300, 'rgba(255,120,160,A)', 0.12 + Math.sin(t * 0.8) * 0.04);
      for (const cx of [620, 700, 1220, 1300]) { x.fillStyle = '#c9bca2'; x.fillRect(cx - 5, 520, 10, 50); flame(x, cx, 520, 7, t, cx); }
      motes(x, st.motes, t, dt, 'rgba(255,220,240,A)');
    },
  },

  dawn: {
    build(x, rnd) {
      void rnd;
      x.fillStyle = '#000'; x.fillRect(0, 0, VW, VH);
    },
    init(st) { st.t0 = null; },
    frame(x, t, st) {
      if (st.t0 == null) st.t0 = t;
      const k = Math.min(1, (t - st.t0) / 18);
      const sky = x.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, `rgb(${lerp(10, 70, k)},${lerp(14, 90, k)},${lerp(34, 150, k)})`);
      sky.addColorStop(0.6, `rgb(${lerp(40, 250, k)},${lerp(30, 150, k)},${lerp(50, 110, k)})`);
      sky.addColorStop(1, `rgb(${lerp(60, 255, k)},${lerp(40, 200, k)},${lerp(40, 140, k)})`);
      x.fillStyle = sky; x.fillRect(0, 0, VW, VH);
      const sy = lerp(900, 640, k);
      glow(x, 1300, sy, 520, 'rgba(255,200,120,A)', 0.5 * k + 0.1);
      x.fillStyle = `rgba(255,236,190,${0.6 + k * 0.4})`; x.beginPath(); x.arc(1300, sy, 70, 0, Math.PI * 2); x.fill();
      // the manor — just a house again, its tower broken
      x.fillStyle = '#120d12';
      const M = (pts) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fill(); };
      M([700, 880, 700, 760, 735, 725, 770, 760, 770, 780, 900, 780, 900, 680, 922, 664, 940, 690, 958, 650, 975, 676, 992, 640, 1020, 690, 1020, 780, 1150, 780, 1150, 755, 1185, 715, 1220, 755, 1220, 880]);
      for (const [wx, wy] of [[800, 810], [840, 810], [1080, 810], [1120, 810], [950, 720]]) { x.fillStyle = `rgba(255,200,120,${0.15 + k * 0.25})`; x.fillRect(wx, wy, 10, 20); }
      x.fillStyle = '#120d12';
      x.fillRect(0, 870, VW, 210);
      // birds
      x.strokeStyle = '#120d12'; x.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        const bx = ((t * 40 + i * 140) % (VW + 400)) - 200;
        const by = 300 + Math.sin(i * 2.3) * 80 + Math.sin(t * 2 + i) * 6;
        const w = Math.sin(t * 8 + i) * 6;
        x.beginPath(); x.moveTo(bx - 12, by - w); x.quadraticCurveTo(bx - 4, by - 6, bx, by); x.quadraticCurveTo(bx + 4, by - 6, bx + 12, by - w); x.stroke();
      }
    },
  },
};
SCENES.lobby = SCENES.manor;

function star(x, cx, cy, r) {
  x.beginPath();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.fill();
}
function rain(x, drops, dt, alpha) {
  x.strokeStyle = `rgba(170,190,230,${alpha})`; x.lineWidth = 1.2;
  x.beginPath();
  for (const d of drops) {
    d.y += d.s * dt; d.x -= d.s * 0.18 * dt;
    if (d.y > VH) { d.y = -20; d.x = Math.random() * (VW + 200); }
    x.moveTo(d.x, d.y); x.lineTo(d.x + d.l * 0.18, d.y - d.l);
  }
  x.stroke();
}
function motes(x, list, t, dt, color) {
  for (const m of list) {
    m.y -= m.v * dt; m.x += Math.sin(t * 0.5 + m.p) * 6 * dt;
    if (m.y < 0) m.y = VH;
    const a = 0.25 + Math.sin(t * 2 + m.p) * 0.2;
    x.fillStyle = color.replace('A', String(Math.max(0, a)));
    x.fillRect(m.x, m.y, 2, 2);
  }
}

// ---------------------------------------------------------------- fog / lightning / grain
class Fog {
  constructor(rnd) {
    const [c, x] = layer(512, 512);
    const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    this.sprite = c;
    this.puffs = Array.from({ length: 16 }, () => ({ x: rnd() * VW, y: 620 + rnd() * 520, s: 500 + rnd() * 600, v: 12 + rnd() * 24, a: 0.08 + rnd() * 0.1 }));
  }
  draw(x, dt, tint = 'rgba(160,175,210,1)', density = 1) {
    if (density <= 0) return;
    x.save();
    x.globalCompositeOperation = 'screen';
    for (const p of this.puffs) {
      p.x += p.v * dt;
      if (p.x - p.s / 2 > VW) p.x = -p.s / 2;
      x.globalAlpha = p.a * density;
      x.drawImage(this.sprite, p.x - p.s / 2, p.y - p.s * 0.25, p.s, p.s * 0.5);
    }
    x.restore();
    void tint;
  }
}

export class Backdrop {
  constructor() {
    this.cache = new Map();
    this.name = null;
    this.state = null;
    this.params = {};
    this.fog = new Fog(seeded(99));
    this.flash = 0;
    this.bolt = null;
    this.nextLightning = 6;
    this.onThunder = null;
    this.fade = 1;
  }
  setScene(name, params = {}) {
    this.params = params;
    if (this.name === name) return;
    const S = SCENES[name];
    if (!S) return;
    this.prev = this.name ? { canvas: this.cache.get(this.name), state: this.state, name: this.name } : null;
    this.name = name;
    this.fade = 0;
    if (!this.cache.has(name)) {
      const [c, x] = layer();
      const rnd = seeded(name.length * 977 + 13);
      S.build(x, rnd, createNoise2D(rnd));
      this.cache.set(name, c);
    }
    this.state = {};
    const rnd = seeded(name.length * 31 + 7);
    S.init?.(this.state, rnd, createNoise2D(rnd));
  }
  lightning() {
    this.flash = 1;
    const pts = [[600 + Math.random() * 800, 0]];
    while (pts[pts.length - 1][1] < 700) { const [px, py] = pts[pts.length - 1]; pts.push([px + (Math.random() - 0.5) * 120, py + 40 + Math.random() * 60]); }
    this.bolt = { pts, life: 0.35 };
    this.onThunder?.();
  }
  draw(x, t, dt) {
    const S = SCENES[this.name];
    if (!S) { x.fillStyle = '#000'; x.fillRect(0, 0, VW, VH); return; }
    x.drawImage(this.cache.get(this.name), 0, 0);
    S.frame(x, t, this.state, dt, this.params);
    const outdoor = this.name === 'manor' || this.name === 'lobby' || this.name === 'garden';
    this.fog.draw(x, dt, undefined, this.name === 'dawn' ? 0.4 : outdoor ? 1.1 : 0.55);
    if (outdoor) {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) { this.lightning(); this.nextLightning = 12 + Math.random() * 16; }
    }
    if (this.bolt) {
      this.bolt.life -= dt;
      x.strokeStyle = `rgba(230,240,255,${Math.max(0, this.bolt.life * 3)})`; x.lineWidth = 3;
      x.beginPath(); this.bolt.pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
      if (this.bolt.life <= 0) this.bolt = null;
    }
    if (this.flash > 0) {
      x.fillStyle = `rgba(200,215,255,${this.flash * 0.45})`; x.fillRect(0, 0, VW, VH);
      this.flash = Math.max(0, this.flash - dt * 2.8);
    }
    // cross-fade from the previous scene
    if (this.fade < 1) {
      this.fade = Math.min(1, this.fade + dt / 1.2);
      x.fillStyle = `rgba(0,0,0,${1 - this.fade})`; x.fillRect(0, 0, VW, VH);
    }
  }
}
