// Procedurally painted, animated Rajasthani environments for every chapter (haveli, courtyard, pothi khana, zenana, shamiana, baagh, mandap). Logical canvas: 1920×1080.
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
// ---- Rajasthani architecture helpers ----
function pointedArch(x, cx, top, w, h) {
  x.beginPath();
  x.moveTo(cx - w / 2, top + h);
  x.lineTo(cx - w / 2, top + h * 0.42);
  x.quadraticCurveTo(cx - w / 2, top + h * 0.08, cx, top);
  x.quadraticCurveTo(cx + w / 2, top + h * 0.08, cx + w / 2, top + h * 0.42);
  x.lineTo(cx + w / 2, top + h);
  x.closePath();
}
function chhatri(x, cx, baseY, w, h) {
  // platform, slim pillars, an onion dome and a finial
  x.fillRect(cx - w * 0.6, baseY - h * 0.08, w * 1.2, h * 0.08);
  for (const f of [-0.42, -0.14, 0.14, 0.42]) x.fillRect(cx + f * w - w * 0.04, baseY - h * 0.5, w * 0.08, h * 0.44);
  x.fillRect(cx - w * 0.62, baseY - h * 0.56, w * 1.24, h * 0.07);
  x.beginPath();
  x.moveTo(cx - w * 0.5, baseY - h * 0.56);
  x.bezierCurveTo(cx - w * 0.6, baseY - h * 0.95, cx - w * 0.05, baseY - h * 0.92, cx, baseY - h * 1.05);
  x.bezierCurveTo(cx + w * 0.05, baseY - h * 0.92, cx + w * 0.6, baseY - h * 0.95, cx + w * 0.5, baseY - h * 0.56);
  x.fill();
  x.fillRect(cx - 2, baseY - h * 1.18, 4, h * 0.14);
}
function jharokha(x, cx, y, w, h) {
  // a projecting balcony window with a small dome on top
  x.fillRect(cx - w * 0.62, y + h, w * 1.24, h * 0.12);
  x.beginPath(); x.moveTo(cx - w * 0.55, y + h * 1.12); x.lineTo(cx, y + h * 1.4); x.lineTo(cx + w * 0.55, y + h * 1.12); x.fill();
  x.fillRect(cx - w * 0.6, y - h * 0.08, w * 1.2, h * 0.1);
  x.beginPath(); x.ellipse(cx, y - h * 0.08, w * 0.55, h * 0.36, 0, Math.PI, 0); x.fill();
}
function toran(x, x0, x1, y, sag, t, phase = 0) {
  const n = Math.max(8, Math.round((x1 - x0) / 16));
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const px = x0 + (x1 - x0) * f;
    const py = y + Math.sin(f * Math.PI) * sag + Math.sin(t * 1.4 + phase + f * 3) * 2;
    x.fillStyle = i % 2 ? '#f39c12' : '#ffc93c';
    x.beginPath(); x.arc(px, py, 7, 0, Math.PI * 2); x.fill();
    if (i % 3 === 0) { x.fillStyle = '#2f6b2a'; x.beginPath(); x.ellipse(px, py + 14, 4, 9, 0, 0, Math.PI * 2); x.fill(); }
  }
}
function lantern(x, cx, cy, t, seed, scale = 1) {
  const sw = Math.sin(t * 1.1 + seed) * 0.06;
  x.save(); x.translate(cx, 0); x.rotate(sw);
  x.strokeStyle = '#1a120c'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, cy - 30 * scale); x.stroke();
  const f = 0.8 + Math.sin(t * 9 + seed) * 0.08 + Math.sin(t * 23 + seed) * 0.05;
  glow(x, 0, cy, 120 * scale * f, 'rgba(255,160,70,A)', 0.22);
  x.fillStyle = '#3a2412'; x.fillRect(-14 * scale, cy - 30 * scale, 28 * scale, 6 * scale);
  x.fillStyle = `rgba(255,${170 + f * 40},90,${0.75 * f})`;
  x.beginPath(); x.moveTo(-12 * scale, cy - 24 * scale); x.lineTo(12 * scale, cy - 24 * scale); x.lineTo(16 * scale, cy + 14 * scale); x.lineTo(-16 * scale, cy + 14 * scale); x.fill();
  x.strokeStyle = '#3a2412'; x.lineWidth = 2;
  for (const lx of [-6, 0, 6]) { x.beginPath(); x.moveTo(lx * scale, cy - 24 * scale); x.lineTo(lx * 1.3 * scale, cy + 14 * scale); x.stroke(); }
  x.fillStyle = '#3a2412'; x.fillRect(-18 * scale, cy + 14 * scale, 36 * scale, 6 * scale);
  x.restore();
}
function diyaAt(x, cx, cy, s, t, seed) {
  x.fillStyle = '#7a3a18';
  x.beginPath(); x.ellipse(cx, cy, s * 1.6, s * 0.6, 0, 0, Math.PI); x.fill();
  flame(x, cx, cy - s * 0.2, s * 0.7, t, seed);
}
function haveliSilhouette(x, ox, oy, sc, color) {
  x.save(); x.translate(ox, oy); x.scale(sc, sc);
  x.fillStyle = color;
  x.fillRect(-400, -360, 800, 360); // main block
  x.fillRect(-470, -250, 70, 250); x.fillRect(400, -250, 70, 250); // corner bastions
  chhatri(x, -435, -250, 70, 110); chhatri(x, 435, -250, 70, 110);
  x.fillRect(-120, -470, 240, 120); // central upper storey
  chhatri(x, 0, -470, 150, 190);
  chhatri(x, -260, -360, 60, 90); chhatri(x, 260, -360, 60, 90);
  for (let i = -6; i <= 6; i++) x.fillRect(i * 60 - 8, -372, 16, 14); // crenellations
  for (const jx of [-300, -180, 180, 300]) jharokha(x, jx, -260, 54, 60);
  x.restore();
}

const SCENES = {
  manor: {
    build(x, rnd, noise) {
      const sky = x.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, '#04030b'); sky.addColorStop(0.55, '#170f24'); sky.addColorStop(1, '#2b1824');
      x.fillStyle = sky; x.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 220; i++) { x.fillStyle = `rgba(255,240,220,${rnd() * 0.6})`; x.fillRect(rnd() * VW, rnd() * 560, 1.4, 1.4); }
      glow(x, 1480, 230, 460, 'rgba(240,200,150,A)', 0.16);
      const mg = x.createRadialGradient(1460, 210, 10, 1480, 230, 104);
      mg.addColorStop(0, '#fbf3df'); mg.addColorStop(1, '#d9c7a5');
      x.fillStyle = mg; x.beginPath(); x.arc(1480, 230, 100, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(150,130,100,.22)';
      for (const [cx, cy, r] of [[1450, 200, 18], [1510, 262, 24], [1500, 190, 9], [1440, 258, 11]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
      // dunes
      for (const [y0, col, amp] of [[760, '#1a1018', 40], [820, '#130b12', 30]]) {
        x.fillStyle = col; x.beginPath(); x.moveTo(0, y0);
        for (let i = 0; i <= 24; i++) x.lineTo((i / 24) * VW, y0 + Math.sin(i * 0.9) * amp * 0.5 + noise(i / 4, y0) * amp);
        x.lineTo(VW, VH); x.lineTo(0, VH); x.fill();
      }
      // fort walls with round bastions
      x.fillStyle = '#07050a';
      x.fillRect(0, 780, VW, 120);
      for (const bx of [120, 380, 1540, 1800]) { x.beginPath(); x.arc(bx, 790, 60, Math.PI, 0); x.fill(); x.fillRect(bx - 60, 790, 120, 110); }
      for (let i = 0; i < 64; i++) x.fillRect(i * 30, 768, 16, 14);
      haveliSilhouette(x, 960, 880, 1, '#07050a');
      // the great gate
      x.fillStyle = '#1a0d08'; pointedArch(x, 960, 700, 130, 180); x.fill();
      // ground + khejri trees
      x.fillStyle = '#040306'; x.fillRect(0, 880, VW, 200);
      x.strokeStyle = '#030204'; x.lineCap = 'round';
      tree(x, rnd, 150, 1000, 140, -Math.PI / 2 - 0.12, 8, 22);
      tree(x, rnd, 1790, 1000, 150, -Math.PI / 2 + 0.15, 8, 24);
    },
    init(st, rnd, noise) {
      st.clouds = cloudStrip(noise, 1024, 220, [70, 50, 80]);
      st.windows = [];
      for (const [x0, y0, cols, rows] of [[620, 600, 4, 3], [1140, 600, 4, 3], [880, 440, 4, 1]]) {
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) st.windows.push({ x: x0 + c * 46, y: y0 + r * 70, lit: rnd() < 0.45, ph: rnd() * 10 });
      }
      st.ghoonghatWin = st.windows.find((w) => w.y < 500) || st.windows[0];
      st.dust = Array.from({ length: 160 }, () => ({ x: rnd() * VW, y: 560 + rnd() * 520, v: 40 + rnd() * 80, s: 1 + rnd() * 2 }));
      st.bats = Array.from({ length: 6 }, (_, i) => ({ x: rnd() * VW, y: 120 + rnd() * 260, v: 60 + rnd() * 60, p: i }));
    },
    frame(x, t, st, dt) {
      const off = (t * 10) % 1024;
      x.globalAlpha = 0.6;
      for (let i = -1; i < 3; i++) x.drawImage(st.clouds, i * 1024 - off, 120, 1024, 240);
      x.globalAlpha = 1;
      // the gate glows from within
      const gf = 0.6 + Math.sin(t * 3) * 0.1 + Math.sin(t * 11) * 0.05;
      glow(x, 960, 820, 180, 'rgba(255,140,60,A)', 0.35 * gf);
      for (const w of st.windows) {
        const isG = w === st.ghoonghatWin;
        if (!w.lit && !isG) continue;
        const f = 0.65 + Math.sin(t * 7 + w.ph) * 0.12 + Math.sin(t * 17 + w.ph) * 0.08;
        x.fillStyle = `rgba(255,160,70,${f})`;
        pointedArch(x, w.x + 8, w.y, 16, 30); x.fill();
        glow(x, w.x + 8, w.y + 15, 30, 'rgba(255,150,60,A)', 0.2 * f);
      }
      // a figure in a red ghoonghat appears in the upper window now and then
      const cyc = t % 23;
      if (cyc > 17 && cyc < 20) {
        const w = st.ghoonghatWin;
        x.fillStyle = '#ffe6c8'; pointedArch(x, w.x + 8, w.y, 16, 30); x.fill();
        x.fillStyle = '#8a0618'; x.beginPath(); x.ellipse(w.x + 8, w.y + 12, 5, 7, 0, 0, Math.PI * 2); x.fill(); x.fillRect(w.x + 3, w.y + 16, 10, 14);
      }
      // bats across the moon
      x.fillStyle = '#05040a';
      for (const b of st.bats) {
        b.x += b.v * dt; if (b.x > VW + 40) { b.x = -40; b.y = 100 + Math.random() * 300; }
        const fl = Math.sin(t * 14 + b.p) * 7;
        x.beginPath(); x.moveTo(b.x - 14, b.y - fl); x.quadraticCurveTo(b.x - 6, b.y - 2, b.x, b.y + 2); x.quadraticCurveTo(b.x + 6, b.y - 2, b.x + 14, b.y - fl); x.lineTo(b.x, b.y + 5); x.fill();
      }
      // drifting desert dust
      x.fillStyle = 'rgba(230,190,140,.18)';
      for (const d of st.dust) { d.x += d.v * dt; if (d.x > VW) d.x = -10; x.fillRect(d.x, d.y + Math.sin(t + d.x * 0.01) * 4, d.s * 3, d.s); }
    },
  },

  foyer: {
    build(x) {
      const wall = x.createLinearGradient(0, 0, 0, VH);
      wall.addColorStop(0, '#120a08'); wall.addColorStop(0.65, '#2a1810'); wall.addColorStop(1, '#100806');
      x.fillStyle = wall; x.fillRect(0, 0, VW, VH);
      // upper storey with jaali screens
      x.fillStyle = '#1b100b'; x.fillRect(0, 120, VW, 180);
      for (let i = 0; i < 12; i++) {
        const cx = 80 + i * 160;
        x.fillStyle = '#0c0705'; pointedArch(x, cx, 140, 110, 140); x.fill();
        x.strokeStyle = 'rgba(160,110,60,.28)'; x.lineWidth = 2;
        for (let gx = -40; gx <= 40; gx += 14) for (let gy = 180; gy < 280; gy += 14) { x.beginPath(); x.arc(cx + gx, gy, 5, 0, Math.PI * 2); x.stroke(); }
      }
      x.fillStyle = '#2a1a10'; x.fillRect(0, 300, VW, 18);
      // arcade of cusped arches
      for (let i = 0; i < 7; i++) {
        const cx = 140 + i * 273;
        x.fillStyle = '#080403'; pointedArch(x, cx, 380, 200, 460); x.fill();
        x.strokeStyle = 'rgba(200,140,80,.25)'; x.lineWidth = 6; pointedArch(x, cx, 380, 214, 468); x.stroke();
        x.fillStyle = '#2a1a10'; x.fillRect(cx + 120, 360, 32, 500);
      }
      // the great studded door in the middle arch
      x.fillStyle = '#2a140a'; pointedArch(x, 959, 420, 176, 420); x.fill();
      x.fillStyle = '#c99a4a';
      for (let r = 0; r < 9; r++) for (let c = 0; c < 5; c++) { x.beginPath(); x.arc(895 + c * 32, 520 + r * 36, 4, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = '#100604'; x.fillRect(957, 430, 4, 410);
      // courtyard floor
      x.fillStyle = '#0d0706'; x.fillRect(0, 860, VW, 220);
      x.strokeStyle = 'rgba(140,100,70,.14)'; x.lineWidth = 2;
      for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(960 + i * 70, 860); x.lineTo(960 + i * 220, 1080); x.stroke(); }
      for (let r = 0; r < 5; r++) { const y = 860 + r * r * 9 + r * 14; x.beginPath(); x.moveTo(0, y); x.lineTo(VW, y); x.stroke(); }
    },
    init(st, rnd) { st.motes = Array.from({ length: 70 }, () => ({ x: rnd() * VW, y: rnd() * VH, v: 4 + rnd() * 10, p: rnd() * 6 })); },
    frame(x, t, st, dt, params) {
      // marigold torans over the arches
      for (let i = 0; i < 7; i++) { const cx = 140 + i * 273; toran(x, cx - 105, cx + 105, 372, 34, t, i); }
      for (const [lx, ly, s] of [[420, 240, 1.2], [960, 260, 1.5], [1500, 240, 1.2]]) lantern(x, lx, ly, t, lx, s);
      // diyas along the floor edge
      for (let i = 0; i < 18; i++) diyaAt(x, 70 + i * 104, 905, 9, t, i * 1.7);
      // a ghoonghat in the upper jaali, now and then
      if (t % 19 > 16.8) { x.fillStyle = 'rgba(150,10,25,.85)'; x.beginPath(); x.ellipse(1520, 210, 14, 18, 0, 0, Math.PI * 2); x.fill(); x.fillRect(1506, 222, 28, 44); glow(x, 1515, 206, 5, 'rgba(255,40,60,A)', 1); glow(x, 1527, 206, 5, 'rgba(255,40,60,A)', 1); }
      // the tantrik rangoli on the floor
      const g = params.circleGlow ?? 0.25;
      x.save(); x.translate(960, 985); x.scale(1, 0.3);
      const cols = ['#c8102e', '#f39c12', '#ffc93c', '#e0314b'];
      for (let ring = 0; ring < 4; ring++) {
        x.strokeStyle = cols[ring]; x.globalAlpha = 0.25 + g * 0.6; x.lineWidth = 6 - ring;
        x.beginPath(); x.arc(0, 0, 330 - ring * 60, 0, Math.PI * 2); x.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.04;
        x.fillStyle = cols[i % 4];
        x.beginPath(); x.ellipse(Math.cos(a) * 200, Math.sin(a) * 200, 46, 18, a, 0, Math.PI * 2); x.fill();
      }
      x.restore(); x.globalAlpha = 1;
      if (g > 0.3) glow(x, 960, 985, 420, 'rgba(255,60,40,A)', 0.14 * g);
      const fl = 0.8 + Math.sin(t * 9) * 0.06;
      glow(x, 960, 600, 900, 'rgba(255,140,60,A)', 0.08 * fl);
      motes(x, st.motes, t, dt, 'rgba(255,220,170,A)');
    },
  },

  library: {
    build(x, rnd) {
      x.fillStyle = '#0d0806'; x.fillRect(0, 0, VW, VH);
      const cloth = ['#8a1a1a', '#b8862a', '#2a5a2a', '#6a1a4a', '#a0401a', '#1a3a5a'];
      // niches full of cloth-wrapped pothis (manuscripts stacked flat)
      for (const side of [0, 1]) {
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
          const nx = (side ? 1180 : 60) + col * 230;
          const ny = 60 + row * 230;
          x.fillStyle = '#050302'; pointedArch(x, nx + 100, ny, 200, 210); x.fill();
          x.strokeStyle = 'rgba(190,140,80,.2)'; x.lineWidth = 4; pointedArch(x, nx + 100, ny - 4, 210, 218); x.stroke();
          let y = ny + 200;
          while (y > ny + 70) {
            const hgt = 14 + rnd() * 16;
            const w = 120 + rnd() * 50;
            x.fillStyle = cloth[Math.floor(rnd() * cloth.length)];
            x.fillRect(nx + 100 - w / 2 + (rnd() - 0.5) * 10, y - hgt, w, hgt);
            x.fillStyle = 'rgba(240,200,120,.35)'; x.fillRect(nx + 100 - 2, y - hgt, 4, hgt);
            y -= hgt + 2;
          }
        }
      }
      // central jaali window
      x.fillStyle = '#0a1024'; pointedArch(x, 960, 160, 330, 700); x.fill();
      glow(x, 960, 420, 380, 'rgba(140,160,230,A)', 0.14);
      x.strokeStyle = '#120a06'; x.lineWidth = 5;
      for (let gx = 810; gx <= 1110; gx += 30) { x.beginPath(); x.moveTo(gx, 240); x.lineTo(gx, 860); x.stroke(); }
      for (let gy = 260; gy <= 860; gy += 30) { x.beginPath(); x.moveTo(800, gy); x.lineTo(1120, gy); x.stroke(); }
      x.strokeStyle = '#2a1a10'; x.lineWidth = 16; pointedArch(x, 960, 160, 330, 700); x.stroke();
      // low chowki desk with the red-silk diary
      x.fillStyle = '#1a0e08'; x.fillRect(640, 880, 640, 34); x.fillRect(670, 914, 30, 166); x.fillRect(1220, 914, 30, 166);
      x.fillStyle = '#9a0f1f'; x.fillRect(880, 856, 160, 26); x.fillStyle = '#e2b84f'; x.fillRect(880, 866, 160, 4);
      // dhurrie floor stripes
      for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? 'rgba(120,30,20,.25)' : 'rgba(60,40,20,.25)'; x.fillRect(0, 1000 + i * 14, VW, 14); }
    },
    init(st, rnd) {
      st.pages = Array.from({ length: 16 }, () => ({ x: rnd() * VW, y: VH + rnd() * VH, v: 18 + rnd() * 36, r: rnd() * 6, vr: (rnd() - 0.5) * 1.2, s: 0.6 + rnd() * 0.7 }));
      st.motes = Array.from({ length: 70 }, () => ({ x: 780 + rnd() * 360, y: rnd() * VH, v: 3 + rnd() * 8, p: rnd() * 6 }));
    },
    frame(x, t, st, dt) {
      diyaAt(x, 1110, 878, 12, t, 1);
      const fl = 0.8 + Math.sin(t * 11) * 0.08;
      glow(x, 1110, 860, 700, 'rgba(255,140,60,A)', 0.14 * fl);
      // floating palm-leaf manuscript pages
      for (const p of st.pages) {
        p.y -= p.v * dt; p.x += Math.sin(t * 0.8 + p.r) * 18 * dt; p.r += p.vr * dt;
        if (p.y < -60) { p.y = VH + 60; p.x = Math.random() * VW; }
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.scale(p.s, p.s);
        x.fillStyle = 'rgba(214,186,130,.6)'; x.fillRect(-46, -9, 92, 18);
        x.fillStyle = 'rgba(60,30,20,.4)'; for (let i = 0; i < 3; i++) x.fillRect(-38, -5 + i * 5, 76, 1.5);
        x.fillStyle = 'rgba(40,20,10,.6)'; x.beginPath(); x.arc(-26, 0, 2, 0, Math.PI * 2); x.arc(26, 0, 2, 0, Math.PI * 2); x.fill();
        x.restore();
      }
      motes(x, st.motes, t, dt, 'rgba(190,210,255,A)');
    },
  },

  nursery: {
    build(x, rnd) {
      x.fillStyle = '#1e1212'; x.fillRect(0, 0, VW, VH);
      // faded mehendi-pattern wall (paisleys and dots)
      for (let yy = 30; yy < 900; yy += 90) for (let xx = (yy / 90) % 2 ? 45 : 0; xx < VW; xx += 90) {
        x.strokeStyle = 'rgba(160,90,60,.13)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(xx, yy + 18); x.bezierCurveTo(xx - 18, yy, xx, yy - 22, xx + 12, yy - 8); x.bezierCurveTo(xx + 20, yy + 4, xx + 8, yy + 16, xx, yy + 18); x.stroke();
        x.fillStyle = 'rgba(160,90,60,.1)'; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(xx + 30 + k * 6, yy + 30, 1.6, 0, Math.PI * 2); x.fill(); }
      }
      for (let i = 0; i < 6; i++) glow(x, rnd() * VW, rnd() * 700, 60 + rnd() * 120, 'rgba(30,15,5,A)', 0.4);
      // arched jaali window
      x.fillStyle = '#0c1430'; pointedArch(x, 1500, 170, 380, 520); x.fill();
      glow(x, 1560, 320, 70, 'rgba(250,240,220,A)', 0.9);
      x.strokeStyle = '#0d0806'; x.lineWidth = 4;
      for (let gx = 1320; gx <= 1680; gx += 26) for (let gy = 230; gy <= 680; gy += 26) { x.beginPath(); x.moveTo(gx, gy - 13); x.lineTo(gx + 13, gy); x.lineTo(gx, gy + 13); x.lineTo(gx - 13, gy); x.closePath(); x.stroke(); }
      x.lineWidth = 16; pointedArch(x, 1500, 170, 380, 520); x.stroke();
      // the mirror
      x.fillStyle = '#5a4020'; x.beginPath(); x.ellipse(330, 420, 110, 150, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1a2026'; x.beginPath(); x.ellipse(330, 420, 92, 132, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 3; x.beginPath(); x.moveTo(270, 340); x.lineTo(300, 300); x.stroke();
      // floor + gaddi cushions
      x.fillStyle = '#0f0907'; x.fillRect(0, 880, VW, 200);
      for (const [cx, w, c] of [[160, 260, '#6a1020'], [1700, 300, '#7a5a10']]) { x.fillStyle = c; x.beginPath(); x.ellipse(cx, 900, w / 2, 26, 0, 0, Math.PI * 2); x.fill(); }
    },
    init(st, rnd) { st.motes = Array.from({ length: 50 }, () => ({ x: 1200 + rnd() * 500, y: rnd() * VH, v: 2 + rnd() * 6, p: rnd() * 6 })); },
    frame(x, t, st, dt) {
      // jaali moonlight pattern spilling onto the floor
      x.save(); x.globalCompositeOperation = 'lighter';
      const beam = x.createLinearGradient(1500, 300, 900, 1000);
      beam.addColorStop(0, 'rgba(150,170,230,.14)'); beam.addColorStop(1, 'rgba(150,170,230,0)');
      x.fillStyle = beam; x.beginPath(); x.moveTo(1310, 300); x.lineTo(1690, 300); x.lineTo(1250, 1080); x.lineTo(640, 1080); x.fill();
      x.fillStyle = 'rgba(170,190,240,.08)';
      for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) { const px = 820 + i * 52 + j * 30; const py = 940 + j * 32; x.beginPath(); x.moveTo(px, py - 10); x.lineTo(px + 16, py); x.lineTo(px, py + 10); x.lineTo(px - 16, py); x.fill(); }
      x.restore();
      // the jhoola, swinging by itself
      const sw = Math.sin(t * 1.3) * 0.28;
      x.save(); x.translate(900, 0); x.rotate(sw);
      x.strokeStyle = '#2a1a10'; x.lineWidth = 6;
      x.beginPath(); x.moveTo(-120, 0); x.lineTo(-120, 700); x.moveTo(120, 0); x.lineTo(120, 700); x.stroke();
      for (let k = 0; k < 16; k++) { x.fillStyle = k % 2 ? '#f39c12' : '#ffc93c'; x.beginPath(); x.arc(-120, 120 + k * 36, 7, 0, Math.PI * 2); x.arc(120, 120 + k * 36, 7, 0, Math.PI * 2); x.fill(); }
      x.fillStyle = '#3a2412'; x.fillRect(-150, 700, 300, 26);
      x.fillStyle = '#7a0f1f'; x.fillRect(-140, 688, 280, 14);
      x.fillStyle = '#d8a640'; for (let k = 0; k < 9; k++) x.fillRect(-140 + k * 34, 726, 10, 16);
      x.restore();
      // a ghoonghat in the mirror, now and then
      const cyc = t % 21;
      if (cyc > 15 && cyc < 18.5) {
        const a = Math.min(1, (cyc - 15) * 1.5) * Math.min(1, (18.5 - cyc) * 1.5);
        x.globalAlpha = a;
        x.fillStyle = '#8a0618'; x.beginPath(); x.ellipse(330, 400, 40, 52, 0, 0, Math.PI * 2); x.fill(); x.fillRect(290, 430, 80, 110);
        x.fillStyle = '#b6bcae'; x.beginPath(); x.ellipse(330, 410, 22, 28, 0, 0, Math.PI * 2); x.fill();
        glow(x, 322, 404, 5, 'rgba(255,30,50,A)', 1); glow(x, 338, 404, 5, 'rgba(255,30,50,A)', 1);
        x.globalAlpha = 1;
      }
      motes(x, st.motes, t, dt, 'rgba(200,215,255,A)');
    },
  },

  hall: {
    build(x, rnd) {
      x.fillStyle = '#0b0608'; x.fillRect(0, 0, VW, VH);
      // shamiana canopy: striped panels, scalloped edge
      const stripes = ['#7a0f1f', '#b8862a', '#e9dcc0'];
      for (let i = 0; i < 24; i++) {
        x.fillStyle = stripes[i % 3];
        x.globalAlpha = 0.35;
        x.beginPath(); x.moveTo(960, -200); x.lineTo(i * 84, 240); x.lineTo((i + 1) * 84, 240); x.fill();
      }
      x.globalAlpha = 1;
      for (let i = 0; i < 48; i++) { x.fillStyle = i % 2 ? '#7a0f1f' : '#b8862a'; x.beginPath(); x.arc(20 + i * 40, 240, 20, 0, Math.PI); x.fill(); }
      for (const px of [60, 520, 1400, 1860]) { x.fillStyle = '#1a120a'; x.fillRect(px - 8, 240, 16, 840); }
      // long dining rows in perspective with leaf plates
      const tg = x.createLinearGradient(0, 560, 0, VH);
      tg.addColorStop(0, '#5a5248'); tg.addColorStop(1, '#2a2420');
      x.fillStyle = tg;
      x.beginPath(); x.moveTo(880, 560); x.lineTo(1040, 560); x.lineTo(1700, VH); x.lineTo(220, VH); x.fill();
      for (let r = 0; r < 9; r++) {
        const f = (r + 0.5) / 9;
        const y = 570 + (VH - 570) * f * f;
        const half = 80 + 760 * f * f;
        const sc = 0.3 + f * 1.1;
        for (const side of [-1, 1]) {
          const px = 960 + side * half * 0.55;
          x.fillStyle = '#2f5a24'; x.beginPath(); x.ellipse(px, y, 30 * sc, 10 * sc, 0, 0, Math.PI * 2); x.fill();
          x.fillStyle = 'rgba(200,120,40,.6)'; x.beginPath(); x.arc(px - 8 * sc, y - 2 * sc, 5 * sc, 0, Math.PI * 2); x.arc(px + 8 * sc, y, 4 * sc, 0, Math.PI * 2); x.fill();
        }
      }
      x.fillStyle = 'rgba(90,30,20,.25)'; for (let i = 0; i < 14; i++) { x.beginPath(); x.ellipse(600 + rnd() * 720, 700 + rnd() * 340, 20 + rnd() * 40, 8 + rnd() * 10, 0, 0, Math.PI * 2); x.fill(); }
    },
    init(st, rnd) {
      st.guests = [];
      for (let i = 0; i < 7; i++) {
        const f = i / 6.5;
        const yb = lerp(600, 1060, f * f * 0.9 + f * 0.1);
        const sc = lerp(0.35, 1.3, f);
        st.guests.push({ x: lerp(860, 200, f), y: yb, s: sc, tilt: (rnd() - 0.5) * 0.5, ph: rnd() * 6, safa: rnd() < 0.6, pallu: rnd() < 0.3 });
        st.guests.push({ x: lerp(1060, 1720, f), y: yb, s: sc, tilt: (rnd() - 0.5) * 0.5, ph: rnd() * 6, safa: rnd() < 0.6, pallu: rnd() < 0.3 });
      }
      st.lights = Array.from({ length: 3 }, (_, k) => Array.from({ length: 40 }, (_, i) => ({ i, ph: rnd() * 10, col: ['#ffd27a', '#ff6a7a', '#7ad0ff', '#9dff8a'][Math.floor(rnd() * 4)], dead: rnd() < 0.1, k })));
      st.riseT = null;
    },
    frame(x, t, st, dt, params) {
      if (params.rise && st.riseT == null) st.riseT = t;
      if (!params.rise) st.riseT = null;
      const rise = st.riseT == null ? 0 : Math.min(1, (t - st.riseT) / 2.4);
      // fairy lights, flickering and dying
      for (const string of st.lights) {
        for (const l of string) {
          const k = l.k;
          const px = 20 + l.i * 48;
          const py = 280 + k * 46 + Math.sin(l.i / 39 * Math.PI) * 60;
          const on = !l.dead && Math.sin(t * 3 + l.ph) > -0.7 && !(Math.sin(t * 0.7 + k) > 0.97);
          if (on) glow(x, px, py, 12, 'rgba(255,220,150,A)', 0.35);
          x.fillStyle = on ? l.col : '#2a2420';
          x.beginPath(); x.arc(px, py, 3.2, 0, Math.PI * 2); x.fill();
        }
      }
      for (let i = 0; i < 6; i++) { const f = (i + 0.5) / 6; diyaAt(x, 960, lerp(600, 1000, f * f), lerp(5, 12, f), t, i); }
      // the dead baraatis (slumped → rising)
      for (const gst of st.guests) {
        const up = rise * 90 * gst.s;
        x.save(); x.translate(gst.x, gst.y - up); x.scale(gst.s, gst.s); x.rotate(gst.tilt * (1 - rise) + Math.sin(t * 2 + gst.ph) * 0.03 * rise);
        x.fillStyle = '#050304';
        x.beginPath(); x.moveTo(-60, 40); x.quadraticCurveTo(-58, -50, 0, -60); x.quadraticCurveTo(58, -50, 60, 40); x.fill();
        x.beginPath(); x.ellipse(0, -92, 26, 32, 0, 0, Math.PI * 2); x.fill();
        if (gst.safa) { x.fillStyle = '#3a0a10'; x.beginPath(); x.ellipse(0, -112, 34, 20, 0, Math.PI, 0); x.fill(); x.beginPath(); x.moveTo(24, -112); x.quadraticCurveTo(46, -96, 30, -70); x.lineTo(24, -96); x.fill(); }
        if (gst.pallu) { x.fillStyle = 'rgba(120,20,40,.8)'; x.beginPath(); x.moveTo(-30, -120); x.quadraticCurveTo(0, -140, 30, -120); x.lineTo(56, 30); x.lineTo(-56, 30); x.fill(); }
        if (rise > 0.3) { glow(x, -9, -96, 6, 'rgba(255,40,60,A)', rise); glow(x, 9, -96, 6, 'rgba(255,40,60,A)', rise); }
        x.restore();
      }
      const fl = 0.85 + Math.sin(t * 8) * 0.07;
      glow(x, 960, 760, 700, 'rgba(255,140,60,A)', 0.1 * fl);
      if (rise > 0) { x.fillStyle = `rgba(120,0,10,${0.15 * rise * (0.6 + Math.sin(t * 6) * 0.4)})`; x.fillRect(0, 0, VW, VH); }
    },
  },

  garden: {
    build(x, rnd) {
      const sky = x.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, '#04030b'); sky.addColorStop(0.6, '#150f22'); sky.addColorStop(1, '#0d0a10');
      x.fillStyle = sky; x.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,240,220,${rnd() * 0.5})`; x.fillRect(rnd() * VW, rnd() * 460, 1.3, 1.3); }
      glow(x, 360, 160, 300, 'rgba(240,200,150,A)', 0.14);
      x.fillStyle = '#f4ead4'; x.beginPath(); x.arc(360, 160, 52, 0, Math.PI * 2); x.fill();
      // distant haveli and chhatris
      haveliSilhouette(x, 960, 600, 0.55, '#07050c');
      x.fillStyle = '#07050c'; chhatri(x, 300, 640, 90, 140); chhatri(x, 1620, 640, 90, 140);
      // cypress rows
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
        const f = i / 5;
        const cx = 960 + side * lerp(220, 900, f);
        const hgt = lerp(90, 320, f);
        const base = lerp(650, 900, f);
        x.fillStyle = '#060a07'; x.beginPath(); x.moveTo(cx, base - hgt); x.quadraticCurveTo(cx + hgt * 0.16, base - hgt * 0.4, cx, base); x.quadraticCurveTo(cx - hgt * 0.16, base - hgt * 0.4, cx, base - hgt); x.fill();
      }
      // char-bagh path with a water channel
      const pg = x.createLinearGradient(0, 640, 0, VH);
      pg.addColorStop(0, '#1e1812'); pg.addColorStop(1, '#2e261c');
      x.fillStyle = pg; x.beginPath(); x.moveTo(900, 640); x.lineTo(1020, 640); x.lineTo(1400, VH); x.lineTo(520, VH); x.fill();
      x.fillStyle = '#16243a'; x.beginPath(); x.moveTo(950, 640); x.lineTo(970, 640); x.lineTo(1040, VH); x.lineTo(880, VH); x.fill();
      for (const side of [-1, 1]) for (let i = 0; i < 40; i++) {
        const f = rnd();
        const hx = 960 + side * lerp(80, 760, f) + (rnd() - 0.5) * 60;
        const hy = lerp(660, 1060, f);
        x.fillStyle = rnd() < 0.5 ? '#e08a10' : '#f2b02a'; x.beginPath(); x.arc(hx, hy, lerp(2, 9, f), 0, Math.PI * 2); x.fill();
      }
    },
    init(st, rnd) {
      st.lamps = Array.from({ length: 9 }, () => ({ x: rnd() * VW, y: 300 + rnd() * 300, p: rnd() * 6, v: 6 + rnd() * 10 }));
      st.hands = Array.from({ length: 6 }, (_, i) => ({ x: 280 + i * 270 + rnd() * 80, y: 1000 + rnd() * 40, p: rnd() * 6 }));
    },
    frame(x, t, st, dt, params) {
      // floating sky lanterns
      for (const l of st.lamps) {
        l.y -= l.v * dt; if (l.y < -40) { l.y = 700; l.x = Math.random() * VW; }
        const fx = l.x + Math.sin(t * 0.4 + l.p) * 30;
        glow(x, fx, l.y, 26, 'rgba(255,170,80,A)', 0.4);
        x.fillStyle = 'rgba(255,190,110,.85)'; x.beginPath(); x.moveTo(fx - 7, l.y - 10); x.lineTo(fx + 7, l.y - 10); x.lineTo(fx + 5, l.y + 8); x.lineTo(fx - 5, l.y + 8); x.fill();
      }
      // glow from the mandap beyond
      const pulse = 0.7 + Math.sin(t * 1.3) * 0.2;
      glow(x, 960, 540, 220, 'rgba(255,150,60,A)', 0.22 * pulse);
      if (params.hands !== false) {
        for (const hd of st.hands) {
          const up = Math.max(0, Math.sin(t * 0.5 + hd.p)) * 60;
          x.save(); x.translate(hd.x, hd.y + 60 - up);
          x.fillStyle = '#28331f'; x.fillRect(-7, 0, 14, 80);
          x.fillStyle = '#c8102e'; for (let k = 0; k < 4; k++) x.fillRect(-8, 20 + k * 6, 16, 3); // a dead baraati's chooda
          x.fillStyle = '#28331f';
          for (let f = 0; f < 4; f++) { x.save(); x.rotate((f - 1.5) * 0.25 + Math.sin(t * 4 + hd.p + f) * 0.1); x.fillRect(-2.5, -26, 5, 28); x.restore(); }
          x.restore();
        }
      }
    },
  },

  chapel: {
    build(x, rnd) {
      const sky = x.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, '#05040c'); sky.addColorStop(1, '#1a0f14');
      x.fillStyle = sky; x.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 180; i++) { x.fillStyle = `rgba(255,240,220,${rnd() * 0.6})`; x.fillRect(rnd() * VW, rnd() * 600, 1.4, 1.4); }
      // haveli arches behind
      for (let i = 0; i < 9; i++) { x.fillStyle = '#0d0809'; pointedArch(x, 100 + i * 215, 380, 170, 520); x.fill(); }
      x.fillStyle = '#140c0a'; x.fillRect(0, 900, VW, 180);
      // mandap: four pillars, canopy, banana leaves
      for (const px of [560, 760, 1160, 1360]) {
        const g = x.createLinearGradient(px - 18, 0, px + 18, 0);
        g.addColorStop(0, '#5a3a14'); g.addColorStop(0.5, '#c99a4a'); g.addColorStop(1, '#5a3a14');
        x.fillStyle = g; x.fillRect(px - 16, 300, 32, 600);
        x.fillStyle = '#2f6b2a';
        for (const s of [-1, 1]) { x.beginPath(); x.moveTo(px, 880); x.quadraticCurveTo(px + s * 70, 700, px + s * 20, 520); x.quadraticCurveTo(px + s * 30, 700, px, 880); x.fill(); }
      }
      x.fillStyle = '#7a0f1f'; x.beginPath(); x.moveTo(500, 300); x.quadraticCurveTo(960, 120, 1420, 300); x.lineTo(1420, 330); x.lineTo(500, 330); x.fill();
      x.fillStyle = '#d8a640'; x.fillRect(500, 322, 920, 10);
      for (let i = 0; i < 23; i++) { x.fillStyle = i % 2 ? '#7a0f1f' : '#b8862a'; x.beginPath(); x.arc(520 + i * 40, 334, 20, 0, Math.PI); x.fill(); }
      // havan kund
      x.fillStyle = '#5a2a14'; x.beginPath(); x.moveTo(890, 870); x.lineTo(1030, 870); x.lineTo(1010, 910); x.lineTo(910, 910); x.fill();
      x.strokeStyle = '#8a4a24'; x.lineWidth = 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(900 + i * 7, 880 + i * 10); x.lineTo(1020 - i * 7, 880 + i * 10); x.stroke(); }
    },
    init(st, rnd) {
      st.petals = Array.from({ length: 70 }, () => ({ x: rnd() * VW, y: rnd() * VH, v: 20 + rnd() * 40, r: rnd() * 6, c: rnd() < 0.5 ? '#f39c12' : '#ffc93c' }));
      st.sparks = Array.from({ length: 30 }, () => ({ x: 960 + (rnd() - 0.5) * 80, y: 870 - rnd() * 200, v: 30 + rnd() * 50 }));
    },
    frame(x, t, st, dt) {
      for (let i = 0; i < 4; i++) toran(x, 540 + i * 200, 740 + i * 200, 342, 40, t, i);
      for (const px of [560, 760, 1160, 1360]) for (let k = 0; k < 10; k++) { x.fillStyle = k % 2 ? '#f39c12' : '#ffc93c'; x.beginPath(); x.arc(px + Math.sin(k * 1.3 + t) * 4, 360 + k * 46, 8, 0, Math.PI * 2); x.fill(); }
      // the sacred fire glows softly; sparks rise
      const f = 0.8 + Math.sin(t * 7) * 0.1 + Math.sin(t * 19) * 0.06;
      glow(x, 960, 860, 380, 'rgba(255,140,50,A)', 0.3 * f);
      for (let k = 0; k < 5; k++) flame(x, 930 + k * 15, 872, 9 + Math.sin(t * 5 + k) * 2, t, k);
      for (const s of st.sparks) { s.y -= s.v * dt; s.x += Math.sin(t * 3 + s.y) * 10 * dt; if (s.y < 600) { s.y = 870; s.x = 960 + (Math.random() - 0.5) * 80; } x.fillStyle = `rgba(255,200,100,${(s.y - 600) / 270})`; x.fillRect(s.x, s.y, 2, 2); }
      for (const cx of [460, 620, 1300, 1460]) diyaAt(x, cx, 900, 10, t, cx);
      // marigold petals drifting down
      for (const p of st.petals) {
        p.y += p.v * dt; p.x += Math.sin(t + p.r) * 14 * dt; p.r += dt;
        if (p.y > VH) { p.y = -10; p.x = Math.random() * VW; }
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.beginPath(); x.ellipse(0, 0, 5, 2.6, 0, 0, Math.PI * 2); x.fill(); x.restore();
      }
    },
  },

  dawn: {
    build(x) { x.fillStyle = '#000'; x.fillRect(0, 0, VW, VH); },
    init(st) { st.t0 = null; },
    frame(x, t, st) {
      if (st.t0 == null) st.t0 = t;
      const k = Math.min(1, (t - st.t0) / 18);
      const sky = x.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, `rgb(${lerp(10, 80, k)},${lerp(14, 90, k)},${lerp(34, 150, k)})`);
      sky.addColorStop(0.6, `rgb(${lerp(40, 250, k)},${lerp(30, 150, k)},${lerp(50, 90, k)})`);
      sky.addColorStop(1, `rgb(${lerp(60, 255, k)},${lerp(40, 196, k)},${lerp(40, 120, k)})`);
      x.fillStyle = sky; x.fillRect(0, 0, VW, VH);
      const sy = lerp(900, 640, k);
      glow(x, 1320, sy, 520, 'rgba(255,190,110,A)', 0.5 * k + 0.1);
      x.fillStyle = `rgba(255,232,180,${0.6 + k * 0.4})`; x.beginPath(); x.arc(1320, sy, 70, 0, Math.PI * 2); x.fill();
      haveliSilhouette(x, 960, 880, 0.55, '#160e14');
      x.fillStyle = '#160e14'; x.fillRect(0, 870, VW, 210);
      // birds
      x.strokeStyle = '#160e14'; x.lineWidth = 3;
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
