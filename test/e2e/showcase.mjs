// Visual showcase at real speed: jumps through every chapter and screenshots the TV environments,
// narration captions, a live zombie wave and the boss.   node test/e2e/showcase.mjs [--shots dir]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../../server/index.js';
import { getSim } from '../../server/engine/steps/arena.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : path.resolve('test-artifacts/showcase');
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = createServer({ fast: false, port: 4000 + Math.floor(Math.random() * 90), seed: 99, restore: false, persist: false });
const { port } = await srv.listen();
const base = `http://127.0.0.1:${port}`;
const game = srv.game;
const browser = await chromium.launch();
const errors = [];
const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const tv = await tvCtx.newPage();
tv.on('pageerror', (e) => errors.push(`tv: ${e.message}`));
tv.on('console', (m) => { if (m.type() === 'error') errors.push(`tv: ${m.text()}`); });
await tv.goto(`${base}/tv/`);
await tv.click('#enter', { force: true });

// four guests with generated "selfies"
const fx = await tvCtx.newPage();
const names = ['Arjun', 'Kabir', 'Riya', 'Sana', 'Dev', 'Meher'];
for (let i = 0; i < names.length; i++) {
  await fx.setContent(`<div style="width:240px;height:240px;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%, hsl(${i * 60},40%,55%), hsl(${i * 60},40%,20%));font-size:150px">${['🧔', '👩', '👨‍🦱', '👩‍🦰', '🧑', '👱‍♀️'][i]}</div>`);
  const buf = await fx.locator('div').screenshot({ type: 'jpeg', quality: 80 });
  game.join({ name: names[i], photo: `data:image/jpeg;base64,${buf.toString('base64')}` });
}
await fx.close();
game.updateSettings({ groomName: 'Arjun', brideName: 'Meera', groomId: game.order[0], heat: 'spicy', narration: false });
await wait(1500);
await tv.screenshot({ path: `${SHOTS}/00-lobby.jpg`, type: 'jpeg', quality: 80 });
game.hostCommand('start');

const shoot = async (name, ms = 0) => { if (ms) await wait(ms); await tv.screenshot({ path: `${SHOTS}/${name}.jpg`, type: 'jpeg', quality: 80 }); };
await shoot('01-prologue-title', 3500);
game.next(); // prologue story
await shoot('02-prologue-story', 9000);
game.jumpTo((s) => s.kind === 'sorting');
await shoot('03-sorting', 9000);

for (const [ch, label] of [['guestbook', 'foyer'], ['library', 'library'], ['nursery', 'nursery'], ['reception', 'hall'], ['vow', 'chapel']]) {
  game.hostCommand('jump', { chapter: ch });
  await shoot(`10-${label}-title`, 3500);
  game.next();
  await shoot(`11-${label}-story`, 7000);
}
// a few gameplay screens at real speed
game.jumpTo((s) => s.kind === 'quiz' && s.params.qtype === 'trivia');
await shoot('20-quiz', 2500);
game.jumpTo((s) => s.kind === 'trial' && s.params.trial === 'gallery');
game.hostCommand('skip');
await shoot('21-gallery', 1200);
game.jumpTo((s) => s.kind === 'glass');
await shoot('22-glass', 2000);
game.jumpTo((s) => s.kind === 'story' && s.params.fx === 'rise');
await shoot('23-rise', 24000);
game.jumpTo((s) => s.kind === 'brides');
await shoot('24-brides', 2500);
game.jumpTo((s) => s.kind === 'crypt');
await shoot('25-crypt', 2000);

// the zombie arena
game.jumpTo((s) => s.kind === 'arena');
const sim = getSim(game);
const steer = setInterval(() => { for (const p of game.connectedPlayers()) sim.setMove(p.id, Math.sin(Date.now() / 900 + p.id.length), Math.cos(Date.now() / 1100)); }, 100);
await shoot('30-arena-warmup', 4000);
await shoot('31-arena-wave1', 24000);
await shoot('32-arena-wave1-b', 6000);
// skip to the boss
sim.zombies = []; sim.queue = []; sim.waveIdx = 2; sim.phase = 'cleared'; sim.phaseEnds = sim.t;
for (const p of sim.players.values()) { p.kills = 35; p.tier = 3; }
await shoot('33-arena-boss', 9000);
await shoot('34-arena-boss-b', 5000);
clearInterval(steer);
game.hostCommand('jump', { chapter: 'dawn' });
await wait(7500); game.next();
await shoot('40-dawn', 9000);
game.jumpTo((s) => s.kind === 'credits');
await shoot('41-credits', 9000);
await shoot('42-awards', 12000);

await browser.close();
srv.close();
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no errors');
console.log(`screenshots in ${SHOTS}`);
process.exit(errors.length ? 1 : 0);
