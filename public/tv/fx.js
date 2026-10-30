// Screen-level effects for the TV: jump scares, film grain, screen shake, petals/embers.
import { getPossessed } from '/shared/photos.js';
import { audio } from '/shared/audio.js';

let chudailFace = null;
// The Chudail Dulhan: a pale face under a blood-red ghoonghat, sindoor in the parting, hollow eyes with red pinpricks.
export function drawChudail(size = 900) {
  if (chudailFace) return chudailFace;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const s = size / 100;
  const bg = x.createRadialGradient(50 * s, 50 * s, 5 * s, 50 * s, 50 * s, 60 * s);
  bg.addColorStop(0, '#2a1012'); bg.addColorStop(1, '#000');
  x.fillStyle = bg; x.fillRect(0, 0, size, size);
  // hair
  x.fillStyle = '#050303';
  x.beginPath(); x.ellipse(50 * s, 46 * s, 36 * s, 48 * s, 0, 0, Math.PI * 2); x.fill();
  // face
  const fg = x.createRadialGradient(48 * s, 44 * s, 4 * s, 50 * s, 52 * s, 32 * s);
  fg.addColorStop(0, '#e6e9dd'); fg.addColorStop(0.7, '#a9b29f'); fg.addColorStop(1, '#4a5244');
  x.fillStyle = fg; x.beginPath(); x.ellipse(50 * s, 54 * s, 23 * s, 30 * s, 0, 0, Math.PI * 2); x.fill();
  // sindoor parting + maang tikka
  x.strokeStyle = '#c8102e'; x.lineWidth = 1.6 * s; x.beginPath(); x.moveTo(50 * s, 10 * s); x.lineTo(50 * s, 27 * s); x.stroke();
  x.fillStyle = '#e2b84f'; x.beginPath(); x.arc(50 * s, 30 * s, 2.2 * s, 0, Math.PI * 2); x.fill();
  // eyes
  for (const ex of [40, 60]) {
    const eg = x.createRadialGradient(ex * s, 48 * s, 0, ex * s, 48 * s, 8 * s);
    eg.addColorStop(0, '#000'); eg.addColorStop(0.7, '#000'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = eg; x.beginPath(); x.ellipse(ex * s, 48 * s, 8 * s, 9 * s, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ff1a3a'; x.beginPath(); x.arc(ex * s, 48 * s, 1.1 * s, 0, Math.PI * 2); x.fill();
  }
  // nath (nose ring)
  x.strokeStyle = '#e2b84f'; x.lineWidth = 0.8 * s; x.beginPath(); x.arc(54 * s, 62 * s, 3.4 * s, 0, Math.PI * 2); x.stroke();
  // mouth
  x.fillStyle = '#060000';
  x.beginPath(); x.ellipse(50 * s, 73 * s, 7 * s, 11 * s, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(60,0,10,.8)'; x.lineWidth = 0.6 * s;
  for (let i = 0; i < 14; i++) { x.beginPath(); const vx = (30 + Math.random() * 40) * s; x.moveTo(vx, 84 * s); x.quadraticCurveTo(vx + (Math.random() - 0.5) * 8 * s, 70 * s, vx + (Math.random() - 0.5) * 12 * s, 60 * s); x.stroke(); }
  // red ghoonghat with a gold border
  x.fillStyle = 'rgba(170,10,30,.55)';
  x.beginPath(); x.moveTo(12 * s, 100 * s); x.quadraticCurveTo(14 * s, 4 * s, 50 * s, 2 * s); x.quadraticCurveTo(86 * s, 4 * s, 88 * s, 100 * s);
  x.lineTo(76 * s, 100 * s); x.quadraticCurveTo(74 * s, 22 * s, 50 * s, 18 * s); x.quadraticCurveTo(26 * s, 22 * s, 24 * s, 100 * s); x.closePath(); x.fill();
  x.strokeStyle = '#d8a640'; x.lineWidth = 1.4 * s;
  x.beginPath(); x.moveTo(24 * s, 100 * s); x.quadraticCurveTo(26 * s, 22 * s, 50 * s, 18 * s); x.quadraticCurveTo(74 * s, 22 * s, 76 * s, 100 * s); x.stroke();
  chudailFace = c.toDataURL('image/jpeg', 0.85);
  return chudailFace;
}
export const drawVesper = drawChudail;

export class ScreenFx {
  constructor({ stage, scare, grain }) {
    this.stage = stage;
    this.scareEl = scare;
    this.grain = grain;
    this.gx = grain.getContext('2d');
    this.lastScare = 0;
    this.buildGrain();
  }
  buildGrain() {
    const w = 256;
    this.grain.width = w; this.grain.height = w;
    this.frames = [];
    for (let f = 0; f < 6; f++) {
      const img = this.gx.createImageData(w, w);
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 22; }
      this.frames.push(img);
    }
    this.gf = 0;
  }
  tickGrain() { this.gx.putImageData(this.frames[(this.gf = (this.gf + 1) % this.frames.length)], 0, 0); }
  shake(cls = 'shake') {
    this.stage.classList.remove(cls);
    void this.stage.offsetWidth;
    this.stage.classList.add(cls);
  }
  scare({ pid = null, level = 1 } = {}) {
    const now = performance.now();
    if (now - this.lastScare < 1200) return; // never stack scares
    this.lastScare = now;
    const src = (pid && getPossessed(pid)) || drawChudail();
    this.scareEl.style.backgroundImage = `url(${src})`;
    this.scareEl.classList.remove('on');
    void this.scareEl.offsetWidth;
    this.scareEl.classList.add('on');
    audio.stinger(level);
    audio.scream(0.6 * level);
    this.shake();
  }
}
