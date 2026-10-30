// Chapter VI — "Murda Baraat". An authoritative top-down zombie arena simulated at 30 Hz.
// Phones are twin-stick gamepads: left stick moves, right stick aims; guns never stop firing (with no aim
// input they lock onto the nearest zombie). Buttons: dash, nimbu-mirchi bomb, power.
// The TV gets compact binary snapshots (see public/shared/rtcodec.js) and interpolates between them.
import { makeRng } from '../util.js';

export const W = 1600;
export const H = 900;
const PR = 18; // player radius

export const WEAPONS = [
  { id: 'revolver', name: 'Desi Katta', kind: 'shot', rate: 2.6, dmg: 24, pellets: 1, spread: 0.03, range: 390, at: 0 },
  { id: 'shotgun', name: 'Dunali', kind: 'shot', rate: 1.35, dmg: 15, pellets: 7, spread: 0.34, range: 310, at: 6 },
  { id: 'tommy', name: 'Tommy Gun', kind: 'shot', rate: 9, dmg: 12, pellets: 1, spread: 0.11, range: 430, at: 16 },
  { id: 'candle', name: 'Phuljhadi Flamer', kind: 'flame', rate: 12, dmg: 7, range: 200, cone: 0.5, at: 30 },
  { id: 'bell', name: 'Anaar Rocket', kind: 'beam', rate: 2.2, dmg: 70, range: 720, at: 50 },
];

export const ZTYPES = {
  walker: { i: 0, hp: 34, speed: 52, r: 16, dps: 14, pts: 10 },
  runner: { i: 1, hp: 22, speed: 118, r: 14, dps: 10, pts: 12 },
  bridesmaid: { i: 2, hp: 55, speed: 64, r: 16, dps: 12, pts: 20 },
  bloater: { i: 3, hp: 95, speed: 38, r: 25, dps: 18, pts: 25 },
  boss: { i: 4, hp: 1500, speed: 72, r: 46, dps: 28, pts: 0 },
};
const ZTYPE_BY_I = Object.keys(ZTYPES);

export const POWERS = ['coldfeet', 'prenup', 'lastdance', 'bestman', 'bouquet'];
export const PICKUP_KINDS = ['grenade', ...POWERS];
const DASH_TIME = 0.2;
const DASH_SPEED = 820;
const DASH_COOLDOWN = 3;

export const OBSTACLES = [
  { x: 800, y: 450, r: 62, kind: 'fountain' },
  { x: 380, y: 230, r: 30, kind: 'statue' },
  { x: 1220, y: 230, r: 30, kind: 'statue' },
  { x: 380, y: 670, r: 30, kind: 'statue' },
  { x: 1220, y: 670, r: 30, kind: 'statue' },
  { x: 560, y: 120, r: 22, kind: 'grave' },
  { x: 1040, y: 780, r: 22, kind: 'grave' },
  { x: 180, y: 460, r: 40, kind: 'tree' },
  { x: 1420, y: 440, r: 40, kind: 'tree' },
  { x: 640, y: 760, r: 24, kind: 'grave' },
  { x: 980, y: 130, r: 24, kind: 'grave' },
];

const GATES = [
  [-40, 450], [W + 40, 450], [800, -40], [800, H + 40], [-40, -40], [W + 40, -40], [-40, H + 40], [W + 40, H + 40], [400, -40], [1200, H + 40],
];

function waveDefs(n, fast) {
  if (fast) {
    return [
      { title: 'The Baraat Arrives', spawn: { walker: 3 }, over: 1 },
      { title: 'The Gossip Aunties', spawn: { runner: 2, bridesmaid: 1 }, over: 1 },
      { title: 'Fufaji Is Angry', spawn: { bloater: 2 }, over: 1 },
      { title: 'Kunwar Vikram, the Bhoot Dulha', boss: true, spawn: { walker: 2 }, over: 1 },
    ];
  }
  return [
    { title: 'The Baraat Arrives', spawn: { walker: 12 + 4 * n }, over: 26 },
    { title: 'The Gossip Aunties', spawn: { walker: 6 + 2 * n, runner: 5 + 2 * n, bridesmaid: 2 + Math.floor(n / 3) }, over: 30 },
    { title: 'Fufaji Is Angry', spawn: { walker: 8 + 2 * n, runner: 5 + 2 * n, bloater: 3 + n, bridesmaid: 2 }, over: 34 },
    { title: 'Kunwar Vikram, the Bhoot Dulha', boss: true, spawn: { walker: 6 + 2 * n }, over: 45 },
  ];
}

export class ArenaSim {
  constructor({ seed = 1, fast = false, players = [], hooks = {}, breakAfter = 1, waves = null } = {}) {
    this.rng = makeRng(seed);
    this.fast = fast;
    this.hooks = hooks; // { kill(pid, type), down(pid), revive(pid, by), bossDmg(pid, n) }
    this.t = 0;
    this.players = new Map();
    this.zombies = [];
    this.pickups = [];
    this.grenades = [];
    this.allies = [];
    this.events = [];
    this.nextId = 1;
    this.slowUntil = 0;
    this.waveIdx = -1;
    this.phase = 'warmup';
    this.phaseEnds = fast ? 1.2 : 16;
    this.queue = [];
    this.waveEnds = 0;
    this.boss = null;
    this.done = false;
    this.waves = waveDefs(Math.max(1, players.length), fast);
    if (waves) this.waves = this.waves.slice(this.waves.length - waves); // short night: drop the opening waves
    this.breakAfter = breakAfter; // wave index after which the "Baraat Break" quiz pauses the fight (-1: never)
    this.inBreak = false;
    for (const p of players) this.addPlayer(p);
  }

  // ---------- players ----------
  // items: how many solah-shringar pieces the player's team recovered in the treasure hunt.
  addPlayer({ id, team, perks = [], relics = [], items = 0 }) {
    if (this.players.has(id)) return;
    const a = (this.players.size / 8) * Math.PI * 2;
    const tier = Math.min(WEAPONS.length - 1, (relics.includes('musicbox') ? 1 : 0) + (items >= 2 ? 1 : 0));
    const maxHp = Math.round((relics.includes('wine') ? 150 : 100) * (items >= 1 ? 1.15 : 1));
    this.players.set(id, {
      id, team, perks, relics, x: 800 + Math.cos(a) * 130, y: 450 + Math.sin(a) * 130,
      mx: 0, my: 0, ax: 0, ay: 0, aim: 0, hp: maxHp, maxHp, down: false, downAt: 0, revive: 0, reviver: null,
      kills: 0, tier, tierFloor: tier, cool: 0, firing: 0,
      power: perks.includes('lullaby') ? 'bestman' : items >= 3 ? this.rng.pick(POWERS) : null,
      grenades: 2, speedUntil: 0, shieldUntil: 0, allyUntil: 0, allyCool: 0,
      dashUntil: 0, dashReady: 0, dashCd: items >= 4 ? DASH_COOLDOWN / 2 : DASH_COOLDOWN, dx: 1, dy: 0, hitAt: -9,
    });
  }
  removePlayer(id) { this.players.delete(id); }
  setMove(id, x, y) { this.setInput(id, x, y, 0, 0); }
  // Twin-stick state, each axis -1..1. An aim vector shorter than 0.3 means "auto-aim".
  setInput(id, mx, my, ax = 0, ay = 0) {
    const p = this.players.get(id);
    if (!p) return;
    const norm = (x, y) => {
      x = Number(x) || 0; y = Number(y) || 0;
      const m = Math.hypot(x, y);
      return m > 1 ? [x / m, y / m] : [x, y];
    };
    [p.mx, p.my] = norm(mx, my);
    [p.ax, p.ay] = norm(ax, ay);
  }
  dash(id) {
    const p = this.players.get(id);
    if (!p || p.down || this.t < p.dashReady) return;
    const m = Math.hypot(p.mx, p.my);
    if (m > 0.2) { p.dx = p.mx / m; p.dy = p.my / m; } else { p.dx = Math.cos(p.aim); p.dy = Math.sin(p.aim); }
    p.dashUntil = this.t + DASH_TIME;
    p.dashReady = this.t + p.dashCd;
    this.ev({ e: 'dash', pid: id, x: p.x | 0, y: p.y | 0, a: Math.round(Math.atan2(p.dy, p.dx) * 100) });
  }
  // The Baraat Break quiz hands out a power to every correct answer.
  grantPower(id) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.power) { p.grenades = Math.min(5, p.grenades + 2); this.ev({ e: 'pickup', pid: id, kind: 'grenade' }); return; }
    p.power = this.rng.pick(POWERS);
    this.ev({ e: 'pickup', pid: id, kind: p.power });
  }
  usePower(id) {
    const p = this.players.get(id);
    if (!p || p.down || !p.power) return;
    const pw = p.power;
    p.power = null;
    const t = this.t;
    if (pw === 'coldfeet') p.speedUntil = t + 6;
    if (pw === 'prenup') p.shieldUntil = t + 6;
    if (pw === 'lastdance') this.slowUntil = t + 5;
    if (pw === 'bestman') p.allyUntil = t + 11;
    if (pw === 'bouquet') this.explode(p.x, p.y, 250, 220, id, true);
    this.ev({ e: 'power', pid: id, pw, x: p.x | 0, y: p.y | 0 });
  }
  throwGrenade(id) {
    const p = this.players.get(id);
    if (!p || p.down || p.grenades <= 0) return;
    p.grenades--;
    // Thrown where you're aiming; with no aim input, lobbed at the nearest zombie.
    const manual = Math.hypot(p.ax, p.ay) >= 0.3;
    const tgt = manual ? null : this.nearestZombie(p.x, p.y, 380);
    const ang = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : p.aim;
    const dist = tgt ? Math.min(340, Math.hypot(tgt.x - p.x, tgt.y - p.y)) : 120 + 220 * Math.min(1, Math.hypot(p.ax, p.ay));
    this.grenades.push({ x: p.x, y: p.y, tx: p.x + Math.cos(ang) * dist, ty: p.y + Math.sin(ang) * dist, t0: this.t, dur: 0.7, pid: id });
    this.ev({ e: 'throw', pid: id });
  }

  // ---------- helpers ----------
  ev(e) { this.events.push(e); }
  weapon(p) {
    const w = WEAPONS[p.tier];
    const rate = w.rate * (p.perks.includes('steady') ? 1.25 : 1);
    const dmg = w.dmg * (p.perks.includes('exorcist') ? 1.3 : 1);
    const range = w.range * (p.perks.includes('thirdeye') ? 1.3 : 1);
    return { ...w, rate, dmg, range };
  }
  nearestZombie(x, y, range) {
    let best = null;
    let bd = range * range;
    for (const z of this.zombies) {
      const d = (z.x - x) ** 2 + (z.y - y) ** 2;
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  }
  standing() { return [...this.players.values()].filter((p) => !p.down); }

  spawn(type, at) {
    const def = ZTYPES[type];
    const n = Math.max(1, this.players.size);
    const [gx, gy] = at || GATES[this.rng.int(GATES.length)];
    const hpScale = this.fast ? 0.05 : 1 + 0.05 * n;
    const z = {
      id: this.nextId++, type, x: gx + (this.rng() - 0.5) * 60, y: gy + (this.rng() - 0.5) * 60,
      hp: def.hp * hpScale, maxHp: def.hp * hpScale, r: def.r, angle: 0,
      speed: def.speed * (0.85 + this.rng() * 0.3), frenzyUntil: 0, screamAt: this.t + 3 + this.rng() * 4, wob: this.rng() * 6,
    };
    if (type === 'boss') {
      z.hp = z.maxHp = this.fast ? 40 : 1400 + 280 * n;
      z.state = 'walk';
      z.stateEnds = this.t + 5;
      z.summoned = 0;
      z.x = 800; z.y = -60;
      this.boss = z;
    }
    this.zombies.push(z);
    return z;
  }

  damage(z, amount, pid) {
    if (z.hp <= 0) return;
    let dmg = amount;
    if (z.type === 'boss') {
      if (z.state === 'stun') dmg *= 3;
      this.hooks.bossDmg?.(pid, Math.min(dmg, z.hp));
    }
    z.hp -= dmg;
    z.hit = this.t;
    if (z.hp <= 0) this.kill(z, pid);
  }
  kill(z, pid) {
    this.zombies = this.zombies.filter((o) => o !== z);
    const p = this.players.get(pid);
    if (z.type === 'boss') {
      this.boss = null;
      this.ev({ e: 'bossDie', x: z.x | 0, y: z.y | 0 });
      // The dead lose their master — everything left crumbles.
      for (const o of this.zombies.slice()) { this.ev({ e: 'kill', x: o.x | 0, y: o.y | 0, z: ZTYPES[o.type].i, burn: 1 }); }
      this.zombies = [];
    } else {
      this.ev({ e: 'kill', x: z.x | 0, y: z.y | 0, z: ZTYPES[z.type].i, pid: pid || null, v: z.id % 4 });
      if (z.type === 'bloater') this.explode(z.x, z.y, 100, 45, pid, false, true);
    }
    if (p) {
      p.kills++;
      const next = WEAPONS.reduce((acc, w, i) => (p.kills >= w.at ? i : acc), 0);
      if (next > p.tier) { p.tier = next; this.ev({ e: 'level', pid, tier: next }); }
    }
    this.hooks.kill?.(pid, z.type);
    const roll = this.rng();
    if (z.type !== 'boss') {
      if (roll < 0.1) this.pickups.push({ id: this.nextId++, kind: this.rng.pick(POWERS), x: z.x, y: z.y, until: this.t + 14 });
      else if (roll < 0.15) this.pickups.push({ id: this.nextId++, kind: 'grenade', x: z.x, y: z.y, until: this.t + 14 });
    }
  }
  explode(x, y, radius, dmg, pid, holy = false, hurtsPlayers = false) {
    this.ev({ e: 'boom', x: x | 0, y: y | 0, r: radius, holy: holy ? 1 : 0 });
    for (const z of this.zombies.slice()) {
      const d = Math.hypot(z.x - x, z.y - y);
      if (d < radius + z.r) this.damage(z, z.type === 'boss' ? dmg * 0.6 : dmg, pid);
    }
    if (hurtsPlayers) {
      for (const p of this.players.values()) {
        if (!p.down && Math.hypot(p.x - x, p.y - y) < radius) this.hurt(p, 22);
      }
    }
  }
  hurt(p, amount) {
    if (p.down || this.t < p.shieldUntil || this.t < p.dashUntil) return;
    p.hp -= amount;
    p.hitAt = this.t;
    if (p.hp <= 0) {
      p.hp = 0;
      p.down = true;
      p.downAt = this.t;
      p.revive = 0;
      this.ev({ e: 'down', pid: p.id });
      this.hooks.down?.(p.id);
    }
  }

  // ---------- main step ----------
  step(dt) {
    if (this.done) return;
    this.t += dt;
    this.phases();
    const slow = this.t < this.slowUntil ? 0.35 : 1;

    // Players: move, revive, fire
    for (const p of this.players.values()) {
      let sp = 235 * (p.perks.includes('quickdraw') ? 1.2 : 1) * (this.t < p.speedUntil ? 1.7 : 1);
      if (p.down) sp = 55;
      if (!p.down && this.t < p.dashUntil) {
        p.x += p.dx * DASH_SPEED * dt;
        p.y += p.dy * DASH_SPEED * dt;
      } else {
        p.x += p.mx * sp * dt;
        p.y += p.my * sp * dt;
      }
      this.collide(p, PR, 20);
      if (p.down) {
        const helper = this.standing().find((o) => Math.hypot(o.x - p.x, o.y - p.y) < 64);
        if (helper) p.revive += dt; else p.revive = Math.max(0, p.revive - dt * 0.5);
        p.reviver = helper ? helper.id : null;
        const auto = this.t - p.downAt > (this.fast ? 1 : 8);
        if (p.revive >= 1.8 || auto) {
          p.down = false;
          p.hp = Math.round(p.maxHp * (auto ? 0.4 : 0.6));
          p.shieldUntil = this.t + 1.5;
          this.ev({ e: 'revive', pid: p.id, by: auto ? null : helper?.id });
          if (!auto && helper) this.hooks.revive?.(p.id, helper.id);
        }
        continue;
      }
      if (!this.inBreak) this.fire(p, dt);
      if (this.t < p.allyUntil) this.allyFire(p, dt);
      for (const k of this.pickups.slice()) {
        if (Math.hypot(k.x - p.x, k.y - p.y) > 34) continue;
        if (k.kind === 'grenade') { if (p.grenades >= 5) continue; p.grenades++; }
        else { if (p.power) continue; p.power = k.kind; }
        this.pickups = this.pickups.filter((o) => o !== k);
        this.ev({ e: 'pickup', pid: p.id, kind: k.kind });
      }
    }
    this.pickups = this.pickups.filter((k) => k.until > this.t);

    // Grenades in flight
    for (const gr of this.grenades.slice()) {
      if (this.t - gr.t0 >= gr.dur) {
        this.grenades = this.grenades.filter((o) => o !== gr);
        this.explode(gr.tx, gr.ty, 125, 95, gr.pid, true);
      }
    }

    // Zombies
    const targets = this.standing();
    const pool = targets.length ? targets : [...this.players.values()];
    for (const z of this.zombies) {
      if (z.type === 'boss') { this.bossStep(z, dt, pool, slow); continue; }
      let tgt = null;
      let bd = Infinity;
      for (const p of pool) { const d = (p.x - z.x) ** 2 + (p.y - z.y) ** 2; if (d < bd) { bd = d; tgt = p; } }
      if (!tgt) continue;
      const ang = Math.atan2(tgt.y - z.y, tgt.x - z.x);
      z.angle = ang;
      const frenzy = this.t < z.frenzyUntil ? 1.55 : 1;
      const sp = z.speed * slow * frenzy;
      z.x += Math.cos(ang) * sp * dt;
      z.y += Math.sin(ang) * sp * dt;
      if (z.type === 'bridesmaid' && this.t > z.screamAt) {
        z.screamAt = this.t + 6 + this.rng() * 3;
        if (Math.sqrt(bd) < 520) {
          this.ev({ e: 'scream', x: z.x | 0, y: z.y | 0 });
          for (const o of this.zombies) if (Math.hypot(o.x - z.x, o.y - z.y) < 280) o.frenzyUntil = this.t + 3.5;
        }
      }
      if (z.type === 'bloater') z.swell = Math.sqrt(bd) < 150; // Fufaji puffs up before he blows
      if (z.type === 'bloater' && Math.sqrt(bd) < z.r + PR + 6 && !tgt.down) { this.damage(z, 9999, null); continue; }
      if (!tgt.down && Math.sqrt(bd) < z.r + PR + 4) this.hurt(tgt, ZTYPES[z.type].dps * dt);
    }
    // Separation (keeps hordes readable) + obstacles + loose bounds
    const zs = this.zombies;
    for (let i = 0; i < zs.length; i++) {
      const a = zs[i];
      for (let j = i + 1; j < zs.length; j++) {
        const b = zs[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          const wa = a.type === 'boss' ? 0.1 : 1;
          const wb = b.type === 'boss' ? 0.1 : 1;
          a.x -= nx * push * wa; a.y -= ny * push * wa;
          b.x += nx * push * wb; b.y += ny * push * wb;
        }
      }
      this.collide(a, a.r, -80);
    }
    this.zombies = this.zombies.filter((z) => z.hp > 0);
  }

  collide(o, r, margin) {
    for (const ob of OBSTACLES) {
      const dx = o.x - ob.x;
      const dy = o.y - ob.y;
      const d = Math.hypot(dx, dy);
      const min = ob.r + r;
      if (d < min) {
        if (d < 0.001) { o.x += min; continue; }
        o.x = ob.x + (dx / d) * min;
        o.y = ob.y + (dy / d) * min;
      }
    }
    const lo = margin;
    o.x = Math.max(lo + r, Math.min(W - lo - r, o.x));
    o.y = Math.max(lo + r, Math.min(H - lo - r, o.y));
  }

  fire(p, dt) {
    p.cool -= dt;
    const w = this.weapon(p);
    if (Math.hypot(p.ax, p.ay) >= 0.3) p.aim = Math.atan2(p.ay, p.ax); // manual aim
    else {
      const tgt = this.nearestZombie(p.x, p.y, w.range);
      if (tgt) p.aim = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    }
    // Guns never stop — but between waves (nothing to shoot) they rest so the yard can breathe.
    if (this.phase !== 'fight' && !this.zombies.length) { p.firing = Math.max(0, p.firing - dt); return; }
    if (p.cool > 0) return;
    p.cool = 1 / w.rate;
    p.firing = 0.25;
    if (w.kind === 'shot') {
      for (let k = 0; k < w.pellets; k++) {
        const a = p.aim + (this.rng() - 0.5) * w.spread * 2;
        const hit = this.rayHit(p.x, p.y, a, w.range);
        const len = hit ? hit.t : w.range;
        if (hit) this.damage(hit.z, w.dmg, p.id);
        this.ev({ e: 'shot', w: p.tier, x: p.x | 0, y: p.y | 0, a: Math.round(a * 100), l: len | 0, h: hit ? 1 : 0 });
      }
    } else if (w.kind === 'flame') {
      for (const z of this.zombies.slice()) {
        const dx = z.x - p.x;
        const dy = z.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > w.range + z.r) continue;
        let da = Math.atan2(dy, dx) - p.aim;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < w.cone) this.damage(z, w.dmg, p.id);
      }
      this.ev({ e: 'flame', pid: p.id, a: Math.round(p.aim * 100) });
    } else if (w.kind === 'beam') {
      for (const z of this.zombies.slice()) {
        const dx = z.x - p.x;
        const dy = z.y - p.y;
        const t = dx * Math.cos(p.aim) + dy * Math.sin(p.aim);
        if (t < 0 || t > w.range) continue;
        const perp2 = dx * dx + dy * dy - t * t;
        if (perp2 <= (z.r + 10) ** 2) this.damage(z, w.dmg, p.id);
      }
      this.ev({ e: 'beam', x: p.x | 0, y: p.y | 0, a: Math.round(p.aim * 100), l: w.range | 0 });
    }
  }
  allyFire(p, dt) {
    p.allyCool -= dt;
    if (p.allyCool > 0) return;
    const ang = this.t * 3;
    const ax = p.x + Math.cos(ang) * 46;
    const ay = p.y + Math.sin(ang) * 46;
    const tgt = this.nearestZombie(ax, ay, 360);
    if (!tgt) return;
    p.allyCool = 0.28;
    const a = Math.atan2(tgt.y - ay, tgt.x - ax);
    const hit = this.rayHit(ax, ay, a, 360);
    if (hit) this.damage(hit.z, 18, p.id);
    this.ev({ e: 'shot', w: 9, x: ax | 0, y: ay | 0, a: Math.round(a * 100), l: hit ? hit.t | 0 : 360, h: hit ? 1 : 0 });
  }
  rayHit(x, y, a, range) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    let best = null;
    for (const z of this.zombies) {
      const dx = z.x - x;
      const dy = z.y - y;
      const t = dx * c + dy * s;
      if (t < 0 || t > range + z.r) continue;
      const perp2 = dx * dx + dy * dy - t * t;
      const r2 = z.r * z.r;
      if (perp2 > r2) continue;
      const th = t - Math.sqrt(r2 - perp2);
      if (!best || th < best.t) best = { z, t: Math.max(0, th) };
    }
    return best;
  }

  bossStep(z, dt, pool, slow) {
    let tgt = null;
    let bd = Infinity;
    for (const p of pool) { const d = (p.x - z.x) ** 2 + (p.y - z.y) ** 2; if (d < bd) { bd = d; tgt = p; } }
    if (!tgt) return;
    const frac = z.hp / z.maxHp;
    if ((frac < 0.66 && z.summoned === 0) || (frac < 0.33 && z.summoned === 1)) {
      z.summoned++;
      this.ev({ e: 'summon', x: z.x | 0, y: z.y | 0 });
      for (let i = 0; i < (this.fast ? 1 : 6); i++) this.spawn(i % 3 === 0 ? 'runner' : 'walker', [z.x + Math.cos(i) * 80, z.y + Math.sin(i) * 80]);
    }
    if (z.state === 'walk') {
      z.angle = Math.atan2(tgt.y - z.y, tgt.x - z.x);
      z.x += Math.cos(z.angle) * z.speed * slow * dt;
      z.y += Math.sin(z.angle) * z.speed * slow * dt;
      if (this.t > z.stateEnds && z.y > 60) { z.state = 'tele'; z.stateEnds = this.t + 1.1; this.ev({ e: 'roar', x: z.x | 0, y: z.y | 0 }); }
    } else if (z.state === 'tele') {
      z.angle = Math.atan2(tgt.y - z.y, tgt.x - z.x);
      if (this.t > z.stateEnds) { z.state = 'charge'; z.stateEnds = this.t + 1.4; z.cdir = z.angle; }
    } else if (z.state === 'charge') {
      const sp = 540 * slow;
      const nx = z.x + Math.cos(z.cdir) * sp * dt;
      const ny = z.y + Math.sin(z.cdir) * sp * dt;
      const hitWall = nx < z.r || nx > W - z.r || ny < z.r || ny > H - z.r;
      const hitObs = OBSTACLES.some((o) => Math.hypot(nx - o.x, ny - o.y) < o.r + z.r);
      for (const p of this.players.values()) {
        if (!p.down && Math.hypot(p.x - z.x, p.y - z.y) < z.r + PR + 6 && !z.hitIds?.includes(p.id)) {
          (z.hitIds ||= []).push(p.id);
          this.hurt(p, 32);
          p.x += Math.cos(z.cdir) * 70;
          p.y += Math.sin(z.cdir) * 70;
          this.collide(p, PR, 20);
        }
      }
      if (hitWall || hitObs) {
        z.state = 'stun'; z.stateEnds = this.t + 2.6; z.hitIds = [];
        this.ev({ e: 'slam', x: z.x | 0, y: z.y | 0 });
      } else {
        z.x = nx; z.y = ny;
        if (this.t > z.stateEnds) { z.state = 'walk'; z.stateEnds = this.t + 5 + this.rng() * 3; z.hitIds = []; }
      }
    } else if (z.state === 'stun') {
      if (this.t > z.stateEnds) { z.state = 'walk'; z.stateEnds = this.t + 5 + this.rng() * 3; }
    }
    if (z.state !== 'charge' && !tgt.down && Math.sqrt(bd) < z.r + PR + 4) this.hurt(tgt, ZTYPES.boss.dps * dt);
  }

  // ---------- wave flow ----------
  phases() {
    const t = this.t;
    if (this.phase === 'warmup' && t >= this.phaseEnds) this.startTitle();
    else if (this.phase === 'title' && t >= this.phaseEnds) this.startFight();
    else if (this.phase === 'fight') {
      while (this.queue.length && this.queue[0].at <= t) {
        const q = this.queue.shift();
        if (this.zombies.length < 90) this.spawn(q.type);
        else this.queue.push({ ...q, at: t + 1 });
      }
      const wave = this.waves[this.waveIdx];
      if (wave.boss) {
        if (!this.boss && this.bossSpawned) this.endWave();
        else if (t >= this.waveEnds) this.endWave(true);
      } else if ((!this.queue.length && !this.zombies.length) || t >= this.waveEnds) this.endWave(t >= this.waveEnds);
    } else if (this.phase === 'cleared' && t >= this.phaseEnds) {
      if (this.waveIdx >= this.waves.length - 1) { this.phase = 'victory'; this.phaseEnds = t + (this.fast ? 0.8 : 5); this.ev({ e: 'victory' }); }
      else if (this.waveIdx === this.breakAfter && !this.breakDone) {
        this.breakDone = true;
        this.inBreak = true;
        this.phase = 'break';
        this.phaseEnds = t + (this.fast ? 1.5 : 22);
        this.ev({ e: 'break' });
      } else this.startTitle();
    } else if (this.phase === 'break' && t >= this.phaseEnds) {
      this.inBreak = false;
      this.startTitle();
    } else if (this.phase === 'victory' && t >= this.phaseEnds) {
      this.done = true;
    }
  }
  startTitle() {
    this.waveIdx++;
    this.phase = 'title';
    this.phaseEnds = this.t + (this.fast ? 0.6 : 3.5);
    this.ev({ e: 'wave', n: this.waveIdx + 1, title: this.waves[this.waveIdx].title, boss: !!this.waves[this.waveIdx].boss });
  }
  startFight() {
    const wave = this.waves[this.waveIdx];
    this.phase = 'fight';
    const list = [];
    for (const [type, count] of Object.entries(wave.spawn)) for (let i = 0; i < count; i++) list.push(type);
    const shuffled = this.rng.shuffle(list);
    this.queue = shuffled.map((type, i) => ({ type, at: this.t + (i / Math.max(1, shuffled.length)) * wave.over }));
    this.waveEnds = this.t + (this.fast ? 8 : wave.boss ? 170 : wave.over + 75);
    if (wave.boss) { this.spawn('boss'); this.bossSpawned = true; this.ev({ e: 'boss' }); }
  }
  endWave(timedOut = false) {
    // At the cap the bell tolls and whatever's left burns — the story never stalls.
    if (timedOut) {
      for (const z of this.zombies) this.ev({ e: 'kill', x: z.x | 0, y: z.y | 0, z: ZTYPES[z.type].i, burn: 1 });
      this.zombies = [];
      this.boss = null;
      this.queue = [];
      this.ev({ e: 'bell' });
    }
    this.phase = 'cleared';
    this.phaseEnds = this.t + (this.fast ? 0.5 : 3);
    this.grenades = [];
  }

  // ---------- snapshots ----------
  // Binary tables (Int16) + a small meta object. Row order of `p` matches meta.ids.
  snapshot() {
    const t = this.t;
    const ids = [];
    const p = [];
    for (const q of this.players.values()) {
      ids.push(q.id);
      p.push([q.x, q.y, q.aim * 100, (q.hp / q.maxHp) * 100,
        (q.down ? 1 : 0) | (t < q.shieldUntil ? 2 : 0) | (t < q.speedUntil ? 4 : 0) | (q.firing > 0 ? 8 : 0) | (t < q.allyUntil ? 16 : 0)
          | (t < q.dashUntil ? 32 : 0) | (t - q.hitAt < 0.12 ? 64 : 0) | (q.relics.includes('candle') ? 128 : 0),
        q.tier, q.revive * 50, q.kills, q.power ? POWERS.indexOf(q.power) : -1]);
    }
    const z = this.zombies.map((o) => [o.id, ZTYPES[o.type].i, o.x, o.y, o.angle * 100, (o.hp / o.maxHp) * 100,
      (t < o.frenzyUntil ? 1 : 0) | (o.state === 'stun' ? 2 : 0) | (o.state === 'tele' ? 4 : 0) | (o.state === 'charge' ? 8 : 0)
        | (o.hit && t - o.hit < 0.08 ? 16 : 0) | (o.type === 'bloater' && o.swell ? 32 : 0)]);
    const k = this.pickups.map((o) => [o.id, PICKUP_KINDS.indexOf(o.kind), o.x, o.y]);
    const g = this.grenades.map((gr) => { const f = Math.min(1, (t - gr.t0) / gr.dur); return [gr.x + (gr.tx - gr.x) * f, gr.y + (gr.ty - gr.y) * f, f * 100]; });
    const meta = {
      phase: this.phase,
      wave: this.waveIdx + 1,
      waves: this.waves.length,
      title: this.waves[this.waveIdx]?.title || '',
      left: Math.max(0, Math.round(this.phaseEnds - t)),
      slow: t < this.slowUntil ? 1 : 0,
      boss: this.boss ? { hp: Math.round((this.boss.hp / this.boss.maxHp) * 100), state: this.boss.state } : null,
      ids,
      ev: this.events,
    };
    this.events = [];
    return { t: Math.round(t * 1000), tables: { p, z, k, g }, meta };
  }
  hud(id) {
    const p = this.players.get(id);
    if (!p) return null;
    const w = WEAPONS[p.tier];
    const nextW = WEAPONS[p.tier + 1];
    return {
      hp: Math.round(p.hp), maxHp: p.maxHp, down: p.down, revive: Math.round((p.revive / 1.8) * 100),
      kills: p.kills, tier: p.tier, weapon: w.name, next: nextW ? { name: nextW.name, at: nextW.at } : null,
      power: p.power, grenades: p.grenades, phase: this.phase, wave: this.waveIdx + 1, title: this.waves[this.waveIdx]?.title || '',
      dash: Math.max(0, Math.min(100, Math.round(((p.dashReady - this.t) / p.dashCd) * 100))), hit: this.t - p.hitAt < 0.25,
      shield: this.t < p.shieldUntil, speed: this.t < p.speedUntil, ally: this.t < p.allyUntil,
      bossHp: this.boss ? Math.round((this.boss.hp / this.boss.maxHp) * 100) : null,
    };
  }
}

export { ZTYPE_BY_I };
