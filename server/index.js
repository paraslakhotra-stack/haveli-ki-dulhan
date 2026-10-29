// NIGHTFALL server — run on the laptop that's plugged into the TV.
// TV:     http://localhost:3000/tv        Phones: scan the QR code on the TV (http://<lan-ip>:3000/play)
import express from 'express';
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import { Game } from './engine/game.js';
import { STEPS } from './engine/steps/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };

const FAST = flag('fast') || process.env.NIGHTFALL_FAST === '1';
const QUIET = flag('quiet');
const SAVE_FILE = path.join(ROOT, opt('save', 'nightfall-save.json'));
const NO_SAVE = flag('no-save');
const log = (...a) => { if (!QUIET) console.log(...a); };

export function lanAddress() {
  const nets = os.networkInterfaces();
  const cands = [];
  for (const [name, list] of Object.entries(nets)) {
    for (const n of list || []) {
      if (n.family !== 'IPv4' || n.internal) continue;
      const a = n.address;
      const score = a.startsWith('192.168.') ? 3 : a.startsWith('10.') ? 2 : /^172\.(1[6-9]|2\d|3[01])\./.test(a) ? 1 : 0;
      // Skip obvious virtual adapters (Docker, VMware, VirtualBox, WSL).
      const virtual = /docker|vbox|vmnet|virtual|wsl|veth|br-/i.test(name);
      cands.push({ a, score: score - (virtual ? 5 : 0) });
    }
  }
  cands.sort((x, y) => y.score - x.score);
  return cands[0]?.a || 'localhost';
}

export function createServer({ fast = FAST, port = Number(opt('port', process.env.PORT || 3000)), seed, restore = !flag('new') } = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 2e5, pingInterval: 10000, pingTimeout: 20000 });

  // ---------- static ----------
  const nm = (p) => path.join(ROOT, 'node_modules', p);
  const vendor = {
    'nipplejs.mjs': nm('nipplejs/dist/index.mjs'),
    'zzfx.mjs': nm('zzfx/ZzFX.js'),
    'simplex-noise.mjs': nm('simplex-noise/dist/esm/simplex-noise.js'),
    'confetti.mjs': nm('canvas-confetti/dist/confetti.module.mjs'),
  };
  app.disable('x-powered-by');
  app.get('/vendor/:file', (req, res) => {
    const f = vendor[req.params.file];
    if (!f) return res.sendStatus(404);
    res.type('application/javascript').sendFile(f);
  });
  app.use('/fonts/cinzel', express.static(nm('@fontsource/cinzel/files'), { maxAge: '7d' }));
  app.use('/fonts/fell', express.static(nm('@fontsource/im-fell-english/files'), { maxAge: '7d' }));
  app.use('/fonts/elite', express.static(nm('@fontsource/special-elite/files'), { maxAge: '7d' }));
  app.use('/content/runes.js', (req, res) => res.type('application/javascript').sendFile(path.join(ROOT, 'server/content/runes.js')));
  app.use('/tv', express.static(path.join(ROOT, 'public/tv')));
  app.use('/play', express.static(path.join(ROOT, 'public/play')));
  app.use('/shared', express.static(path.join(ROOT, 'public/shared')));
  app.get('/', (req, res) => {
    const ua = req.get('user-agent') || '';
    res.redirect(/Mobi|Android|iPhone|iPad/i.test(ua) ? '/play/' : '/tv/');
  });
  app.get('/health', (req, res) => res.json({ ok: true, kind: game.step.kind, players: game.players.size }));

  // ---------- game ----------
  let flushTimer = null;
  let photosDirty = false;
  const game = new Game({
    fast,
    seed,
    onChange: (photos) => { if (photos) photosDirty = true; scheduleFlush(); },
    onFx: (e) => io.emit('fx', e),
    onStep: () => save(),
  });
  if (restore && !NO_SAVE && fs.existsSync(SAVE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
      const fresh = Date.now() - (data.savedAt || 0) < 8 * 3600 * 1000;
      if (fresh && data.stepIdx > 0 && game.restore(data)) log(`\n  ↺  Resumed the saved night (room ${game.code}). Start with --new for a fresh game.\n`);
    } catch (e) { log('  (could not read the save file — starting fresh)'); }
  }
  function save() {
    if (NO_SAVE) return;
    try {
      if (game.step.kind === 'lobby') { if (fs.existsSync(SAVE_FILE)) fs.unlinkSync(SAVE_FILE); return; }
      fs.writeFileSync(SAVE_FILE, JSON.stringify(game.serialize()));
    } catch { /* saving is best-effort */ }
  }

  // ---------- sockets ----------
  const sent = new Map(); // socket.id -> { view: string, photos: Map<pid, len> }
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, 40);
  }
  function sendPhotos(sock, st) {
    for (const p of game.players.values()) {
      const sig = p.photo ? p.photo.length + p.photo.slice(-12) : '';
      if (st.photos.get(p.id) === sig) continue;
      st.photos.set(p.id, sig);
      sock.emit('photo', { id: p.id, data: p.photo });
    }
  }
  function flush() {
    flushTimer = null;
    const doPhotos = photosDirty;
    photosDirty = false;
    for (const sock of io.sockets.sockets.values()) {
      const st = sent.get(sock.id);
      if (!st) continue;
      if (doPhotos || st.fresh) sendPhotos(sock, st);
      st.fresh = false;
      let view;
      if (sock.data.role === 'tv') view = game.tvView();
      else if (sock.data.pid) view = game.phoneView(sock.data.pid);
      if (!view) continue;
      const json = JSON.stringify(view);
      if (json === st.view) continue;
      st.view = json;
      sock.emit(sock.data.role === 'tv' ? 'tv' : 'view', view);
    }
  }

  io.on('connection', (sock) => {
    sent.set(sock.id, { view: '', photos: new Map(), fresh: true });
    const bind = (pid) => {
      sock.data.pid = pid;
      sock.data.role = 'phone';
      for (const other of io.sockets.sockets.values()) {
        if (other.id !== sock.id && other.data.pid === pid) other.disconnect(true); // newest tab wins
      }
      game.setConnected(pid, true);
      sent.get(sock.id).fresh = true;
      scheduleFlush();
    };

    sock.on('hello', (msg, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (msg?.role === 'tv') {
        sock.data.role = 'tv';
        sock.join('tv');
        sent.get(sock.id).fresh = true;
        scheduleFlush();
        return reply({ ok: true });
      }
      const p = game.byToken(msg?.token);
      if (p) { bind(p.id); return reply({ ok: true, id: p.id, name: p.name }); }
      reply({ ok: false });
    });
    sock.on('join', (msg, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      if (sock.data.pid) return reply({ ok: true, id: sock.data.pid, token: game.players.get(sock.data.pid)?.token });
      const r = game.join({ name: msg?.name, photo: msg?.photo });
      if (r.error) return reply({ ok: false, error: r.error });
      bind(r.player.id);
      reply({ ok: true, id: r.player.id, token: r.player.token, name: r.player.name });
    });
    sock.on('photo', (msg) => { if (sock.data.pid) game.setPhoto(sock.data.pid, msg?.photo); });
    sock.on('input', (msg) => { if (sock.data.pid) game.input(sock.data.pid, msg); });
    sock.on('host', (msg, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const allowed = sock.data.role === 'tv' || (sock.data.pid && game.isHost(sock.data.pid));
      if (!allowed || !msg || typeof msg.cmd !== 'string') return reply({ ok: false });
      if (msg.cmd === 'input' && sock.data.pid) { game.input(sock.data.pid, msg.args); return reply({ ok: true }); }
      const ok = game.hostCommand(msg.cmd, msg.args || {});
      if (msg.cmd === 'restart') save();
      reply({ ok: !!ok });
    });
    sock.on('leave', () => {
      if (sock.data.pid && game.step.kind === 'lobby') game.kick(sock.data.pid);
      sock.data.pid = null;
    });
    sock.on('disconnect', () => {
      sent.delete(sock.id);
      const pid = sock.data.pid;
      if (pid && ![...io.sockets.sockets.values()].some((o) => o.data.pid === pid)) game.setConnected(pid, false);
    });
  });

  // ---------- loops ----------
  const tick = setInterval(() => { game.tick(); }, 100);
  let last = performance.now();
  const arenaLoop = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.step.kind !== 'arena' || game.paused) return;
    const snap = STEPS.arena.simTick(game, game.s, dt);
    if (snap) io.to('tv').volatile.emit('arena', snap);
  }, 1000 / 30);
  const autosave = setInterval(save, 15000);

  async function listen() {
    let p = port;
    for (let i = 0; i < 10; i++) {
      try {
        await new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(p, '0.0.0.0', () => { server.off('error', reject); resolve(); });
        });
        break;
      } catch (e) {
        if (e.code !== 'EADDRINUSE' || i === 9) throw e;
        p++;
      }
    }
    const ip = lanAddress();
    const url = `http://${ip}:${p}/play/`;
    game.joinInfo = { url, code: game.code, qr: await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#14080aff', light: '#efe3c8ff' } }) };
    scheduleFlush();
    return { port: p, ip, url };
  }

  function close() {
    clearInterval(tick); clearInterval(arenaLoop); clearInterval(autosave);
    io.close();
    server.close();
  }
  return { app, server, io, game, listen, close };
}

// ---------- CLI ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const srv = createServer();
  srv.listen().then(async ({ port, url }) => {
    let qr = '';
    try { qr = await QRCode.toString(url, { type: 'terminal', small: true }); } catch { /* optional */ }
    log(`
  ╔══════════════════════════════════════════════════════════╗
     N I G H T F A L L  —  The Blackthorn Wedding
  ╚══════════════════════════════════════════════════════════╝

   1. On THIS laptop (plugged into the TV), open:
        http://localhost:${port}/tv

   2. Guests scan the QR code on the TV — or open:
        ${url}

   Everyone must be on the same Wi-Fi.${FAST ? '\n   ⚡ FAST mode (testing): every timer is ~12× quicker.' : ''}
   Press Ctrl+C to end the night.
${qr}`);
  }).catch((e) => {
    console.error('Could not start the server:', e.message);
    process.exit(1);
  });
  process.on('SIGINT', () => { log('\n  The manor sleeps. Goodnight.\n'); process.exit(0); });
}
