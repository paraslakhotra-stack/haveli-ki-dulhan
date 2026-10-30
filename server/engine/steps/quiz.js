// Chapter II — the Forbidden Quiz: groom questions, trivia, and "who among you" votes.
import { TRIVIA, ACCUSE, SHAADI } from '../../content/quiz.js';
import { tally } from '../util.js';

export const quiz = {
  enter(g, s, params) {
    s.qtype = params.qtype;
    s.round = params.round;
    s.n = params.n;
    s.total = params.total;
    let item = null;
    if (params.qtype === 'groom') item = g.secrets.groomQs?.[params.idx];
    if (params.qtype === 'trivia' || (params.qtype === 'groom' && !item)) item = g.draw('trivia', TRIVIA);
    if (params.qtype === 'shaadi') item = g.draw('shaadi', SHAADI);
    s.phere = !!params.phere;
    if (params.qtype === 'accuse') {
      const ps = g.connectedPlayers();
      s.q = {
        text: g.fmt(g.draw(`accuse.${g.settings.heat}`, ACCUSE[g.settings.heat])),
        options: ps.map((p) => ({ id: p.id, label: p.name, photo: true })),
        correct: null,
      };
    } else {
      const opts = g.rng.shuffle([{ label: item.a, ok: true }, ...item.w.map((w) => ({ label: w, ok: false }))]);
      s.q = {
        text: g.fmt(item.q),
        options: opts.map((o, i) => ({ id: String(i), label: g.fmt(o.label) })),
        correct: String(opts.findIndex((o) => o.ok)),
      };
    }
    s.answers = {};
    s.sub = 'ask';
    s.limit = params.qtype === 'accuse' ? 20000 : params.phere ? 12000 : 16000;
    s.askedAt = g.now();
    g.setTimer(s.limit);
  },
  input(g, s, p, msg) {
    if (s.sub !== 'ask' || msg.type !== 'answer' || s.answers[p.id]) return;
    if (!s.q.options.some((o) => o.id === msg.id)) return;
    if (s.qtype === 'accuse' && msg.id === p.id && g.connectedPlayers().length > 1) return; // no self-votes
    s.answers[p.id] = { id: msg.id, ms: g.now() - s.askedAt };
    g.changed();
    if (g.connectedPlayers().every((x) => s.answers[x.id])) this.reveal(g, s);
  },
  reveal(g, s) {
    if (s.sub !== 'ask') return;
    s.sub = 'reveal';
    const limit = g.dur(s.limit);
    s.gains = {};
    if (s.qtype === 'accuse') {
      const t = tally(Object.fromEntries(Object.entries(s.answers).map(([k, v]) => [k, v.id])), g.rng);
      s.accused = t.winner;
      s.counts = t.counts;
      for (const [pid, a] of Object.entries(s.answers)) {
        if (a.id === t.winner) { s.gains[pid] = 100; g.award(pid, 100); }
      }
    } else {
      s.counts = {};
      for (const [pid, a] of Object.entries(s.answers)) {
        s.counts[a.id] = (s.counts[a.id] || 0) + 1;
        if (a.id === s.q.correct) {
          const pts = 100 + Math.round(100 * Math.max(0, 1 - a.ms / limit));
          s.gains[pid] = pts;
          g.award(pid, pts, 'quiz', 1);
        }
      }
      if (s.phere) {
        // Phere Quiz: tally right answers per team; the best team (per head) hears an extra true whisper
        const ph = (g.secrets.phere ||= {});
        for (const [pid, a] of Object.entries(s.answers)) {
          const t = g.players.get(pid)?.team;
          if (t && a.id === s.q.correct) ph[t] = (ph[t] || 0) + 1;
        }
      }
      const fastest = Object.entries(s.answers).filter(([, a]) => a.id === s.q.correct).sort((a, b) => a[1].ms - b[1].ms)[0];
      s.fastest = fastest ? fastest[0] : null;
    }
    g.setTimer(s.phere ? 4500 : 7000);
  },
  timeout(g, s) { if (s.sub === 'ask') this.reveal(g, s); else g.next(); },
  skip(g, s) { if (s.sub === 'ask') this.reveal(g, s); else g.next(); },
  tv: (g, s) => ({
    sub: s.sub, qtype: s.qtype, round: s.round, n: s.n, total: s.total,
    q: { text: s.q.text, options: s.q.options },
    answered: Object.keys(s.answers),
    reveal: s.sub === 'reveal' ? {
      correct: s.q.correct, counts: s.counts, accused: s.accused || null, fastest: s.fastest || null,
      picks: Object.fromEntries(Object.entries(s.answers).map(([k, v]) => [k, v.id])), gains: s.gains,
    } : null,
  }),
  phone: (g, s, p) => ({
    sub: s.sub, qtype: s.qtype, round: s.round, n: s.n, total: s.total,
    q: { text: s.q.text, options: s.q.options.filter((o) => s.qtype !== 'accuse' || o.id !== p.id || s.q.options.length === 1) },
    mine: s.answers[p.id]?.id ?? null,
    reveal: s.sub === 'reveal' ? { correct: s.q.correct, accused: s.accused || null, gain: s.gains[p.id] || 0 } : null,
  }),
};
