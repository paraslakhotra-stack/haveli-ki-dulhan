#!/usr/bin/env node
// Voice-over pipeline.
//   node tools/vo-build.mjs scripts            → writes tools/vo/<voice>-<n>.txt batch scripts (one per TTS request)
//   node tools/vo-build.mjs split <batch> <mp3> [starts.json]
//        → cuts a batch recording into one clip per line. starts.json lists each line's start time in seconds
//          (from a speech-recogniser pass, e.g. tools/vo-align.py); without it the longest pauses are used.
//   node tools/vo-build.mjs manifest           → measures public/vo/*.mp3 and writes public/vo/manifest.json
// TTS services bill per request (rounded up), so lines are batched per voice, one paragraph per line, and cut
// apart afterwards using word timings from a speech recogniser (break tags are not honoured by every provider).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEATS } from '../server/content/script.js';
import { VOICES, voText } from '../server/content/vo.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const work = path.join(root, 'tools', 'vo');
const out = path.join(root, 'public', 'vo');
const MAX = 4900;

function lines() {
  const all = [];
  for (const [beat, list] of Object.entries(BEATS)) list.forEach(([sp, text], i) => all.push({ key: `${beat}.${i}`, sp, text: voText(`${beat}.${i}`, text) }));
  return all;
}

function scripts() {
  fs.mkdirSync(work, { recursive: true });
  const order = {};
  for (const sp of Object.keys(VOICES)) {
    const mine = lines().filter((l) => l.sp === sp);
    const batches = [[]];
    let len = 0;
    for (const l of mine) {
      const add = [...l.text].length + 2;
      if (len + add > MAX && batches.at(-1).length) { batches.push([]); len = 0; }
      batches.at(-1).push(l); len += add;
    }
    batches.forEach((b, i) => {
      const name = `${sp}-${i}`;
      fs.writeFileSync(path.join(work, `${name}.txt`), b.map((l) => l.text).join('\n\n'));
      order[name] = b.map((l) => l.key);
      console.log(name, b.length, 'lines', [...fs.readFileSync(path.join(work, `${name}.txt`), 'utf8')].length, 'chars');
    });
  }
  fs.writeFileSync(path.join(work, 'order.json'), JSON.stringify(order, null, 2));
}

function probeMs(file) {
  return Math.round(parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' })) * 1000);
}

function split(batch, mp3, startsFile) {
  const order = JSON.parse(fs.readFileSync(path.join(work, 'order.json'), 'utf8'))[batch];
  if (!order) throw new Error(`unknown batch ${batch}`);
  let log;
  try { log = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${mp3}" -af silencedetect=noise=-42dB:d=0.25 -f null - 2>&1`], { encoding: 'utf8' }); } catch (e) { log = String(e.stdout || ''); }
  const sil = [];
  let start = null;
  for (const m of log.matchAll(/silence_(start|end): ([\d.]+)/g)) {
    if (m[1] === 'start') start = +m[2];
    else if (start != null) { sil.push({ start, end: +m[2], d: +m[2] - start }); start = null; }
  }
  const total = probeMs(mp3) / 1000;
  let bounds;
  if (startsFile) {
    const starts = JSON.parse(fs.readFileSync(startsFile, 'utf8'));
    if (starts.length !== order.length) throw new Error(`starts has ${starts.length} entries, need ${order.length}`);
    // cut in the middle of the pause just before each line starts
    bounds = [0, ...starts.slice(1).map((t) => {
      // the pause that ends closest before (or just at) the first word; never one inside the line
      const near = sil.filter((x) => x.end >= t - 0.7 && x.end <= t + 0.06).sort((a, b) => b.end - a.end)[0];
      return near ? (near.start + near.end) / 2 : Math.max(0, t - 0.08);
    }), total];
  } else bounds = longestPauses(sil, total, order.length);
  cutClips(order, mp3, bounds);
}

function longestPauses(sil, total, n) {
  const cuts = sil.filter((s) => s.start > 0.05 && s.end < total - 0.05).sort((a, b) => b.d - a.d).slice(0, n - 1).sort((a, b) => a.start - b.start);
  if (cuts.length !== n - 1) throw new Error(`found ${cuts.length} breaks, need ${n - 1}`);
  console.log('shortest break used:', Math.min(...cuts.map((c) => c.d)).toFixed(2), 's; longest unused:', (sil.filter((s) => !cuts.includes(s)).sort((a, b) => b.d - a.d)[0]?.d || 0).toFixed(2), 's');
  return [0, ...cuts.map((c) => (c.start + c.end) / 2), total];
}

function cutClips(order, mp3, bounds) {
  fs.mkdirSync(out, { recursive: true });
  order.forEach((key, i) => {
    const dest = path.join(out, `${key}.mp3`);
    // trim the silence at both ends, keep a short tail, normalise loudness, mono 64k
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', bounds[i].toFixed(3), '-to', bounds[i + 1].toFixed(3), '-i', mp3,
      '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.12,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ac', '1', '-ar', '44100', '-b:a', '64k', dest]);
    console.log(key, probeMs(dest), 'ms');
  });
}

function manifest() {
  const m = {};
  for (const l of lines()) {
    const f = path.join(out, `${l.key}.mp3`);
    if (fs.existsSync(f)) m[l.key] = { file: `${l.key}.mp3`, ms: probeMs(f) };
  }
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(m, null, 1));
  const missing = lines().filter((l) => !m[l.key]).map((l) => l.key);
  console.log(Object.keys(m).length, 'clips;', missing.length ? `missing: ${missing.join(', ')}` : 'none missing');
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'scripts') scripts();
else if (cmd === 'split') split(...args);
else if (cmd === 'manifest') manifest();
else console.log('usage: vo-build.mjs scripts | split <batch> <mp3> | manifest');
