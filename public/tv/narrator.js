// Story captions (typewriter) + optional spoken narration via the laptop's speech synthesis.
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

export class Narrator {
  constructor(root) {
    this.root = root;
    this.timers = [];
    this.enabled = true;
  }
  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    clear(this.root);
  }
  // lines: [{ sp, text, at, ms }] — `elapsed` lets a reconnecting TV join mid-story.
  play(lines, { elapsed = 0, speak = true, onLine } = {}) {
    this.stop();
    lines.forEach((line, i) => {
      const delay = line.at - elapsed;
      if (delay + line.ms < 0) return;
      this.timers.push(setTimeout(() => {
        this.show(line, i);
        onLine?.(line, i);
        if (speak && this.enabled) this.say(line);
        if (line.sp === 'v') { audio.whisper(0.9, 0, 2.2); audio.ghungroo(0.9, Math.random() * 1.4 - 0.7, 3); }
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
  say(line) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(line.text.replace(/…/g, '...'));
      const v = pickVoice(line.sp === 'n' ? 'n' : 'f');
      if (v) u.voice = v;
      if (line.sp === 'v') { u.rate = 0.78; u.pitch = 0.55; }
      else if (line.sp === 'b') { u.rate = 1.08; u.pitch = 1.15; }
      else { u.rate = 0.9; u.pitch = 0.72; }
      u.volume = 1;
      synth.speak(u);
    } catch { /* speech is optional */ }
  }
  // Speak arbitrary text (used for the vow performance).
  speakText(text, sp = 'n') { if (this.enabled) this.say({ text, sp }); }
}
