// Story captions (typewriter) + voice-over.
// Voice sources, best first: the live ElevenLabs voice for lines that name the groom/bride (when the server has a
// key), the recorded ElevenLabs clips in /vo, and finally the laptop's own speech synthesis.
// Recorded voices are shaped live with Web Audio so they sit inside the haveli:
//   narrator — heavy low end, a touch of presence, a dark hall;  Chandravati — slowed, drenched in reverb, with a
//   high whisper doubling her a beat late on the other side;  the bride — a crackling phone line.
import { h, clear, add } from '/shared/dom.js';
import { audio } from '/shared/audio.js';

let voices = [];
function loadVoices() { voices = window.speechSynthesis?.getVoices?.() || []; }
if (window.speechSynthesis) { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }

function pickVoice(kind) {
  if (!voices.length) loadVoices();
  const en = voices.filter((v) => /^(en|hi)/i.test(v.lang));
  const pref = kind === 'n'
    ? [/Rishi/i, /Ravi/i, /Prabhat/i, /Madhur/i, /en-IN.*Male/i, /Daniel/i, /Google UK English Male/i, /Ryan/i, /George/i, /Male/i]
    : [/Veena/i, /Heera/i, /Neerja/i, /Swara/i, /Lekha/i, /Google हिन्दी/i, /en-IN/i, /Google UK English Female/i, /Sonia/i, /Samantha/i, /Female/i];
  for (const re of pref) { const v = en.find((x) => re.test(x.name) || re.test(x.lang)); if (v) return v; }
  return en[0] || voices[0] || null;
}

// ---------------------------------------------------------------- clip loading
let manifest = null;
const manifestReady = fetch('/vo/manifest.json').then((r) => (r.ok ? r.json() : {})).then((m) => { manifest = m; }).catch(() => { manifest = {}; });
const buffers = new Map(); // url -> Promise<AudioBuffer|null>
function load(url) {
  if (!buffers.has(url)) {
    buffers.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => (ab && audio.ctx ? audio.ctx.decodeAudioData(ab) : null)).catch(() => null));
  }
  return buffers.get(url);
}

export class Narrator {
  constructor(root) {
    this.root = root;
    this.timers = [];
    this.enabled = true;
    this.mode = 'cinematic'; // cinematic | browser | off
    this.live = false; // server has a live ElevenLabs key
    this.active = [];
    this.duckUntil = 0;
  }
  configure({ voice, live }) { if (voice) this.mode = voice; this.live = !!live; }
  urlsFor(line) {
    const out = [];
    if (this.live && line.pz) out.push(`/tts?k=${encodeURIComponent(line.key)}`);
    if (manifest?.[line.key]) out.push(`/vo/${manifest[line.key].file}`);
    return out;
  }
  // Start fetching/decoding every clip of a story step as soon as it begins.
  async preload(lines) {
    if (this.mode !== 'cinematic' || !audio.ctx) return;
    await manifestReady;
    for (const l of lines) for (const u of this.urlsFor(l)) load(u);
  }
  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    this.stopClips();
    clear(this.root);
  }
  stopClips() {
    const c = audio.ctx;
    for (const a of this.active) {
      try { a.out.gain.setTargetAtTime(0, c.currentTime, 0.05); a.srcs.forEach((s) => s.stop(c.currentTime + 0.3)); } catch { /* already stopped */ }
    }
    this.active = [];
  }
  // lines: [{ sp, text, at, ms, key, pz }] — `elapsed` lets a reconnecting TV join mid-story.
  play(lines, { elapsed = 0, speak = true, onLine } = {}) {
    this.stop();
    if (speak) this.preload(lines);
    lines.forEach((line, i) => {
      const delay = line.at - elapsed;
      if (delay + line.ms < 0) return;
      this.timers.push(setTimeout(() => {
        this.show(line, i);
        onLine?.(line, i);
        if (speak && this.enabled) this.say(line, Math.max(0, -delay));
        if (line.sp === 'v') { audio.whisper(0.6, 0, 2.2); audio.ghungroo(0.9, Math.random() * 1.4 - 0.7, 3); }
        if (line.sp === 'b') audio.static(0.8, 0.8);
      }, Math.max(0, delay)));
    });
  }
  show(line) {
    const old = this.root.querySelector('.cap.now');
    if (old) { old.classList.remove('now'); old.classList.add('was'); }
    for (const was of [...this.root.querySelectorAll('.cap.was')].slice(0, -1)) was.remove();
    const cls = line.sp === 'v' ? 'cap now vesper' : line.sp === 'b' ? 'cap now bride' : 'cap now';
    const el = h('div', { class: cls });
    if (line.sp === 'b') add(el, h('div', { class: 'cap-call' }, '📞 incoming call'));
    const textEl = h('div', { class: 'cap-text' });
    add(el, textEl);
    add(this.root, el);
    // typewriter: reveal over ~60% of the line's slot
    const chars = [...line.text];
    const per = Math.max(12, Math.min(45, (line.ms * 0.6) / chars.length));
    let i = 0;
    const tick = () => {
      if (!el.isConnected) return;
      i = Math.min(chars.length, i + 1);
      textEl.textContent = chars.slice(0, i).join('');
      if (i < chars.length) this.timers.push(setTimeout(tick, per));
    };
    tick();
  }
  async say(line, lateMs = 0) {
    if (this.mode === 'off') return;
    if (this.mode === 'cinematic' && audio.ctx) {
      await manifestReady;
      for (const url of this.urlsFor(line)) {
        const t0 = performance.now();
        const buf = await load(url);
        if (!buf) continue;
        // a clip that arrives very late is skipped rather than talking over the next line
        const waited = performance.now() - t0 + lateMs;
        if (waited > Math.min(2500, line.ms * 0.5)) return;
        this.playClip(buf, line.sp, waited / 1000);
        return;
      }
    }
    this.speakBrowser(line);
  }
  // Route one clip through the speaker's effect chain into the voice bus; duck the music around it.
  playClip(buf, sp, offset = 0) {
    const c = audio.ctx;
    const now = c.currentTime;
    this.stopClips();
    const out = c.createGain();
    out.gain.value = 1;
    out.connect(audio.bus.voice);
    const srcs = [];
    const src = c.createBufferSource();
    src.buffer = buf;
    srcs.push(src);
    const send = (node, amount) => { const g = c.createGain(); g.gain.value = amount; node.connect(g).connect(audio.reverb); };
    if (sp === 'n') {
      const low = c.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 110; low.gain.value = 9;
      const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 220; body.Q.value = 0.9; body.gain.value = 2.5;
      const pres = c.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.Q.value = 1; pres.gain.value = 2;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
      src.connect(low).connect(body).connect(pres).connect(comp).connect(out);
      send(comp, 0.22);
    } else if (sp === 'v') {
      src.playbackRate.value = 0.93; // a little lower and slower — not quite human
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
      const pan = c.createStereoPanner(); pan.pan.value = 0.18;
      src.connect(hp).connect(pan).connect(out);
      send(hp, 0.55);
      // the whisper double: same words, airy, a beat late on the other side
      const w = c.createBufferSource(); w.buffer = buf; w.playbackRate.value = 0.93; srcs.push(w);
      const wh = c.createBiquadFilter(); wh.type = 'highpass'; wh.frequency.value = 2600;
      const wg = c.createGain(); wg.gain.value = 0.32;
      const wp = c.createStereoPanner(); wp.pan.value = -0.65;
      w.connect(wh).connect(wg).connect(wp).connect(out);
      send(wg, 0.8);
      w.start(now + 0.07, offset);
    } else {
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3300;
      const drive = audio.shaper(8);
      const g = c.createGain(); g.gain.value = 0.85;
      src.connect(hp).connect(lp).connect(drive).connect(g).connect(out);
      send(g, 0.12);
    }
    src.start(now, offset);
    const dur = (buf.duration - offset) / (src.playbackRate.value || 1);
    this.active.push({ out, srcs });
    this.duck(now, dur);
  }
  duck(now, dur) {
    for (const bus of [audio.bus.music, audio.bus.amb]) {
      const p = bus.gain;
      const base = bus === audio.bus.music ? 0.7 : 0.8;
      p.cancelScheduledValues(now);
      p.setTargetAtTime(base * 0.5, now, 0.08); // about −6 dB under the voice
      p.setTargetAtTime(base, now + dur + 0.2, 0.4);
    }
  }
  speakBrowser(line) {
    if (this.mode === 'off') return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(line.text.replace(/…/g, '...'));
      const v = pickVoice(line.sp === 'n' ? 'n' : 'f');
      if (v) u.voice = v;
      if (line.sp === 'v') { u.rate = 0.78; u.pitch = 0.55; }
      else if (line.sp === 'b') { u.rate = 1.08; u.pitch = 1.15; }
      else { u.rate = 0.9; u.pitch = 0.62; }
      u.volume = 1;
      synth.speak(u);
    } catch { /* speech is optional */ }
  }
  // Speak arbitrary player-written text (the vow performance): always the laptop voice, low and slow.
  speakText(text, sp = 'n') { if (this.enabled && this.mode !== 'off') this.speakBrowser({ text, sp }); }
}
