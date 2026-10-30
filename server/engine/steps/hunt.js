// Chapter V step: wraps the HuntSim. Owns the per-team shaadi questions that guard each station,
// awards points (which decide the chapter's souls), and records how many adornments each team recovered —
// those become perks in the zombie baraat.
import { HuntSim } from '../hunt/sim.js';
import { SHAADI } from '../../content/quiz.js';
import { ITEMS } from '../../../public/shared/haveli-map.js';

const sims = new WeakMap();
export const getHunt = (g) => sims.get(g) || null;
const FINISH_PTS = [220, 150, 100, 60];

export const hunt = {
  enter(g, s) {
    const short = g.settings.length === 'short';
    const teams = g.teams.map((t) => ({ id: t.id, members: g.connectedPlayers().filter((p) => p.team === t.id).map((p) => p.id) })).filter((t) => t.members.length);
    s.q = {}; // teamId -> { q, opts, a, by?, ok? }
    s.sub = 'hunt';
    const sim = new HuntSim({
      seed: g.rng.int(1e9),
      fast: g.fast,
      teams,
      stations: short ? 4 : 5,
      hooks: {
        arrive: (teamId) => {
          const item = g.draw('shaadi', SHAADI);
          s.q[teamId] = { q: item.q, opts: g.rng.shuffle([item.a, ...item.w]), a: item.a };
          g.changed();
        },
        found: (teamId, item, pid) => {
          for (const p of g.connectedPlayers()) if (p.team === teamId) g.award(p.id, p.id === pid ? 60 : 30, 'mystery', 1);
          const t = g.team(teamId);
          if (t) t.items = (t.items || 0) + 1;
          g.fx('found', { team: teamId, item: ITEMS[item]?.name });
        },
        finish: (teamId, place) => {
          for (const p of g.connectedPlayers()) if (p.team === teamId) g.award(p.id, FINISH_PTS[place - 1] ?? 40);
        },
      },
    });
    sims.set(g, sim);
    for (const t of g.teams) t.items = 0;
  },
  simTick(g, s, dt) {
    const sim = getHunt(g);
    if (!sim || s.sub !== 'hunt') return null;
    for (const p of g.connectedPlayers()) if (!sim.players.has(p.id) && p.team) sim.addPlayer(p.id, p.team);
    sim.step(dt);
    for (const [t, q] of Object.entries(s.q)) if (q.clearAt && g.now() >= q.clearAt) { delete s.q[t]; g.changed(); }
    const snap = sim.snapshot();
    if (sim.done) this.finish(g, s);
    return snap;
  },
  // [mx, my, _, _, buttons] — bit 1 = diya raised
  rtInput(g, s, p, a) {
    if (s.sub !== 'hunt') return;
    getHunt(g)?.setInput(p.id, a[0] / 100, a[1] / 100, (a[4] | 0) & 1);
  },
  hud(g, s, pid) { return s.sub === 'hunt' ? getHunt(g)?.hud(pid) || null : null; },
  input(g, s, p, msg) {
    if (msg.type !== 'answer' || s.sub !== 'hunt') return;
    const q = s.q[p.team];
    if (!q || q.by) return;
    const ok = q.opts[msg.i] === q.a;
    q.by = p.id; q.ok = ok;
    getHunt(g)?.answer(p.team, ok, p.id);
    if (ok) g.award(p.id, 20, 'quiz', 1);
    q.clearAt = g.now() + (g.fast ? 200 : 2200); // the result stays up briefly, then the card clears
    g.changed();
  },
  finish(g, s) {
    if (s.sub !== 'hunt') return;
    s.sub = 'results';
    const sim = getHunt(g);
    s.results = (sim?.teams || []).map((t) => ({ team: t.id, items: t.at, total: t.stations.length, place: sim.finished.indexOf(t.id) + 1 || null }))
      .sort((a, b) => (a.place || 99) - (b.place || 99) || b.items - a.items);
    g.changed();
    g.setTimer(g.fast ? 800 : 9000);
  },
  timeout(g) { g.next(); },
  skip(g, s) {
    if (s.sub === 'hunt') { const sim = getHunt(g); if (sim) sim.done = true; this.finish(g, s); } else g.next();
  },
  exit(g) { sims.delete(g); },
  playerLeft(g, s, id) { getHunt(g)?.removePlayer(id); },
  tv: (g, s) => ({ sub: s.sub, results: s.results || null, q: Object.fromEntries(Object.entries(s.q || {}).map(([t, q]) => [t, { q: q.q, by: q.by || null, ok: q.ok ?? null }])) }),
  phone: (g, s, p) => {
    const q = s.q?.[p.team];
    return {
      sub: s.sub,
      hud: getHunt(g)?.hud(p.id) || null,
      q: q ? { q: q.q, opts: q.opts, by: q.by || null, ok: q.ok ?? null, a: q.by ? q.a : null } : null,
      results: s.results || null,
    };
  },
};
