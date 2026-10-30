import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGame, runToEnd } from './helpers.js';
import { makeRng } from '../../server/engine/util.js';
import { CHAPTERS } from '../../server/content/script.js';
import { ArenaSim } from '../../server/engine/arena/sim.js';
import { Game } from '../../server/engine/game.js';

test('a full night plays from the lobby to the credits', () => {
  for (const players of [2, 5, 9, 12]) {
    const { g, clock } = makeGame({ players, seed: players * 7 });
    assert.equal(g.hostCommand('start'), true);
    const { visited } = runToEnd(g, clock, { rng: makeRng(players) });
    assert.equal(g.step.kind, 'credits', `reached credits with ${players} players`);
    const chapters = visited.filter((s) => s.kind === 'chapterTitle').map((s) => s.params.chapter);
    assert.deepEqual(chapters, CHAPTERS.map((c) => c.id));
    for (const kind of ['sorting', 'seance', 'quiz', 'trial', 'possess', 'toast', 'glass', 'unmask', 'arena', 'crypt', 'brides', 'vowWrite']) {
      assert.ok(visited.some((s) => s.kind === kind), `visited ${kind}`);
    }
    assert.ok(['win', 'lose'].includes(g.ending));
    const souls = g.teams.reduce((a, t) => a + t.souls, 0);
    assert.ok(souls > 0, 'covens earned souls');
    const view = g.tvView();
    assert.ok(view.step.awards.length > 0, 'awards handed out');
  }
});

test('the night still completes when nobody touches their phone', () => {
  const { g, clock } = makeGame({ players: 4, seed: 3 });
  g.hostCommand('start');
  let ms = 0;
  while (g.step.kind !== 'credits' && ms < 4 * 3600 * 1000) {
    clock.advance(100); ms += 100; g.tick();
    if (g.stepDef.simTick) g.stepDef.simTick(g, g.s, 0.1);
  }
  assert.equal(g.step.kind, 'credits');
});

test('teams: 2 up to 5 guests, 3 for 6–9, 4 from 10, balanced within one', () => {
  for (let n = 2; n <= 16; n++) {
    const { g } = makeGame({ players: n, seed: n });
    g.formTeams();
    assert.equal(g.teams.length, n >= 10 ? 4 : n >= 6 ? 3 : 2);
    const sizes = g.teams.map((t) => g.teamMembers(t.id).length);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `balanced for ${n}: ${sizes}`);
  }
});

test('late joiners land in the smallest coven', () => {
  const { g } = makeGame({ players: 5 });
  g.formTeams();
  const r = g.join({ name: 'Late' });
  const sizes = g.teams.map((t) => g.teamMembers(t.id).length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
  assert.ok(r.player.team);
});

test('secrets only reach the right phone', () => {
  const { g, clock } = makeGame({ players: 6, seed: 11 });
  g.hostCommand('start');
  g.formTeams();
  // Jump to the possession and check every phone.
  g.jumpTo((s) => s.kind === 'possess');
  const possessed = g.secrets.possessed;
  assert.ok(possessed);
  for (const p of g.allPlayers()) {
    const v = g.phoneView(p.id);
    assert.equal(v.step.possessed, p.id === possessed);
    assert.ok(!JSON.stringify(v).includes('"secrets"'));
  }
  assert.ok(!JSON.stringify(g.tvView()).includes(possessed + '"possessed'));
  // Glass: each phone sees only its own clues, and only the possessed sees the lie flag.
  g.jumpTo((s) => s.kind === 'glass');
  for (const p of g.allPlayers()) {
    const v = g.phoneView(p.id).step;
    const T = g.s.teams[p.team];
    assert.deepEqual(v.clues.map((c) => c.text), (T.clues[p.id] || []).map((c) => c.text));
    if (p.id !== possessed) assert.ok(v.clues.every((c) => c.lie === false));
  }
  // Séance: no phone receives the full sequence before it's solved.
  g.jumpTo((s) => s.kind === 'seance');
  for (const p of g.allPlayers()) {
    const v = g.phoneView(p.id).step;
    assert.equal(v.lit.length, 0);
    assert.ok(!('seq' in v));
  }
  clock.advance(1);
});

test('séance: the tapper never holds the clue for the rune they must tap', () => {
  const { g } = makeGame({ players: 6, seed: 5 });
  g.hostCommand('start');
  g.formTeams();
  g.jumpTo((s) => s.kind === 'seance');
  for (const [, T] of Object.entries(g.s.teams)) {
    if (T.members.length < 2) continue;
    for (let pos = 0; pos < T.seq.length; pos++) {
      const tapper = T.members[pos % T.members.length];
      assert.ok(!(T.clues[tapper] || []).some((c) => c.pos === pos));
    }
  }
});

test('stale inputs from a previous step are ignored', () => {
  const { g, ids } = makeGame({ players: 3 });
  g.hostCommand('start');
  g.jumpTo((s) => s.kind === 'quiz');
  const old = g.seq - 1;
  g.input(ids[1], { seq: old, type: 'answer', id: g.s.q.options[0].id });
  assert.equal(Object.keys(g.s.answers).length, 0);
  g.input(ids[1], { seq: g.seq, type: 'answer', id: g.s.q.options[0].id });
  assert.equal(Object.keys(g.s.answers).length, 1);
});

test('pause freezes every timer', () => {
  const { g, clock } = makeGame({ players: 3, fast: false });
  g.hostCommand('start');
  const before = g.remaining();
  g.hostCommand('pause');
  clock.advance(60_000);
  g.tick();
  assert.equal(g.remaining(), before);
  g.hostCommand('resume');
  clock.advance(1000);
  assert.equal(g.remaining(), before - 1000);
});

test('reconnecting by token returns the same seat; host passes on after the grace period', () => {
  const { g, clock, ids } = makeGame({ players: 3 });
  const host = g.players.get(ids[0]);
  assert.equal(g.byToken(host.token).id, ids[0]);
  g.setConnected(ids[0], false);
  g.tick();
  assert.equal(g.hostId, ids[0], 'host keeps the crown during the grace period');
  clock.advance(31_000);
  g.tick();
  assert.notEqual(g.hostId, ids[0]);
  g.setConnected(ids[0], true);
  assert.equal(g.byToken(host.token).id, ids[0]);
});

test('duplicate names get a suffix and junk input is sanitised', () => {
  const { g } = makeGame({ players: 0 });
  const a = g.join({ name: 'Rahul' }).player;
  const b = g.join({ name: 'rahul' }).player;
  const c = g.join({ name: '\u0000\u0007   ', photo: 'javascript:alert(1)' }).player;
  assert.equal(a.name, 'Rahul');
  assert.equal(b.name, 'rahul 2');
  assert.equal(c.name, 'Guest');
  assert.equal(c.photo, null);
});

test('a saved night resumes at the same step with scores intact', () => {
  const { g, clock } = makeGame({ players: 4, seed: 9 });
  g.hostCommand('start');
  runToEnd(g, clock, { maxMs: 10 * 60 * 1000, rng: makeRng(1) });
  const data = JSON.parse(JSON.stringify(g.serialize()));
  const g2 = new Game({ fast: true, now: clock.now });
  assert.ok(g2.restore(data));
  assert.equal(g2.step.kind, g.step.kind);
  assert.equal(g2.allPlayers().length, 4);
  assert.deepEqual(g2.allPlayers().map((p) => p.score), g.allPlayers().map((p) => p.score));
  // and it can carry on to the end
  for (const p of g2.allPlayers()) g2.setConnected(p.id, true);
  runToEnd(g2, clock, { rng: makeRng(2) });
  assert.equal(g2.step.kind, 'credits');
});

test('heat level switches the content decks', () => {
  const { g } = makeGame({ players: 4, seed: 2 });
  g.updateSettings({ heat: 'spicy' });
  g.hostCommand('start');
  g.jumpTo((s) => s.kind === 'toast');
  assert.equal(g.settings.heat, 'spicy');
  assert.ok(Object.keys(g.decks).some((k) => k.endsWith('spicy')));
});

test('arena: same seed, same fight', () => {
  const run = () => {
    const sim = new ArenaSim({ seed: 77, players: [{ id: 'a', team: 'A' }, { id: 'b', team: 'B' }] });
    for (let i = 0; i < 30 * 90; i++) { sim.setMove('a', Math.sin(i / 30), Math.cos(i / 40)); sim.step(1 / 30); sim.snapshot(); }
    return { kills: sim.players.get('a').kills + sim.players.get('b').kills, z: sim.zombies.length, wave: sim.waveIdx };
  };
  assert.deepEqual(run(), run());
});

test('arena: kills level weapons up, downed players get back up, waves always end', () => {
  const sim = new ArenaSim({ seed: 3, players: [{ id: 'a', team: 'A' }, { id: 'b', team: 'B', relics: ['wine', 'musicbox'] }] });
  assert.equal(sim.players.get('b').maxHp, 150);
  assert.equal(sim.players.get('b').tier, 1);
  let downed = false;
  let leveled = false;
  let steps = 0;
  while (!sim.done && steps < 30 * 60 * 12) {
    sim.step(1 / 30);
    const snap = sim.snapshot();
    if (snap.meta.ev.some((e) => e.e === 'down')) downed = true;
    if (snap.meta.ev.some((e) => e.e === 'level')) leveled = true;
    steps++;
  }
  assert.ok(sim.done, 'arena finished (timeouts guarantee it)');
  assert.ok(leveled, 'someone levelled up');
  for (const p of sim.players.values()) {
    if (downed) assert.ok(p.down === false || sim.t - p.downAt < 9, 'nobody stays down forever');
  }
});

test('bots with perfect play win the night', () => {
  const { g, clock } = makeGame({ players: 6, seed: 21 });
  g.hostCommand('start');
  runToEnd(g, clock, { rng: makeRng(5), accuracy: 1 });
  assert.equal(g.ending, 'win');
});

test('kicking players mid-game never breaks the night', () => {
  const { g, clock, ids } = makeGame({ players: 6, seed: 8 });
  g.hostCommand('start');
  let kicked = 0;
  runToEnd(g, clock, {
    rng: makeRng(9),
    onStep: (game) => {
      if (kicked < 3 && ['seance', 'glass', 'arena'].includes(game.step.kind)) { game.kick(ids[5 - kicked]); kicked++; }
    },
  });
  assert.equal(g.step.kind, 'credits');
});
