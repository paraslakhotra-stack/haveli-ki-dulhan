// Chapter V step wrapper: owns the ArenaSim, feeds it input and turns its events into points and stats.
import { ArenaSim, ZTYPES } from '../arena/sim.js';

// The sim is transient (not serialised) — a restored game simply restarts the fight.
const sims = new WeakMap();
export const getSim = (g) => sims.get(g) || null;

export const arena = {
  enter(g, s) {
    const players = g.connectedPlayers().map((p) => ({ id: p.id, team: p.team, perks: p.perks, relics: g.team(p.team)?.relics || [] }));
    const sim = new ArenaSim({
      seed: g.rng.int(1e9),
      fast: g.fast,
      players,
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
    s.hudAt = 0;
  },
  // Called by the server loop at 30 Hz.
  simTick(g, s, dt) {
    const sim = getSim(g);
    if (!sim || s.sub !== 'fight') return null;
    for (const p of g.connectedPlayers()) {
      if (!sim.players.has(p.id)) sim.addPlayer({ id: p.id, team: p.team, perks: p.perks, relics: g.team(p.team)?.relics || [] });
    }
    sim.step(dt);
    // Boss damage converts to points in chunks so the score ticks up visibly.
    for (const [pid, n] of Object.entries(s.bossAcc)) {
      if (n >= 10) { const pts = Math.floor(n / 10); g.award(pid, pts, 'bossDmg', pts * 10); s.bossAcc[pid] = n - pts * 10; }
    }
    const snap = sim.snapshot();
    if (sim.done) this.finish(g, s);
    // Phone HUDs ride on the normal view updates, ~5 per second.
    s.hudAt += dt;
    if (s.hudAt > 0.2) { s.hudAt = 0; g.changed(); }
    return snap;
  },
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
  tv: (g, s) => ({ sub: s.sub, board: s.board || null, teamKills: s.teamKills || null }),
  phone: (g, s, p) => ({ sub: s.sub, hud: getSim(g)?.hud(p.id) || null, kills: s.board?.find((b) => b.pid === p.id)?.kills ?? null }),
};
