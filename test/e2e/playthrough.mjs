// End-to-end: real Chromium TV + phones against the real server, played to the credits in FAST mode.
// Phones join through the real UI (name + uploaded photo), the host sets up via the host panel,
// then bots drive every step while the browsers render every screen. Fails on any console/page error.
//   node test/e2e/playthrough.mjs [--players 6] [--shots dir]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from '../../server/index.js';
import { botsAct } from '../unit/helpers.js';
import { makeRng } from '../../server/engine/util.js';

// Playwright is resolved like CommonJS so a globally installed copy works too.
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const N = Number(opt('players', 6));
const SHOTS = opt('shots', path.resolve('test-artifacts/e2e'));
fs.mkdirSync(SHOTS, { recursive: true });

const errors = [];
const srv = createServer({ fast: true, port: 3900 + Math.floor(Math.random() * 90), seed: 1234, restore: false, persist: false });
const { port } = await srv.listen();
const base = `http://127.0.0.1:${port}`;
const game = srv.game;
console.log(`server on ${base}`);

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const watchErrors = (page, label) => {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${label}] console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${label}] pageerror: ${e.message}`));
};

// ---- TV ----
const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const tv = await tvCtx.newPage();
watchErrors(tv, 'tv');
await tv.goto(`${base}/tv/`);
await tv.click('#enter', { force: true });

// ---- selfie fixture ----
const fx = await tvCtx.newPage();
const selfies = [];
for (let i = 0; i < N; i++) {
  await fx.setContent(`<div style="width:300px;height:300px;display:grid;place-items:center;background:hsl(${i * 47},45%,35%);font-size:180px">${['😀', '😎', '🤠', '🥸', '😈', '🤓', '😺', '🧛', '🧟', '👻', '🎃', '🤖'][i % 12]}</div>`);
  selfies.push(await fx.locator('div').screenshot({ type: 'png' }));
}
await fx.close();

// ---- phones ----
const names = ['Arjun', 'Kabir', 'Riya', 'Sana', 'Dev', 'Ishaan', 'Meher', 'Tara', 'Neel', 'Zoya', 'Aman', 'Pia'];
const phones = [];
for (let i = 0; i < N; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  watchErrors(page, `phone${i}`);
  await page.goto(`${base}/play/`);
  await page.waitForSelector('.join');
  await page.setInputFiles('input[type=file]', { name: 'me.png', mimeType: 'image/png', buffer: selfies[i] });
  await page.waitForSelector('.join-photo.has img');
  await page.fill('.join .field', names[i]);
  await page.click('.join .btn');
  await page.waitForSelector('#top:not(.hidden)');
  phones.push(page);
}
await tv.waitForFunction((n) => window.__nightfall.view?.players.length === n, N);
await tv.screenshot({ path: `${SHOTS}/tv-00-lobby.jpg`, type: 'jpeg', quality: 72 });
await phones[0].screenshot({ path: `${SHOTS}/phone-00-lobby.jpg`, type: 'jpeg', quality: 72 });

// ---- host setup through the host panel ----
const host = phones[0];
await host.click('#host-btn');
await host.waitForSelector('#sheet:not(.hidden) select');
await host.selectOption('#sheet select', { label: 'Arjun' });
const inputs = host.locator('#sheet input.field');
await inputs.nth(1).fill('Meera');
await host.click('#sheet .seg button:has-text("Spicy")');
await host.click('#sheet details.fold summary');
const q = host.locator('.qrow').first().locator('input');
await q.nth(1).fill('College canteen');
await q.nth(2).fill('A wedding');
await q.nth(3).fill('Instagram');
await q.nth(4).fill('Goa');
await host.screenshot({ path: `${SHOTS}/phone-01-host-setup.jpg`, type: 'jpeg', quality: 72 });
await host.click('#sheet .btn.blood');
await tv.waitForFunction(() => window.__nightfall.view?.kind !== 'lobby');
if (game.settings.groomName !== 'Arjun' || game.settings.brideName !== 'Meera' || game.settings.heat !== 'spicy') errors.push(`host settings not applied: ${JSON.stringify(game.settings)}`);
if (game.secrets.groomQs?.length !== 1) errors.push('groom quiz question not created');

// ---- drive the night ----
const rng = makeRng(7);
const seen = new Set();
let shot = 2;
const started = Date.now();
let reloaded = false;
while (game.step.kind !== 'credits' && Date.now() - started < 12 * 60 * 1000) {
  botsAct(game, rng, 0.9);
  const k = game.step.kind === 'trial' ? `trial-${game.s.trial}` : game.step.kind === 'story' ? null : game.step.kind;
  if (k && !seen.has(k)) {
    seen.add(k);
    await new Promise((r) => setTimeout(r, k === 'arena' ? 2500 : 250));
    const tag = String(shot++).padStart(2, '0');
    await tv.screenshot({ path: `${SHOTS}/tv-${tag}-${k}.jpg`, type: 'jpeg', quality: 72 });
    await phones[1].screenshot({ path: `${SHOTS}/phone-${tag}-${k}.jpg`, type: 'jpeg', quality: 72 });
    if (k === 'arena' && !reloaded) {
      reloaded = true;
      await phones[2].reload();
      await phones[2].waitForSelector('#top:not(.hidden)', { timeout: 10000 });
      const pid = game.allPlayers()[2].id;
      if (!game.players.get(pid).connected) errors.push('reloaded phone did not reconnect to its seat');
    }
  }
  await new Promise((r) => setTimeout(r, 120));
}
await new Promise((r) => setTimeout(r, 1500));
await tv.screenshot({ path: `${SHOTS}/tv-99-credits.jpg`, type: 'jpeg', quality: 72 });
await phones[1].screenshot({ path: `${SHOTS}/phone-99-credits.jpg`, type: 'jpeg', quality: 72 });

const expected = ['sorting', 'seance', 'quiz', 'trial-candle', 'trial-musicbox', 'trial-banish', 'trial-blink', 'trial-gallery', 'possess', 'toast', 'glass', 'unmask', 'arena', 'crypt', 'brides', 'vowWrite', 'chapterTitle', 'chapterEnd'];
for (const e of expected) if (!seen.has(e)) errors.push(`never reached ${e}`);
if (game.step.kind !== 'credits') errors.push(`did not reach credits (stuck at ${game.step.kind})`);

await browser.close();
srv.close();
const real = errors.filter((e) => !/favicon|AudioContext was not allowed/i.test(e));
console.log(`visited: ${[...seen].join(', ')}`);
console.log(`screenshots: ${SHOTS}`);
if (real.length) { console.error(`\n✗ ${real.length} problem(s):\n${real.join('\n')}`); process.exit(1); }
console.log(`\n✓ Full night played with ${N} phones — no errors. Ending: ${game.ending}`);
process.exit(0);
