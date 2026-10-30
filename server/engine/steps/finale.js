// Chapter VI — the Crypt Code and the Three Brides.
import { makeBrides } from '../puzzles.js';
import { tally } from '../util.js';
import { timeline } from './basic.js';

export const crypt = {
  enter(g, s) {
    const c = g.secrets.crypt;
    // Hand out anything still undelivered, then make sure every guest holds at least one engraving.
    const delivered = new Set(Object.values(g.inventory).flat().filter((i) => i.kind === 'crypt').map((i) => i.text));
    const ps = g.connectedPlayers();
    const missing = c.clues.filter((t) => !delivered.has(t));
    missing.forEach((text, i) => { if (ps.length) g.giveInventory(ps[i % ps.length].id, { kind: 'crypt', piece: '?', text }); });
    let sp = 0;
    for (const p of ps) {
      if (!(g.inventory[p.id] || []).some((i) => i.kind === 'crypt')) {
        const text = c.spare[sp++ % Math.max(1, c.spare.length)] || c.clues[0];
        g.giveInventory(p.id, { kind: 'crypt', piece: '?', text });
      }
    }
    s.attempts = [];
    s.maxAttempts = 3;
    s.sub = 'play';
    g.setTimer(200000);
  },
  input(g, s, p, msg) {
    if (s.sub !== 'play' || msg.type !== 'code') return;
    const code = String(msg.code || '').replace(/\D/g, '').slice(0, 4);
    if (code.length !== 4) return;
    s.attempts.push({ pid: p.id, code });
    if (code === g.secrets.crypt.code) {
      s.sub = 'solved';
      s.solver = p.id;
      for (const x of g.allPlayers()) g.award(x.id, 150, 'mystery');
      g.award(p.id, 50);
      g.fx('cryptOpen', {});
      g.setTimer(7000);
    } else {
      g.fx('cryptWrong', { pid: p.id });
      if (s.attempts.length >= s.maxAttempts) { s.sub = 'failed'; g.setTimer(7000); }
      else if (g.deadline != null) g.deadline = Math.max(g.now() + g.dur(5000), g.deadline - g.dur(20000));
    }
    g.changed();
  },
  timeout(g, s) {
    if (s.sub === 'play') { s.sub = 'failed'; g.setTimer(7000); } else g.next();
  },
  skip(g, s) { this.timeout(g, s); },
  tv: (g, s) => ({
    sub: s.sub, attempts: s.attempts.map((a) => ({ pid: a.pid, code: a.code })), maxAttempts: s.maxAttempts,
    code: s.sub !== 'play' ? g.secrets.crypt.code : null, solver: s.solver || null,
  }),
  phone: (g, s) => ({
    sub: s.sub, attemptsLeft: s.maxAttempts - s.attempts.length,
    last: s.attempts.length ? s.attempts[s.attempts.length - 1].code : null,
    code: s.sub !== 'play' ? g.secrets.crypt.code : null,
  }),
};

export const brides = {
  enter(g, s) {
    const B = makeBrides(g.rng);
    s.brides = B.brides;
    s.answer = B.answer;
    s.whispers = {};
    const ps = g.rng.shuffle(g.connectedPlayers());
    const truths = B.whispers.slice();
    // Needed truths first, then a mix of Chandravati's lies and spare truths.
    ps.forEach((p, i) => {
      const list = (s.whispers[p.id] = []);
      if (i < truths.length) list.push({ text: truths[i], red: false });
    });
    truths.slice(ps.length).forEach((t, i) => ps.length && s.whispers[ps[i % ps.length].id].push({ text: t, red: false }));
    let li = 0;
    let ti = 0;
    for (const p of ps) {
      if (s.whispers[p.id].length) continue;
      const giveLie = g.rng() < 0.55 && li < B.lies.length;
      if (giveLie) s.whispers[p.id].push({ text: B.lies[li++], red: true });
      else if (B.extraTruths[ti]) s.whispers[p.id].push({ text: B.extraTruths[ti++], red: false });
      else if (B.lies[li]) s.whispers[p.id].push({ text: B.lies[li++], red: true });
    }
    // The Phere Quiz winners (right answers per team member) hear one more truth, like the Janam-Patri relic.
    const ph = g.secrets.phere || {};
    const per = (t) => (ph[t] || 0) / Math.max(1, ps.filter((p) => p.team === t).length);
    const phereWinner = Object.keys(ph).sort((a, b) => per(b) - per(a))[0] || null;
    s.phereWinner = phereWinner;
    for (const p of ps) {
      if (g.hasRelic(p.team, 'diary') || p.team === phereWinner) {
        const extra = B.extraTruths[ti++] || B.whispers[g.rng.int(B.whispers.length)];
        s.whispers[p.id].push({ text: extra, red: false, diary: true });
      }
      s.whispers[p.id] = g.rng.shuffle(s.whispers[p.id]);
    }
    s.round = 1;
    s.removed = [];
    s.votes = {};
    s.sub = 'vote';
    g.setTimer(60000);
  },
  input(g, s, p, msg) {
    if (s.sub !== 'vote' || msg.type !== 'bride' || s.votes[p.id] != null) return;
    const idx = Math.floor(Number(msg.idx));
    if (![0, 1, 2].includes(idx) || s.removed.includes(idx)) return;
    s.votes[p.id] = idx;
    g.changed();
    if (g.connectedPlayers().every((x) => s.votes[x.id] != null)) this.reveal(g, s);
  },
  reveal(g, s) {
    if (s.sub !== 'vote') return;
    const t = tally(s.votes, g.rng);
    let choice = t.winner != null ? Number(t.winner) : null;
    if (choice == null) choice = g.rng.pick([0, 1, 2].filter((i) => !s.removed.includes(i)));
    s.choice = choice;
    s.counts = t.counts;
    for (const [pid, v] of Object.entries(s.votes)) if (v === s.answer) g.award(pid, 100, 'mystery');
    if (choice === s.answer) {
      g.ending = 'win';
      s.sub = 'right';
      g.setTimer(7000);
    } else if (s.round === 1) {
      s.sub = 'wrong';
      s.lastChance = timeline(g, 'lastChance');
      g.setTimer(Math.max(7000, s.lastChance.total));
    } else {
      g.ending = 'lose';
      s.sub = 'lost';
      g.setTimer(7000);
    }
    g.changed();
  },
  timeout(g, s) {
    if (s.sub === 'vote') this.reveal(g, s);
    else if (s.sub === 'wrong') {
      s.removed.push(s.choice);
      s.round = 2;
      s.votes = {};
      s.sub = 'vote';
      g.setTimer(45000);
    } else g.next();
  },
  skip(g, s) { if (s.sub === 'vote') this.reveal(g, s); else this.timeout(g, s); },
  tv: (g, s) => ({
    sub: s.sub, round: s.round, brides: s.brides, removed: s.removed, voted: Object.keys(s.votes),
    choice: s.sub !== 'vote' ? s.choice : null, answer: s.sub === 'right' || s.sub === 'lost' ? s.answer : null,
    counts: s.sub !== 'vote' ? s.counts : null,
    lines: s.sub === 'wrong' ? s.lastChance.lines : null,
  }),
  phone: (g, s, p) => ({
    sub: s.sub, round: s.round, removed: s.removed, brides: s.brides,
    whispers: s.whispers[p.id] || [], myVote: s.votes[p.id] ?? null,
    choice: s.sub !== 'vote' ? s.choice : null,
  }),
};
