// NIGHTFALL — the TV. Renders the shared screen; all game state lives on the server.
import { connect } from '/shared/net.js';
import { h, clear, add } from '/shared/dom.js';
import { setNames, face } from '/shared/photos.js';
import { audio } from '/shared/audio.js';
import { Backdrop, VW, VH } from '/tv/backdrops.js';
import { ArenaRenderer } from '/tv/arena.js';
import { Narrator } from '/tv/narrator.js';
import { ScreenFx } from '/tv/fx.js';
import { SCREENS } from '/tv/screens.js';
import confetti from '/vendor/confetti.mjs';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const bg = $('bg');
const ctx2d = bg.getContext('2d');
const ui = $('ui');

const backdrop = new Backdrop();
const arena = new ArenaRenderer();
const narrator = new Narrator($('captions'));
const fx = new ScreenFx({ stage, scare: $('scare'), grain: $('grain') });
backdrop.onThunder = () => audio.thunder(0.9);
backdrop.setScene('lobby');

const petals = () => confetti({ particleCount: 160, spread: 140, startVelocity: 38, gravity: 0.55, ticks: 420, scalar: 1.3, colors: ['#ffffff', '#f6dbe2', '#e9b8c4', '#c8102e'], shapes: ['circle'], origin: { y: 0.35 }, zIndex: 50 });
const embers = () => { for (let i = 0; i < 4; i++) setTimeout(() => confetti({ particleCount: 60, spread: 180, startVelocity: 18, gravity: -0.15, ticks: 500, scalar: 0.7, colors: ['#ffd27a', '#ffb35c', '#fff3d0'], origin: { x: Math.random(), y: 1 }, zIndex: 50 }), i * 700); };
const ctx = { backdrop, arena, narrator, fx, petals, embers };

let view = null;
let current = null; // { key, comp }
let arenaOn = false;

// ---------- fit the 1920×1080 stage to any screen ----------
function fit() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener('resize', fit);
fit();

// ---------- render loop ----------
let last = performance.now();
let frame = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (arenaOn) arena.draw(ctx2d, dt);
  else backdrop.draw(ctx2d, now / 1000, dt);
  if (frame++ % 3 === 0) fx.tickGrain();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- gate: one click unlocks sound ----------
function enter() {
  audio.unlock();
  $('gate').classList.add('gone');
  setTimeout(() => $('gate').remove(), 900);
  if (view) applyAudio(view);
}
$('enter').addEventListener('click', enter);

// ---------- network ----------
const net = connect({
  role: 'tv',
  onReady: (socket) => socket.emit('hello', { role: 'tv' }),
  onStatus: (st) => $('offline').classList.toggle('hidden', st === 'online'),
  onView: render,
  onFx: onFx,
  onArena: (snap) => { if (arenaOn) arena.ingest(snap); },
});
const host = (cmd, args) => net.socket.emit('host', { cmd, args });

function sceneFor(v) {
  if (v.kind === 'lobby') return 'lobby';
  if (v.kind === 'story') return v.step.scene;
  if (v.kind === 'credits') return 'dawn';
  return v.chapter.scene || 'manor';
}

function applyAudio(v) {
  if (!audio.ready) return;
  const scene = sceneFor(v);
  audio.setScene(v.kind === 'arena' ? 'garden' : scene);
  if (v.kind === 'arena' && v.step.sub === 'fight') audio.startCombat(); else audio.stopCombat();
}

function render(v) {
  const prevKind = view?.kind;
  view = v;
  setNames(v.players);
  narrator.enabled = v.narration && !v.fast;
  arena.setContext({ teams: v.teams, players: v.players, groomId: v.groomId });

  const wantArena = v.kind === 'arena';
  if (wantArena && !arenaOn) arena.reset();
  arenaOn = wantArena;
  if (!wantArena) {
    const scene = sceneFor(v);
    backdrop.setScene(scene, backdrop.name === scene ? backdrop.params : {});
  }
  applyAudio(v);

  const key = `${v.kind}:${v.seq}`;
  if (!current || current.key !== key) {
    current?.comp.destroy?.();
    clear(ui);
    const comp = (SCREENS[v.kind] || SCREENS.story)(ui, v, ctx);
    current = { key, comp };
  } else {
    current.comp.update?.(v);
  }
  renderHud(v);
  $('pause').classList.toggle('hidden', !v.paused);
  if (prevKind && prevKind !== v.kind && v.kind === 'chapterTitle') fx.shake('fade-flash');
}

function renderHud(v) {
  const showTag = !['lobby', 'chapterTitle', 'arena', 'credits'].includes(v.kind);
  const tag = $('chapter-tag');
  clear(tag);
  if (showTag) add(tag, h('span', { class: 'ct-num' }, v.chapter.numeral || '✦'), h('span', {}, v.chapter.title), h('span', { class: 'ct-clock' }, v.chapter.clock));
  const souls = $('souls-mini');
  clear(souls);
  if (v.teams.length && !['lobby', 'arena', 'credits'].includes(v.kind)) {
    for (const t of v.teams) add(souls, h('div', { class: 'sm-row', style: { '--tc': t.color } }, h('span', {}, t.name.replace('The ', '')), h('b', {}, t.souls)));
  }
  const join = $('join-mini');
  clear(join);
  if (v.join?.qr && !['lobby', 'arena', 'credits', 'chapterTitle'].includes(v.kind)) {
    add(join, h('img', { src: v.join.qr, alt: '' }), h('span', {}, 'Late? Scan to join'));
  }
}

function onFx(e) {
  switch (e.type) {
    case 'scare': fx.scare({ pid: e.pid, level: 0.8 }); break;
    case 'rune': audio.musicBoxNote(64 + e.progress * 3, 0, 1.3); break;
    case 'sigil': audio.bell(0.9); audio.ui('good'); break;
    case 'candleOut': audio.ui('bad'); break;
    case 'glassRight': audio.glass(1); audio.ui('good'); break;
    case 'accept': audio.heartbeat(1.2); break;
    default:
  }
}

// ---------- keyboard: the laptop is a host remote too ----------
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'f' || e.key === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); }
  if (!view) return;
  if (e.key === ' ') { e.preventDefault(); host(view.paused ? 'resume' : 'pause'); }
  if (e.key === 'n' || e.key === 'N' || e.key === 'ArrowRight') host('skip');
  if ((e.key === 's' || e.key === 'S') && view.kind === 'lobby') host('start');
  if (document.getElementById('gate') && (e.key === 'Enter')) enter();
});

// For tests: expose a tiny hook.
window.__nightfall = { get view() { return view; }, enter, face };
