// Real-speed check of the action chapter renderers: N bot players with twin-stick input, TV frame-rate sampling
// and screenshots.   node test/e2e/arena-check.mjs [--players 8] [--shots dir] [--chapter arena|hunt]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../../server/index.js';
import { STEPS } from '../../server/engine/steps/index.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const N = Number(opt('players', 8));
const KIND = opt('chapter', 'arena');
const SHOTS = opt('shots', path.resolve('test-artifacts/action'));
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const srv = createServer({ fast: false, port: 4100 + Math.floor(Math.random() * 90), seed: 5, restore: false, persist: false });
const { port } = await srv.listen();
const game = srv.game;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
const tv = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
tv.on('pageerror', (e) => errors.push(`tv: ${e.message}`));
tv.on('console', (m) => { if (m.type() === 'error') errors.push(`tv: ${m.text()}`); });
await tv.goto(`http://127.0.0.1:${port}/tv/?debug`);
await tv.click('#enter', { force: true });
const fx = await tv.context().newPage();
const names = ['Arjun', 'Kabir', 'Riya', 'Sana', 'Dev', 'Meher', 'Tara', 'Neel', 'Zoya', 'Aman', 'Pia', 'Ishaan', 'Rohan', 'Kiara', 'Vir', 'Anya'];
for (let i = 0; i < N; i++) {
  await fx.setContent(`<div style="width:160px;height:160px;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%, hsl(${i * 47},40%,55%), hsl(${i * 47},40%,20%));font-size:100px">${['🧔', '👩', '👨‍🦱', '👩‍🦰', '🧑', '👱‍♀️', '🧕', '👳'][i % 8]}</div>`);
  const buf = await fx.locator('div').screenshot({ type: 'jpeg', quality: 70 });
  game.join({ name: names[i], photo: `data:image/jpeg;base64,${buf.toString('base64')}` });
}
await fx.close();
game.updateSettings({ groomName: 'Arjun', brideName: 'Meera', groomId: game.order[0], narration: false });
game.hostCommand('start');
game.formTeams();
for (const t of game.teams) t.items = 2;
game.jumpTo((s) => s.kind === KIND);
const st = STEPS[KIND];
// bots: wander + aim in circles, sometimes dash
const steer = setInterval(() => {
  const t = Date.now() / 1000;
  game.connectedPlayers().forEach((p, i) => {
    const a = [Math.sin(t * 0.7 + i) * 100, Math.cos(t * 0.9 + i * 1.3) * 100, Math.cos(t * 2 + i) * 100, Math.sin(t * 2 + i) * 100];
    st.rtInput?.(game, game.s, p, i % 2 ? a : [a[0], a[1], 0, 0]);
    if (Math.random() < 0.004) game.input(p.id, { seq: game.seq, type: 'dash' });
  });
}, 50);
await tv.evaluate(() => { window.__frames = []; const f = (t) => { window.__frames.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f); });
const fps = async (label) => {
  const r = await tv.evaluate(() => { const fr = window.__frames; window.__frames = []; const d = []; for (let i = 1; i < fr.length; i++) d.push(fr[i] - fr[i - 1]); d.sort((a, b) => a - b); return { n: d.length, p50: d[Math.floor(d.length / 2)], p95: d[Math.floor(d.length * 0.95)] }; });
  const draw = await tv.evaluate(() => window.__drawMs?.() || 0);
  console.log(`${label}: frames ${r.n}, frame-time p50 ${r.p50?.toFixed(1)}ms p95 ${r.p95?.toFixed(1)}ms, draw cpu ${draw.toFixed(1)}ms`);
  return r;
};
const shoot = async (name) => tv.screenshot({ path: `${SHOTS}/${KIND}-${name}.jpg`, type: 'jpeg', quality: 82 });
const plan = (opt('plan', '') || (KIND === 'arena' ? '4:warmup,22:wave1,8:wave1b' : '6:start,15:mid,15:late')).split(',');
for (const step of plan) { const [s, name] = step.split(':'); await wait(Number(s) * 1000); await fps(name); await shoot(name); }
if (KIND === 'arena') {
  const { getSim } = await import('../../server/engine/steps/arena.js');
  const sim = getSim(game);
  sim.zombies = []; sim.queue = []; sim.waveIdx = sim.waves.length - 2; sim.phase = 'cleared'; sim.phaseEnds = sim.t; sim.breakDone = true;
  for (const p of sim.players.values()) { p.kills = 35; p.tier = 3; }
  await wait(10000); await fps('boss'); await shoot('boss');
  await wait(5000); await shoot('boss-b');
}
console.log('server rt stats', JSON.stringify(await (await fetch(`http://127.0.0.1:${port}/stats`)).json()));
clearInterval(steer);
await browser.close();
srv.close();
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no errors');
process.exit(errors.length ? 1 : 0);
