// Lobby, narration, chapter cards, team sorting, chapter results, forfeits, ending and credits.
import { BEATS, CHAPTERS, RELICS } from '../../content/script.js';
import { FORFEITS } from '../../content/forfeits.js';

// ---------- narration timeline ----------
export function timeline(g, beatKey) {
  const scale = g.fast ? 0.08 : 1;
  const raw = (BEATS[beatKey] || []).map(([sp, text]) => ({ sp, text: g.fmt(text) }));
  let t = 700;
  const lines = [];
  for (const l of raw) {
    const ms = Math.min(15000, Math.max(3600, l.text.length * (l.sp === 'v' ? 80 : 66)));
    lines.push({ ...l, at: Math.round(t * scale), ms: Math.round(ms * scale) });
    t += ms + 650;
  }
  return { lines, total: t + 900 };
}

export const lobby = {
  enter() {},
  tv: (g) => ({ join: g.joinInfo || null }),
  phone: () => ({}),
};

export const story = {
  enter(g, s, params) {
    const beat = params.beat === '@ending' ? (g.ending === 'win' ? 'endingWin' : 'endingLose') : params.beat;
    s.beat = beat;
    s.tl = timeline(g, beat);
    s.scene = params.scene || g.chapter.scene;
    s.fxTag = params.fx || (beat === 'endingWin' ? 'win' : beat === 'endingLose' ? 'lose' : null);
    g.setTimer(s.tl.total);
  },
  tv: (g, s) => ({ beat: s.beat, scene: s.scene, lines: s.tl.lines, fx: s.fxTag, total: g.dur(s.tl.total) }),
  phone: (g, s) => ({ beat: s.beat, lines: s.tl.lines, fx: s.fxTag, total: g.dur(s.tl.total) }),
};

export const chapterTitle = {
  enter(g, s, params) {
    s.chapter = CHAPTERS.find((c) => c.id === params.chapter);
    g.setTimer(7000);
  },
  tv: (g, s) => ({ ...s.chapter }),
  phone: (g, s) => ({ ...s.chapter }),
};

export const sorting = {
  enter(g, s) {
    g.formTeams();
    s.order = g.rng.shuffle(g.allPlayers().map((p) => p.id));
    s.stepMs = Math.round(g.dur(1100));
    s.startMs = Math.round(g.dur(2500));
    g.setTimer(2500 + 1100 * s.order.length + 4500);
  },
  playerLeft(g, s, id) { s.order = s.order.filter((x) => x !== id); },
  tv: (g, s) => ({ order: s.order, stepMs: s.stepMs, startMs: s.startMs }),
  phone: (g, s, p) => {
    const i = s.order.indexOf(p.id);
    return { revealIn: i < 0 ? 0 : s.startMs + s.stepMs * i };
  },
};

// Ring-piece engravings: the crypt clues are handed out across chapters I–IV.
const CRYPT_CHAPTERS = ['guestbook', 'library', 'nursery', 'reception'];
const PIECE = ['I', 'II', 'III', 'IV'];

export function handOutCrypt(g, chapterId) {
  const crypt = g.secrets.crypt;
  const b = CRYPT_CHAPTERS.indexOf(chapterId);
  if (!crypt || b < 0) return [];
  crypt.given ||= {};
  if (crypt.given[chapterId]) return [];
  crypt.given[chapterId] = true;
  const per = Math.ceil(crypt.clues.length / 4);
  const batch = crypt.clues.slice(b * per, (b + 1) * per);
  const ps = g.rng.shuffle(g.connectedPlayers());
  const out = [];
  if (!ps.length) return out;
  batch.forEach((text, i) => {
    const p = ps[i % ps.length];
    g.giveInventory(p.id, { kind: 'crypt', piece: PIECE[b], text });
    out.push(p.id);
  });
  return out;
}

export const chapterEnd = {
  enter(g, s, params) {
    s.result = g.settleChapter(params.chapter);
    s.received = handOutCrypt(g, params.chapter);
    s.top = g.allPlayers()
      .map((p) => ({ id: p.id, pts: p.chapterPts[params.chapter] || 0 }))
      .sort((a, b) => b.pts - a.pts).slice(0, 3);
    s.piece = PIECE[CRYPT_CHAPTERS.indexOf(params.chapter)] || null;
    g.setTimer(12000);
  },
  tv: (g, s) => ({ result: s.result, top: s.top, piece: s.piece }),
  phone: (g, s, p) => {
    const mine = s.result.ranking.find((r) => r.team === p.team);
    return {
      rank: mine ? mine.rank : null, souls: mine ? mine.souls : 0, teams: s.result.ranking.length,
      relic: s.result.relic, gotClue: s.received.includes(p.id), piece: s.piece,
    };
  },
};

export const forfeit = {
  enter(g, s, params) {
    const ps = g.connectedPlayers();
    if (!ps.length) { g.setTimer(10); s.sub = 'none'; return; }
    const low = Math.min(...ps.map((p) => p.chapterPts[params.chapter] || 0));
    const pool = ps.filter((p) => (p.chapterPts[params.chapter] || 0) === low);
    s.pid = g.rng.pick(pool).id;
    s.card = g.fmt(g.draw(`forfeit.${g.settings.heat}`, FORFEITS[g.settings.heat]));
    s.sub = 'offer';
    g.setTimer(25000);
  },
  input(g, s, p, msg) {
    if (p.id !== s.pid && !g.isHost(p.id)) return;
    if (s.sub === 'offer' && p.id === s.pid && msg.type === 'forfeit') {
      if (msg.accept) { s.sub = 'perform'; g.setTimer(40000); g.fx('accept', { pid: s.pid }); }
      else { s.sub = 'passed'; g.setTimer(3500); }
    } else if (s.sub === 'perform' && msg.type === 'forfeitDone') {
      this.complete(g, s);
    }
  },
  complete(g, s) {
    const p = g.players.get(s.pid);
    if (p) { g.addSouls(p.team, 50); g.award(p.id, 50, 'forfeits', 1); }
    s.sub = 'done';
    g.setTimer(4000);
  },
  timeout(g, s) {
    if (s.sub === 'offer') { s.sub = 'passed'; g.setTimer(3000); }
    else if (s.sub === 'perform') this.complete(g, s);
    else g.next();
  },
  playerLeft(g, s, id) { if (id === s.pid) { s.sub = 'passed'; g.setTimer(1500); } },
  tv: (g, s) => ({ sub: s.sub, pid: s.pid, card: s.card }),
  phone: (g, s, p) => ({ sub: s.sub, mine: p.id === s.pid, pid: s.pid, name: g.players.get(s.pid)?.name, card: s.card }),
  host: (g, s) => (s.sub === 'perform' ? { canConfirmForfeit: true } : null),
};

// ---------- credits & awards ----------
function awards(g) {
  const ps = g.allPlayers();
  if (!ps.length) return [];
  const best = (fn, min = 1) => {
    const sorted = ps.slice().sort((a, b) => fn(b) - fn(a));
    return fn(sorted[0]) >= min ? sorted[0].id : null;
  };
  const list = [
    { id: 'mvp', title: 'MVP of the Manor', pid: best((p) => p.score) },
    { id: 'brain', title: 'Brain of the Manor', pid: best((p) => p.stats.quiz * 100 + p.stats.mystery) },
    { id: 'slayer', title: 'Zombie Slayer', pid: best((p) => p.stats.kills) },
    { id: 'nerves', title: 'Nerves of Steel', pid: best((p) => p.stats.trials) },
    { id: 'toast', title: 'Best Toast', pid: best((p) => p.stats.toastVotes) },
    { id: 'suspicious', title: 'Most Suspicious', pid: best((p) => p.stats.suspicion) },
    { id: 'medic', title: 'Guardian Angel', pid: best((p) => p.stats.revives) },
    { id: 'brave', title: 'Braver Than Vesper', pid: best((p) => p.stats.forfeits) },
  ];
  const downed = ps.filter((p) => p.stats.firstDown != null).sort((a, b) => a.stats.firstDown - b.stats.firstDown);
  if (downed.length) list.splice(3, 0, { id: 'firstdie', title: 'First to Die', pid: downed[0].id });
  return list.filter((a) => a.pid);
}

export const credits = {
  enter(g, s) {
    s.awards = awards(g);
    s.teams = g.teams.slice().sort((a, b) => b.souls - a.souls).map((t) => ({ id: t.id, souls: t.souls }));
    s.ending = g.ending;
  },
  tv: (g, s) => ({ awards: s.awards, teams: s.teams, ending: s.ending, cast: g.allPlayers().map((p) => ({ id: p.id, name: p.name, team: p.team, score: p.score, stats: p.stats })) }),
  phone: (g, s, p) => ({
    awards: s.awards.filter((a) => a.pid === p.id).map((a) => a.title),
    teamRank: s.teams.findIndex((t) => t.id === p.team),
    stats: p.stats, score: p.score, ending: s.ending,
  }),
};

export { RELICS };
