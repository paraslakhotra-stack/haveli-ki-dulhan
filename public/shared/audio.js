// NIGHTFALL sound engine — everything is synthesised live with the Web Audio API (no audio files).
// A generated convolution reverb puts every sound in the same cold stone manor.
// Weapon/impact one-shots are built with ZzFX (github.com/KilledByAPixel/ZzFX) and routed through our mix.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Vesper's Lullaby — A minor, music-box register (MIDI notes). The motif recurs all night.
export const LULLABY = [76, 81, 84, 83, 81, 76, 77, 76, 74, 72, 71, 69, 72, 71, 69, 64];
const SIMON_NOTES = [69, 72, 76, 81];

class Engine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.ambience = null;
    this.combat = null;
    this.zz = null;
    this.zzCache = new Map();
    this.lastShot = 0;
    this.voices = 0;
  }

  // Must be called from a user gesture (iOS/Chrome autoplay rules).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;
      this.master.connect(comp).connect(c.destination);
      this.reverb = c.createConvolver();
      this.reverb.buffer = this.impulse(3.6, 2.4);
      this.wet = c.createGain();
      this.wet.gain.value = 0.55;
      this.reverb.connect(this.wet).connect(this.master);
      this.bus = { amb: this.channel(0.8), music: this.channel(0.7), sfx: this.channel(0.9), voice: this.channel(1) };
      this.noise = this.makeNoise(3);
      import('/vendor/zzfx.mjs').then((m) => { this.zz = m.ZZFX; this.zz.sampleRate = c.sampleRate; }).catch(() => {});
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }
  get ready() { return !!this.ctx && this.ctx.state === 'running' && this.enabled; }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  channel(level) {
    const g = this.ctx.createGain();
    g.gain.value = level;
    g.connect(this.master);
    const send = this.ctx.createGain();
    send.gain.value = 0.35;
    g.connect(send).connect(this.reverb);
    g.send = send;
    return g;
  }
  impulse(seconds, decay) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // Early reflections then a dark exponential tail.
        const early = i < c.sampleRate * 0.08 && Math.random() < 0.012 ? 1 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, decay) + early * (Math.random() - 0.5)) * (1 - t * 0.3);
      }
    }
    return buf;
  }
  makeNoise(seconds) {
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  noiseSrc(loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = loop;
    if (loop) s.loopStart = Math.random();
    return s;
  }
  env(param, t, { a = 0.01, d = 0.3, peak = 1, sus = 0, rel = 0.2, hold = 0 }) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + a);
    if (hold > 0) {
      param.setTargetAtTime(Math.max(0.0001, sus * peak), t + a, d / 3);
      param.setTargetAtTime(0.0001, t + a + hold, rel / 3);
      return t + a + hold + rel * 2;
    }
    param.setTargetAtTime(0.0001, t + a, d / 3);
    return t + a + d * 2.2;
  }
  panner(pan = 0, dest = this.bus.sfx) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(dest);
    return p;
  }
  shaper(amount = 30) {
    const ws = this.ctx.createWaveShaper();
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x)); }
    ws.curve = curve;
    return ws;
  }
  stopAt(nodes, t) { for (const n of nodes) { try { n.stop(t); } catch { /* already stopped */ } } }

  // ---------------- one-shots ----------------
  stinger(level = 1) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const out = c.createGain(); out.connect(this.bus.sfx);
    const end = this.env(out.gain, t, { a: 0.015, d: 1.8, peak: 0.32 * level });
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(200, t); hp.frequency.exponentialRampToValueAtTime(1800, t + 1.6);
    hp.connect(out);
    const oscs = [];
    for (const n of [57, 58, 63, 64, 70, 71]) {
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(NOTE(n) * 0.98, t); o.frequency.linearRampToValueAtTime(NOTE(n) * 1.03, t + 1.5);
      o.detune.value = (Math.random() - 0.5) * 30;
      o.connect(hp); o.start(t); oscs.push(o);
    }
    const nz = this.noiseSrc(); const ng = c.createGain(); this.env(ng.gain, t, { a: 0.002, d: 0.25, peak: 0.6 });
    nz.connect(ng).connect(hp); nz.start(t); oscs.push(nz);
    // Sub hit
    const sub = c.createOscillator(); sub.frequency.setValueAtTime(90, t); sub.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const sg = c.createGain(); this.env(sg.gain, t, { a: 0.003, d: 0.7, peak: 0.9 * level }); sub.connect(sg).connect(this.bus.sfx); sub.start(t); oscs.push(sub);
    this.stopAt(oscs, end + 0.1);
  }
  scream(level = 1, pan = 0) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const out = c.createGain(); out.connect(this.panner(pan));
    const end = this.env(out.gain, t, { a: 0.05, d: 1.1, peak: 0.22 * level, sus: 0.6, hold: 0.5, rel: 0.6 });
    const dist = this.shaper(18);
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1100; f1.Q.value = 5;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 2700; f2.Q.value = 6;
    dist.connect(f1).connect(out); dist.connect(f2).connect(out);
    const o = c.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(1250, t + 0.35); o.frequency.exponentialRampToValueAtTime(820, t + 1.4);
    const vib = c.createOscillator(); vib.frequency.value = 7.5; const vg = c.createGain(); vg.gain.value = 40; vib.connect(vg).connect(o.frequency);
    o.connect(dist);
    const nz = this.noiseSrc(); const ng = c.createGain(); ng.gain.value = 0.25; nz.connect(ng).connect(dist);
    o.start(t); vib.start(t); nz.start(t);
    this.stopAt([o, vib, nz], end);
  }
  thunder(level = 1) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const crack = this.noiseSrc(); const cg = c.createGain(); const chp = c.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 1500;
    this.env(cg.gain, t, { a: 0.001, d: 0.12, peak: 0.5 * level }); crack.connect(chp).connect(cg).connect(this.bus.amb); crack.start(t); crack.stop(t + 0.4);
    const rum = this.noiseSrc(); const rg = c.createGain(); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(380, t); lp.frequency.exponentialRampToValueAtTime(70, t + 5);
    const end = this.env(rg.gain, t + 0.05, { a: 0.25, d: 4.5, peak: 1.1 * level });
    rum.connect(lp).connect(rg).connect(this.bus.amb); rum.start(t); rum.stop(end);
  }
  heartbeat(level = 1) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    for (const [dt, amp] of [[0, 1], [0.24, 0.7]]) {
      const o = c.createOscillator(); o.frequency.setValueAtTime(68, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.16);
      const g = c.createGain(); this.env(g.gain, t + dt, { a: 0.008, d: 0.18, peak: 0.9 * amp * level });
      o.connect(g).connect(this.bus.sfx); o.start(t + dt); o.stop(t + dt + 0.5);
    }
  }
  bell(level = 1, base = 98) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const partials = [[0.5, 1, 6], [1, 0.8, 4.5], [1.183, 0.5, 3.5], [1.506, 0.45, 3], [2, 0.35, 2.4], [2.514, 0.25, 2], [2.662, 0.2, 1.7], [3.011, 0.15, 1.4], [4.166, 0.1, 1]];
    const out = c.createGain(); out.gain.value = 0.16 * level; out.connect(this.bus.music);
    for (const [ratio, amp, dec] of partials) {
      const o = c.createOscillator(); o.frequency.value = base * 2 * ratio;
      const g = c.createGain(); this.env(g.gain, t, { a: 0.002, d: dec, peak: amp });
      o.connect(g).connect(out); o.start(t); o.stop(t + dec * 2.5);
    }
    const thunk = this.noiseSrc(); const tg = c.createGain(); const tl = c.createBiquadFilter(); tl.type = 'lowpass'; tl.frequency.value = 900;
    this.env(tg.gain, t, { a: 0.001, d: 0.08, peak: 0.6 }); thunk.connect(tl).connect(tg).connect(out); thunk.start(t); thunk.stop(t + 0.3);
  }
  musicBoxNote(midi, when = 0, level = 1, dest = this.bus.music) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now + when;
    const f = NOTE(midi);
    const out = c.createGain(); out.gain.value = 0.2 * level; out.connect(dest);
    for (const [mult, amp, dec] of [[1, 1, 1.4], [3, 0.18, 0.4], [5.04, 0.06, 0.18], [2, 0.12, 0.6]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * mult; o.detune.value = (Math.random() - 0.5) * 8;
      const g = c.createGain(); this.env(g.gain, t, { a: 0.002, d: dec, peak: amp });
      o.connect(g).connect(out); o.start(t); o.stop(t + dec * 2.5);
    }
    const tick = this.noiseSrc(); const tg = c.createGain(); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
    this.env(tg.gain, t, { a: 0.001, d: 0.01, peak: 0.25 }); tick.connect(hp).connect(tg).connect(out); tick.start(t); tick.stop(t + 0.05);
  }
  lullaby({ notes = LULLABY, tempo = 0.42, level = 1, detune = 0 } = {}) {
    notes.forEach((n, i) => this.musicBoxNote(n + detune, i * tempo * (1 + (i % 4 === 3 ? 0.35 : 0)), level));
  }
  simonNote(i, when = 0) { this.musicBoxNote(SIMON_NOTES[i % 4], when, 1.4, this.bus.sfx); }
  whisper(level = 1, pan = Math.random() * 2 - 1, dur = 1.6) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const src = this.noiseSrc();
    const out = c.createGain(); out.connect(this.panner(pan, this.bus.amb));
    const end = this.env(out.gain, t, { a: 0.2, d: dur, peak: 0.5 * level, sus: 0.8, hold: dur * 0.6, rel: 0.5 });
    const am = c.createGain(); am.gain.value = 0.5;
    const lfo = c.createOscillator(); lfo.frequency.value = 5 + Math.random() * 4; const lg = c.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg).connect(am.gain);
    for (const [f, q] of [[700 + Math.random() * 300, 9], [1600 + Math.random() * 500, 10], [3200, 7]]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      bp.frequency.setTargetAtTime(f * (0.8 + Math.random() * 0.5), t + 0.3, 0.4);
      src.connect(bp).connect(am);
    }
    am.connect(out);
    src.start(t); lfo.start(t);
    this.stopAt([src, lfo], end);
  }
  creak(level = 1, pan = Math.random() * 2 - 1) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const dur = 0.8 + Math.random() * 0.9;
    const o = c.createOscillator(); o.type = 'sawtooth';
    const curve = new Float32Array(32);
    let f = 90 + Math.random() * 60;
    for (let i = 0; i < 32; i++) { f += (Math.random() - 0.45) * 30; curve[i] = Math.max(40, f); }
    o.frequency.setValueCurveAtTime(curve, t, dur);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 3;
    const g = c.createGain(); this.env(g.gain, t, { a: 0.08, d: dur, peak: 0.18 * level, sus: 0.7, hold: dur * 0.7, rel: 0.2 });
    o.connect(bp).connect(g).connect(this.panner(pan, this.bus.amb)); o.start(t); o.stop(t + dur + 0.6);
  }
  knock(level = 1, count = 3) {
    if (!this.ready) return;
    const c = this.ctx;
    for (let i = 0; i < count; i++) {
      const t = this.now + i * 0.32;
      const o = c.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      const g = c.createGain(); this.env(g.gain, t, { a: 0.001, d: 0.1, peak: 0.8 * level });
      o.connect(g).connect(this.bus.amb); o.start(t); o.stop(t + 0.3);
    }
  }
  slam(level = 1) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const o = c.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.4);
    const g = c.createGain(); this.env(g.gain, t, { a: 0.001, d: 0.5, peak: 1.2 * level });
    o.connect(g).connect(this.bus.sfx); o.start(t); o.stop(t + 1.2);
    const n = this.noiseSrc(); const ng = c.createGain(); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
    this.env(ng.gain, t, { a: 0.001, d: 0.25, peak: 0.7 * level }); n.connect(lp).connect(ng).connect(this.bus.sfx); n.start(t); n.stop(t + 0.8);
  }
  glass(level = 1) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    for (let i = 0; i < 9; i++) {
      const o = c.createOscillator(); o.frequency.value = 2200 + Math.random() * 5000;
      const g = c.createGain(); const dt = Math.random() * 0.25;
      this.env(g.gain, t + dt, { a: 0.001, d: 0.3 + Math.random() * 0.6, peak: 0.08 * level });
      o.connect(g).connect(this.panner(Math.random() * 2 - 1)); o.start(t + dt); o.stop(t + dt + 2);
    }
    const n = this.noiseSrc(); const ng = c.createGain(); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    this.env(ng.gain, t, { a: 0.001, d: 0.2, peak: 0.4 * level }); n.connect(hp).connect(ng).connect(this.bus.sfx); n.start(t); n.stop(t + 0.6);
  }
  groan(level = 1, pan = 0, pitch = 1) {
    if (!this.ready || this.voices > 10) return;
    const c = this.ctx; const t = this.now;
    const dur = 0.7 + Math.random() * 0.8;
    const o = c.createOscillator(); o.type = 'sawtooth';
    const f = (78 + Math.random() * 50) * pitch;
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (0.8 + Math.random() * 0.15), t + dur);
    const vib = c.createOscillator(); vib.frequency.value = 4 + Math.random() * 4; const vg = c.createGain(); vg.gain.value = f * 0.04; vib.connect(vg).connect(o.frequency);
    const dist = this.shaper(8);
    const out = c.createGain(); this.env(out.gain, t, { a: 0.12, d: dur, peak: 0.16 * level, sus: 0.8, hold: dur * 0.6, rel: 0.25 });
    for (const [ff, q] of [[480 + Math.random() * 120, 5], [1050 + Math.random() * 200, 7]]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = q; dist.connect(bp).connect(out);
    }
    o.connect(dist); out.connect(this.panner(pan));
    o.start(t); vib.start(t);
    this.voices++;
    this.stopAt([o, vib], t + dur + 0.8);
    setTimeout(() => { this.voices--; }, (dur + 0.8) * 1000);
  }
  roar(level = 1) {
    this.groan(level * 2.2, 0, 0.55);
    this.groan(level * 1.6, -0.3, 0.42);
    this.slam(level * 0.6);
  }
  ring(seconds = 3) {
    if (!this.ready) return;
    const c = this.ctx;
    for (let k = 0; k < Math.ceil(seconds / 1.5); k++) {
      const t = this.now + k * 1.5;
      const g = c.createGain(); g.connect(this.bus.voice);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.setValueAtTime(0.12, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + 0.85);
      for (const f of [440, 480]) { const o = c.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 0.9); }
      const am = c.createOscillator(); am.frequency.value = 20; const ag = c.createGain(); ag.gain.value = 0.06; am.connect(ag).connect(g.gain); am.start(t); am.stop(t + 0.9);
    }
  }
  static(seconds = 1.2, level = 1) {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const n = this.noiseSrc(); const g = c.createGain(); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 0.6;
    const end = this.env(g.gain, t, { a: 0.01, d: seconds, peak: 0.25 * level, sus: 0.9, hold: seconds * 0.8, rel: 0.1 });
    n.connect(bp).connect(g).connect(this.bus.voice); n.start(t); n.stop(end);
  }
  ui(kind = 'tap') {
    if (!this.ready) return;
    const c = this.ctx; const t = this.now;
    const tones = { tap: [[880, 0.05]], ok: [[660, 0.08], [990, 0.12]], good: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]], bad: [[180, 0.25], [150, 0.35]], tick: [[1200, 0.02]], join: [[392, 0.1], [523, 0.1], [784, 0.3]] }[kind] || [[880, 0.05]];
    let dt = 0;
    for (const [f, d] of tones) {
      const o = c.createOscillator(); o.type = kind === 'bad' ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      const g = c.createGain(); this.env(g.gain, t + dt, { a: 0.004, d, peak: kind === 'bad' ? 0.12 : 0.2 });
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
      o.connect(lp).connect(g).connect(this.bus.sfx); o.start(t + dt); o.stop(t + dt + d * 3 + 0.1);
      dt += d * 0.8;
    }
  }

  // ---------------- ZzFX one-shots (weapons, impacts) ----------------
  zzfx(key, params, { level = 1, pan = 0, rate = 1, variants = 3 } = {}) {
    if (!this.ready || !this.zz) return;
    let list = this.zzCache.get(key);
    if (!list) {
      list = [];
      for (let i = 0; i < variants; i++) {
        const samples = this.zz.buildSamples(...params);
        const buf = this.ctx.createBuffer(1, samples.length, this.zz.sampleRate);
        buf.getChannelData(0).set(samples);
        list.push(buf);
      }
      this.zzCache.set(key, list);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
    const g = this.ctx.createGain(); g.gain.value = level;
    src.connect(g).connect(this.panner(pan));
    src.start();
  }
  shot(tier = 0, pan = 0) {
    const t = performance.now();
    if (t - this.lastShot < (tier === 2 ? 45 : 25)) return; // voice limiting for big firefights
    this.lastShot = t;
    const presets = [
      ['revolver', [1.6, 0.05, 300, 0, 0.02, 0.22, 4, 1.8, -9, 0, 0, 0, 0, 1.4, 0, 0.3, 0, 0.6, 0.08]],
      ['shotgun', [2.2, 0.05, 120, 0, 0.05, 0.4, 4, 2.4, -4, 0, 0, 0, 0, 2.2, 0, 0.5, 0, 0.5, 0.12]],
      ['tommy', [1, 0.05, 420, 0, 0.01, 0.09, 4, 1.4, -12, 0, 0, 0, 0, 1.1, 0, 0.2, 0, 0.6, 0.04]],
      ['candle', [0.6, 0.2, 90, 0.02, 0.08, 0.12, 4, 0.5, 0, 0, 0, 0, 0, 3, 0, 0.1, 0, 0.7, 0.05]],
      ['bell', [1.2, 0.02, 880, 0.01, 0.1, 0.5, 0, 2, 0, 0, 220, 0.05, 0, 0, 0, 0, 0.12, 0.8, 0.1]],
    ];
    const [key, params] = tier === 9 ? ['ally', [0.6, 0.05, 1200, 0, 0.01, 0.06, 1, 1.5, -20, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.02]] : presets[Math.min(tier, 4)];
    this.zzfx(key, params, { level: tier === 3 ? 0.5 : 0.8, pan });
  }
  boom(level = 1, holy = false) {
    this.zzfx(holy ? 'holyboom' : 'boom', holy ? [2, 0.1, 360, 0.01, 0.2, 0.9, 4, 0.6, -2, 0, 330, 0.05, 0, 1.5, 0, 0.6, 0.15, 0.4, 0.2] : [2.4, 0.1, 70, 0.01, 0.25, 1.2, 4, 0.5, -1, 0, 0, 0, 0, 2, 0, 0.8, 0, 0.4, 0.3], { level });
  }
  splat(pan = 0) { this.zzfx('splat', [0.7, 0.4, 160, 0.01, 0.03, 0.18, 4, 2, -3, 0, 0, 0, 0, 2.5, 0, 0.1, 0, 0.5, 0.06], { level: 0.6, pan }); }
  pickup() { this.zzfx('pickup', [1, 0.05, 620, 0.01, 0.08, 0.2, 1, 1.7, 0, 0, 380, 0.06, 0, 0, 0, 0, 0, 0.7, 0.05], { level: 0.6 }); }
  levelUp() { this.ui('good'); this.zzfx('lvl', [1.2, 0.05, 440, 0.02, 0.2, 0.4, 0, 1.5, 0, 0, 220, 0.1, 0.08, 0, 0, 0, 0, 0.8, 0.1], { level: 0.5 }); }

  // ---------------- ambience beds ----------------
  setScene(name) {
    if (!this.ready || this.sceneName === name) return;
    this.sceneName = name;
    const c = this.ctx; const t = this.now;
    if (this.ambience) {
      const old = this.ambience;
      old.out.gain.setTargetAtTime(0.0001, t, 1.2);
      clearInterval(old.timer);
      setTimeout(() => this.stopAt(old.nodes, 0), 5000);
    }
    const cfg = {
      manor: { root: 38, wind: 0.09, rain: 0.06, drone: 0.05, events: ['creak', 'thunder', 'whisper'] },
      foyer: { root: 40, wind: 0.025, rain: 0.015, drone: 0.07, events: ['creak', 'whisper', 'knock'] },
      library: { root: 36, wind: 0.02, rain: 0.02, drone: 0.06, events: ['whisper', 'creak', 'page'] },
      nursery: { root: 45, wind: 0.02, rain: 0.01, drone: 0.05, events: ['lullaby', 'creak', 'whisper'] },
      hall: { root: 33, wind: 0.02, rain: 0.01, drone: 0.08, events: ['groan', 'creak', 'whisper'] },
      garden: { root: 31, wind: 0.08, rain: 0.03, drone: 0.07, events: ['groan', 'thunder', 'whisper'] },
      chapel: { root: 41, wind: 0.04, rain: 0.0, drone: 0.05, choir: 0.05, events: ['bell', 'whisper'] },
      dawn: { root: 45, wind: 0.03, rain: 0, drone: 0.03, major: true, events: [] },
      lobby: { root: 38, wind: 0.06, rain: 0.05, drone: 0.04, events: ['creak', 'thunder'] },
    }[name] || { root: 38, wind: 0.05, rain: 0.02, drone: 0.05, events: [] };
    const out = c.createGain(); out.gain.value = 0.0001; out.connect(this.bus.amb);
    out.gain.setTargetAtTime(1, t, 1.5);
    const nodes = [];
    // Drone: root + fifth + a dissonant minor second, slowly breathing through a lowpass.
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 3; lp.connect(out);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 200; lfo.connect(lg).connect(lp.frequency); lfo.start(); nodes.push(lfo);
    const intervals = cfg.major ? [0, 7, 16, 24] : [0, 7, 13, 24];
    for (const iv of intervals) {
      for (const det of [-7, 7]) {
        const o = c.createOscillator(); o.type = iv === 13 ? 'sine' : 'sawtooth'; o.frequency.value = NOTE(cfg.root + iv); o.detune.value = det;
        const g = c.createGain(); g.gain.value = cfg.drone * (iv === 13 ? 0.5 : iv === 24 ? 0.35 : 1);
        o.connect(g).connect(lp); o.start(); nodes.push(o);
      }
    }
    // Wind: band-passed noise with a wandering centre frequency.
    if (cfg.wind) {
      const w = this.noiseSrc(true); const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.9;
      const wl = c.createOscillator(); wl.frequency.value = 0.11; const wlg = c.createGain(); wlg.gain.value = 320; wl.connect(wlg).connect(bp.frequency);
      const wg = c.createGain(); wg.gain.value = cfg.wind;
      const gl = c.createOscillator(); gl.frequency.value = 0.05; const glg = c.createGain(); glg.gain.value = cfg.wind * 0.7; gl.connect(glg).connect(wg.gain);
      w.connect(bp).connect(wg).connect(out); w.start(); wl.start(); gl.start(); nodes.push(w, wl, gl);
    }
    if (cfg.rain) {
      const r = this.noiseSrc(true); const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
      const lp2 = c.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 7000;
      const rg = c.createGain(); rg.gain.value = cfg.rain; r.connect(hp).connect(lp2).connect(rg).connect(out); r.start(); nodes.push(r);
    }
    if (cfg.choir) {
      for (const n of [cfg.root + 12, cfg.root + 15, cfg.root + 19, cfg.root + 24]) {
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = NOTE(n);
        const vib = c.createOscillator(); vib.frequency.value = 4.5 + Math.random(); const vg = c.createGain(); vg.gain.value = NOTE(n) * 0.006; vib.connect(vg).connect(o.frequency);
        const g = c.createGain(); g.gain.value = cfg.choir; o.connect(g).connect(out); o.start(); vib.start(); nodes.push(o, vib);
      }
    }
    // Random events keep the room alive.
    const timer = setInterval(() => {
      if (!cfg.events.length || document.hidden) return;
      if (Math.random() > 0.35) return;
      const e = cfg.events[Math.floor(Math.random() * cfg.events.length)];
      if (e === 'creak') this.creak(0.7);
      if (e === 'whisper') this.whisper(0.5);
      if (e === 'thunder') this.thunder(0.6);
      if (e === 'knock') this.knock(0.4);
      if (e === 'groan') this.groan(0.5, Math.random() * 2 - 1, 0.9);
      if (e === 'bell') this.bell(0.35);
      if (e === 'lullaby') this.lullaby({ notes: LULLABY.slice(0, 6), level: 0.5, tempo: 0.5 });
      if (e === 'page') this.creak(0.3);
    }, 4000);
    this.ambience = { out, nodes, timer };
  }
  stopAmbience() {
    if (!this.ambience) return;
    this.ambience.out.gain.setTargetAtTime(0.0001, this.now, 0.5);
    clearInterval(this.ambience.timer);
    const old = this.ambience; this.ambience = null; this.sceneName = null;
    setTimeout(() => this.stopAt(old.nodes, 0), 3000);
  }

  // ---------------- adaptive combat score ----------------
  startCombat() {
    if (!this.ready || this.combat) return;
    const c = this.ctx;
    const out = c.createGain(); out.gain.value = 0.0001; out.connect(this.bus.music); out.gain.setTargetAtTime(0.9, this.now, 1);
    this.combat = { out, intensity: 0.3, next: this.now + 0.1, beat: 0 };
    this.combat.timer = setInterval(() => this.scheduleCombat(), 50);
  }
  setIntensity(v) { if (this.combat) this.combat.intensity = Math.max(0, Math.min(1, v)); }
  scheduleCombat() {
    const cb = this.combat;
    if (!cb || !this.ctx) return;
    const c = this.ctx;
    const bpm = 92 + cb.intensity * 56;
    const step = 60 / bpm / 2;
    while (cb.next < this.now + 0.25) {
      const t = cb.next;
      const b = cb.beat % 16;
      // Taiko-ish low drum on the downbeats, more hits as intensity rises.
      if (b % 4 === 0 || (cb.intensity > 0.55 && b % 4 === 3) || (cb.intensity > 0.8 && b % 2 === 1)) {
        const o = c.createOscillator(); o.frequency.setValueAtTime(b % 8 === 0 ? 72 : 96, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
        const g = c.createGain(); this.env(g.gain, t, { a: 0.003, d: 0.28, peak: b % 8 === 0 ? 0.9 : 0.55 });
        o.connect(g).connect(cb.out); o.start(t); o.stop(t + 0.7);
      }
      // Dissonant string ostinato.
      if (b % 2 === 0) {
        const seq = [45, 45, 46, 45, 48, 45, 46, 44];
        const n = seq[(cb.beat / 2) % 8 | 0];
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500 + cb.intensity * 1600;
        const g = c.createGain(); this.env(g.gain, t, { a: 0.01, d: step * 1.6, peak: 0.07 + cb.intensity * 0.05 });
        o.connect(lp).connect(g).connect(cb.out); o.start(t); o.stop(t + step * 4);
      }
      // High tension tremolo when the horde is big.
      if (cb.intensity > 0.6 && b === 0) {
        for (const n of [81, 82]) {
          const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n);
          const g = c.createGain(); this.env(g.gain, t, { a: 0.5, d: 2, peak: 0.025 * cb.intensity, sus: 0.7, hold: step * 12, rel: 0.4 });
          const trem = c.createOscillator(); trem.frequency.value = 12; const tg = c.createGain(); tg.gain.value = 0.015; trem.connect(tg).connect(g.gain);
          o.connect(g).connect(cb.out); o.start(t); trem.start(t); o.stop(t + step * 16); trem.stop(t + step * 16);
        }
      }
      cb.next += step;
      cb.beat++;
    }
  }
  stopCombat() {
    if (!this.combat) return;
    clearInterval(this.combat.timer);
    this.combat.out.gain.setTargetAtTime(0.0001, this.now, 0.8);
    this.combat = null;
  }
}

export const audio = new Engine();
