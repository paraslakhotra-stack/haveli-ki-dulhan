// The authoritative game: players, teams, the story script and the step state machine.
// Everything here is plain data so a game can be saved and resumed if the laptop sleeps or crashes.
import { makeRng, randomCode, randomToken, cleanText } from './util.js';
import { CHAPTERS, TEAMS, RELICS } from '../content/script.js';
import { buildScript } from './script.js';
import { STEPS } from './steps/index.js';
import { fill, names } from './personalize.js';

const SOULS_BY_RANK = [300, 180, 90];
const HOST_GRACE_MS = 30000;
const MAX_PLAYERS = 16;

export class Game {
  constructor(opts = {}) {
    this.fast = !!opts.fast;
    this.realNow = opts.now || (() => Date.now());
    this.seed = opts.seed ?? (Date.now() & 0xffffffff);
    this.rng = makeRng(this.seed);
    this.onChange = opts.onChange || (() => {});
    this.onFx = opts.onFx || (() => {});
    this.onStep = opts.onStep || (() => {});
    this.reset();
  }

  reset() {
    this.code = randomCode(this.rng);
    this.players = new Map();
    this.order = [];
    this.nextId = 1;
    this.hostId = null;
    this.settings = { heat: 'mild', groomName: '', brideName: '', groomId: null, narration: true, groomQuiz: [] };
    this.teams = [];
    this.script = [{ kind: 'lobby', params: {} }];
    this.stepIdx = 0;
    this.s = {};
    this.seq = 1;
    this.deadline = null;
    this.paused = false;
    this.pauseStarted = 0;
    this.pausedTotal = 0;
    this.chapterId = 'prologue';
    this.chapterResults = {};
    this.decks = {};
    this.secrets = {};
    this.inventory = {};
    this.ending = null;
    this.startedAt = null;
    STEPS.lobby.enter(this, this.s, {});
    this.changed();
  }

  // ---------- time ----------
  now() {
    const pausedNow = this.paused ? this.realNow() - this.pauseStarted : 0;
    return this.realNow() - this.pausedTotal - pausedNow;
  }
  dur(ms) { return this.fast ? Math.max(350, Math.round(ms * 0.08)) : ms; }
  setTimer(ms) { this.deadline = ms == null ? null : this.now() + this.dur(ms); this.changed(); }
  remaining() { return this.deadline == null ? null : Math.max(0, this.deadline - this.now()); }

  // ---------- script / steps ----------
  get step() { return this.script[this.stepIdx]; }
  get stepDef() { return STEPS[this.step.kind]; }
  get chapter() { return CHAPTERS.find((c) => c.id === this.chapterId) || CHAPTERS[0]; }

  start() {
    if (this.step.kind !== 'lobby') return false;
    if (this.connectedPlayers().length < 1) return false;
    this.startedAt = this.realNow();
    this.secrets = {};
    this.script = [this.script[0], ...buildScript(this)];
    this.next();
    return true;
  }

  next() {
    const def = this.stepDef;
    def.exit?.(this, this.s, this.step.params);
    if (this.stepIdx >= this.script.length - 1) return; // credits stay up until a restart
    this.stepIdx++;
    this.enterCurrent();
  }

  enterCurrent() {
    this.seq++;
    this.s = {};
    this.deadline = null;
    const { kind, params } = this.step;
    if (params.chapter) this.chapterId = params.chapter;
    STEPS[kind].enter(this, this.s, params);
    this.changed();
    this.onStep();
  }

  jumpTo(predicate) {
    const idx = this.script.findIndex((st, i) => i > 0 && predicate(st));
    if (idx < 0) return false;
    // Keep the chapter id consistent with where we land.
    for (let i = idx; i >= 0; i--) {
      if (this.script[i].params?.chapter) { this.chapterId = this.script[i].params.chapter; break; }
    }
    this.stepIdx = idx;
    this.enterCurrent();
    return true;
  }

  tick() {
    if (this.paused) return;
    const def = this.stepDef;
    def.tick?.(this, this.s, this.step.params);
    if (this.deadline != null && this.now() >= this.deadline) {
      this.deadline = null;
      if (def.timeout) def.timeout(this, this.s, this.step.params);
      else this.next();
    }
    this.checkHost();
  }

  // ---------- players ----------
  connectedPlayers() { return this.order.map((id) => this.players.get(id)).filter((p) => p && p.connected); }
  allPlayers() { return this.order.map((id) => this.players.get(id)).filter(Boolean); }
  teamMembers(teamId, { connectedOnly = false } = {}) {
    return this.allPlayers().filter((p) => p.team === teamId && (!connectedOnly || p.connected));
  }
  byToken(token) {
    if (typeof token !== 'string') return null;
    for (const p of this.players.values()) if (p.token === token) return p;
    return null;
  }

  join({ name, photo }) {
    if (this.players.size >= MAX_PLAYERS) return { error: 'The manor is full (16 guests max).' };
    let clean = cleanText(name, 16) || 'Guest';
    const taken = new Set(this.allPlayers().map((p) => p.name.toLowerCase()));
    if (taken.has(clean.toLowerCase())) {
      let n = 2;
      while (taken.has(`${clean} ${n}`.toLowerCase())) n++;
      clean = `${clean} ${n}`;
    }
    const id = `p${this.nextId++}`;
    const p = {
      id, token: randomToken(this.rng), name: clean, photo: validPhoto(photo) ? photo : null,
      team: null, connected: true, lastSeen: this.realNow(), score: 0, chapterPts: {},
      stats: { quiz: 0, mystery: 0, trials: 0, kills: 0, downs: 0, firstDown: null, toastVotes: 0, suspicion: 0, forfeits: 0, revives: 0, bossDmg: 0 },
      perks: [],
    };
    this.players.set(id, p);
    this.order.push(id);
    if (!this.hostId || !this.players.get(this.hostId)?.connected) this.hostId = id;
    if (this.teams.length) p.team = this.smallestTeam().id;
    this.changed(true);
    return { player: p };
  }

  setPhoto(id, photo) {
    const p = this.players.get(id);
    if (!p || !validPhoto(photo)) return;
    p.photo = photo;
    this.changed(true);
  }

  setConnected(id, on) {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = on;
    p.lastSeen = this.realNow();
    if (on && !this.players.get(this.hostId)?.connected) this.hostId = id;
    this.changed();
  }

  kick(id) {
    if (!this.players.has(id)) return;
    this.players.delete(id);
    this.order = this.order.filter((x) => x !== id);
    if (this.settings.groomId === id) this.settings.groomId = null;
    if (this.hostId === id) this.hostId = this.connectedPlayers()[0]?.id || this.order[0] || null;
    this.stepDef.playerLeft?.(this, this.s, id);
    this.changed(true);
  }

  checkHost() {
    const host = this.players.get(this.hostId);
    if (host && host.connected) return;
    if (host && this.realNow() - host.lastSeen < HOST_GRACE_MS) return;
    const next = this.connectedPlayers()[0];
    if (next && next.id !== this.hostId) { this.hostId = next.id; this.changed(); }
  }

  // ---------- teams ----------
  formTeams() {
    const ps = this.rng.shuffle(this.allPlayers());
    const count = ps.length >= 8 ? 3 : 2;
    this.teams = TEAMS.slice(0, count).map((t) => ({ ...t, souls: 0, relics: [] }));
    // Keep the groom and host on different covens when possible — spreads the chaos.
    ps.forEach((p, i) => { p.team = this.teams[i % count].id; });
    this.changed();
  }
  smallestTeam() {
    return this.teams.slice().sort((a, b) => this.teamMembers(a.id).length - this.teamMembers(b.id).length)[0];
  }
  team(id) { return this.teams.find((t) => t.id === id); }
  hasRelic(teamId, relicId) { return !!this.team(teamId)?.relics.includes(relicId); }

  // ---------- scoring ----------
  award(pid, pts, stat, statAmount = pts) {
    const p = this.players.get(pid);
    if (!p || !pts && !stat) return;
    p.score += pts;
    p.chapterPts[this.chapterId] = (p.chapterPts[this.chapterId] || 0) + pts;
    if (stat) p.stats[stat] = (p.stats[stat] || 0) + statAmount;
    this.changed();
  }
  addSouls(teamId, n) {
    const t = this.team(teamId);
    if (t) { t.souls += n; this.changed(); }
  }
  // Team ranking for a chapter uses the AVERAGE of members' points so uneven covens stay fair.
  chapterRanking(chapterId) {
    return this.teams.map((t) => {
      const members = this.teamMembers(t.id);
      const sum = members.reduce((a, p) => a + (p.chapterPts[chapterId] || 0), 0);
      return { team: t.id, avg: members.length ? Math.round(sum / members.length) : 0 };
    }).sort((a, b) => b.avg - a.avg);
  }
  settleChapter(chapterId) {
    if (this.chapterResults[chapterId]) return this.chapterResults[chapterId];
    const ranking = this.chapterRanking(chapterId);
    const result = { ranking: [], relic: null };
    ranking.forEach((r, i) => {
      const tiedWithPrev = i > 0 && r.avg === ranking[i - 1].avg;
      const rank = tiedWithPrev ? result.ranking[i - 1].rank : i;
      const souls = SOULS_BY_RANK[rank] ?? 60;
      this.addSouls(r.team, souls);
      result.ranking.push({ ...r, rank, souls });
    });
    const relic = RELICS[chapterId];
    if (relic && ranking.length) {
      const winner = ranking[0].team;
      this.team(winner).relics.push(relic.id);
      result.relic = { team: winner, ...relic };
    }
    this.chapterResults[chapterId] = result;
    return result;
  }

  // ---------- content ----------
  fmt(text) { return fill(text, this.settings); }
  names() { return names(this.settings); }
  groom() { return this.players.get(this.settings.groomId) || null; }
  // Draw without repeats from a named deck; reshuffles when exhausted.
  draw(key, source) {
    if (!this.decks[key] || !this.decks[key].length) this.decks[key] = this.rng.shuffle(source.map((_, i) => i));
    return source[this.decks[key].pop()];
  }
  giveInventory(pid, item) {
    (this.inventory[pid] ||= []).push(item);
    this.changed();
  }

  // ---------- host ----------
  isHost(pid) { return pid === this.hostId; }
  hostCommand(cmd, args = {}) {
    switch (cmd) {
      case 'start': return this.start();
      case 'pause':
        if (!this.paused) { this.paused = true; this.pauseStarted = this.realNow(); this.changed(); }
        return true;
      case 'resume':
        if (this.paused) { this.pausedTotal += this.realNow() - this.pauseStarted; this.paused = false; this.changed(); }
        return true;
      case 'skip':
        if (this.step.kind === 'lobby') return false;
        if (this.stepDef.skip) this.stepDef.skip(this, this.s, this.step.params);
        else this.next();
        return true;
      case 'settings': return this.updateSettings(args);
      case 'kick': this.kick(args.id); return true;
      case 'shuffle':
        if (this.teams.length) { this.formTeams(); return true; }
        return false;
      case 'restart': this.reset(); return true;
      case 'jump': {
        const ch = String(args.chapter || '');
        return this.jumpTo((st) => st.kind === 'chapterTitle' && st.params.chapter === ch);
      }
      default: return false;
    }
  }
  updateSettings(a) {
    const s = this.settings;
    if (a.heat === 'mild' || a.heat === 'spicy') s.heat = a.heat;
    if (typeof a.groomName === 'string') s.groomName = cleanText(a.groomName, 24);
    if (typeof a.brideName === 'string') s.brideName = cleanText(a.brideName, 24);
    if (a.groomId === null || this.players.has(a.groomId)) s.groomId = a.groomId;
    if (typeof a.narration === 'boolean') s.narration = a.narration;
    if (Array.isArray(a.groomQuiz)) {
      s.groomQuiz = a.groomQuiz.slice(0, 10).map((r) => ({
        q: cleanText(r?.q, 120), a: cleanText(r?.a, 60),
        w: Array.isArray(r?.w) ? r.w.slice(0, 3).map((w) => cleanText(w, 60)) : [],
      }));
    }
    this.changed();
    return true;
  }

  // ---------- input ----------
  input(pid, msg) {
    const p = this.players.get(pid);
    if (!p || !msg || typeof msg !== 'object') return;
    if (msg.seq != null && msg.seq !== this.seq) return; // stale tap from a previous step
    if (this.paused) return;
    this.stepDef.input?.(this, this.s, p, msg, this.step.params);
  }

  // ---------- views ----------
  changed(photos = false) { this.onChange(photos); }
  fx(type, data = {}) { this.onFx({ type, ...data }); }

  baseView() {
    const n = this.names();
    return {
      code: this.code,
      seq: this.seq,
      kind: this.step.kind,
      chapter: this.chapter,
      paused: this.paused,
      remaining: this.remaining(),
      heat: this.settings.heat,
      groom: n.groom,
      bride: n.bride,
      groomId: this.settings.groomId,
      hostId: this.hostId,
      teams: this.teams.map((t) => ({ id: t.id, name: t.name, color: t.color, glyph: t.glyph, souls: t.souls, relics: t.relics.slice(), size: this.teamMembers(t.id).length })),
    };
  }
  tvView() {
    return {
      ...this.baseView(),
      narration: this.settings.narration,
      fast: this.fast,
      join: this.joinInfo || null,
      players: this.allPlayers().map((p) => ({ id: p.id, name: p.name, team: p.team, connected: p.connected, score: p.score, photo: !!p.photo })),
      step: this.stepDef.tv?.(this, this.s, this.step.params) ?? {},
    };
  }
  phoneView(pid) {
    const p = this.players.get(pid);
    if (!p) return null;
    const isHost = pid === this.hostId;
    const team = this.team(p.team);
    return {
      ...this.baseView(),
      me: { id: p.id, name: p.name, team: p.team, teamName: team?.name || null, teamColor: team?.color || null, score: p.score, isHost, isGroom: pid === this.settings.groomId, photo: !!p.photo, perks: p.perks.slice() },
      inventory: (this.inventory[pid] || []).slice(),
      roster: this.allPlayers().map((x) => ({ id: x.id, name: x.name, team: x.team })),
      step: this.stepDef.phone?.(this, this.s, p, this.step.params) ?? {},
      host: isHost ? this.hostView() : null,
    };
  }
  hostView() {
    return {
      settings: this.settings,
      players: this.allPlayers().map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
      canStart: this.step.kind === 'lobby' && this.connectedPlayers().length >= 1,
      started: this.step.kind !== 'lobby',
      extra: this.stepDef.host?.(this, this.s, this.step.params) ?? null,
    };
  }

  // ---------- persistence ----------
  serialize() {
    return {
      v: 1, savedAt: this.realNow(), fast: this.fast, seed: this.seed,
      code: this.code, players: this.allPlayers(), order: this.order, nextId: this.nextId, hostId: this.hostId,
      settings: this.settings, teams: this.teams, script: this.script, stepIdx: this.stepIdx, chapterId: this.chapterId,
      chapterResults: this.chapterResults, decks: this.decks, secrets: this.secrets, inventory: this.inventory,
      ending: this.ending, startedAt: this.startedAt, seq: this.seq,
    };
  }
  restore(d) {
    if (!d || d.v !== 1) return false;
    this.code = d.code;
    this.players = new Map(d.players.map((p) => [p.id, { ...p, connected: false }]));
    this.order = d.order; this.nextId = d.nextId; this.hostId = d.hostId;
    this.settings = d.settings; this.teams = d.teams; this.script = d.script;
    this.stepIdx = Math.min(d.stepIdx, d.script.length - 1); this.chapterId = d.chapterId;
    this.chapterResults = d.chapterResults; this.decks = d.decks; this.secrets = d.secrets;
    this.inventory = d.inventory; this.ending = d.ending; this.startedAt = d.startedAt;
    this.seq = d.seq + 10;
    this.paused = false; this.pausedTotal = 0;
    this.enterCurrent(); // the interrupted step restarts cleanly
    return true;
  }
}

export function validPhoto(photo) {
  return typeof photo === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo) && photo.length < 90000;
}
