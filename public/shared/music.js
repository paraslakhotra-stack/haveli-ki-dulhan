// Background music: the recorded "Haveli" theme for the big moments (lobby, chapter cards, results, credits),
// and a live, adaptive score for the scenes in between — synthesised tabla (bayan + dayan), santoor
// (Karplus-Strong plucks), a sarangi line with meend glides and sub-bass swells, all locked to a taal.
// Both go into the engine's music bus, so the voice-over ducks them automatically.
import { audio } from './audio.js';

const NOTE = (m) => 440 * 2 ** ((m - 69) / 12);
// Scales as semitone offsets from Sa (root). Marwa: komal re, tivra Ma — restless, perfect for a search.
const BHAIRAVI = [0, 1, 3, 5, 7, 8, 10];
const MARWA = [0, 1, 4, 6, 9, 11];

// Taals as 16-step patterns: 'D' bayan (bass, "dha/ge"), 't' dayan (bright "na/tin"), 'k' muted slap, '.' rest.
const TAAL = {
  keherwa: 'D.t.k.t.D.k.t...',
  hunt: 'D.tkt.D.tkD.t.kt',
  dadra: 'D.t.t.k.t.t.....',
  mandap: 'D.......t.......',
};

const CUES = {
  hunt: { root: 50, scale: MARWA, bpm: 96, taal: 'hunt', santoor: 0.9, sarangi: 0.5, sub: 0.35, density: 0.75, level: 0.7 },
  mandap: { root: 50, scale: BHAIRAVI, bpm: 64, taal: 'mandap', santoor: 0.6, sarangi: 0.8, sub: 0.25, density: 0.35, level: 0.6 },
  story: { root: 50, scale: BHAIRAVI, bpm: 72, taal: 'keherwa', santoor: 0.45, sarangi: 0.4, sub: 0.2, density: 0.3, level: 0.42 },
};

// Karplus–Strong: a burst of noise through a tuned, damped delay line → a struck metal string.
const ksCache = new Map();
function santoorBuffer(midi) {
  const c = audio.ctx;
  const key = midi;
  if (ksCache.has(key)) return ksCache.get(key);
  const sr = c.sampleRate;
  const len = Math.floor(sr * 2.2);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / NOTE(midi)));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  const damp = 0.996;
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % period;
    const v = (ring[idx] + ring[next]) * 0.5 * damp;
    d[i] = ring[idx];
    ring[idx] = v;
    idx = next;
  }
  ksCache.set(key, buf);
  return buf;
}

class Score {
  constructor() { this.cue = null; this.theme = null; this.themeOn = false; }

  // ---------------------------------------------------------------- recorded theme
  ensureTheme() {
    if (this.theme || !audio.ctx) return this.theme;
    const el = new Audio('/audio/theme.mp3');
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    const src = audio.ctx.createMediaElementSource(el);
    const g = audio.ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(g).connect(audio.bus.music);
    this.theme = { el, g };
    return this.theme;
  }
  playTheme(on) {
    if (!audio.ready) return;
    if (on === this.themeOn) return;
    this.themeOn = on;
    const th = this.ensureTheme();
    if (!th) return;
    const t = audio.now;
    if (on) {
      th.el.play().catch(() => {});
      th.g.gain.cancelScheduledValues(t);
      th.g.gain.setTargetAtTime(0.85, t, 1.2);
    } else {
      th.g.gain.cancelScheduledValues(t);
      th.g.gain.setTargetAtTime(0.0001, t, 0.9);
      clearTimeout(this.pauseT);
      this.pauseT = setTimeout(() => { if (!this.themeOn) th.el.pause(); }, 4000);
    }
  }

  // ---------------------------------------------------------------- live score
  play(name) {
    if (!audio.ready) return;
    if (this.cue?.name === name) return;
    this.stop();
    const cfg = CUES[name];
    if (!cfg) return;
    const c = audio.ctx;
    const out = c.createGain();
    out.gain.value = 0.0001;
    out.connect(audio.bus.music);
    out.gain.setTargetAtTime(cfg.level, audio.now, 1.5);
    this.cue = { name, cfg, out, next: audio.now + 0.15, step: 0, phrase: 0, intensity: 0.5 };
    this.cue.timer = setInterval(() => this.schedule(), 40);
  }
  stop() {
    if (!this.cue) return;
    const { out, timer } = this.cue;
    clearInterval(timer);
    out.gain.setTargetAtTime(0.0001, audio.now, 0.8);
    setTimeout(() => out.disconnect(), 4000);
    this.cue = null;
  }
  setIntensity(v) { if (this.cue) this.cue.intensity = Math.max(0, Math.min(1, v)); }
  stinger(kind = 'found') {
    if (!audio.ready) return;
    const t = audio.now + 0.02;
    const root = 62;
    const notes = kind === 'found' ? [0, 4, 7, 12, 16] : kind === 'wrong' ? [0, 1, 6] : [0, 7, 12];
    notes.forEach((n, i) => this.santoor(root + n, t + i * 0.07, 0.5, audio.bus.music));
    if (kind !== 'found') this.bayan(t, 0.9, audio.bus.music);
  }

  schedule() {
    const cu = this.cue;
    if (!cu || !audio.ctx || document.hidden) return;
    const { cfg } = cu;
    const step = 60 / cfg.bpm / 4; // 16th notes
    while (cu.next < audio.now + 0.2) {
      const t = cu.next;
      const s = cu.step % 16;
      const ch = TAAL[cfg.taal][s];
      const k = 0.55 + cu.intensity * 0.45;
      if (ch === 'D') this.bayan(t, 0.75 * k, cu.out);
      if (ch === 't') this.dayan(t, 0.45 * k, cu.out, 1);
      if (ch === 'k') this.dayan(t, 0.25 * k, cu.out, 0);
      // santoor: arpeggiated phrases from the raag, denser with intensity
      if (cfg.santoor && s % 2 === 0 && Math.random() < cfg.density * (0.6 + cu.intensity * 0.6)) {
        const deg = cfg.scale[(cu.phrase + (s >> 1)) % cfg.scale.length];
        const oct = s >= 8 ? 12 : 0;
        this.santoor(cfg.root + 12 + deg + oct, t, 0.22 * cfg.santoor, cu.out);
        if (Math.random() < 0.3) this.santoor(cfg.root + 12 + deg + oct, t + step * 0.5, 0.12 * cfg.santoor, cu.out); // tremolo strike
      }
      if (s === 0) {
        cu.phrase = (cu.phrase + 2 + Math.floor(Math.random() * 3)) % cfg.scale.length;
        // a sub swell under every cycle
        if (cfg.sub) this.sub(cfg.root - 12, t, step * 16, cfg.sub * (0.6 + cu.intensity * 0.5), cu.out);
        // the sarangi sings a slow gliding phrase every other cycle
        if (cfg.sarangi && (cu.step / 16) % 2 === 0) this.sarangi(cfg, t, step * 16, cu.out);
      }
      cu.next += step;
      cu.step++;
    }
  }

  // ---------------------------------------------------------------- instruments
  bayan(t, level, dest) {
    const c = audio.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.25); // the "ge" pitch bend
    const g = c.createGain(); audio.env(g.gain, t, { a: 0.003, d: 0.45, peak: level });
    o.connect(g).connect(dest); o.start(t); o.stop(t + 0.7);
  }
  dayan(t, level, dest, open = 1) {
    const c = audio.ctx;
    const f = open ? 520 : 380;
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.frequency.value = f * 2.7;
    const g = c.createGain(); audio.env(g.gain, t, { a: 0.001, d: open ? 0.18 : 0.05, peak: level });
    const g2 = c.createGain(); audio.env(g2.gain, t, { a: 0.001, d: 0.06, peak: level * 0.4 });
    const n = audio.noiseSrc(); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 2;
    const ng = c.createGain(); audio.env(ng.gain, t, { a: 0.001, d: 0.025, peak: level * 0.5 });
    o.connect(g).connect(dest); o2.connect(g2).connect(dest); n.connect(bp).connect(ng).connect(dest);
    o.start(t); o2.start(t); n.start(t); o.stop(t + 0.4); o2.stop(t + 0.2); n.stop(t + 0.1);
  }
  santoor(midi, t, level, dest) {
    const c = audio.ctx;
    const src = c.createBufferSource(); src.buffer = santoorBuffer(midi);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 180;
    const g = c.createGain(); g.gain.value = level;
    const pan = c.createStereoPanner(); pan.pan.value = ((midi % 12) / 12 - 0.5) * 0.9;
    src.connect(hp).connect(g).connect(pan).connect(dest);
    src.start(t); src.stop(t + 2.2);
  }
  sub(midi, t, dur, level, dest) {
    const c = audio.ctx;
    const o = c.createOscillator(); o.frequency.value = NOTE(midi);
    const g = c.createGain(); audio.env(g.gain, t, { a: dur * 0.4, d: dur * 0.5, peak: level, sus: 0, rel: 0.2 });
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.5);
  }
  // A bowed, nasal line: sawtooth through a formant-ish bandpass, with vibrato and meend between notes.
  sarangi(cfg, t, dur, dest) {
    const c = audio.ctx;
    const degs = [0, 2, 3, 2, 1, 0].map((i) => cfg.scale[(i + Math.floor(Math.random() * 2)) % cfg.scale.length]);
    const o = c.createOscillator(); o.type = 'sawtooth';
    const vib = c.createOscillator(); vib.frequency.value = 5.2; const vg = c.createGain(); vg.gain.value = 6; vib.connect(vg).connect(o.detune);
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 900; f1.Q.value = 3;
    const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2600;
    const g = c.createGain(); audio.env(g.gain, t, { a: dur * 0.15, d: dur * 0.6, peak: 0.07 * cfg.sarangi, sus: 0.4, hold: dur * 0.2, rel: dur * 0.2 });
    const seg = dur / degs.length;
    degs.forEach((d, i) => {
      const f = NOTE(cfg.root + 12 + d);
      if (i === 0) o.frequency.setValueAtTime(f, t);
      else o.frequency.setTargetAtTime(f, t + i * seg, seg * 0.25); // meend: slide into the note
    });
    o.connect(f1).connect(f2).connect(g).connect(dest);
    const send = c.createGain(); send.gain.value = 0.5; g.connect(send).connect(audio.reverb);
    o.start(t); vib.start(t); o.stop(t + dur + 0.6); vib.stop(t + dur + 0.6);
  }
}

export const music = new Score();
