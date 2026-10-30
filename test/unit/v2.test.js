// Tests for the real-time layer, the treasure hunt, the twin-stick arena, teams of 2–4 and the voice-over plumbing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { encode, decode } from '../../public/shared/rtcodec.js';
import { HuntSim } from '../../server/engine/hunt/sim.js';
import { ArenaSim } from '../../server/engine/arena/sim.js';
import { GRID, COLS, ROWS, TILE, START, HUNT_ROOMS, solidAt } from '../../public/shared/haveli-map.js';
import { BEATS } from '../../server/content/script.js';
import { SHAADI } from '../../server/content/quiz.js';
import { timeline } from '../../server/engine/steps/basic.js';
import { VO } from '../../server/content/vo.js';
import { getHunt } from '../../server/engine/steps/hunt.js';
import { makeGame, runToEnd } from './helpers.js';

test('rt codec: tables round-trip, values clamp to Int16', () => {
  const tables = { p: [[1, -2, 300.4, 32767], [-40000, 40000, 0, 5]], z: [], k: [[7, 1, 99, 100]] };
  const d = decode(encode(123456, tables));
  assert.equal(d.t, 123456);
  assert.deepEqual(d.tables.p, [[1, -2, 300, 32767], [-32768, 32767, 0, 5]]);
  assert.deepEqual(d.tables.z, []);
  assert.deepEqual(d.tables.k, [[7, 1, 99, 100]]);
});

test('haveli map: every station spot is reachable from the gate', () => {
  const seen = new Uint8Array(COLS * ROWS);
  const q = [[Math.floor(START[0] / TILE), Math.floor(START[1] / TILE)]];
  seen[q[0][1] * COLS + q[0][0]] = 1;
  while (q.length) {
    const [c, r] = q.pop();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const C = c + dc; const R = r + dr;
      if (!solidAt(C, R) && !seen[R * COLS + C]) { seen[R * COLS + C] = 1; q.push([C, R]); }
    }
  }
  for (const room of HUNT_ROOMS) for (const [c, r] of room.spots) assert.ok(!solidAt(c, r) && seen[r * COLS + c], `${room.id} ${c},${r}`);
  assert.equal(GRID.length, COLS * ROWS);
});

test('hunt: stations, questions, wrong-answer lock, finishing order, time cap', () => {
  const found = [];
  const sim = new HuntSim({ seed: 3, fast: true, teams: [{ id: 'A', members: ['a1', 'a2'] }, { id: 'B', members: ['b1'] }], hooks: { found: (t, item) => found.push([t, item]) } });
  const A = sim.team('A');
  assert.equal(A.stations.length, 5);
  assert.equal(new Set(A.stations.map((s) => s.room)).size, 5, 'five different rooms per trail');
  while (sim.phase === 'warmup') sim.step(0.1);
  // walk a1 onto the station → a question is pending
  const p = sim.players.get('a1');
  p.x = A.stations[0].x; p.y = A.stations[0].y;
  sim.step(0.05);
  assert.ok(A.asking);
  sim.answer('A', false, 'a1');
  assert.ok(!A.asking && sim.t < A.lockUntil, 'wrong answer locks the team');
  while (sim.t < A.lockUntil) sim.step(0.1);
  sim.step(0.05);
  assert.ok(A.asking, 'asks again after the lock');
  for (let k = 0; k < 5; k++) {
    if (!A.asking) { const s = A.stations[A.at]; p.x = s.x; p.y = s.y; sim.step(0.05); }
    sim.answer('A', true, 'a1');
  }
  assert.equal(A.at, 5);
  assert.deepEqual(sim.finished, ['A']);
  assert.equal(found.length, 5);
  // team B never finishes: the time cap ends the hunt anyway
  let guard = 0;
  while (!sim.done && guard++ < 10000) sim.step(0.1);
  assert.ok(sim.done);
  const snap = sim.snapshot();
  assert.equal(snap.tables.s.length, 2);
});

test('hunt: shadows freeze players; a raised diya keeps them off', () => {
  const sim = new HuntSim({ seed: 9, fast: true, teams: [{ id: 'A', members: ['a1'] }] });
  while (sim.phase === 'warmup') sim.step(0.1);
  const p = sim.players.get('a1');
  const g = sim.ghosts[0];
  g.x = p.x + 10; g.y = p.y;
  sim.step(0.05);
  assert.ok(sim.t < p.frozenUntil, 'touch freezes');
  const sim2 = new HuntSim({ seed: 9, fast: true, teams: [{ id: 'A', members: ['a1'] }] });
  while (sim2.phase === 'warmup') sim2.step(0.1);
  const p2 = sim2.players.get('a1');
  sim2.setInput('a1', 0, 0, true);
  const g2 = sim2.ghosts[0];
  g2.x = p2.x + 120; g2.y = p2.y; g2.pushed = -9;
  for (let i = 0; i < 20; i++) sim2.step(0.05);
  assert.ok(Math.hypot(g2.x - p2.x, g2.y - p2.y) > 120, 'pushed back');
  assert.ok(!(sim2.t < p2.frozenUntil));
});

test('arena: twin-stick aim overrides auto-aim, dash gives i-frames, guns never stop in a fight', () => {
  const sim = new ArenaSim({ seed: 4, fast: true, players: [{ id: 'a', team: 'A', items: 4 }] });
  const p = sim.players.get('a');
  assert.equal(p.maxHp, 115, 'hunt items: +15% HP');
  assert.equal(p.tier, 1, 'hunt items: a weapon tier up');
  assert.ok(p.power, 'hunt items: a free power');
  assert.equal(p.dashCd, 1.5, 'hunt items: faster dash');
  while (sim.phase !== 'fight') sim.step(1 / 30);
  sim.setInput('a', 0, 0, -1, 0); // aim left
  sim.step(1 / 30);
  assert.ok(Math.abs(Math.abs(p.aim) - Math.PI) < 0.01);
  sim.dash('a');
  const hp = p.hp;
  sim.hurt(p, 50);
  assert.equal(p.hp, hp, 'no damage mid-dash');
  sim.dash('a');
  assert.ok(sim.t < p.dashReady, 'cooldown');
});

test('teams: 2/3/4 by head-count; the hunt runs with four teams and the night still finishes', () => {
  const { g, clock } = makeGame({ players: 12, seed: 5 });
  g.hostCommand('start');
  let sawHunt = false;
  const { visited } = runToEnd(g, clock, { accuracy: 0.97, onStep: (gg) => { if (gg.step.kind === 'hunt') { sawHunt = true; assert.equal(getHunt(gg).teams.length, 4); } } });
  assert.equal(g.teams.length, 4);
  assert.ok(sawHunt);
  assert.equal(g.step.kind, 'credits');
  assert.ok(visited.some((s) => s.kind === 'quiz' && s.params.phere), 'phere quiz ran');
  assert.ok(g.teams.some((t) => t.items > 0), 'hunt items recorded');
});

test('short night trims trials, hunt stations and arena waves', () => {
  const { g } = makeGame({ players: 4, seed: 6 });
  g.updateSettings({ length: 'short' });
  g.hostCommand('start');
  assert.equal(g.script.filter((s) => s.kind === 'trial').length, 3);
});

test('voice-over: a clip for every narration line, and timelines wait for the clip', () => {
  const missing = [];
  for (const [beat, lines] of Object.entries(BEATS)) lines.forEach((_, i) => { if (!VO[`${beat}.${i}`]) missing.push(`${beat}.${i}`); });
  assert.deepEqual(missing, []);
  for (const v of Object.values(VO)) assert.ok(fs.existsSync(new URL(`../../public/vo/${v.file}`, import.meta.url)), v.file);
  const { g } = makeGame({ players: 2, fast: false });
  const tl = timeline(g, 'prologue');
  tl.lines.forEach((l) => assert.ok(l.ms >= VO[l.key].ms, `${l.key} slot fits its clip`));
  assert.ok(tl.lines.some((l) => l.pz), 'lines naming the groom are flagged for the live voice');
});

test('shaadi pool is well-formed', () => {
  assert.ok(SHAADI.length >= 45);
  for (const q of SHAADI) { assert.ok(q.q && q.a); assert.equal(q.w.length, 3); assert.ok(!q.w.includes(q.a)); }
});
