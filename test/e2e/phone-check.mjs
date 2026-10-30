// Screenshots of the phone controllers (hunt + arena, landscape + portrait) through the real phone UI.
//   node test/e2e/phone-check.mjs [--shots dir]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../../server/index.js';

const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const SHOTS = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : path.resolve('test-artifacts/phone');
fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const srv = createServer({ fast: false, port: 4200 + Math.floor(Math.random() * 90), seed: 8, restore: false, persist: false });
const { port } = await srv.listen();
const game = srv.game;
const browser = await chromium.launch();
const errors = [];
const mk = async (w, h) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${w}x${h}: ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${port}/play/`);
  await page.waitForSelector('.join');
  await page.fill('.join .field', w > h ? 'Kabir' : 'Riya');
  await page.click('.join .btn');
  await page.waitForSelector('#top:not(.hidden)');
  return page;
};
game.join({ name: 'Arjun' });
const land = await mk(844, 390);
const port_ = await mk(390, 844);
for (const n of ['Dev', 'Sana', 'Meher']) game.join({ name: n });
game.hostCommand('start');
game.formTeams();
game.jumpTo((s) => s.kind === 'hunt');
await wait(9000);
await land.screenshot({ path: `${SHOTS}/hunt-landscape.jpg`, type: 'jpeg', quality: 80 });
await port_.screenshot({ path: `${SHOTS}/hunt-portrait.jpg`, type: 'jpeg', quality: 80 });
// force a station question for the landscape phone's team
const { getHunt } = await import('../../server/engine/steps/hunt.js');
const sim = getHunt(game);
const me = game.allPlayers().find((p) => p.name === 'Kabir');
const team = sim.team(me.team);
const st = team.stations[team.at];
const sp = sim.players.get(me.id); sp.x = st.x; sp.y = st.y;
await wait(1500);
await land.screenshot({ path: `${SHOTS}/hunt-question.jpg`, type: 'jpeg', quality: 80 });
game.jumpTo((s) => s.kind === 'arena');
await wait(20000);
await land.screenshot({ path: `${SHOTS}/arena-landscape.jpg`, type: 'jpeg', quality: 80 });
await port_.screenshot({ path: `${SHOTS}/arena-portrait.jpg`, type: 'jpeg', quality: 80 });
await browser.close();
srv.close();
console.log(errors.length ? `errors:\n${errors.join('\n')}` : 'no errors');
process.exit(errors.length ? 1 : 0);
