// Chapter VI step wrapper: owns the ArenaSim, feeds it twin-stick input and turns its events into points and stats.
// Between waves 2 and 3 the "Baraat Break" puts a shaadi question on every phone; a right answer earns a power.
import { ArenaSim, ZTYPES } from '../arena/sim.js';
import { SHAADI } from '../../content/quiz.js';

const shuffleOpts = (g, item) => g.rng.shuffle([item.a, ...item.w]);
const playerSpec = (g, p) => ({ id: p.id, team: p.team, perks: p.perks, relics: g.team(p.team)?.relics || [], items: g.team(p.team)?.items || 0 });

// The sim is transient (not serialised) — a restored game simply restarts the fight.
const sims = new WeakMap();
export const getSim = (g) => sims.get(g) || null;

export const arena = {
  enter(g, s) {
    const players = g.connectedPlayers().map((p) => playerSpec(g, p));
    const short = g.settings.length === 'short';
    const sim = new ArenaSim({
      seed: g.rng.int(1e9),
      fast: g.fast,
      players,
      waves: short ? 3 : null,
      breakAfter: short ? 0 : 1,
      hooks: {
        kill: (pid, type) => { if (pid && type !== 'boss') g.award(pid, ZTYPES[type].pts, 'kills', 1); },
        down: (pid) => {
          const p = g.players.get(pid);
          if (!p) return;
          p.stats.downs++;
          if (p.stats.firstDown == null) p.stats.firstDown = g.now();
        },
        revive: (pid, by) => g.award(by, 50, 'revives', 1),
        bossDmg: (pid, n) => { if (pid) { s.bossAcc[pid] = (s.bossAcc[pid] || 0) + n; } },
      },
    });
    sims.set(g, sim);
    s.bossAcc = {};
    s.sub = 'fight';
    s.brk = null;
  },
  // Called by the server loop at 30 Hz.
  simTick(g, s, dt) {
    const sim = getSim(g);
    if (!sim || s.sub !== 'fight') return null;
    for (const p of g.connectedPlayers()) {
      if (!sim.players.has(p.id)) sim.addPlayer(playerSpec(g, p));
    }
    sim.step(dt);
    if (sim.phase === 'break' && !s.brk) {
      const item = g.draw('shaadi', SHAADI);
      s.brk = { q: item.q, opts: shuffleOpts(g, item), a: item.a, answered: {}, ends: g.now() + (sim.phaseEnds - sim.t) * 1000 };
      g.changed();
    } else if (sim.phase !== 'break' && s.brk && !s.brk.done) {
      s.brk.done = true; // reveal stays on the phones until the next wave title
      g.changed();
    } else if (s.brk?.done && sim.phase === 'fight') { s.brk = null; g.changed(); }
    // Boss damage converts to points in chunks so the score ticks up visibly.
    for (const [pid, n] of Object.entries(s.bossAcc)) {
      if (n >= 10) { const pts = Math.floor(n / 10); g.award(pid, pts, 'bossDmg', pts * 10); s.bossAcc[pid] = n - pts * 10; }
    }
    const snap = sim.snapshot();
    if (sim.done) this.finish(g, s);
    return snap;
  },
  // Volatile stick packets straight from the phones: [mx, my, ax, ay] in -100..100.
  rtInput(g, s, p, a) {
    if (s.sub !== 'fight') return;
    getSim(g)?.setInput(p.id, a[0] / 100, a[1] / 100, a[2] / 100, a[3] / 100);
  },
  hud(g, s, pid) { return s.sub === 'fight' ? getSim(g)?.hud(pid) || null : null; },
  finish(g, s) {
    if (s.sub !== 'fight') return;
    s.sub = 'results';
    const sim = getSim(g);
    s.board = [...(sim?.players.values() || [])].map((p) => ({ pid: p.id, kills: p.kills })).sort((a, b) => b.kills - a.kills);
    s.teamKills = {};
    for (const b of s.board) {
      const t = g.players.get(b.pid)?.team;
      if (t) s.teamKills[t] = (s.teamKills[t] || 0) + b.kills;
    }
    g.fx('arenaWon', {});
    g.setTimer(10000);
  },
  input(g, s, p, msg) {
    const sim = getSim(g);
    if (!sim || s.sub !== 'fight') return;
    if (msg.type === 'move') sim.setMove(p.id, msg.x, msg.y);
    else if (msg.type === 'power') sim.usePower(p.id);
    else if (msg.type === 'throw') sim.throwGrenade(p.id);
    else if (msg.type === 'dash') sim.dash(p.id);
    else if (msg.type === 'brk' && s.brk && !s.brk.done && !(p.id in s.brk.answered)) {
      const pick = s.brk.opts[msg.i];
      const ok = pick === s.brk.a;
      s.brk.answered[p.id] = ok;
      if (ok) { sim.grantPower(p.id); g.award(p.id, 40, 'quiz', 1); }
      g.changed();
    }
  },
  timeout(g) { g.next(); },
  skip(g, s) {
    if (s.sub === 'fight') {
      const sim = getSim(g);
      if (sim) sim.done = true;
      this.finish(g, s);
    } else g.next();
  },
  exit(g) { sims.delete(g); },
  playerLeft(g, s, id) { getSim(g)?.removePlayer(id); },
  tv: (g, s) => ({
    sub: s.sub, board: s.board || null, teamKills: s.teamKills || null,
    brk: s.brk ? { q: s.brk.q, opts: s.brk.opts, done: !!s.brk.done, a: s.brk.done ? s.brk.a : null, right: Object.values(s.brk.answered).filter(Boolean).length, answered: Object.keys(s.brk.answered).length } : null,
  }),
  phone: (g, s, p) => ({
    sub: s.sub, hud: getSim(g)?.hud(p.id) || null, kills: s.board?.find((b) => b.pid === p.id)?.kills ?? null,
    brk: s.brk ? { q: s.brk.q, opts: s.brk.opts, ends: s.brk.ends, mine: s.brk.answered[p.id] ?? null, done: !!s.brk.done, a: s.brk.done || p.id in s.brk.answered ? s.brk.a : null } : null,
  }),
};
