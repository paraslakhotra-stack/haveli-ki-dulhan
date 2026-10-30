// Test helpers: a fake clock, a game with N bot players, and bots that play every step.
import { Game } from '../../server/engine/game.js';
import { getHunt } from '../../server/engine/steps/hunt.js';
import { STEPS } from '../../server/engine/steps/index.js';

export function makeClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

export function makeGame({ players = 6, fast = true, seed = 42, photos = false, groomQuiz = true } = {}) {
  const clock = makeClock();
  const fx = [];
  const g = new Game({ fast, seed, now: clock.now, onFx: (e) => fx.push(e) });
  const ids = [];
  for (let i = 0; i < players; i++) {
    const r = g.join({ name: `Bot${i}`, photo: photos ? 'data:image/jpeg;base64,AAAA' : null });
    ids.push(r.player.id);
  }
  g.updateSettings({
    groomName: 'Arjun', brideName: 'Meera', groomId: ids[0],
    groomQuiz: groomQuiz ? [{ q: 'Where did {GROOM} and {BRIDE} meet?', a: 'College', w: ['Office', 'Goa'] }, { q: 'Fav food?', a: 'Biryani', w: ['Pizza', 'Dosa', 'Momos'] }] : [],
  });
  return { g, clock, fx, ids };
}

// Bots read their own phone view plus (cheekily) the step state, so we can drive success paths.
export function botsAct(g, rng = Math.random, accuracy = 0.85) {
  const kind = g.step.kind;
  const s = g.s;
  for (const p of g.connectedPlayers()) {
    const v = g.phoneView(p.id).step;
    const send = (msg) => g.input(p.id, { seq: g.seq, ...msg });
    switch (kind) {
      case 'seance': {
        const T = s.teams[p.team];
        if (T && v.isTapper && !T.done && rng() < 0.5) send({ type: 'rune', rune: rng() < accuracy ? T.seq[T.progress] : 'nope' });
        break;
      }
      case 'quiz':
        if (v.sub === 'ask' && v.mine == null && rng() < 0.4) {
          const opts = v.q.options;
          const pick = s.q.correct && rng() < accuracy ? s.q.correct : opts[Math.floor(rng() * opts.length)]?.id;
          if (pick != null) send({ type: 'answer', id: pick });
        }
        break;
      case 'trial':
        if (v.sub !== 'play') break;
        if (v.trial === 'candle') { if (!s.hold?.[p.id]) send({ type: 'hold', on: true }); else if (rng() < 0.05) send({ type: 'hold', on: false }); }
        if (v.trial === 'musicbox' && rng() < 0.3) send({ type: 'mb', level: (s.scores[p.id] || 0) + 1 });
        if (v.trial === 'banish') send({ type: 'taps', n: Math.floor(rng() * 6) });
        if (v.trial === 'blink' && rng() < 0.2) send({ type: 'blink', i: Math.floor(rng() * 8), rt: 300 + rng() * 500 });
        if (v.trial === 'gallery' && v.gsub === 'answer' && v.mine == null) send({ type: 'count', v: rng() < accuracy ? s.rounds[s.gr].answer : v.options[0] });
        break;
      case 'forfeit':
        if (v.sub === 'offer' && v.mine) send({ type: 'forfeit', accept: true });
        if (v.sub === 'perform' && v.mine) send({ type: 'forfeitDone' });
        break;
      case 'toast':
      case 'vowWrite':
        if (v.sub === 'write' && !v.mine) send({ type: 'write', text: `${p.name} says something legendary` });
        if (v.sub === 'vet' && g.isHost(p.id)) send({ type: 'vetDone' });
        if (v.sub === 'vote' && !v.myVote && v.choices?.length) send({ type: 'vote', pid: v.choices[0].pid });
        break;
      case 'glass': {
        const T = s.teams[p.team];
        if (T && !T.done && v.lockMs === 0) send({ type: 'pick', pos: rng() < accuracy ? T.answer : 1 + Math.floor(rng() * 6) });
        break;
      }
      case 'unmask':
        if (v.sub === 'vote' && !v.myVote && v.choices.length) send({ type: 'vote', pid: rng() < 0.5 && g.secrets.possessed && g.secrets.possessed !== p.id ? g.secrets.possessed : v.choices[0].pid });
        break;
      case 'arena':
        send({ type: 'move', x: rng() * 2 - 1, y: rng() * 2 - 1 });
        if (rng() < 0.01) send({ type: 'power' });
        if (rng() < 0.01) send({ type: 'throw' });
        if (rng() < 0.01) send({ type: 'dash' });
        if (v.brk && v.brk.mine == null && !v.brk.done) send({ type: 'brk', i: Math.floor(rng() * v.brk.opts.length) });
        break;
      case 'hunt': {
        const sim = getHunt(g);
        const team = sim?.team(p.team);
        const st = team?.stations[team.at];
        const me = sim?.players.get(p.id);
        if (st && me) {
          const dx = st.x - me.x; const dy = st.y - me.y; const m = Math.hypot(dx, dy) || 1;
          // greedy walk with a little wander so bots slide around walls; good bots "teleport" (perfect pathing)
          if (accuracy >= 0.95 && rng() < 0.2) { me.x = st.x + (rng() - 0.5) * 20; me.y = st.y + (rng() - 0.5) * 20; }
          sim.setInput(p.id, dx / m + (rng() - 0.5), dy / m + (rng() - 0.5), rng() < 0.1);
        }
        if (v.q && !v.q.by) { const right = v.q.opts.indexOf(g.s.q[p.team]?.a); send({ type: 'answer', i: rng() < accuracy ? right : Math.floor(rng() * v.q.opts.length) }); }
        break;
      }
      case 'crypt':
        if (v.sub === 'play' && rng() < 0.05) send({ type: 'code', code: rng() < 0.7 ? g.secrets.crypt.code : '0000' });
        break;
      case 'brides':
        if (v.sub === 'vote' && v.myVote == null) send({ type: 'bride', idx: rng() < accuracy ? s.answer : [0, 1, 2].find((i) => !v.removed.includes(i)) });
        break;
      default:
    }
  }
}

// Run the game to the credits (or until maxMs of fake time). Returns the list of step kinds visited.
export function runToEnd(g, clock, { maxMs = 3 * 3600 * 1000, rng = Math.random, accuracy, onStep } = {}) {
  const visited = [];
  let lastIdx = -1;
  let ms = 0;
  while (g.step.kind !== 'credits' && ms < maxMs) {
    if (g.stepIdx !== lastIdx) { lastIdx = g.stepIdx; visited.push(g.step); onStep?.(g); }
    botsAct(g, rng, accuracy);
    clock.advance(100);
    ms += 100;
    g.tick();
    if (g.stepDef.simTick) { for (let i = 0; i < 3; i++) g.stepDef.simTick(g, g.s, 1 / 30); }
    // Views must always build without throwing.
    g.tvView();
    for (const p of g.allPlayers()) g.phoneView(p.id);
  }
  visited.push(g.step);
  return { visited, ms };
}
