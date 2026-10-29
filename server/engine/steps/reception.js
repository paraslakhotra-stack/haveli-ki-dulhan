// Chapter IV — the Possessed, the Toast (roasts), the Poisoned Glass and the Unmasking.
import { ROASTS } from '../../content/roasts.js';
import { makeGlasses } from '../puzzles.js';
import { tally, cleanText } from '../util.js';

export const possess = {
  enter(g, s) {
    const ps = g.connectedPlayers();
    s.pid = ps.length >= 3 ? g.rng.pick(ps).id : null; // a traitor needs a crowd to hide in
    g.secrets.possessed = s.pid;
    g.setTimer(9000);
  },
  tv: () => ({}),
  phone: (g, s, p) => ({ possessed: p.id === s.pid }),
};

// Shared write → host veto → vote → reveal flow for toasts and vows.
function writeFlow({ key, prompt, writeMs, voting }) {
  return {
    enter(g, s, params) {
      s.prompt = prompt(g, params);
      s.answers = {};
      s.hidden = {};
      s.votes = {};
      s.sub = 'write';
      g.setTimer(writeMs);
    },
    input(g, s, p, msg) {
      if (s.sub === 'write' && msg.type === 'write') {
        const text = cleanText(msg.text, 90);
        if (!text) return;
        s.answers[p.id] = text;
        g.changed();
        if (g.connectedPlayers().every((x) => s.answers[x.id])) this.toVet(g, s);
      } else if (s.sub === 'vet' && g.isHost(p.id)) {
        if (msg.type === 'veto' && s.answers[msg.pid] != null) { s.hidden[msg.pid] = !!msg.hidden; g.changed(); }
        if (msg.type === 'vetDone') this.afterVet(g, s);
      } else if (s.sub === 'vote' && msg.type === 'vote') {
        if (msg.pid === p.id || s.votes[p.id] || !this.visible(s).includes(msg.pid)) return;
        s.votes[p.id] = msg.pid;
        g.changed();
        const voters = g.connectedPlayers().filter((x) => this.visible(s).some((v) => v !== x.id));
        if (voters.every((x) => s.votes[x.id])) this.reveal(g, s);
      }
    },
    visible(s) { return Object.keys(s.answers).filter((k) => !s.hidden[k]); },
    toVet(g, s) {
      if (s.sub !== 'write') return;
      if (!Object.keys(s.answers).length) { s.sub = 'empty'; g.setTimer(3000); return; }
      s.sub = 'vet';
      g.setTimer(25000);
    },
    afterVet(g, s) {
      if (s.sub !== 'vet') return;
      if (voting && this.visible(s).length >= 2) { s.sub = 'vote'; g.setTimer(30000); }
      else this.reveal(g, s);
    },
    reveal(g, s) {
      if (s.sub === 'reveal') return;
      s.sub = 'reveal';
      s.tally = {};
      for (const v of Object.values(s.votes)) s.tally[v] = (s.tally[v] || 0) + 1;
      if (voting) {
        const best = Math.max(0, ...Object.values(s.tally));
        s.winners = Object.keys(s.tally).filter((k) => s.tally[k] === best && best > 0);
        for (const [pid, n] of Object.entries(s.tally)) g.award(pid, n * 100, 'toastVotes', n);
        for (const pid of s.winners) g.award(pid, 100);
        g.setTimer(12000);
      } else {
        for (const pid of this.visible(s)) g.award(pid, 50);
        g.setTimer(Math.max(8000, this.visible(s).length * 5200 + 4000));
      }
    },
    timeout(g, s) {
      if (s.sub === 'write') this.toVet(g, s);
      else if (s.sub === 'vet') this.afterVet(g, s);
      else if (s.sub === 'vote') this.reveal(g, s);
      else g.next();
    },
    skip(g, s) { this.timeout(g, s); },
    playerLeft(g, s, id) { delete s.answers[id]; delete s.votes[id]; },
    tv(g, s) {
      const vis = this.visible(s);
      return {
        key, sub: s.sub, prompt: s.prompt,
        written: Object.keys(s.answers),
        answers: s.sub === 'vote' || s.sub === 'reveal' ? vis.map((pid) => ({ pid: s.sub === 'reveal' ? pid : null, text: s.answers[pid], votes: s.sub === 'reveal' ? s.tally[pid] || 0 : null })) : null,
        voted: Object.keys(s.votes),
        winners: s.sub === 'reveal' ? s.winners || [] : null,
      };
    },
    phone(g, s, p) {
      const vis = this.visible(s);
      return {
        key, sub: s.sub, prompt: s.prompt, mine: s.answers[p.id] || null,
        choices: s.sub === 'vote' ? vis.filter((pid) => pid !== p.id).map((pid) => ({ pid, text: s.answers[pid] })) : null,
        myVote: s.votes[p.id] || null,
        votesForMe: s.sub === 'reveal' ? s.tally[p.id] || 0 : null,
        hiddenMine: !!s.hidden[p.id],
      };
    },
    host(g, s) {
      if (s.sub !== 'vet') return null;
      return { vet: Object.entries(s.answers).map(([pid, text]) => ({ pid, name: g.players.get(pid)?.name, text, hidden: !!s.hidden[pid] })) };
    },
  };
}

export const toast = writeFlow({
  key: 'toast',
  prompt: (g) => g.fmt(g.draw(`roast.${g.settings.heat}`, ROASTS[g.settings.heat])),
  writeMs: 60000,
  voting: true,
});

export const vowWrite = writeFlow({
  key: 'vow',
  prompt: (g) => g.fmt('Write ONE line of {GROOM}\'s wedding vow. Start it however you like — "I promise to…", "I will never…"'),
  writeMs: 75000,
  voting: false,
});

// ---------- The Poisoned Glass ----------
export const glass = {
  enter(g, s) {
    s.teams = {};
    const possessed = g.secrets.possessed;
    for (const t of g.teams) {
      const members = g.teamMembers(t.id, { connectedOnly: true }).map((p) => p.id);
      const all = members.length ? members : g.teamMembers(t.id).map((p) => p.id);
      if (!all.length) continue;
      const pz = makeGlasses(g.rng);
      const clues = Object.fromEntries(all.map((id) => [id, []]));
      const order = g.rng.shuffle(all);
      pz.clues.forEach((c, i) => clues[order[i % order.length]].push({ text: c, lie: false }));
      // Give anyone left empty-handed a spare true clue so everyone has something to say.
      let spare = 0;
      for (const id of all) if (!clues[id].length && pz.spare[spare]) clues[id].push({ text: pz.spare[spare++], lie: false });
      if (possessed && all.includes(possessed) && pz.lies.length) {
        clues[possessed].push({ text: pz.lies[0], lie: true });
        if (pz.spare[spare]) clues[order.find((id) => id !== possessed) || possessed].push({ text: pz.spare[spare++], lie: false });
      }
      for (const id of all) clues[id] = g.rng.shuffle(clues[id]);
      s.teams[t.id] = { glasses: pz.glasses, answer: pz.answer, clues, members: all, picks: {}, done: false, doneAt: null, rank: null, lockUntil: 0, wrong: 0 };
    }
    s.sub = 'play';
    s.started = g.now();
    s.finished = 0;
    g.setTimer(150000);
  },
  input(g, s, p, msg) {
    if (s.sub !== 'play' || msg.type !== 'pick') return;
    const T = s.teams[p.team];
    if (!T || T.done || g.now() < T.lockUntil) return;
    const pos = Math.floor(Number(msg.pos));
    if (pos < 1 || pos > 6) return;
    T.picks[p.id] = pos;
    const present = T.members.filter((id) => g.players.get(id)?.connected);
    const voters = present.length ? present : T.members;
    if (voters.every((id) => T.picks[id] === pos)) {
      if (pos === T.answer) {
        T.done = true;
        T.doneAt = g.now() - s.started;
        T.rank = s.finished++;
        g.fx('glassRight', { team: p.team });
        if (Object.values(s.teams).every((x) => x.done)) this.finish(g, s);
      } else {
        T.wrong++;
        T.lockUntil = g.now() + g.dur(15000);
        T.picks = {};
        g.fx('scare', { team: p.team, kind: 'glass' });
      }
    }
    g.changed();
  },
  finish(g, s) {
    if (s.sub !== 'play') return;
    s.sub = 'reveal';
    const order = Object.entries(s.teams).sort(([, a], [, b]) => (a.done !== b.done ? (a.done ? -1 : 1) : (a.doneAt ?? 0) - (b.doneAt ?? 0)));
    s.results = order.map(([team, T], i) => {
      const pts = T.done ? Math.max(140, 320 - i * 70 - T.wrong * 20) : 40;
      for (const p of g.teamMembers(team)) if (p.id !== g.secrets.possessed) g.award(p.id, pts, 'mystery');
      return { team, done: T.done, time: T.doneAt, wrong: T.wrong, pts, answer: T.answer };
    });
    g.setTimer(8000);
  },
  timeout(g, s) { if (s.sub === 'play') this.finish(g, s); else g.next(); },
  skip(g, s) { this.timeout(g, s); },
  tv: (g, s) => ({
    sub: s.sub, results: s.results || null,
    teams: Object.entries(s.teams).map(([id, T]) => ({
      id, done: T.done, rank: T.rank, wrong: T.wrong, locked: g.now() < T.lockUntil,
      picks: Object.values(T.picks), members: T.members.length,
      glasses: T.glasses, answer: s.sub === 'reveal' || T.done ? T.answer : null,
    })),
  }),
  phone: (g, s, p) => {
    const T = s.teams[p.team];
    if (!T) return { sub: s.sub, spectator: true };
    const mine = T.clues[p.id] || [];
    return {
      sub: s.sub, glasses: T.glasses, done: T.done, rank: T.rank,
      lockMs: Math.max(0, T.lockUntil - g.now()),
      clues: mine.map((c) => ({ text: c.text, lie: p.id === g.secrets.possessed ? c.lie : false })),
      possessed: p.id === g.secrets.possessed,
      myPick: T.picks[p.id] || null,
      picks: Object.entries(T.picks).map(([pid, pos]) => ({ pid, pos })),
      answer: s.sub === 'reveal' || T.done ? T.answer : null,
      member: T.members.includes(p.id),
    };
  },
};

// ---------- The Unmasking ----------
export const unmask = {
  enter(g, s) {
    s.votes = {};
    s.sub = g.secrets.possessed ? 'vote' : 'none';
    g.setTimer(g.secrets.possessed ? 40000 : 10);
  },
  input(g, s, p, msg) {
    if (s.sub !== 'vote' || msg.type !== 'vote' || s.votes[p.id]) return;
    if (!g.players.has(msg.pid) || msg.pid === p.id) return;
    s.votes[p.id] = msg.pid;
    g.changed();
    if (g.connectedPlayers().every((x) => s.votes[x.id])) this.reveal(g, s);
  },
  reveal(g, s) {
    if (s.sub !== 'vote') return;
    s.sub = 'reveal';
    const t = tally(s.votes, g.rng);
    s.counts = t.counts;
    s.accused = t.winner;
    s.possessed = g.secrets.possessed;
    s.caught = !!s.accused && s.accused === s.possessed;
    for (const [pid, n] of Object.entries(t.counts)) g.award(pid, 0, 'suspicion', n);
    for (const [voter, target] of Object.entries(s.votes)) if (target === s.possessed) g.award(voter, 100);
    const pp = g.players.get(s.possessed);
    if (pp) {
      if (s.caught) { for (const team of g.teams) if (team.id !== pp.team) g.addSouls(team.id, 60); }
      else { g.award(pp.id, 300); g.addSouls(pp.team, 100); }
    }
    g.setTimer(12000);
  },
  timeout(g, s) { if (s.sub === 'vote') this.reveal(g, s); else g.next(); },
  skip(g, s) { this.timeout(g, s); },
  tv: (g, s) => ({ sub: s.sub, voted: Object.keys(s.votes), counts: s.counts || null, accused: s.accused || null, possessed: s.sub === 'reveal' ? s.possessed : null, caught: s.caught ?? null }),
  phone: (g, s, p) => ({
    sub: s.sub, myVote: s.votes[p.id] || null,
    choices: g.allPlayers().filter((x) => x.id !== p.id).map((x) => ({ pid: x.id, name: x.name })),
    possessed: s.sub === 'reveal' ? s.possessed : null, caught: s.caught ?? null, wasMe: p.id === g.secrets.possessed,
  }),
};
