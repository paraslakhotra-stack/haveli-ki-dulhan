// Chapter I — Tantrik Rangoli: a team communication puzzle.
import { makeSeance } from '../puzzles.js';

function activeMembers(g, T) {
  const on = T.members.filter((id) => g.players.get(id)?.connected);
  return on.length ? on : T.members.filter((id) => g.players.has(id));
}
function tapperOf(g, T) {
  const act = activeMembers(g, T);
  return act.length ? act[T.progress % act.length] : null;
}
// Clues follow their holder; if the holder has gone, the next present teammate inherits them.
function cluesFor(g, T, pid) {
  const act = activeMembers(g, T);
  const out = [];
  for (const [holder, list] of Object.entries(T.clues)) {
    let owner = holder;
    if (!act.includes(holder)) {
      const i = T.members.indexOf(holder);
      owner = act.length ? act[(Math.max(0, i)) % act.length] : holder;
    }
    if (owner === pid) out.push(...list);
  }
  return out.sort((a, b) => a.pos - b.pos);
}

export const seance = {
  enter(g, s, params) {
    s.round = params.round;
    s.length = params.length;
    s.teams = {};
    for (const t of g.teams) {
      const members = g.teamMembers(t.id, { connectedOnly: true }).map((p) => p.id);
      const all = members.length ? members : g.teamMembers(t.id).map((p) => p.id);
      if (!all.length) continue;
      const pz = makeSeance(g.rng, all, params.length);
      s.teams[t.id] = { ...pz, members: all, progress: 0, done: false, doneAt: null, rank: null, stunUntil: 0, mistakes: 0 };
    }
    s.sub = 'play';
    s.limit = params.length <= 4 ? 120000 : 150000;
    s.started = g.now();
    s.finished = 0;
    g.setTimer(s.limit);
  },
  input(g, s, p, msg) {
    if (s.sub !== 'play' || msg.type !== 'rune') return;
    const T = s.teams[p.team];
    if (!T || T.done || g.now() < T.stunUntil) return;
    // A late joiner who isn't in the sigil yet can still help by talking — but not tap.
    if (!T.members.includes(p.id)) return;
    if (tapperOf(g, T) !== p.id) return;
    if (msg.rune === T.seq[T.progress]) {
      T.progress++;
      g.fx('rune', { team: p.team, progress: T.progress, len: T.seq.length });
      if (T.progress >= T.seq.length) {
        T.done = true;
        T.doneAt = g.now() - s.started;
        T.rank = s.finished++;
        g.fx('sigil', { team: p.team, rank: T.rank });
        if (Object.values(s.teams).every((x) => x.done)) this.finish(g, s);
      }
    } else {
      T.progress = 0;
      T.mistakes++;
      T.stunUntil = g.now() + g.dur(3000);
      g.fx('scare', { team: p.team, pid: p.id, kind: 'seance' });
    }
    g.changed();
  },
  finish(g, s) {
    if (s.sub !== 'play') return;
    s.sub = 'reveal';
    const order = Object.entries(s.teams).sort(([, a], [, b]) => {
      if (a.done !== b.done) return a.done ? -1 : 1;
      if (a.done) return a.doneAt - b.doneAt;
      return b.progress - a.progress;
    });
    s.results = order.map(([team, T], i) => {
      const pts = T.done ? Math.max(120, 320 - i * 80) : T.progress * 35;
      for (const pid of g.teamMembers(team).map((p) => p.id)) g.award(pid, pts, 'mystery');
      return { team, done: T.done, time: T.doneAt, progress: T.progress, len: T.seq.length, pts, mistakes: T.mistakes };
    });
    g.setTimer(8000);
  },
  timeout(g, s) {
    if (s.sub === 'play') this.finish(g, s);
    else g.next();
  },
  skip(g, s) { if (s.sub === 'play') this.finish(g, s); else g.next(); },
  tv: (g, s) => ({
    sub: s.sub, round: s.round, length: s.length, results: s.results || null,
    teams: Object.entries(s.teams).map(([id, T]) => ({
      id, progress: T.progress, len: T.seq.length, done: T.done, rank: T.rank, mistakes: T.mistakes,
      stunned: g.now() < T.stunUntil, tapper: tapperOf(g, T),
      seq: s.sub === 'reveal' || T.done ? T.seq : T.seq.slice(0, T.progress),
    })),
  }),
  phone: (g, s, p) => {
    const T = s.teams[p.team];
    if (!T) return { sub: s.sub, spectator: true, results: s.results || null };
    const tapper = tapperOf(g, T);
    return {
      sub: s.sub, round: s.round, length: s.length,
      progress: T.progress, done: T.done, rank: T.rank,
      stunned: g.now() < T.stunUntil, stunMs: Math.max(0, T.stunUntil - g.now()),
      pad: T.pads[p.id] || T.pads[T.members[0]],
      isTapper: tapper === p.id, tapperName: g.players.get(tapper)?.name || '',
      member: T.members.includes(p.id),
      clues: cluesFor(g, T, p.id),
      lit: T.seq.slice(0, T.progress),
      results: s.results || null,
    };
  },
};
