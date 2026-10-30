// Optional live voice: lines that mention the groom or bride are spoken by ElevenLabs with tonight's real names.
// Everything else uses the recorded clips in public/vo. Set ELEVENLABS_API_KEY (and optionally VO_NARRATOR,
// VO_GHOST, VO_BRIDE voice ids) on the server; without a key this module does nothing.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BEATS } from './content/script.js';
import { VOICES } from './content/vo.js';

const MODEL = 'eleven_multilingual_v2';
const SETTINGS = {
  n: { stability: 0.5, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
  v: { stability: 0.35, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true },
  b: { stability: 0.4, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true },
};

export function createTts({ apiKey, fmt, log = () => {} }) {
  const enabled = !!apiKey;
  const dir = path.join(os.tmpdir(), 'haveli-tts');
  if (enabled) fs.mkdirSync(dir, { recursive: true });
  const mem = new Map(); // hash -> Buffer
  const inflight = new Map(); // hash -> Promise
  let failures = 0;

  async function synth(sp, text) {
    const voice = VOICES[sp]?.id;
    const hash = crypto.createHash('sha1').update(`${MODEL}|${voice}|${text}`).digest('hex');
    if (mem.has(hash)) return { ok: true, buf: mem.get(hash) };
    const file = path.join(dir, `${hash}.mp3`);
    if (fs.existsSync(file)) { const buf = fs.readFileSync(file); mem.set(hash, buf); return { ok: true, buf }; }
    if (failures >= 5) return { ok: false, status: 503 }; // stop hammering a bad key / exhausted quota
    if (!inflight.has(hash)) {
      inflight.set(hash, (async () => {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 15000);
        try {
          const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
            method: 'POST',
            headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
            body: JSON.stringify({ text, model_id: MODEL, voice_settings: SETTINGS[sp] || SETTINGS.n }),
            signal: ctl.signal,
          });
          if (!r.ok) { failures++; log(`  (live voice: ElevenLabs answered ${r.status})`); return { ok: false, status: 502 }; }
          const buf = Buffer.from(await r.arrayBuffer());
          failures = 0;
          mem.set(hash, buf);
          try { fs.writeFileSync(file, buf); } catch { /* cache is best-effort */ }
          return { ok: true, buf };
        } catch {
          failures++;
          return { ok: false, status: 504 };
        } finally {
          clearTimeout(timer);
          inflight.delete(hash);
        }
      })());
    }
    return inflight.get(hash);
  }

  return {
    enabled,
    // key = "beat.index" (only lines that name the groom/bride are served live)
    async line(key) {
      const m = /^([A-Za-z@]+)\.(\d+)$/.exec(key);
      const line = m && BEATS[m[1]]?.[Number(m[2])];
      if (!line) return { ok: false, status: 404 };
      const [sp, raw] = line;
      if (!/\{(GROOM|BRIDE)\}/.test(raw)) return { ok: false, status: 404 };
      return synth(sp, fmt(raw));
    },
    // Fire-and-forget: render every named line in the background so the first play has no wait.
    prewarm() {
      if (!enabled) return;
      clearTimeout(this.t);
      this.t = setTimeout(() => {
        for (const [beat, lines] of Object.entries(BEATS)) {
          lines.forEach(([, raw], i) => { if (/\{(GROOM|BRIDE)\}/.test(raw)) this.line(`${beat}.${i}`); });
        }
      }, 1500);
    },
  };
}
