// Chapter V — "Solah Shringar Ki Khoj": a team treasure hunt through the haveli, simulated at 30 Hz.
// Every team roams the same haveli, chasing its own trail of five stations. A riddle names the room;
// the mini-map's hint zone narrows over time. Reaching the station puts a shaadi question on the team's phones;
// the first right answer recovers one of the bride's adornments and reveals the next riddle.
// Two of Chandravati's shadows drift through the halls — touch one and you freeze; hold up your diya to push her back.
import { makeRng } from '../util.js';
import { TILE, WORLD_W, WORLD_H, HUNT_ROOMS, ITEMS, START, solidAt, tileCenter, roomCenter, GRID, COLS, ROWS } from '../../../public/shared/haveli-map.js';

const PR = 14; // player radius
const SPEED = 215;
const REACH = 46; // how close counts as "at the station"
const HINT_START = 300;
const HINT_MIN = 46;
const HINT_STEP_S = 25;
const FREEZE_S = 3;
const LOCK_S = 8;

export class HuntSim {
  // teams: [{ id, members: [pid] }]
  constructor({ seed = 1, fast = false, teams = [], stations = 5, duration = null, hooks = {} } = {}) {
    this.rng = makeRng(seed);
    this.fast = fast;
    this.hooks = hooks; // { arrive(teamId), found(teamId, item), finish(teamId, place) }
    this.t = 0;
    this.phase = 'warmup';
    this.phaseEnds = fast ? 1 : 6;
    this.duration = duration ?? (fast ? 25 : 480);
    this.ends = Infinity;
    this.players = new Map();
    this.events = [];
    this.finished = [];
    this.done = false;
    const itemDeck = this.rng.shuffle(ITEMS.map((_, i) => i));
    this.teams = teams.map((t, ti) => {
      // each team gets its own order of rooms (rotated so teams start in different wings) and its own spot per room
      const rooms = this.rng.shuffle(HUNT_ROOMS.map((_, i) => i));
      const offset = ti * 2;
      const order = rooms.map((_, i) => rooms[(i + offset) % rooms.length]).slice(0, stations);
      return {
        id: t.id, idx: ti, members: t.members.slice(),
        stations: order.map((ri, k) => {
          const room = HUNT_ROOMS[ri];
          const [c, r] = room.spots[(ti + k) % room.spots.length];
          const [x, y] = tileCenter(c, r);
          return { room: room.id, roomName: room.name, x, y, riddle: this.rng.pick(room.riddles), item: itemDeck[(ti * stations + k) % itemDeck.length] };
        }),
        at: 0, // index of the current station
        since: 0, // when the current station became active
        lockUntil: 0,
        asking: false, // a question is on the team's phones
        hint: null,
        finishedAt: null,
      };
    });
    for (const t of teams) for (const id of t.members) this.addPlayer(id, t.id);
    this.ghosts = [0, 1].map((i) => {
      const [x, y] = this.randomFloor();
      return { id: i + 1, x, y, tx: x, ty: y, vx: 0, vy: 0, chase: null, pushed: 0 };
    });
  }

  addPlayer(id, teamId) {
    if (this.players.has(id)) return;
    const k = this.players.size;
    const p = { id, team: teamId, x: START[0] + ((k % 6) - 2.5) * 30, y: START[1] - Math.floor(k / 6) * 30, mx: 0, my: 0, diya: false, frozenUntil: 0, moving: false };
    this.players.set(id, p);
    const team = this.team(teamId);
    if (team && !team.members.includes(id)) team.members.push(id);
  }
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.players.delete(id);
    const team = this.team(p.team);
    if (team) team.members = team.members.filter((m) => m !== id);
  }
  team(id) { return this.teams.find((t) => t.id === id); }
  setInput(id, mx, my, diya) {
    const p = this.players.get(id);
    if (!p) return;
    mx = Number(mx) || 0; my = Number(my) || 0;
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    p.mx = mx; p.my = my; p.diya = !!diya;
  }
  ev(e) { this.events.push(e); }
  randomFloor() {
    for (let i = 0; i < 200; i++) {
      const c = this.rng.int(COLS);
      const r = this.rng.int(ROWS);
      if (!solidAt(c, r) && Math.hypot(c * TILE - START[0], r * TILE - START[1]) > 500) return tileCenter(c, r);
    }
    return [WORLD_W / 2, WORLD_H / 2];
  }

  // Tile collision: move each axis separately and push out of solid tiles.
  move(o, dx, dy, r) {
    o.x += dx;
    this.collideAxis(o, r, true);
    o.y += dy;
    this.collideAxis(o, r, false);
  }
  collideAxis(o, r, horizontal) {
    const c0 = Math.floor((o.x - r) / TILE);
    const c1 = Math.floor((o.x + r) / TILE);
    const r0 = Math.floor((o.y - r) / TILE);
    const r1 = Math.floor((o.y + r) / TILE);
    for (let rr = r0; rr <= r1; rr++) {
      for (let cc = c0; cc <= c1; cc++) {
        if (!solidAt(cc, rr)) continue;
        const left = cc * TILE;
        const top = rr * TILE;
        if (horizontal) {
          if (o.x < left + TILE / 2) o.x = Math.min(o.x, left - r - 0.01); else o.x = Math.max(o.x, left + TILE + r + 0.01);
        } else if (o.y < top + TILE / 2) o.y = Math.min(o.y, top - r - 0.01); else o.y = Math.max(o.y, top + TILE + r + 0.01);
      }
    }
  }

  // ---------- station flow ----------
  startStation(team) {
    team.since = this.t;
    const st = team.stations[team.at];
    if (!st) return;
    // The hint zone starts room-sized, offset from the true spot, and closes in on it over time.
    const a = this.rng() * Math.PI * 2;
    const off = (HINT_START - HINT_MIN) * (0.35 + this.rng() * 0.45);
    team.hint = { ox: Math.cos(a) * off, oy: Math.sin(a) * off };
    this.ev({ e: 'clue', team: team.id, at: team.at });
  }
  hintFor(team) {
    const st = team.stations[team.at];
    if (!st || !team.hint) return null;
    // catch-up: teams trailing the leader by 2+ items narrow faster
    const lead = Math.max(...this.teams.map((t) => t.at));
    const pace = lead - team.at >= 2 ? 1.6 : 1;
    const steps = Math.floor(((this.t - team.since) * pace) / (this.fast ? 2 : HINT_STEP_S));
    const r = Math.max(HINT_MIN, HINT_START - steps * 60);
    const k = (r - HINT_MIN) / (HINT_START - HINT_MIN);
    return { x: st.x + team.hint.ox * k, y: st.y + team.hint.oy * k, r };
  }
  // Called by the step when the team's question is answered.
  answer(teamId, correct, pid) {
    const team = this.team(teamId);
    if (!team || !team.asking) return;
    team.asking = false;
    if (!correct) {
      team.lockUntil = this.t + (this.fast ? 1 : LOCK_S);
      this.ev({ e: 'wrong', team: teamId });
      // Chandravati comes looking for the team that got it wrong
      const g = this.ghosts[this.rng.int(this.ghosts.length)];
      const m = this.players.get(team.members[0]);
      if (m) { const [x, y] = this.near(m.x, m.y, 260); g.x = x; g.y = y; this.ev({ e: 'ghostTp', id: g.id, x: x | 0, y: y | 0 }); }
      return;
    }
    const st = team.stations[team.at];
    this.ev({ e: 'found', team: teamId, item: st.item, pid, x: st.x | 0, y: st.y | 0 });
    this.hooks.found?.(teamId, st.item, pid);
    team.at++;
    if (team.at >= team.stations.length) {
      team.finishedAt = this.t;
      this.finished.push(teamId);
      this.ev({ e: 'finish', team: teamId, place: this.finished.length });
      this.hooks.finish?.(teamId, this.finished.length);
      if (this.finished.length === this.teams.length) this.end();
    } else this.startStation(team);
  }
  near(x, y, d) {
    for (let i = 0; i < 40; i++) {
      const a = this.rng() * Math.PI * 2;
      const nx = x + Math.cos(a) * d;
      const ny = y + Math.sin(a) * d;
      if (!solidAt(Math.floor(nx / TILE), Math.floor(ny / TILE))) return [nx, ny];
    }
    return this.randomFloor();
  }
  end() {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.phaseEnds = this.t + (this.fast ? 1 : 5);
    this.ev({ e: 'over', finished: this.finished.slice() });
  }

  step(dt) {
    if (this.done) return;
    this.t += dt;
    if (this.phase === 'warmup' && this.t >= this.phaseEnds) {
      this.phase = 'hunt';
      this.ends = this.t + this.duration;
      for (const team of this.teams) this.startStation(team);
      this.ev({ e: 'go' });
    } else if (this.phase === 'hunt' && this.t >= this.ends) this.end();
    else if (this.phase === 'over' && this.t >= this.phaseEnds) { this.done = true; return; }

    for (const p of this.players.values()) {
      const frozen = this.t < p.frozenUntil;
      const sp = frozen ? 0 : SPEED * (p.diya ? 0.6 : 1);
      const ox = p.x; const oy = p.y;
      this.move(p, p.mx * sp * dt, p.my * sp * dt, PR);
      p.moving = Math.hypot(p.x - ox, p.y - oy) > 0.5;
    }
    if (this.phase !== 'hunt') return;

    // arrivals
    for (const team of this.teams) {
      if (team.finishedAt != null || team.asking || this.t < team.lockUntil) continue;
      const st = team.stations[team.at];
      if (!st) continue;
      for (const id of team.members) {
        const p = this.players.get(id);
        if (p && Math.hypot(p.x - st.x, p.y - st.y) < REACH) {
          team.asking = true;
          this.ev({ e: 'arrive', team: team.id, pid: id, x: st.x | 0, y: st.y | 0 });
          this.hooks.arrive?.(team.id, id);
          break;
        }
      }
    }
    // ghosts: drift between rooms, stalk whoever comes close, recoil from a raised diya
    for (const g of this.ghosts) {
      let target = null;
      let bd = 260;
      for (const p of this.players.values()) {
        if (this.t < p.frozenUntil) continue;
        const d = Math.hypot(p.x - g.x, p.y - g.y);
        if (d < bd) { bd = d; target = p; }
      }
      let dirx = 0; let diry = 0; let sp = 70;
      if (target && target.diya && bd < 170) {
        dirx = g.x - target.x; diry = g.y - target.y; sp = 150; g.pushed = this.t;
      } else if (target && this.t - g.pushed > 1.5) {
        dirx = target.x - g.x; diry = target.y - g.y; sp = 112;
      } else {
        if (Math.hypot(g.tx - g.x, g.ty - g.y) < 30 || this.rng() < 0.002) [g.tx, g.ty] = this.randomFloor();
        dirx = g.tx - g.x; diry = g.ty - g.y;
      }
      const m = Math.hypot(dirx, diry) || 1;
      // ghosts glide through furniture but not outer walls
      g.x = Math.max(TILE * 2, Math.min(WORLD_W - TILE * 2, g.x + (dirx / m) * sp * dt));
      g.y = Math.max(TILE * 2, Math.min(WORLD_H - TILE * 2, g.y + (diry / m) * sp * dt));
      g.vx = dirx / m; g.vy = diry / m;
      if (target && bd < 28 && !target.diya) {
        target.frozenUntil = this.t + (this.fast ? 0.5 : FREEZE_S);
        this.ev({ e: 'freeze', pid: target.id, x: target.x | 0, y: target.y | 0 });
        [g.x, g.y] = this.near(target.x, target.y, 520);
        g.pushed = this.t;
      }
    }
  }

  // ---------- network ----------
  snapshot() {
    const ids = [];
    const p = [];
    const teamIdx = Object.fromEntries(this.teams.map((t, i) => [t.id, i]));
    for (const q of this.players.values()) {
      ids.push(q.id);
      p.push([q.x, q.y, (this.t < q.frozenUntil ? 1 : 0) | (q.diya ? 2 : 0) | (q.moving ? 4 : 0), teamIdx[q.team] ?? 0]);
    }
    const g = this.ghosts.map((o) => [o.id, o.x, o.y, o.vx * 100, this.t - o.pushed < 0.4 ? 1 : 0]);
    const s = this.teams.map((t) => {
      const st = t.stations[t.at];
      const h = this.hintFor(t);
      return [t.idx, st ? st.x : -1, st ? st.y : -1, h ? h.x : -1, h ? h.y : -1, h ? h.r : 0, t.at, (t.asking ? 1 : 0) | (this.t < t.lockUntil ? 2 : 0) | (t.finishedAt != null ? 4 : 0), st ? st.item : -1];
    });
    const meta = {
      phase: this.phase,
      left: Math.max(0, Math.round((this.phase === 'warmup' ? this.phaseEnds : this.ends) - this.t)),
      ids,
      teams: this.teams.map((t) => t.id),
      found: this.teams.map((t) => t.stations.slice(0, t.at).map((s) => s.item)),
      finished: this.finished,
      ev: this.events,
    };
    this.events = [];
    return { t: Math.round(this.t * 1000), tables: { p, g, s }, meta };
  }
  hud(id) {
    const p = this.players.get(id);
    if (!p) return null;
    const team = this.team(p.team);
    const st = team?.stations[team.at];
    const d = st ? Math.hypot(p.x - st.x, p.y - st.y) : null;
    // hot/cold: a 0–100 "garam" meter from the player's own distance to the station
    const heat = d == null ? 0 : Math.max(0, Math.min(100, Math.round(100 - (d / 900) * 100)));
    return {
      phase: this.phase,
      left: Math.max(0, Math.round((this.phase === 'warmup' ? this.phaseEnds : this.ends) - this.t)),
      at: team?.at || 0, total: team?.stations.length || 0,
      riddle: st && this.phase === 'hunt' ? st.riddle : null,
      item: st ? st.item : null,
      found: team ? team.stations.slice(0, team.at).map((s) => s.item) : [],
      heat, frozen: this.t < p.frozenUntil, locked: team ? Math.max(0, Math.ceil(team.lockUntil - this.t)) : 0,
      finished: team?.finishedAt != null, place: team ? this.finished.indexOf(team.id) + 1 : 0,
    };
  }
}

export { GRID, roomCenter };
