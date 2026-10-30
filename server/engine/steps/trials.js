// Chapter III — Trials of Nerve. Everyone plays each trial at the same time on their own phone.
import { BLESSINGS } from '../../content/script.js';

const SPEC = {
  candle: { title: 'Diya Pakdo', how: 'Diye ki lau pe angootha rakho. Kuch bhi dikhe — chhodna MAT.', play: 25000 },
  musicbox: { title: 'Payal Ki Taal', how: 'Uski payal ki taal suno. Wahi bajao. Har baar ek beat lambi.', play: 45000 },
  banish: { title: 'Nimbu-Mirchi Bhagao', how: 'TAP. Jitna tez ho sake. Har tap tumhari team ki chudail ko chimney mein waapas dhakelta hai.', play: 10000 },
  blink: { title: 'Pairon Ko Mat Dekho', how: 'Sirf NAZAR charm aane pe tap karo. Uske ulte pair dikhe aur tapa… toh gaye.', play: 22000 },
  gallery: { title: 'Shaadi Album', how: 'TV dekho. Ginti karo — kitni photos POSSESSED hain.', play: 0 },
};

function makeBlinkCues(rng) {
  const cues = [];
  let t = 1800;
  for (let i = 0; i < 8; i++) {
    cues.push({ at: t, real: i === 0 ? true : rng() < 0.62 });
    t += 1500 + rng.int(1300);
  }
  return cues;
}

function makeGallery(g) {
  const pids = g.connectedPlayers().map((p) => p.id);
  const rounds = [];
  for (let r = 0; r < 3; r++) {
    const slots = Math.max(6, Math.min(12, pids.length + 3));
    const faces = [];
    for (let i = 0; i < slots; i++) faces.push(i < pids.length ? pids[i] : null);
    const shuffled = g.rng.shuffle(faces);
    const count = 1 + g.rng.int(Math.min(5, slots - 2)) + r; // later rounds get busier
    const possessed = new Set(g.rng.shuffle(shuffled.map((_, i) => i)).slice(0, Math.min(count, slots - 1)));
    const answer = possessed.size;
    const opts = new Set([answer]);
    while (opts.size < 4) opts.add(Math.max(0, answer + g.rng.int(7) - 3));
    rounds.push({ grid: shuffled.map((pid, i) => ({ pid, possessed: possessed.has(i) })), answer, options: [...opts].sort((a, b) => a - b) });
  }
  return rounds;
}

export const trial = {
  enter(g, s, params) {
    s.trial = params.trial;
    s.n = params.n;
    s.total = params.total;
    s.spec = SPEC[params.trial];
    s.scores = {};
    s.sub = 'intro';
    g.setTimer(7000);
  },
  startPlay(g, s) {
    s.sub = 'play';
    s.playStart = g.now();
    if (s.trial === 'candle') {
      s.hold = {};
      s.scares = [];
      let t = 3000;
      while (t < SPEC.candle.play - 2000) { s.scares.push(t); t += 2500 + g.rng.int(3500); }
      s.scares = s.scares.map((x) => Math.round(g.fast ? x * 0.08 : x));
    }
    if (s.trial === 'musicbox') s.melody = Array.from({ length: 14 }, () => g.rng.int(4));
    if (s.trial === 'banish') s.teamTaps = Object.fromEntries(g.teams.map((t) => [t.id, 0]));
    if (s.trial === 'blink') s.cues = makeBlinkCues(g.rng).map((c) => ({ ...c, at: Math.round(g.fast ? c.at * 0.08 : c.at) }));
    if (s.trial === 'gallery') {
      s.rounds = makeGallery(g);
      s.gr = 0;
      s.gsub = 'show';
      s.gAnswers = [{}, {}, {}];
      g.setTimer(4000);
      return;
    }
    g.setTimer(SPEC[s.trial].play);
  },
  input(g, s, p, msg) {
    if (s.sub !== 'play') return;
    const t = g.now() - s.playStart;
    switch (s.trial) {
      case 'candle': {
        if (msg.type !== 'hold') return;
        const h = (s.hold[p.id] ||= { down: null, best: 0, out: false });
        if (h.out) return;
        if (msg.on && h.down == null) h.down = t;
        else if (!msg.on && h.down != null) {
          h.best = Math.max(h.best, t - h.down);
          h.down = null;
          h.out = true; // one life — lifting your thumb puts the candle out
          s.scores[p.id] = h.best;
          g.fx('candleOut', { pid: p.id });
          if (g.connectedPlayers().every((x) => s.hold[x.id]?.out)) this.finish(g, s);
        }
        g.changed();
        break;
      }
      case 'musicbox': {
        if (msg.type !== 'mb') return;
        const cur = s.scores[p.id] || 0;
        if (msg.level === cur + 1 && msg.level <= s.melody.length) { s.scores[p.id] = msg.level; g.changed(); }
        if (msg.fail) { (s.failed ||= {})[p.id] = true; g.changed(); if (g.connectedPlayers().every((x) => s.failed[x.id])) this.finish(g, s); }
        break;
      }
      case 'banish': {
        if (msg.type !== 'taps') return;
        const n = Math.max(0, Math.min(8, Math.floor(Number(msg.n) || 0)));
        s.scores[p.id] = (s.scores[p.id] || 0) + n;
        if (p.team && s.teamTaps[p.team] != null) s.teamTaps[p.team] += n;
        g.changed();
        break;
      }
      case 'blink': {
        if (msg.type !== 'blink') return;
        const i = Math.floor(Number(msg.i));
        const cue = s.cues[i];
        if (!cue) return;
        const rec = ((s.blink ||= {})[p.id] ||= {});
        if (rec[i] != null) return;
        if (!cue.real) { rec[i] = -500; g.fx('scare', { pid: p.id, kind: 'blink' }); }
        else { const rt = Math.max(120, Math.min(1500, Number(msg.rt) || 1500)); rec[i] = Math.max(0, 1000 - rt); }
        s.scores[p.id] = Object.values(rec).reduce((a, b) => a + b, 0);
        g.changed();
        break;
      }
      case 'gallery': {
        if (msg.type !== 'count' || s.gsub !== 'answer') return;
        const A = s.gAnswers[s.gr];
        if (A[p.id]) return;
        A[p.id] = { v: Number(msg.v), ms: g.now() - s.gAskAt };
        if (g.connectedPlayers().every((x) => A[x.id])) this.galleryNext(g, s);
        g.changed();
        break;
      }
    }
  },
  galleryNext(g, s) {
    if (s.gsub === 'show') { s.gsub = 'answer'; s.gAskAt = g.now(); g.setTimer(9000); return; }
    if (s.gsub === 'answer') {
      const R = s.rounds[s.gr];
      for (const [pid, a] of Object.entries(s.gAnswers[s.gr])) {
        if (a.v === R.answer) s.scores[pid] = (s.scores[pid] || 0) + 150 + Math.round(100 * Math.max(0, 1 - a.ms / g.dur(9000)));
      }
      s.gsub = 'result';
      g.setTimer(3500);
      return;
    }
    if (s.gsub === 'result') {
      if (s.gr < s.rounds.length - 1) { s.gr++; s.gsub = 'show'; g.setTimer(4000); }
      else this.finish(g, s);
    }
  },
  finish(g, s) {
    if (s.sub !== 'play') return;
    if (s.trial === 'candle') {
      const t = g.now() - s.playStart;
      for (const [pid, h] of Object.entries(s.hold)) {
        if (!h.out && h.down != null) s.scores[pid] = Math.max(h.best, Math.min(t, g.dur(SPEC.candle.play)) - h.down);
      }
    }
    s.sub = 'reveal';
    const entries = g.allPlayers().map((p) => ({ pid: p.id, score: Math.round(s.scores[p.id] || 0) }));
    entries.sort((a, b) => b.score - a.score);
    const max = Math.max(1, entries[0]?.score || 1);
    s.board = entries.map((e, i) => {
      const pts = e.score > 0 ? Math.round(40 + 180 * (e.score / max)) + (i === 0 ? 60 : 0) : 0;
      if (pts) g.award(e.pid, pts, 'trials');
      return { ...e, pts };
    });
    const champ = s.board[0] && s.board[0].score > 0 ? s.board[0].pid : null;
    s.blessing = champ ? { pid: champ, ...BLESSINGS[s.trial] } : null;
    if (champ) {
      const p = g.players.get(champ);
      if (p && !p.perks.includes(BLESSINGS[s.trial].id)) p.perks.push(BLESSINGS[s.trial].id);
    }
    g.setTimer(8000);
  },
  timeout(g, s) {
    if (s.sub === 'intro') this.startPlay(g, s);
    else if (s.sub === 'play') {
      if (s.trial === 'gallery') this.galleryNext(g, s);
      else this.finish(g, s);
    } else g.next();
  },
  skip(g, s) {
    if (s.sub === 'intro') this.startPlay(g, s);
    else if (s.sub === 'play') { s.gsub = 'result'; s.gr = s.rounds ? s.rounds.length - 1 : 0; this.finish(g, s); }
    else g.next();
  },
  tv: (g, s) => {
    const base = { sub: s.sub, trial: s.trial, n: s.n, total: s.total, title: s.spec.title, how: s.spec.how };
    if (s.sub === 'reveal') return { ...base, board: s.board, blessing: s.blessing };
    if (s.sub !== 'play') return base;
    const live = Object.entries(s.scores).map(([pid, score]) => ({ pid, score: Math.round(score) })).sort((a, b) => b.score - a.score);
    const extra = {};
    if (s.trial === 'candle') { extra.scares = s.scares; extra.out = Object.keys(s.hold).filter((k) => s.hold[k].out); extra.holding = Object.keys(s.hold).filter((k) => !s.hold[k].out && s.hold[k].down != null); }
    if (s.trial === 'banish') {
      extra.teamTaps = Object.fromEntries(Object.entries(s.teamTaps).map(([t, n]) => [t, Math.round(n / Math.max(1, g.teamMembers(t).length))]));
    }
    if (s.trial === 'gallery') {
      const R = s.rounds[s.gr];
      Object.assign(extra, { gr: s.gr, gsub: s.gsub, grid: R.grid, answer: s.gsub === 'result' ? R.answer : null, answered: Object.keys(s.gAnswers[s.gr]) });
    }
    return { ...base, live, ...extra };
  },
  phone: (g, s, p) => {
    const base = { sub: s.sub, trial: s.trial, n: s.n, total: s.total, title: s.spec.title, how: s.spec.how, score: Math.round(s.scores[p.id] || 0) };
    if (s.sub === 'reveal') {
      const i = s.board.findIndex((b) => b.pid === p.id);
      return { ...base, rank: i + 1, of: s.board.length, pts: s.board[i]?.pts || 0, blessing: s.blessing && s.blessing.pid === p.id ? s.blessing : null, champ: s.blessing ? g.players.get(s.blessing.pid)?.name : null };
    }
    if (s.sub !== 'play') return base;
    const extra = { playMs: g.dur(SPEC[s.trial].play || 0) };
    if (s.trial === 'candle') { const h = s.hold[p.id]; extra.out = !!h?.out; extra.scares = s.scares; }
    if (s.trial === 'musicbox') { extra.melody = s.melody; extra.failed = !!s.failed?.[p.id]; }
    if (s.trial === 'blink') extra.cues = s.cues;
    if (s.trial === 'gallery') {
      const R = s.rounds[s.gr];
      Object.assign(extra, { gr: s.gr, gsub: s.gsub, options: R.options, mine: s.gAnswers[s.gr][p.id]?.v ?? null, answer: s.gsub === 'result' ? R.answer : null });
    }
    return { ...base, ...extra };
  },
};
