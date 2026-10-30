// Screen-level effects for the TV: jump scares, film grain, screen shake, petals/embers.
import { getPossessed } from '/shared/photos.js';
import { audio } from '/shared/audio.js';

let vesperFace = null;
export function drawVesper(size = 900) {
  if (vesperFace) return vesperFace;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const s = size / 100;
  const bg = x.createRadialGradient(50 * s, 50 * s, 5 * s, 50 * s, 50 * s, 60 * s);
  bg.addColorStop(0, '#2a2f2a'); bg.addColorStop(1, '#000');
  x.fillStyle = bg; x.fillRect(0, 0, size, size);
  // hair
  x.fillStyle = '#050505';
  x.beginPath(); x.ellipse(50 * s, 46 * s, 38 * s, 48 * s, 0, 0, Math.PI * 2); x.fill();
  // face
  const fg = x.createRadialGradient(48 * s, 44 * s, 4 * s, 50 * s, 52 * s, 32 * s);
  fg.addColorStop(0, '#e9eee4'); fg.addColorStop(0.7, '#a9b4a4'); fg.addColorStop(1, '#4a5446');
  x.fillStyle = fg; x.beginPath(); x.ellipse(50 * s, 52 * s, 24 * s, 31 * s, 0, 0, Math.PI * 2); x.fill();
  // eyes — black pits with red pinpricks
  for (const ex of [40, 60]) {
    const eg = x.createRadialGradient(ex * s, 46 * s, 0, ex * s, 46 * s, 8 * s);
    eg.addColorStop(0, '#000'); eg.addColorStop(0.7, '#000'); eg.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = eg; x.beginPath(); x.ellipse(ex * s, 46 * s, 8 * s, 9 * s, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ff1a3a'; x.beginPath(); x.arc(ex * s, 46 * s, 1.1 * s, 0, Math.PI * 2); x.fill();
  }
  // mouth — stretched open
  x.fillStyle = '#060000';
  x.beginPath(); x.ellipse(50 * s, 70 * s, 7 * s, 11 * s, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(60,0,10,.8)'; x.lineWidth = 0.6 * s;
  for (let i = 0; i < 14; i++) { x.beginPath(); const vx = (30 + Math.random() * 40) * s; x.moveTo(vx, 80 * s); x.quadraticCurveTo(vx + (Math.random() - 0.5) * 8 * s, 66 * s, vx + (Math.random() - 0.5) * 12 * s, 56 * s); x.stroke(); }
  // veil
  x.fillStyle = 'rgba(230,235,240,.16)';
  x.beginPath(); x.moveTo(18 * s, 100 * s); x.quadraticCurveTo(20 * s, 10 * s, 50 * s, 6 * s); x.quadraticCurveTo(80 * s, 10 * s, 82 * s, 100 * s); x.fill();
  vesperFace = c.toDataURL('image/jpeg', 0.85);
  return vesperFace;
}

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
    const src = (pid && getPossessed(pid)) || drawVesper();
    this.scareEl.style.backgroundImage = `url(${src})`;
    this.scareEl.classList.remove('on');
    void this.scareEl.offsetWidth;
    this.scareEl.classList.add('on');
    audio.stinger(level);
    audio.scream(0.6 * level);
    this.shake();
  }
}
